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
      message: 'No scheduled actions to execute',
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
    message: `Executed ${results.filter(r => r.success).length} of ${results.length} scheduled actions`,
    executed: results.filter(r => r.success).length,
    results: results
  };
}
