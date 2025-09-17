import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AutomationSettings {
  target_pool_temp: number;
  automation_enabled: boolean;
  price_sensitivity: number;
  temp_tolerance: number;
  min_pump_temp: number;
  max_pump_temp: number;
  optimization_horizon_hours: number;
}

interface PriceData {
  start_time: string;
  price_value: number;
}

interface HeatPumpStatus {
  current_temp: number;
  water_temp: number;
  target_temp: number;
  power_status: string;
  is_online: boolean;
}

/**
 * Calculate rolling average price for the next N hours
 */
function calculatePriceForecast(prices: PriceData[], hoursAhead: number): number {
  const now = new Date();
  const cutoffTime = new Date(now.getTime() + hoursAhead * 60 * 60 * 1000);
  
  const relevantPrices = prices.filter(p => {
    const priceTime = new Date(p.start_time);
    return priceTime >= now && priceTime <= cutoffTime;
  });
  
  if (relevantPrices.length === 0) return 0;
  
  const sum = relevantPrices.reduce((acc, p) => acc + p.price_value, 0);
  return sum / relevantPrices.length;
}

/**
 * Classify current price relative to historical data
 */
function classifyPrice(currentPrice: number, prices: PriceData[]): 'low' | 'normal' | 'high' {
  const allPrices = prices.map(p => p.price_value).sort((a, b) => a - b);
  const lowThreshold = allPrices[Math.floor(allPrices.length * 0.3)];
  const highThreshold = allPrices[Math.floor(allPrices.length * 0.7)];
  
  if (currentPrice <= lowThreshold) return 'low';
  if (currentPrice >= highThreshold) return 'high';
  return 'normal';
}

/**
 * Calculate optimal heat pump target temperature based on prices and settings
 */
function calculateOptimalPumpTemp(
  settings: AutomationSettings,
  currentPoolTemp: number,
  currentPrice: number,
  avgForecastPrice: number,
  priceClassification: 'low' | 'normal' | 'high'
): { newTemp: number; reason: string } {
  const { target_pool_temp, price_sensitivity, temp_tolerance, min_pump_temp, max_pump_temp } = settings;
  
  // Base target is what user wants for the pool
  let optimalPumpTemp = target_pool_temp;
  let reason = `Maintaining target pool temperature of ${target_pool_temp}°C`;
  
  // Calculate temperature difference needed
  const tempDifference = target_pool_temp - currentPoolTemp;
  
  // Adjust based on price classification and sensitivity
  const priceMultiplier = price_sensitivity;
  
  if (priceClassification === 'low') {
    // During low prices, we can heat more aggressively
    const bonus = Math.min(temp_tolerance, 3.0 * priceMultiplier);
    optimalPumpTemp = target_pool_temp + bonus;
    reason = `Low electricity prices detected - pre-heating to ${optimalPumpTemp}°C to store thermal energy`;
  } else if (priceClassification === 'high') {
    // During high prices, be more conservative
    if (tempDifference <= 0) {
      // Pool is already at or above target, reduce pump temperature
      const reduction = Math.min(temp_tolerance, 2.0 * priceMultiplier);
      optimalPumpTemp = Math.max(target_pool_temp - reduction, currentPoolTemp - 1);
      reason = `High electricity prices - reducing heating to ${optimalPumpTemp}°C as pool is near target`;
    } else if (tempDifference > 0 && tempDifference <= temp_tolerance) {
      // Pool is slightly below target, heat moderately
      optimalPumpTemp = target_pool_temp - (temp_tolerance * 0.5);
      reason = `High prices but pool needs heating - conservative target of ${optimalPumpTemp}°C`;
    }
    // If pool is very cold (tempDifference > temp_tolerance), still heat normally
  } else {
    // Normal prices - standard heating strategy
    if (tempDifference > temp_tolerance) {
      // Pool is quite cold, heat more aggressively
      optimalPumpTemp = target_pool_temp + 1;
      reason = `Pool significantly below target - heating aggressively to ${optimalPumpTemp}°C`;
    } else if (tempDifference < -temp_tolerance) {
      // Pool is too hot, reduce heating
      optimalPumpTemp = Math.max(currentPoolTemp - 1, target_pool_temp - temp_tolerance);
      reason = `Pool above target temperature - reducing to ${optimalPumpTemp}°C`;
    }
  }
  
  // Enforce absolute limits
  optimalPumpTemp = Math.max(min_pump_temp, Math.min(max_pump_temp, optimalPumpTemp));
  
  return { newTemp: Math.round(optimalPumpTemp * 10) / 10, reason };
}

