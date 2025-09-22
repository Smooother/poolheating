import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
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
    // Get latest price data timestamp for each zone
    const zones = ['SE1', 'SE2', 'SE3', 'SE4'];
    const priceStatus = {};
    
    for (const zone of zones) {
      const { data, error } = await supabase
        .from('price_data')
        .select('updated_at, start_time')
        .eq('bidding_zone', zone)
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();
      
      if (data) {
        priceStatus[zone] = {
          lastUpdated: data.updated_at,
          latestPriceTime: data.start_time,
          age: Math.round((new Date() - new Date(data.updated_at)) / (1000 * 60 * 60)) // hours
        };
      } else {
        priceStatus[zone] = {
          error: error?.message || 'No data found'
        };
      }
    }

    // Get latest automation log entry
    const { data: latestLog } = await supabase
      .from('automation_log')
      .select('created_at, action_reason, success')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    // Get latest heat pump status
    const { data: latestStatus } = await supabase
      .from('heat_pump_status')
      .select('updated_at, is_online')
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();

    return res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      priceData: priceStatus,
      latestAutomation: latestLog ? {
        timestamp: latestLog.created_at,
        action: latestLog.action_reason,
        success: latestLog.success
      } : null,
      heatPumpStatus: latestStatus ? {
        lastUpdate: latestStatus.updated_at,
        isOnline: latestStatus.is_online
      } : null,
      cronSchedule: {
        dailySetup: ['8:00 CET', '12:00 CET'],
        description: 'Price collection and automation setup'
      }
    });

  } catch (error) {
    console.error('Cron status error:', error);
    return res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
}
