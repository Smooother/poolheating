import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  // Enable CORS for mobile app
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (req.method === 'POST') {
      // Trigger automation
      const result = await runAutomation();
      return res.status(200).json(result);
    }

    if (req.method === 'GET') {
      // Get automation settings and logs
      const { data: settings } = await supabase
        .from('automation_settings')
        .select('*')
        .eq('user_id', 'default')
        .single();

      const { data: logs } = await supabase
        .from('automation_log')
        .select('*')
        .eq('user_id', 'default')
        .order('timestamp', { ascending: false })
        .limit(10);

      return res.status(200).json({
        settings: settings || {},
        recentLogs: logs || []
      });
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Automation API error:', error);
    res.status(500).json({ error: error.message });
  }
}

async function runAutomation() {
  console.log('🔄 Running SIMPLE automation...');

  // 1. Get automation settings
  const { data: settings } = await supabase
    .from('automation_settings')
    .select('*')
    .eq('user_id', 'default')
    .single();

  if (!settings?.automation_enabled) {
    return { success: false, message: 'Automation is disabled' };
  }

  // 2. Get current price
  const now = new Date();
  const { data: currentPrice } = await supabase
    .from('price_data')
    .select('*')
    .eq('bidding_zone', settings.bidding_zone || 'SE3')
    .gte('start_time', new Date(now.getTime() - 3600000).toISOString())
    .lte('start_time', now.toISOString())
    .order('start_time', { ascending: false })
    .limit(1)
    .single();

  if (!currentPrice) {
    return { success: false, message: 'No current price data available' };
  }

  // 3. Get 7-day average
  const averagePrice = await calculatePriceAverage(7, settings.bidding_zone || 'SE3');

  // 4. Get current heat pump status
  const { data: heatPumpStatus } = await supabase
    .from('heat_pump_status')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  // 5. CONFIGURABLE CALCULATION - use settings from Control page
  // Use energy price for comparison (excluding taxes and net fees which are fixed)
  const currentPriceValue = currentPrice.energy_price ? parseFloat(currentPrice.energy_price) : parseFloat(currentPrice.price_value);
  const staticBaselineTemp = settings.target_pool_temp || 28; // STATIC baseline from user settings
  
  // Get configurable thresholds and offsets (with defaults)
  const lowPriceThreshold = settings.low_price_threshold || 0.7;
  const highPriceThreshold = settings.high_price_threshold || 1.3;
  const lowTempOffset = settings.low_temp_offset || 2.0;
  const highTempOffset = settings.high_temp_offset || 2.0;
  const minPumpTemp = settings.min_pump_temp || 18;
  const maxPumpTemp = settings.max_pump_temp || 32;
  
  let newTemp = staticBaselineTemp;
  let reason = '';

  // Check if temperature would exceed safe limits
  const proposedLowTemp = staticBaselineTemp + lowTempOffset;
  const proposedHighTemp = staticBaselineTemp - highTempOffset;
  
  if (proposedLowTemp > maxPumpTemp || proposedHighTemp < minPumpTemp) {
    // SHUTDOWN - temperature would exceed safe limits
    newTemp = null;
    reason = `SHUTDOWN: Temperature adjustment would exceed safe limits (${minPumpTemp}-${maxPumpTemp}°C)`;
  } else if (currentPriceValue >= 1.50) {
    // SHUTDOWN - extremely high price
    newTemp = null;
    reason = `SHUTDOWN: Price ${currentPriceValue.toFixed(3)} SEK/kWh >= 1.50 threshold`;
  } else if (currentPriceValue >= averagePrice * highPriceThreshold) {
    // HIGH price - reduce by configured offset from STATIC baseline
    newTemp = Math.max(minPumpTemp, staticBaselineTemp - highTempOffset);
    reason = `HIGH price: ${currentPriceValue.toFixed(3)} SEK/kWh (avg: ${averagePrice.toFixed(3)}, threshold: ${(averagePrice * highPriceThreshold).toFixed(3)}) - reduced heating -${highTempOffset}°C from ${staticBaselineTemp}°C`;
  } else if (currentPriceValue <= averagePrice * lowPriceThreshold) {
    // LOW price - increase by configured offset from STATIC baseline
    newTemp = Math.min(maxPumpTemp, staticBaselineTemp + lowTempOffset);
    reason = `LOW price: ${currentPriceValue.toFixed(3)} SEK/kWh (avg: ${averagePrice.toFixed(3)}, threshold: ${(averagePrice * lowPriceThreshold).toFixed(3)}) - aggressive heating +${lowTempOffset}°C from ${staticBaselineTemp}°C`;
  } else {
    // NORMAL price - keep STATIC baseline
    newTemp = staticBaselineTemp;
    reason = `NORMAL price: ${currentPriceValue.toFixed(3)} SEK/kWh (avg: ${averagePrice.toFixed(3)}) - baseline temperature ${staticBaselineTemp}°C`;
  }

  // 6. Check if we need to change temperature
  const currentTemp = heatPumpStatus?.target_temp || staticBaselineTemp;
  const tempDifference = Math.abs(newTemp - currentTemp);

  if (tempDifference < 0.5) {
    return {
      success: true,
      message: 'No temperature change needed',
      currentPrice: currentPriceValue,
      averagePrice: averagePrice,
      currentTemp: currentTemp,
      newTemp: newTemp,
      reason: reason
    };
  }

  // 7. Apply temperature change using the working heat pump API
  let actionTaken = '';
  
  if (newTemp === null) {
    // Turn off pump
    try {
      const response = await fetch(`${process.env.BASE_URL || 'https://poolheating.vercel.app'}/api/heatpump`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'sendCommand',
          commands: [{ code: 'Power', value: false }]
        })
      });
      
      const result = await response.json();
      if (result.success) {
        actionTaken = 'Pump turned OFF';
      } else {
        actionTaken = `Failed to turn off pump: ${result.error || 'Unknown error'}`;
      }
    } catch (error) {
      actionTaken = `Failed to turn off pump: ${error.message}`;
    }
  } else {
    // Set temperature
    try {
      const response = await fetch(`${process.env.BASE_URL || 'https://poolheating.vercel.app'}/api/heatpump`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'setTemperature',
          temperature: newTemp
        })
      });
      
      const result = await response.json();
      if (result.success) {
        actionTaken = `Temperature set to ${newTemp}°C`;
      } else {
        actionTaken = `Failed to set temperature: ${result.error || 'Unknown error'}`;
      }
    } catch (error) {
      actionTaken = `Failed to set temperature: ${error.message}`;
    }
  }

  // 8. Log the action
  await supabase.from('automation_log').insert({
    user_id: 'default',
    current_price: currentPriceValue,
    avg_price_forecast: averagePrice,
    current_pool_temp: heatPumpStatus?.water_temp || null,
    target_pool_temp: settings.target_pool_temp,
    current_pump_temp: currentTemp,
    new_pump_temp: newTemp,
    price_classification: newTemp === null ? 'shutdown' : 
                         currentPriceValue >= averagePrice * 1.3 ? 'high' :
                         currentPriceValue <= averagePrice * 0.7 ? 'low' : 'normal',
    action_reason: `${reason} | ${actionTaken}`
  });

  return {
    success: true,
    currentPrice: currentPriceValue,
    averagePrice: averagePrice,
    currentTemp: currentTemp,
    newTemp: newTemp,
    reason: reason,
    actionTaken: actionTaken
  };
}

// Simple calculation is now inline in runAutomation()

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
    return 0.10; // Default fallback average
  }
  
  // Use energy_price if available, otherwise fallback to price_value
  const total = priceData.reduce((sum, p) => {
    const energyPrice = p.energy_price ? parseFloat(p.energy_price) : parseFloat(p.price_value);
    return sum + energyPrice;
  }, 0);
  
  return total / priceData.length;
}

// Classification is now inline in runAutomation()