async function runAutomation(supabase: any): Promise<any> {
  console.log('Starting price automation cycle...');
  
  try {
    // Get automation settings
    const { data: settings, error: settingsError } = await supabase
      .from('automation_settings')
      .select('*')
      .eq('user_id', 'default')
      .single();
    
    if (settingsError || !settings) {
      console.error('Failed to get automation settings:', settingsError);
      return { success: false, error: 'No automation settings found' };
    }
    
    if (!settings.automation_enabled) {
      console.log('Automation is disabled');
      return { success: true, message: 'Automation disabled' };
    }
    
    // Get current heat pump status
    const { data: heatPumpStatus, error: statusError } = await supabase
      .from('heat_pump_status')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(1);
    
    if (statusError || !heatPumpStatus?.[0]) {
      console.error('Failed to get heat pump status:', statusError);
      return { success: false, error: 'No heat pump status available' };
    }
    
    const currentStatus: HeatPumpStatus = heatPumpStatus[0];
    
    if (!currentStatus.is_online) {
      console.log('Heat pump is offline, skipping automation');
      return { success: true, message: 'Heat pump offline' };
    }
    
    // Get current and forecasted prices
    const now = new Date();
    const hoursAhead = settings.optimization_horizon_hours;
    const endTime = new Date(now.getTime() + hoursAhead * 60 * 60 * 1000);
    
    const { data: priceData, error: priceError } = await supabase
      .from('price_data')
      .select('start_time, price_value')
      .gte('start_time', now.toISOString())
      .lte('start_time', endTime.toISOString())
      .order('start_time', { ascending: true });
    
    if (priceError || !priceData?.length) {
      console.error('Failed to get price data:', priceError);
      return { success: false, error: 'No price data available' };
    }
    
    // Get current price (first entry should be current hour)
    const currentPrice = priceData[0]?.price_value || 0;
    
    // Calculate price forecast
    const avgForecastPrice = calculatePriceForecast(priceData, hoursAhead);
    
    // Get historical data for price classification
    const historicalStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); // 7 days ago
    const { data: historicalPrices } = await supabase
      .from('price_data')
      .select('price_value')
      .gte('start_time', historicalStart.toISOString())
      .lte('start_time', now.toISOString());
    
    const priceClassification = classifyPrice(currentPrice, historicalPrices || []);
    
    // Calculate optimal temperature
    const { newTemp, reason } = calculateOptimalPumpTemp(
      settings,
      currentStatus.water_temp, // Use water temp as pool temp proxy
      currentPrice,
      avgForecastPrice,
      priceClassification
    );
    
    console.log(`Automation decision: ${reason}`);
    console.log(`Current pump temp: ${currentStatus.target_temp}°C, Optimal: ${newTemp}°C`);
    
    // Only send command if there's a meaningful change (more than 0.5°C difference)
    const tempDifference = Math.abs(newTemp - currentStatus.target_temp);
    
    if (tempDifference >= 0.5) {
      console.log(`Sending temperature command: ${newTemp}°C`);
      
      // Send command to heat pump via tuya-proxy
      const { data: config } = await supabase
        .from('tuya_config')
        .select('device_id, uid')
        .eq('id', 'default')
        .single();
      
      if (config?.device_id && config?.uid) {
        const { data: commandResult, error: commandError } = await supabase.functions.invoke('tuya-proxy', {
          body: { 
            action: 'sendCommand',
            deviceId: config.device_id,
            uid: config.uid,
            commands: [{ code: 'SetTemp', value: newTemp }]
          }
        });
        
        if (commandError || !commandResult?.success) {
          console.error('Failed to send temperature command:', commandError || commandResult);
        } else {
          console.log('Temperature command sent successfully');
        }
      }
    } else {
      console.log('Temperature change too small, skipping command');
    }
    
    // Log the automation decision
    await supabase
      .from('automation_log')
      .insert([{
        user_id: 'default',
        current_pool_temp: currentStatus.water_temp,
        target_pool_temp: settings.target_pool_temp,
        current_pump_temp: currentStatus.target_temp,
        new_pump_temp: newTemp,
        current_price: currentPrice,
        avg_price_forecast: avgForecastPrice,
        price_classification: priceClassification,
        action_reason: reason
      }]);
    
    return {
      success: true,
      data: {
        current_pool_temp: currentStatus.water_temp,
        current_pump_temp: currentStatus.target_temp,
        optimal_pump_temp: newTemp,
        current_price: currentPrice,
        avg_forecast_price: avgForecastPrice,
        price_classification: priceClassification,
        action_reason: reason,
        command_sent: tempDifference >= 0.5
      }
    };
    
  } catch (error) {
    console.error('Automation error:', error);
    return { success: false, error: error.message };
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    const result = await runAutomation(supabase);
    
    return new Response(
      JSON.stringify(result),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Price automation error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Internal server error',
        details: error.message 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});