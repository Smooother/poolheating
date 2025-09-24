import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing required environment variables');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('🚀 Running database fix script...');
    
    const results = [];
    
    // 1. Add missing columns to price_data table
    console.log('Adding columns to price_data table...');
    const priceDataSQL = `
      ALTER TABLE public.price_data 
      ADD COLUMN IF NOT EXISTS energy_price DECIMAL(10,4),
      ADD COLUMN IF NOT EXISTS tax_price DECIMAL(10,4),
      ADD COLUMN IF NOT EXISTS net_fee DECIMAL(10,4),
      ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'elpriset';
    `;
    
    const { error: priceDataError } = await supabase.rpc('exec_sql', { sql: priceDataSQL });
    if (priceDataError) {
      console.error('Price data error:', priceDataError);
      results.push({ step: 'price_data_columns', success: false, error: priceDataError.message });
    } else {
      console.log('✅ Added columns to price_data table');
      results.push({ step: 'price_data_columns', success: true });
    }
    
    // 2. Add missing columns to automation_settings table
    console.log('Adding columns to automation_settings table...');
    const automationSQL = `
      ALTER TABLE public.automation_settings 
      ADD COLUMN IF NOT EXISTS low_price_threshold DECIMAL(3,2) DEFAULT 0.70,
      ADD COLUMN IF NOT EXISTS high_price_threshold DECIMAL(3,2) DEFAULT 1.30,
      ADD COLUMN IF NOT EXISTS low_temp_offset DECIMAL(3,1) DEFAULT 2.0,
      ADD COLUMN IF NOT EXISTS high_temp_offset DECIMAL(3,1) DEFAULT 2.0,
      ADD COLUMN IF NOT EXISTS rolling_days INTEGER DEFAULT 7;
    `;
    
    const { error: automationError } = await supabase.rpc('exec_sql', { sql: automationSQL });
    if (automationError) {
      console.error('Automation settings error:', automationError);
      results.push({ step: 'automation_settings_columns', success: false, error: automationError.message });
    } else {
      console.log('✅ Added columns to automation_settings table');
      results.push({ step: 'automation_settings_columns', success: true });
    }
    
    // 3. Create system_info table
    console.log('Creating system_info table...');
    const systemInfoSQL = `
      CREATE TABLE IF NOT EXISTS public.system_info (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        data_point TEXT NOT NULL UNIQUE,
        value TEXT NOT NULL,
        unit TEXT NOT NULL,
        status TEXT NOT NULL,
        last_fetched TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      
      ALTER TABLE public.system_info ENABLE ROW LEVEL SECURITY;
      
      CREATE POLICY IF NOT EXISTS "Allow read system info" 
      ON public.system_info 
      FOR SELECT 
      USING (true);
      
      CREATE POLICY IF NOT EXISTS "Allow insert system info" 
      ON public.system_info 
      FOR INSERT 
      WITH CHECK (true);
      
      CREATE POLICY IF NOT EXISTS "Allow update system info" 
      ON public.system_info 
      FOR UPDATE 
      USING (true);
    `;
    
    const { error: systemInfoError } = await supabase.rpc('exec_sql', { sql: systemInfoSQL });
    if (systemInfoError) {
      console.error('System info error:', systemInfoError);
      results.push({ step: 'system_info_table', success: false, error: systemInfoError.message });
    } else {
      console.log('✅ Created system_info table');
      results.push({ step: 'system_info_table', success: true });
    }
    
    // 4. Insert initial data
    console.log('Inserting initial system info data...');
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
