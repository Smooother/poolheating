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
  const startTime = new Date();
  console.log(`Starting daily setup at ${startTime.toISOString()}...`);
  
  const results = {
    priceCollection: null,
    scheduleCreation: null,
    immediateExecution: null
  };
  
  try {
    // Step 1: Collect new price data
    console.log('Step 1: Collecting price data...');
    results.priceCollection = await collectPriceData();
    console.log('✅ Price collection completed:', results.priceCollection);
  } catch (error) {
    console.error('❌ Price collection failed:', error);
    results.priceCollection = { success: false, error: error.message };
  }
  
  try {
    // Step 2: Create 24-hour automation schedule
    console.log('Step 2: Creating automation schedule...');
    results.scheduleCreation = await createDailySchedule();
    console.log('✅ Schedule creation completed:', results.scheduleCreation);
  } catch (error) {
    console.error('❌ Schedule creation failed:', error);
    results.scheduleCreation = { success: false, error: error.message };
  }
  
  try {
    // Step 3: Execute any immediate actions
    console.log('Step 3: Executing immediate actions...');
    results.immediateExecution = await executeScheduledActions();
    console.log('✅ Immediate execution completed:', results.immediateExecution);
  } catch (error) {
    console.error('❌ Immediate execution failed:', error);
    results.immediateExecution = { success: false, error: error.message };
  }
  
  const endTime = new Date();
  const duration = endTime - startTime;
  
  // Check if any critical steps failed
  const criticalFailures = [
    results.priceCollection?.success === false,
    results.scheduleCreation?.success === false
  ].filter(Boolean).length;
  
  return {
    success: criticalFailures === 0,
    message: criticalFailures === 0 
      ? 'Daily setup completed successfully' 
      : `Daily setup completed with ${criticalFailures} critical failures`,
    timestamp: endTime.toISOString(),
    duration: `${duration}ms`,
    results
  };
}

async function collectPriceData() {
  const zones = ['SE1', 'SE2', 'SE3', 'SE4'];
  let totalSaved = 0;
  const results = {};
  
  for (const zone of zones) {
    try {
      console.log(`Collecting price data for ${zone}...`);
      
      // Get the last data date for this zone
      const { data: lastData } = await supabase
        .from('price_data')
        .select('start_time')
        .eq('bidding_zone', zone)
        .order('start_time', { ascending: false })
        .limit(1)
        .single();
      
      let startDate;
      if (lastData) {
        // Start from the day after the last data
        startDate = new Date(lastData.start_time);
        startDate.setDate(startDate.getDate() + 1);
        console.log(`Last data for ${zone}: ${lastData.start_time}, starting from: ${startDate.toISOString()}`);
      } else {
        // No data exists, start from 7 days ago
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 7);
        console.log(`No existing data for ${zone}, starting from 7 days ago: ${startDate.toISOString()}`);
      }
      
      // Collect data from startDate to today
      const endDate = new Date();
      const currentDate = new Date(startDate);
      let zoneSaved = 0;
      let daysProcessed = 0;
      
      while (currentDate <= endDate) {
        const dateStr = currentDate.toISOString().split('T')[0];
        console.log(`Fetching data for ${zone} on ${dateStr}...`);
        
        try {
          const prices = await fetchElprisetData(zone, currentDate);
          if (prices.length > 0) {
            await savePriceData(prices, zone);
            zoneSaved += prices.length;
            console.log(`✅ Saved ${prices.length} price points for ${zone} on ${dateStr}`);
          } else {
            console.log(`⚠️ No price data available for ${zone} on ${dateStr}`);
          }
        } catch (dayError) {
          console.error(`❌ Failed to fetch data for ${zone} on ${dateStr}:`, dayError.message);
          // Continue with next day instead of failing completely
        }
        
        currentDate.setDate(currentDate.getDate() + 1);
        daysProcessed++;
        
        // Small delay to avoid overwhelming the API
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      totalSaved += zoneSaved;
      results[zone] = {
        success: true,
        saved: zoneSaved,
        daysProcessed,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      };
      console.log(`✅ Completed ${zone}: ${zoneSaved} price points saved over ${daysProcessed} days`);
      
    } catch (error) {
      console.error(`❌ Error collecting data for ${zone}:`, error);
      results[zone] = {
        success: false,
        error: error.message
      };
      // Don't throw - continue with other zones
    }
  }
  
  const successfulZones = Object.values(results).filter(r => r.success).length;
  const totalZones = zones.length;
  
  return {
    success: successfulZones > 0, // Success if at least one zone worked
    message: `Collected and saved ${totalSaved} price points from ${successfulZones}/${totalZones} zones`,
    totalSaved,
    zoneResults: results,
    successfulZones,
    totalZones
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

  // Clear existing future automation logs (our "schedule")
  await supabase
    .from('automation_log')
    .delete()
    .eq('user_id', 'default')
    .gte('timestamp', now.toISOString());

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
      timestamp: pricePoint.start_time,
      current_price: priceValue,
      avg_price_forecast: averagePrice,
      current_pool_temp: null,
      target_pool_temp: settings.target_pool_temp,
      current_pump_temp: baselineTemp,
      new_pump_temp: shouldShutdown ? null : targetTemp,
      price_classification: priceClassification,
      action_reason: reason
    });
  }

  // Insert schedule entries into automation_log
  const { data: insertedSchedule, error } = await supabase
    .from('automation_log')
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
  
  // Get scheduled actions that should be executed now (future automation_log entries)
  const { data: scheduledActions, error: fetchError } = await supabase
    .from('automation_log')
    .select('*')
    .eq('user_id', 'default')
    .gte('timestamp', fiveMinutesAgo.toISOString())
    .lte('timestamp', now.toISOString())
    .order('timestamp', { ascending: true });

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

      if (action.new_pump_temp === null) {
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
            commands: [{ code: 'SetTemp', value: action.new_pump_temp }]
          }
        });
        
        if (tempError || !tempResult?.success) {
          throw new Error(`Failed to set temperature: ${tempError?.message || tempResult?.msg}`);
        }
        success = true;
        message = `Temperature set to ${action.new_pump_temp}°C`;
      }

      // Mark as executed by updating the action_reason
      await supabase
        .from('automation_log')
        .update({
          action_reason: `${action.action_reason} | EXECUTED: ${message}`
        })
        .eq('id', action.id);

      results.push({
        id: action.id,
        scheduled_time: action.timestamp,
        action: action.action_reason,
        success: true,
        message: message
      });

    } catch (error) {
      console.error(`Error executing action ${action.id}:`, error);
      results.push({
        id: action.id,
        scheduled_time: action.timestamp,
        action: action.action_reason,
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
