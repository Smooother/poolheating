import { createClient } from '@supabase/supabase-js';
import { withApiKeyAuth, logApiAccess } from './auth';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function handler(req, res) {

  try {
    const userId = 'default'; // Single user system

    if (req.method === 'GET') {
      // Get current automation settings
      const { data: settings, error } = await supabase
        .from('automation_settings')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
        throw error;
      }

      return res.status(200).json({
        settings: settings || {
          user_id: userId,
          target_pool_temp: 28.0,
          automation_enabled: true,
          price_sensitivity: 1.0,
          temp_tolerance: 2.0,
          min_pump_temp: 18.0,
          max_pump_temp: 35.0,
          optimization_horizon_hours: 12,
          average_days: 7,
          high_price_threshold: 1.50,
          low_price_multiplier: 0.70,
          high_price_multiplier: 1.30,
          bidding_zone: 'SE3'
        }
      });
    }

    if (req.method === 'POST' || req.method === 'PUT') {
      // Update automation settings
      const updates = req.body;
      
      // Validate required fields
      if (updates.bidding_zone && !['SE1', 'SE2', 'SE3', 'SE4'].includes(updates.bidding_zone)) {
        return res.status(400).json({ 
          success: false, 
          error: 'Invalid bidding zone. Must be SE1, SE2, SE3, or SE4' 
        });
      }

      if (updates.target_pool_temp && (updates.target_pool_temp < 15 || updates.target_pool_temp > 40)) {
        return res.status(400).json({ 
          success: false, 
          error: 'Target pool temperature must be between 15 and 40°C' 
        });
      }

      if (updates.min_pump_temp && (updates.min_pump_temp < 10 || updates.min_pump_temp > 30)) {
        return res.status(400).json({ 
          success: false, 
          error: 'Minimum pump temperature must be between 10 and 30°C' 
        });
      }

      if (updates.max_pump_temp && (updates.max_pump_temp < 20 || updates.max_pump_temp > 50)) {
        return res.status(400).json({ 
          success: false, 
          error: 'Maximum pump temperature must be between 20 and 50°C' 
        });
      }

      // Add user_id and timestamp
      const settingsData = {
        ...updates,
        user_id: userId,
        updated_at: new Date().toISOString()
      };

      // Upsert the settings
      const { data, error } = await supabase
        .from('automation_settings')
        .upsert(settingsData, { 
          onConflict: 'user_id',
          ignoreDuplicates: false 
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      logApiAccess(req, '/api/settings', true);
      return res.status(200).json({
        success: true,
        message: 'Settings updated successfully',
        settings: data
      });
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Settings API error:', error);
    logApiAccess(req, '/api/settings', false);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
}

// Export with API key authentication
export default withApiKeyAuth(handler);
