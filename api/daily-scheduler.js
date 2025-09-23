import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (req.method === 'POST') {
      // Run daily scheduling
      const result = await createDailySchedule();
      return res.status(200).json(result);
    }

    if (req.method === 'GET') {
      // Get today's schedule
      const today = new Date().toISOString().split('T')[0];
      const { data: schedule } = await supabase
        .from('automation_schedule')
        .select('*')
        .eq('date', today)
        .order('hour', { ascending: true });

      return res.status(200).json({
        success: true,
        date: today,
        schedule: schedule || [],
        message: 'Daily schedule retrieved'
      });
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Daily scheduler error:', error);
    res.status(500).json({ error: error.message });
  }
}

async function createDailySchedule() {
  console.log('📅 Creating daily automation schedule...');

  // 1. Get automation settings
  const { data: settings } = await supabase
    .from('automation_settings')
    .select('*')
    .eq('user_id', 'default')
    .single();

  if (!settings?.automation_enabled) {
    return { success: false, message: 'Automation is disabled' };
  }

  // 2. First, try to fetch fresh prices from Tibber (including historical data)
  try {
    console.log('🔄 Fetching fresh prices from Tibber...');
    const tibberResponse = await fetch(`${process.env.BASE_URL || 'https://poolheating.vercel.app'}/api/tibber-prices`, {
      method: 'POST'
    });
    
    if (tibberResponse.ok) {
      const tibberResult = await tibberResponse.json();
      if (tibberResult.success) {
        console.log(`✅ Fetched ${tibberResult.pricesCount} prices from Tibber (including historical data)`);
      }
    }
  } catch (error) {
    console.log('⚠️ Tibber fetch failed, using existing data:', error.message);
  }

  // 3. Get today's prices (from Tibber or existing data)
  const today = new Date();
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

  const { data: priceData } = await supabase
    .from('price_data')
    .select('*')
    .eq('bidding_zone', settings.bidding_zone || 'SE3')
    .gte('start_time', startOfDay.toISOString())
    .lte('start_time', endOfDay.toISOString())
    .order('start_time', { ascending: true });

  if (!priceData || priceData.length === 0) {
    return { success: false, message: 'No price data available for today. Tibber prices may not be available yet (released at 13:20).' };
  }

  // 3. Get configurable rolling average for classification
  const rollingDays = settings.rolling_days || 7;
  const averagePrice = await calculatePriceAverage(rollingDays, settings.bidding_zone || 'SE3');
  const staticBaselineTemp = settings.target_pool_temp || 28;

  // 4. Create hourly schedule
  const schedule = [];
  
  // Get configurable thresholds and offsets
  const lowPriceThreshold = settings.low_price_threshold || 0.7;
  const highPriceThreshold = settings.high_price_threshold || 1.3;
  const lowTempOffset = settings.low_temp_offset || 2.0;
  const highTempOffset = settings.high_temp_offset || 2.0;
  const minPumpTemp = settings.min_pump_temp || 18;
  const maxPumpTemp = settings.max_pump_temp || 32;

  for (const price of priceData) {
    // Use energy price for comparison (excluding taxes and net fees which are fixed)
    const priceValue = price.energy_price ? parseFloat(price.energy_price) : parseFloat(price.price_value);
    const hour = new Date(price.start_time).getHours();
    
    let targetTemp = staticBaselineTemp;
    let classification = 'normal';
    let reason = '';

    // Check if temperature would exceed safe limits
    const proposedLowTemp = staticBaselineTemp + lowTempOffset;
    const proposedHighTemp = staticBaselineTemp - highTempOffset;
    
    if (proposedLowTemp > maxPumpTemp || proposedHighTemp < minPumpTemp) {
      // SHUTDOWN - temperature would exceed safe limits
      targetTemp = null;
      classification = 'shutdown';
      reason = `SHUTDOWN: Temperature adjustment would exceed safe limits (${minPumpTemp}-${maxPumpTemp}°C)`;
    } else if (priceValue >= 1.50) {
      // SHUTDOWN - extremely high price
      targetTemp = null;
      classification = 'shutdown';
      reason = `SHUTDOWN: Price ${priceValue.toFixed(3)} SEK/kWh >= 1.50 threshold`;
    } else if (priceValue >= averagePrice * highPriceThreshold) {
      // HIGH price - reduce by configured offset
      targetTemp = Math.max(minPumpTemp, staticBaselineTemp - highTempOffset);
      classification = 'high';
      reason = `HIGH price: ${priceValue.toFixed(3)} SEK/kWh (avg: ${averagePrice.toFixed(3)}, threshold: ${(averagePrice * highPriceThreshold).toFixed(3)}) - reduced heating -${highTempOffset}°C`;
    } else if (priceValue <= averagePrice * lowPriceThreshold) {
      // LOW price - increase by configured offset
      targetTemp = Math.min(maxPumpTemp, staticBaselineTemp + lowTempOffset);
      classification = 'low';
      reason = `LOW price: ${priceValue.toFixed(3)} SEK/kWh (avg: ${averagePrice.toFixed(3)}, threshold: ${(averagePrice * lowPriceThreshold).toFixed(3)}) - aggressive heating +${lowTempOffset}°C`;
    } else {
      // NORMAL price - baseline
      classification = 'normal';
      reason = `NORMAL price: ${priceValue.toFixed(3)} SEK/kWh (avg: ${averagePrice.toFixed(3)}) - baseline temperature`;
    }

    schedule.push({
      date: today.toISOString().split('T')[0],
      hour: hour,
      price_value: priceValue,
      price_classification: classification,
      target_temperature: targetTemp,
      reason: reason,
      executed: false,
      created_at: new Date().toISOString()
    });
  }

  // 5. Clear existing schedule for today
  await supabase
    .from('automation_schedule')
    .delete()
    .eq('date', today.toISOString().split('T')[0]);

  // 6. Insert new schedule
  const { error } = await supabase
    .from('automation_schedule')
    .insert(schedule);

  if (error) {
    console.error('Failed to insert schedule:', error);
    return { success: false, error: error.message };
  }

  console.log(`✅ Created schedule for ${schedule.length} hours`);

  return {
    success: true,
    date: today.toISOString().split('T')[0],
    schedule_entries: schedule.length,
    average_price: averagePrice,
    baseline_temp: staticBaselineTemp,
    message: `Daily schedule created with ${schedule.length} hourly adjustments`
  };
}

async function calculatePriceAverage(days = 7, biddingZone = 'SE3') {
  // Calculate average ENERGY price over the specified number of days (excluding taxes and net fees)
  const endDate = new Date();
  const startDate = new Date(endDate.getTime() - (days * 24 * 60 * 60 * 1000));
  
  const { data: priceData } = await supabase
    .from('price_data')
    .select('energy_price, price_value')
    .eq('bidding_zone', biddingZone)
    .gte('start_time', startDate.toISOString())
    .lte('start_time', endDate.toISOString());
  
  if (!priceData || priceData.length === 0) {
    return 0.50; // Default fallback average
  }
  
  // Use energy_price if available, otherwise fallback to price_value
  const total = priceData.reduce((sum, p) => {
    const energyPrice = p.energy_price ? parseFloat(p.energy_price) : parseFloat(p.price_value);
    return sum + energyPrice;
  }, 0);
  
  return total / priceData.length;
}
