import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const userId = 'default';

  try {
    if (req.method === 'GET') {
      // Get current settings
      const { data: settings, error } = await supabase
        .from('automation_settings')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        throw new Error(`Failed to fetch settings: ${error.message}`);
      }

      return res.status(200).json({
        success: true,
        settings: {
          target_pool_temp: settings.target_pool_temp,
          automation_enabled: settings.automation_enabled,
          high_price_threshold: settings.high_price_threshold,
          low_price_threshold: settings.low_price_threshold,
          normal_price_threshold: settings.normal_price_threshold,
          min_pump_temp: settings.min_pump_temp,
          max_pump_temp: settings.max_pump_temp
        }
      });
    }

    if (req.method === 'POST') {
      // Update settings
      const {
        target_pool_temp,
        automation_enabled,
        high_price_threshold,
        low_price_threshold,
        normal_price_threshold,
        min_pump_temp,
        max_pump_temp
      } = req.body;

      // Validate input
      if (high_price_threshold !== undefined && (high_price_threshold < 0 || high_price_threshold > 10)) {
        return res.status(400).json({
          success: false,
          error: 'High price threshold must be between 0 and 10 SEK/kWh'
        });
      }

      if (low_price_threshold !== undefined && (low_price_threshold < 0 || low_price_threshold > 1)) {
        return res.status(400).json({
          success: false,
          error: 'Low price threshold must be between 0 and 1 SEK/kWh'
        });
      }

      if (normal_price_threshold !== undefined && (normal_price_threshold < 0 || normal_price_threshold > 2)) {
        return res.status(400).json({
          success: false,
          error: 'Normal price threshold must be between 0 and 2 SEK/kWh'
        });
      }

      if (target_pool_temp !== undefined && (target_pool_temp < 15 || target_pool_temp > 40)) {
        return res.status(400).json({
          success: false,
          error: 'Target pool temperature must be between 15 and 40°C'
        });
      }

      // Update settings
      const updateData = {};
      if (target_pool_temp !== undefined) updateData.target_pool_temp = target_pool_temp;
      if (automation_enabled !== undefined) updateData.automation_enabled = automation_enabled;
      if (high_price_threshold !== undefined) updateData.high_price_threshold = high_price_threshold;
      if (low_price_threshold !== undefined) updateData.low_price_threshold = low_price_threshold;
      if (normal_price_threshold !== undefined) updateData.normal_price_threshold = normal_price_threshold;
      if (min_pump_temp !== undefined) updateData.min_pump_temp = min_pump_temp;
      if (max_pump_temp !== undefined) updateData.max_pump_temp = max_pump_temp;

      const { data, error } = await supabase
        .from('automation_settings')
        .update(updateData)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update settings: ${error.message}`);
      }

      return res.status(200).json({
        success: true,
        message: 'Settings updated successfully',
        settings: {
          target_pool_temp: data.target_pool_temp,
          automation_enabled: data.automation_enabled,
          high_price_threshold: data.high_price_threshold,
          low_price_threshold: data.low_price_threshold,
          normal_price_threshold: data.normal_price_threshold,
          min_pump_temp: data.min_pump_temp,
          max_pump_temp: data.max_pump_temp
        }
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Settings API error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
