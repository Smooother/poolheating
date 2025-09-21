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
    const result = await executeScheduledActions();
    return res.status(200).json(result);
  } catch (error) {
    console.error('Error executing scheduled actions:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

async function executeScheduledActions() {
  const now = new Date();
  const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000); // 5-minute window
  
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
      message: 'No scheduled actions to execute',
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
    message: `Executed ${results.filter(r => r.success).length} of ${results.length} scheduled actions`,
    executed: results.filter(r => r.success).length,
    results: results
  };
}
