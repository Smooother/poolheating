import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing required environment variables: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY');
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('🚀 Running database fix script...');
    
    const results = [];
    
    // 1. Check if system_info table exists
    console.log('Checking system_info table...');
    try {
      const { data: systemInfoData, error: systemInfoError } = await supabase
        .from('system_info')
        .select('*')
        .limit(1);
      
      if (systemInfoError && systemInfoError.code === 'PGRST205') {
        console.log('❌ system_info table does not exist');
        results.push({ 
          step: 'system_info_table', 
          success: false, 
          error: 'Table does not exist - needs manual creation in Supabase dashboard' 
        });
      } else if (systemInfoError) {
        console.error('Error checking system_info table:', systemInfoError);
        results.push({ step: 'system_info_table', success: false, error: systemInfoError.message });
      } else {
        console.log('✅ system_info table exists');
        results.push({ step: 'system_info_table', success: true });
      }
    } catch (err) {
      console.error('Exception checking system_info table:', err);
      results.push({ step: 'system_info_table', success: false, error: err.message });
    }
    
    // 2. Check if energy_price column exists in price_data table
    console.log('Checking price_data table columns...');
    try {
      const { data: priceData, error: priceDataError } = await supabase
        .from('price_data')
        .select('energy_price')
        .limit(1);
      
      if (priceDataError && priceDataError.code === '42703') {
        console.log('❌ energy_price column does not exist in price_data table');
        results.push({ 
          step: 'price_data_columns', 
          success: false, 
          error: 'energy_price column missing - needs manual addition in Supabase dashboard' 
        });
      } else if (priceDataError) {
        console.error('Error checking price_data table:', priceDataError);
        results.push({ step: 'price_data_columns', success: false, error: priceDataError.message });
      } else {
        console.log('✅ price_data table has energy_price column');
        results.push({ step: 'price_data_columns', success: true });
      }
    } catch (err) {
      console.error('Exception checking price_data table:', err);
      results.push({ step: 'price_data_columns', success: false, error: err.message });
    }
    
    // 3. Try to insert initial system info data if table exists
    console.log('Attempting to insert initial system info data...');
    try {
      const { error: insertError } = await supabase
        .from('system_info')
        .upsert([
          { data_point: 'heat_pump_power', value: 'unknown', unit: 'status', status: 'unknown' },
          { data_point: 'heat_pump_water_temp', value: '0', unit: '°C', status: 'unknown' },
          { data_point: 'heat_pump_target_temp', value: '0', unit: '°C', status: 'unknown' },
          { data_point: 'heat_pump_online', value: 'false', unit: 'status', status: 'unknown' },
          { data_point: 'automation_enabled', value: 'false', unit: 'status', status: 'unknown' },
          { data_point: 'heat_pump_fan_speed', value: '0', unit: '%', status: 'unknown' }
        ], { onConflict: 'data_point' });
      
      if (insertError) {
        console.error('Insert error:', insertError);
        results.push({ step: 'initial_data', success: false, error: insertError.message });
      } else {
        console.log('✅ Inserted initial system info data');
        results.push({ step: 'initial_data', success: true });
      }
    } catch (err) {
      console.error('Exception inserting initial data:', err);
      results.push({ step: 'initial_data', success: false, error: err.message });
    }
    
    const successCount = results.filter(r => r.success).length;
    const totalCount = results.length;
    
    console.log(`\n📊 Database fix summary: ${successCount}/${totalCount} steps successful`);
    
    return res.status(200).json({
      success: successCount === totalCount,
      message: `Database fix completed: ${successCount}/${totalCount} steps successful`,
      results
    });
    
  } catch (error) {
    console.error('❌ Database fix failed:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      message: 'Database fix failed'
    });
  }
}
