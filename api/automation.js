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

  // Log the automation decision
  await supabase.from('automation_log').insert({
    user_id: 'default',
    current_price: parseFloat(currentPrice.price_value),
    avg_price_forecast: avgForecastPrice,
    current_pool_temp: heatPumpStatus?.water_temp || null,
    target_pool_temp: settings.target_pool_temp,
    current_pump_temp: heatPumpStatus?.target_temp || null,
    new_pump_temp: result.newTemp,
    price_classification: classifyPrice(parseFloat(currentPrice.price_value), forecastPrices),
    action_reason: result.reason
  });

  return {
    success: true,
    currentPrice: parseFloat(currentPrice.price_value),
    newTemp: result.newTemp,
    reason: result.reason,
    priceClassification: classifyPrice(parseFloat(currentPrice.price_value), forecastPrices)
  };
}

function calculateOptimalPumpTemp(currentPrice, avgForecast, currentPoolTemp, targetPoolTemp, currentPumpTemp, settings) {
  // Use current pump temperature as baseline (this is the actual SetTemp from the pump)
  const baselineTemp = currentPumpTemp || targetPoolTemp;
  let newTemp = baselineTemp;
  let reason = '';

  // Classify current price
  const priceClassification = classifyPrice(currentPrice, []);
  
  if (priceClassification === 'low') {
    // LOW price - add +2°C for aggressive heating
    newTemp = Math.min(settings.max_pump_temp, baselineTemp + 2);
    reason = `LOW price (${currentPrice.toFixed(3)} SEK/kWh) - aggressive heating +2°C`;
  } else if (priceClassification === 'high') {
    // HIGH price - reduce heating by -2°C
    newTemp = Math.max(settings.min_pump_temp, baselineTemp - 2);
    reason = `HIGH price (${currentPrice.toFixed(3)} SEK/kWh) - reduced heating -2°C`;
  } else {
    // NORMAL price - use baseline temperature
    newTemp = baselineTemp;
    reason = `NORMAL price (${currentPrice.toFixed(3)} SEK/kWh) - baseline temperature`;
  }

  return {
    newTemp: Math.round(newTemp),
    reason
  };
}

function classifyPrice(currentPrice, prices) {
  // Use absolute thresholds for price classification
  // These can be adjusted based on your electricity price patterns
  const LOW_THRESHOLD = 0.05;   // Below 0.05 SEK/kWh = LOW
  const HIGH_THRESHOLD = 0.15;  // Above 0.15 SEK/kWh = HIGH
  
  if (currentPrice <= LOW_THRESHOLD) return 'low';
  if (currentPrice >= HIGH_THRESHOLD) return 'high';
  return 'normal';
}