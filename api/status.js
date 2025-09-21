import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  // Enable CORS for mobile app
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
        const now = new Date();
        
        // Get bidding zone from automation settings
        const { data: automationSettings } = await supabase
          .from('automation_settings')
          .select('bidding_zone')
          .eq('user_id', 'default')
          .single();
        
        const area = automationSettings?.bidding_zone || (process.env.PRICE_AREA || 'SE3').trim();

    // Get current heat pump status - fetch real-time from Tuya API
    let heatPumpStatus;
    try {
      // First try to get real-time status from Tuya
      const { data: tuyaResult, error: tuyaError } = await supabase.functions.invoke('tuya-proxy', {
        body: {
          action: 'getStatus',
          deviceId: process.env.TUYA_DEVICE_ID
        }
      });
      
      if (tuyaResult?.success && tuyaResult.status) {
        // Use real-time data from Tuya
        heatPumpStatus = tuyaResult.status;
        console.log('Using real-time Tuya status:', heatPumpStatus);
      } else {
        // Fallback to cached database data
        const { data: cachedStatus } = await supabase
          .from('heat_pump_status')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(1)
          .single();
        heatPumpStatus = cachedStatus;
        console.log('Using cached status:', heatPumpStatus);
      }
    } catch (error) {
      console.error('Error fetching pump status:', error);
      // Fallback to cached data
      const { data: cachedStatus } = await supabase
        .from('heat_pump_status')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      heatPumpStatus = cachedStatus;
    }

    // Get current price data - find the most recent price
    const { data: currentPrice } = await supabase
      .from('price_data')
      .select('*')
      .eq('bidding_zone', area)
      .lte('start_time', now.toISOString())
      .order('start_time', { ascending: false })
      .limit(1)
      .single();

    // Get automation settings
    const { data: settings } = await supabase
      .from('automation_settings')
      .select('*')
      .eq('user_id', 'default')
      .single();

    // Get price forecast for next steps
    const forecastEnd = new Date(now.getTime() + (24 * 3600000)); // Next 24 hours
    const { data: forecastPrices } = await supabase
      .from('price_data')
      .select('*')
      .eq('bidding_zone', area)
      .gte('start_time', now.toISOString())
      .lte('start_time', forecastEnd.toISOString())
      .order('start_time', { ascending: true })
      .limit(24);

    // Get last automation action
    const { data: lastAction } = await supabase
      .from('automation_log')
      .select('*')
      .eq('user_id', 'default')
      .order('timestamp', { ascending: false })
      .limit(1)
      .single();

    // Classify current price
    const priceState = classifyPrice(
      currentPrice?.price_value || 0,
      forecastPrices || []
    );

    // Generate next steps (simplified)
    const nextSteps = generateNextSteps(forecastPrices || [], settings?.target_pool_temp || 28);

    const response = {
      now: now.toISOString(),
      area,
      priceState,
      currentPrice: currentPrice?.price_value || 0,
      targetC: settings?.target_pool_temp || 28,
      power: heatPumpStatus?.power_status === 'on',
      waterTemp: heatPumpStatus?.water_temp || null,
      mode: heatPumpStatus?.mode || 'warm',
      paused: !settings?.automation_enabled,
      nextSteps,
      lastAction: lastAction ? {
        ts: lastAction.timestamp,
        targetC: lastAction.new_pump_temp,
        state: lastAction.price_classification.toUpperCase()
      } : null
    };

    return res.status(200).json(response);
  } catch (error) {
    console.error('Status API error:', error);
    return res.status(500).json({ 
      error: error.message,
      now: new Date().toISOString()
    });
  }
}

function classifyPrice(currentPrice, prices) {
  if (prices.length === 0) return 'NORMAL';
  
  const priceValues = prices.map(p => parseFloat(p.price_value));
  const sorted = priceValues.sort((a, b) => a - b);
  
  const lowThreshold = sorted[Math.floor(sorted.length * 0.3)];
  const highThreshold = sorted[Math.floor(sorted.length * 0.7)];
  
  if (currentPrice <= lowThreshold) return 'LOW';
  if (currentPrice >= highThreshold) return 'HIGH';
  return 'NORMAL';
}

function generateNextSteps(prices, targetTemp) {
  if (prices.length === 0) return [];
  
  return prices.slice(0, 6).map(price => {
    const priceState = classifyPrice(price.price_value, prices);
    let targetC = targetTemp;
    
    // Adjust target based on price state
    if (priceState === 'LOW') {
      targetC = targetTemp + 2;
    } else if (priceState === 'HIGH') {
      targetC = targetTemp - 1;
    }
    
    return {
      start: price.start_time,
      end: price.end_time,
      state: priceState,
      targetC: Math.max(18, Math.min(35, targetC))
    };
  });
}
