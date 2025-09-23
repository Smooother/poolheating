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
      // Execute scheduled adjustments
      const result = await executeScheduledAdjustments();
      return res.status(200).json(result);
    }

    if (req.method === 'GET') {
      // Get current hour's scheduled adjustment
      const now = new Date();
      const currentHour = now.getHours();
      const today = now.toISOString().split('T')[0];

      const { data: currentSchedule } = await supabase
        .from('automation_schedule')
        .select('*')
        .eq('date', today)
        .eq('hour', currentHour)
        .single();

      return res.status(200).json({
        success: true,
        current_hour: currentHour,
        schedule: currentSchedule,
        message: 'Current hour schedule retrieved'
      });
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Schedule executor error:', error);
    res.status(500).json({ error: error.message });
  }
}

async function executeScheduledAdjustments() {
  console.log('⏰ Executing scheduled adjustments...');

  // 1. Get automation settings
  const { data: settings } = await supabase
    .from('automation_settings')
    .select('*')
    .eq('user_id', 'default')
    .single();

  if (!settings?.automation_enabled) {
    return { success: false, message: 'Automation is disabled' };
  }

  // 2. Get current hour's schedule
  const now = new Date();
  const currentHour = now.getHours();
  const today = now.toISOString().split('T')[0];

  const { data: currentSchedule } = await supabase
    .from('automation_schedule')
    .select('*')
    .eq('date', today)
    .eq('hour', currentHour)
    .eq('executed', false)
    .single();

  if (!currentSchedule) {
    return { 
      success: true, 
      message: `No scheduled adjustment for hour ${currentHour}`,
      current_hour: currentHour
    };
  }

  // 3. Get current heat pump status
  const { data: heatPumpStatus } = await supabase
    .from('heat_pump_status')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  const currentTemp = heatPumpStatus?.target_temp || settings.target_pool_temp || 28;
  const newTemp = currentSchedule.target_temperature;

  // 4. Check if adjustment is needed
  if (newTemp === null) {
    // Turn off pump
    const result = await executePumpCommand('power', false);
    await markScheduleExecuted(currentSchedule.id, result);
    
    return {
      success: true,
      action: 'pump_off',
      reason: currentSchedule.reason,
      result: result
    };
  } else {
    // Set temperature
    const tempDifference = Math.abs(newTemp - currentTemp);
    
    if (tempDifference < 0.5) {
      // No significant change needed
      await markScheduleExecuted(currentSchedule.id, 'no_change_needed');
      
      return {
        success: true,
        action: 'no_change',
        current_temp: currentTemp,
        target_temp: newTemp,
        reason: 'Temperature difference too small'
      };
    }

    const result = await executePumpCommand('temperature', newTemp);
    await markScheduleExecuted(currentSchedule.id, result);
    
    return {
      success: true,
      action: 'temperature_set',
      current_temp: currentTemp,
      new_temp: newTemp,
      reason: currentSchedule.reason,
      result: result
    };
  }
}

async function executePumpCommand(action, value) {
  try {
    let body;
    
    if (action === 'power') {
      body = {
        action: 'sendCommand',
        commands: [{ code: 'Power', value: value }]
      };
    } else if (action === 'temperature') {
      body = {
        action: 'setTemperature',
        temperature: value
      };
    }

    const response = await fetch(`${process.env.BASE_URL || 'https://poolheating.vercel.app'}/api/heatpump`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    const result = await response.json();
    
    if (result.success) {
      return `Success: ${action} set to ${value}`;
    } else {
      return `Failed: ${result.error || 'Unknown error'}`;
    }
  } catch (error) {
    return `Error: ${error.message}`;
  }
}

async function markScheduleExecuted(scheduleId, result) {
  await supabase
    .from('automation_schedule')
    .update({ 
      executed: true, 
      executed_at: new Date().toISOString(),
      execution_result: result
    })
    .eq('id', scheduleId);
}
