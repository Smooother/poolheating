import { createClient } from '@supabase/supabase-js';
import { withApiKeyAuth, logApiAccess } from './auth';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { action, value } = req.body;

    if (!action) {
      return res.status(400).json({ 
        success: false, 
        error: 'Action is required' 
      });
    }

    let result;

    switch (action) {
      case 'setPower':
        result = await setPower(value);
        break;
      case 'setTemp':
        result = await setTemperature(value);
        break;
      case 'pause':
        result = await pauseAutomation();
        break;
      case 'resume':
        result = await resumeAutomation();
        break;
      default:
        return res.status(400).json({ 
          success: false, 
          error: 'Invalid action' 
        });
    }

    logApiAccess(req, '/api/override', true);
    return res.status(200).json(result);
  } catch (error) {
    console.error('Override API error:', error);
    logApiAccess(req, '/api/override', false);
    return res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
}

// Export with API key authentication
export default withApiKeyAuth(handler);

async function setPower(value) {
  if (typeof value !== 'boolean') {
    throw new Error('Power value must be boolean');
  }

  // Get Tuya config
  const { data: config } = await supabase
    .from('tuya_config')
    .select('*')
    .eq('id', 'default')
    .single();

  if (!config?.device_id) {
    throw new Error('Tuya device not configured');
  }

  // Send command via tuya-proxy
  const { data: result, error } = await supabase.functions.invoke('tuya-proxy', {
    body: {
      action: 'sendCommand',
      deviceId: config.device_id,
      uid: config.uid,
      commands: [{ code: 'Power', value }]
    }
  });

  if (error || !result?.success) {
    throw new Error(`Failed to set power: ${error?.message || result?.msg}`);
  }

  // Log the action
  await supabase.from('automation_log').insert({
    user_id: 'default',
    current_price: 0, // Will be filled by automation
    avg_price_forecast: 0,
    current_pool_temp: null,
    target_pool_temp: 28,
    current_pump_temp: null,
    new_pump_temp: null,
    price_classification: 'manual',
    action_reason: `Manual power ${value ? 'on' : 'off'}`
  });

  return {
    success: true,
    message: `Power set to ${value ? 'on' : 'off'}`
  };
}

async function setTemperature(value) {
  if (typeof value !== 'number' || value < 18 || value > 35) {
    throw new Error('Temperature must be between 18 and 35 degrees');
  }

  // Get Tuya config
  const { data: config } = await supabase
    .from('tuya_config')
    .select('*')
    .eq('id', 'default')
    .single();

  if (!config?.device_id) {
    throw new Error('Tuya device not configured');
  }

  // Send command via tuya-proxy
  const { data: result, error } = await supabase.functions.invoke('tuya-proxy', {
    body: {
      action: 'sendCommand',
      deviceId: config.device_id,
      uid: config.uid,
      commands: [{ code: 'SetTemp', value: Math.round(value) }]
    }
  });

  if (error || !result?.success) {
    throw new Error(`Failed to set temperature: ${error?.message || result?.msg}`);
  }

  // Log the action
  await supabase.from('automation_log').insert({
    user_id: 'default',
    current_price: 0,
    avg_price_forecast: 0,
    current_pool_temp: null,
    target_pool_temp: 28,
    current_pump_temp: null,
    new_pump_temp: value,
    price_classification: 'manual',
    action_reason: `Manual temperature set to ${value}°C`
  });

  return {
    success: true,
    message: `Temperature set to ${value}°C`
  };
}

async function pauseAutomation() {
  const { error } = await supabase
    .from('automation_settings')
    .update({ automation_enabled: false })
    .eq('user_id', 'default');

  if (error) {
    throw new Error(`Failed to pause automation: ${error.message}`);
  }

  return {
    success: true,
    message: 'Automation paused'
  };
}

async function resumeAutomation() {
  const { error } = await supabase
    .from('automation_settings')
    .update({ automation_enabled: true })
    .eq('user_id', 'default');

  if (error) {
    throw new Error(`Failed to resume automation: ${error.message}`);
  }

  return {
    success: true,
    message: 'Automation resumed'
  };
}
