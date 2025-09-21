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
  // Get automation settings
  const { data: settings } = await supabase
    .from('automation_settings')
    .select('*')
    .eq('user_id', 'default')
    .single();

  if (!settings?.automation_enabled) {
    return { success: false, message: 'Automation is disabled' };
  }

  // Get current heat pump status
  const { data: heatPumpStatus } = await supabase
    .from('heat_pump_status')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  // Get current price data
  const now = new Date();
  const { data: currentPrice } = await supabase
    .from('price_data')
    .select('*')
    .eq('bidding_zone', 'SE3')
    .gte('start_time', new Date(now.getTime() - 3600000).toISOString())
    .lte('start_time', now.toISOString())
    .order('start_time', { ascending: false })
    .limit(1)
    .single();

  if (!currentPrice) {
    return { success: false, message: 'No current price data available' };
  }

  // Get price forecast
  const forecastStart = new Date(now.getTime() + 3600000);
  const forecastEnd = new Date(now.getTime() + (settings.optimization_horizon_hours * 3600000));
  
  const { data: forecastPrices } = await supabase
    .from('price_data')
    .select('*')
    .eq('bidding_zone', 'SE3')
    .gte('start_time', forecastStart.toISOString())
    .lte('start_time', forecastEnd.toISOString())
    .order('start_time', { ascending: true });

  const avgForecastPrice = forecastPrices.length > 0 
    ? forecastPrices.reduce((sum, p) => sum + parseFloat(p.price_value), 0) / forecastPrices.length
    : parseFloat(currentPrice.price_value);

  // Calculate optimal temperature
  const result = calculateOptimalPumpTemp(
    parseFloat(currentPrice.price_value),
    avgForecastPrice,
    heatPumpStatus?.current_temp || settings.target_pool_temp,
    settings.target_pool_temp,
    heatPumpStatus?.target_temp || settings.target_pool_temp,
    settings
  );

  const priceClassification = classifyPrice(parseFloat(currentPrice.price_value), settings);
  let actionTaken = '';

  // Execute the automation action
  if (result.shouldShutdown) {
    // Turn off pump completely
    try {
      const { data: powerResult, error: powerError } = await supabase.functions.invoke('tuya-proxy', {
        body: {
          action: 'sendCommand',
          deviceId: process.env.TUYA_DEVICE_ID,
          commands: [{ code: 'Power', value: false }]
        }
      });
      
      if (powerError || !powerResult?.success) {
        throw new Error(`Failed to turn off pump: ${powerError?.message || powerResult?.msg}`);
      }
      actionTaken = 'Pump turned OFF due to high price';
    } catch (error) {
      console.error('Error turning off pump:', error);
      actionTaken = `Failed to turn off pump: ${error.message}`;
    }
  } else {
    // Set temperature (pump should be on)
    try {
      // First ensure pump is on
      const { data: powerResult, error: powerError } = await supabase.functions.invoke('tuya-proxy', {
        body: {
          action: 'sendCommand',
          deviceId: process.env.TUYA_DEVICE_ID,
          commands: [{ code: 'Power', value: true }]
        }
      });
      
      if (powerError || !powerResult?.success) {
        console.warn('Failed to ensure pump is on:', powerError?.message || powerResult?.msg);
      }

      // Then set temperature
      const { data: tempResult, error: tempError } = await supabase.functions.invoke('tuya-proxy', {
        body: {
          action: 'sendCommand',
          deviceId: process.env.TUYA_DEVICE_ID,
          commands: [{ code: 'SetTemp', value: result.newTemp }]
        }
      });
      
      if (tempError || !tempResult?.success) {
        throw new Error(`Failed to set temperature: ${tempError?.message || tempResult?.msg}`);
      }
      actionTaken = `Temperature set to ${result.newTemp}°C`;
    } catch (error) {
      console.error('Error setting temperature:', error);
      actionTaken = `Failed to set temperature: ${error.message}`;
    }
  }

  // Log the automation decision
  await supabase.from('automation_log').insert({
    user_id: 'default',
    current_price: parseFloat(currentPrice.price_value),
    avg_price_forecast: avgForecastPrice,
    current_pool_temp: heatPumpStatus?.water_temp || null,
    target_pool_temp: settings.target_pool_temp,
    current_pump_temp: heatPumpStatus?.target_temp || null,
    new_pump_temp: result.shouldShutdown ? null : result.newTemp,
    price_classification: priceClassification,
    action_reason: `${result.reason} | ${actionTaken}`
  });

  return {
    success: true,
    currentPrice: parseFloat(currentPrice.price_value),
    newTemp: result.shouldShutdown ? null : result.newTemp,
    shouldShutdown: result.shouldShutdown,
    reason: result.reason,
    actionTaken,
    priceClassification
  };
}

function calculateOptimalPumpTemp(currentPrice, avgForecast, currentPoolTemp, targetPoolTemp, currentPumpTemp, settings) {
  // Use current pump temperature as baseline (this is the actual SetTemp from the pump)
  const baselineTemp = currentPumpTemp || targetPoolTemp;
  let newTemp = baselineTemp;
  let reason = '';
  let shouldShutdown = false;

  // Classify current price using user settings
  const priceClassification = classifyPrice(currentPrice, settings);
  
  if (priceClassification === 'shutdown') {
    // SHUTDOWN price - turn off pump completely
    shouldShutdown = true;
    reason = `SHUTDOWN price (${currentPrice.toFixed(3)} SEK/kWh) - pump turned off (threshold: ${settings?.high_price_threshold ?? 1.50} SEK/kWh)`;
  } else if (priceClassification === 'low') {
    // LOW price - add +2°C for aggressive heating
    newTemp = Math.min(settings?.max_pump_temp ?? 35, baselineTemp + 2);
    reason = `LOW price (${currentPrice.toFixed(3)} SEK/kWh) - aggressive heating +2°C (threshold: ${settings?.low_price_threshold ?? 0.05} SEK/kWh)`;
  } else if (priceClassification === 'high') {
    // HIGH price - reduce heating by -2°C
    newTemp = Math.max(settings?.min_pump_temp ?? 18, baselineTemp - 2);
    reason = `HIGH price (${currentPrice.toFixed(3)} SEK/kWh) - reduced heating -2°C (threshold: ${settings?.normal_price_threshold ?? 0.15} SEK/kWh)`;
  } else {
    // NORMAL price - use baseline temperature
    newTemp = baselineTemp;
    reason = `NORMAL price (${currentPrice.toFixed(3)} SEK/kWh) - baseline temperature`;
  }

  return {
    newTemp: Math.round(newTemp),
    shouldShutdown,
    reason
  };
}

function classifyPrice(currentPrice, settings) {
  // Use user-configurable thresholds from settings, with fallback defaults
  const LOW_THRESHOLD = settings?.low_price_threshold ?? 0.05;
  const NORMAL_THRESHOLD = settings?.normal_price_threshold ?? 0.15;
  const HIGH_THRESHOLD = settings?.high_price_threshold ?? 1.50;
  
  if (currentPrice <= LOW_THRESHOLD) return 'low';
  if (currentPrice >= HIGH_THRESHOLD) return 'shutdown'; // Special case for pump shutdown
  if (currentPrice >= NORMAL_THRESHOLD) return 'high';
  return 'normal';
}