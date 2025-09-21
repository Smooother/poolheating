import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const result = await performDailySetup();
    return res.status(200).json(result);
  } catch (error) {
    console.error('Error in daily setup:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

async function performDailySetup() {
  console.log('Starting daily setup at 1pm CET...');
  
  // Step 1: Collect new price data
  console.log('Step 1: Collecting price data...');
  const priceResult = await collectPriceData();
  
  // Step 2: Create 24-hour automation schedule
  console.log('Step 2: Creating automation schedule...');
  const scheduleResult = await createDailySchedule();
  
  // Step 3: Execute any immediate actions
  console.log('Step 3: Executing immediate actions...');
  const executionResult = await executeScheduledActions();
  
  return {
    success: true,
    message: 'Daily setup completed successfully',
    timestamp: new Date().toISOString(),
    results: {
      priceCollection: priceResult,
      scheduleCreation: scheduleResult,
      immediateExecution: executionResult
    }
  };
}

async function collectPriceData() {
  const zones = ['SE1', 'SE2', 'SE3', 'SE4'];
  let totalSaved = 0;
  
  for (const zone of zones) {
    try {
      const prices = await fetchElprisetData(zone, new Date());
      if (prices.length > 0) {
        await savePriceData(prices, zone);
        totalSaved += prices.length;
      }
    } catch (error) {
      console.error(`Error collecting prices for ${zone}:`, error);
    }
  }
  
  return {
    success: true,
    message: `Collected and saved ${totalSaved} price points`,
    totalSaved
  };
}

async function fetchElprisetData(zone, date) {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const dateStr = `${month}-${day}`;
  
  const url = `https://www.elprisetjustnu.se/api/v1/prices/${year}/${dateStr}_${zone}.json`;
  
  try {
    const response = await fetch(url);
    if (!response.ok) {
      return [];
    }
    
    const data = await response.json();
    
    if (!Array.isArray(data)) {
      return [];
    }
    
    return data.map(item => ({
      start: new Date(item.time_start),
      end: new Date(item.time_end),
      value: item.SEK_per_kWh,
      currency: 'SEK',
      resolution: 'PT60M'
    }));
  } catch (error) {
    console.error(`Error fetching data for ${zone} on ${dateStr}:`, error);
    return [];
  }
}

async function savePriceData(prices, zone) {
  if (prices.length === 0) return;

  const data = prices.map(point => ({
    bidding_zone: zone,
    start_time: point.start.toISOString(),
    end_time: point.end.toISOString(),
    price_value: point.value,
    currency: point.currency,
    provider: 'elpriset',
    resolution: point.resolution
  }));

  const { data: result, error } = await supabase
    .from('price_data')
    .upsert(data, { 
      onConflict: 'bidding_zone,start_time,provider',
      ignoreDuplicates: false 
    });

  if (error) {
    console.error(`Failed to save price data for ${zone}:`, error);
    throw error;
  }
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
    scheduleCount: scheduleEntries.length,
    averagePrice: averagePrice,
    baselineTemp: baselineTemp
  };
}

async function executeScheduledActions() {
  const now = new Date();
  const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
  
  // Get scheduled actions that should be executed now
  const { data: scheduledActions, error: fetchError } = await supabase
    .from('automation_schedule')
    .select('*')
    .eq('user_id', 'default')
    .eq('executed', false)
    .gte('scheduled_time', fiveMinutesAgo.toISOString())
    .lte('scheduled_time', now.toISOString())
    .order('scheduled_time', { ascending: true });

  if (fetchError) {
    throw new Error(`Failed to fetch scheduled actions: ${fetchError.message}`);
  }

  if (!scheduledActions || scheduledActions.length === 0) {
    return {
      success: true,
      message: 'No immediate actions to execute',
      executed: 0
    };
  }

  const results = [];
  
  for (const action of scheduledActions) {
    try {
      let success = false;
      let message = '';

      if (action.should_shutdown) {
        // Turn off pump
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
        success = true;
        message = 'Pump turned OFF due to high price';
      } else {
        // Set temperature (ensure pump is on first)
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

        // Set temperature
        const { data: tempResult, error: tempError } = await supabase.functions.invoke('tuya-proxy', {
          body: {
            action: 'sendCommand',
            deviceId: process.env.TUYA_DEVICE_ID,
            commands: [{ code: 'SetTemp', value: action.target_temperature }]
          }
        });
        
        if (tempError || !tempResult?.success) {
          throw new Error(`Failed to set temperature: ${tempError?.message || tempResult?.msg}`);
        }
        success = true;
        message = `Temperature set to ${action.target_temperature}°C`;
      }

      // Mark as executed
      await supabase
        .from('automation_schedule')
        .update({
          executed: true,
          executed_at: now.toISOString()
        })
        .eq('id', action.id);

      results.push({
        id: action.id,
        scheduled_time: action.scheduled_time,
        action: action.reason,
        success: true,
        message: message
      });

    } catch (error) {
      console.error(`Error executing action ${action.id}:`, error);
      results.push({
        id: action.id,
        scheduled_time: action.scheduled_time,
        action: action.reason,
        success: false,
        error: error.message
      });
    }
  }

  return {
    success: true,
    message: `Executed ${results.filter(r => r.success).length} of ${results.length} immediate actions`,
    executed: results.filter(r => r.success).length,
    results: results
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
