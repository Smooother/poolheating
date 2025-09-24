import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Load environment variables
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables:');
  console.error('- VITE_SUPABASE_URL');
  console.error('- SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyMigration(migrationFile) {
  try {
    console.log(`Applying migration: ${migrationFile}`);
    const migrationPath = path.join(process.cwd(), 'supabase', 'migrations', migrationFile);
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    const { data, error } = await supabase.rpc('exec_sql', { sql: migrationSQL });
    
    if (error) {
      console.error(`Error applying ${migrationFile}:`, error);
      return false;
    }
    
    console.log(`✅ Successfully applied: ${migrationFile}`);
    return true;
  } catch (err) {
    console.error(`Error reading/executing ${migrationFile}:`, err);
    return false;
  }
}

async function main() {
  console.log('🚀 Applying database migrations...\n');
  
  // List of migrations to apply (in order)
  const migrations = [
    '20250924000003_add_price_components.sql',
    '20250925000000_add_configurable_thresholds.sql',
    '20250925000001_create_system_info.sql'
  ];
  
  let successCount = 0;
  
  for (const migration of migrations) {
    const success = await applyMigration(migration);
    if (success) {
      successCount++;
    }
    console.log(''); // Add spacing
  }
  
  console.log(`\n📊 Migration Summary:`);
  console.log(`✅ Successful: ${successCount}`);
  console.log(`❌ Failed: ${migrations.length - successCount}`);
  
  if (successCount === migrations.length) {
    console.log('\n🎉 All migrations applied successfully!');
  } else {
    console.log('\n⚠️  Some migrations failed. Check the errors above.');
    process.exit(1);
  }
}

main().catch(console.error);
