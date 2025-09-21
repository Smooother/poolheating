import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    // Get current schedule
    try {
      const { data: schedule } = await supabase
        .from('automation_schedule')
        .select('*')
        .eq('user_id', 'default')
        .gte('scheduled_time', new Date().toISOString())
        .order('scheduled_time', { ascending: true });

      return res.status(200).json({
        success: true,
        schedule: schedule || [],
        nextExecution: schedule?.[0] || null
      });
    } catch (error) {
      console.error('Error fetching schedule:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  if (req.method === 'POST') {
    // Create new 24-hour schedule
    try {
      const result = await createDailySchedule();
      return res.status(200).json(result);
    } catch (error) {
      console.error('Error creating schedule:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

async function createDailySchedule() {
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  
  // Get automation settings
  const { data: settings } = await supabase
    .from('automation_settings')
    .select('*')
    .eq('user_id', 'default')
    .single();

  if (!settings) {
    throw new Error('Automation settings not found');
  }

  // Get current heat pump status
  const { data: heatPumpStatus } = await supabase
    .from('heat_pump_status')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  const baselineTemp = heatPumpStatus?.target_temp || settings.target_pool_temp;

  // Get price data for next 24 hours
  const { data: priceData } = await supabase
    .from('price_data')
    .select('*')
    .eq('bidding_zone', 'SE3')
    .gte('start_time', now.toISOString())
    .lte('start_time', tomorrow.toISOString())
    .order('start_time', { ascending: true });

  if (!priceData || priceData.length === 0) {
    throw new Error('No price data available for scheduling');
  }

  // Calculate average price for classification
  const averagePrice = await calculatePriceAverage(settings.average_days || 7);

  // Clear existing schedule
  await supabase
    .from('automation_schedule')
    .delete()
    .eq('user_id', 'default');

  // Create new schedule
  const scheduleEntries = [];
  
  for (const pricePoint of priceData) {
    const priceValue = parseFloat(pricePoint.price_value);
    const priceClassification = classifyPrice(priceValue, averagePrice, settings.high_price_threshold || 1.50);
    
    let targetTemp = baselineTemp;
    let shouldShutdown = false;
    let reason = '';

    if (priceClassification === 'shutdown') {
      shouldShutdown = true;
      reason = `SHUTDOWN price (${priceValue.toFixed(3)} SEK/kWh) - pump off`;
    } else if (priceClassification === 'low') {
      targetTemp = Math.min(settings.max_pump_temp, baselineTemp + 2);
      reason = `LOW price (${priceValue.toFixed(3)} SEK/kWh) - aggressive heating +2°C`;
    } else if (priceClassification === 'high') {
      targetTemp = Math.max(settings.min_pump_temp, baselineTemp - 2);
      reason = `HIGH price (${priceValue.toFixed(3)} SEK/kWh) - reduced heating -2°C`;
    } else {
      reason = `NORMAL price (${priceValue.toFixed(3)} SEK/kWh) - baseline temperature`;
    }

    scheduleEntries.push({
      user_id: 'default',
      scheduled_time: pricePoint.start_time,
      price_value: priceValue,
      price_classification: priceClassification,
      target_temperature: shouldShutdown ? null : targetTemp,
      should_shutdown: shouldShutdown,
      reason: reason,
      executed: false
    });
  }

  // Insert schedule entries
  const { data: insertedSchedule, error } = await supabase
    .from('automation_schedule')
    .insert(scheduleEntries);

  if (error) {
    throw new Error(`Failed to create schedule: ${error.message}`);
  }

  return {
    success: true,
    message: `Created ${scheduleEntries.length} scheduled actions for next 24 hours`,
    schedule: scheduleEntries,
    averagePrice: averagePrice,
    baselineTemp: baselineTemp
  };
}

async function calculatePriceAverage(days = 7) {
  const endDate = new Date();
  const startDate = new Date(endDate.getTime() - (days * 24 * 60 * 60 * 1000));
  
  const { data: priceData } = await supabase
    .from('price_data')
    .select('price_value')
    .eq('bidding_zone', 'SE3')
    .gte('start_time', startDate.toISOString())
    .lte('start_time', endDate.toISOString());
  
  if (!priceData || priceData.length === 0) {
    return 0.10; // Default fallback average
  }
  
  const total = priceData.reduce((sum, p) => sum + parseFloat(p.price_value), 0);
  return total / priceData.length;
}

function classifyPrice(currentPrice, averagePrice, highPriceThreshold = 1.50) {
  if (currentPrice >= highPriceThreshold) {
    return 'shutdown';
  }
  
  const LOW_THRESHOLD = averagePrice * 0.7;   // 30% below average = LOW
  const HIGH_THRESHOLD = averagePrice * 1.3;  // 30% above average = HIGH
  
  if (currentPrice <= LOW_THRESHOLD) return 'low';
  if (currentPrice >= HIGH_THRESHOLD) return 'high';
  return 'normal';
}
