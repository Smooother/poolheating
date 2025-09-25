/**
 * Scheduled Edge Function that polls Tuya device status every 2 minutes
 * This function is designed to be called by Supabase's scheduled functions
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  try {
    const DEVICE_ID = Deno.env.get('DEVICE_ID');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!DEVICE_ID || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Missing required environment variables');
    }

    console.log('🔄 Starting scheduled Tuya device status poll...');

    // Call the working Vercel API
    const vercelResponse = await fetch('https://poolheating.vercel.app/api/heatpump', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ action: 'getStatus' })
    });

    if (!vercelResponse.ok) {
      throw new Error(`Vercel API failed: ${vercelResponse.status} ${vercelResponse.statusText}`);
    }

    const deviceStatus = await vercelResponse.json();
    console.log('✅ Device status received:', deviceStatus);

    // Create Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Extract the actual status from the nested structure
    const status = deviceStatus.status || {};
    
    // Map the device status to telemetry format
    const telemetryData = [];
    const historyData = [];

    if (status.power_status !== undefined) {
      telemetryData.push({
        device_id: DEVICE_ID,
        code: 'switch_led',
        value: status.power_status,
        updated_at: new Date().toISOString()
      });
      historyData.push({
        device_id: DEVICE_ID,
        code: 'switch_led',
        value: status.power_status,
        ts: Date.now()
      });
    }

    if (status.water_temp !== undefined) {
      telemetryData.push({
        device_id: DEVICE_ID,
        code: 'WInTemp',
        value: status.water_temp,
        updated_at: new Date().toISOString()
      });
      historyData.push({
        device_id: DEVICE_ID,
        code: 'WInTemp',
        value: status.water_temp,
        ts: Date.now()
      });
    }

    if (status.target_temp !== undefined) {
      telemetryData.push({
        device_id: DEVICE_ID,
        code: 'temp_set',
        value: status.target_temp,
        updated_at: new Date().toISOString()
      });
      historyData.push({
        device_id: DEVICE_ID,
        code: 'temp_set',
        value: status.target_temp,
        ts: Date.now()
      });
    }

    if (status.speed_percentage !== undefined) {
      telemetryData.push({
        device_id: DEVICE_ID,
        code: 'fan_speed',
        value: status.speed_percentage,
        updated_at: new Date().toISOString()
      });
      historyData.push({
        device_id: DEVICE_ID,
        code: 'fan_speed',
        value: status.speed_percentage,
        ts: Date.now()
      });
    }

    // Upsert into telemetry_current
    if (telemetryData.length > 0) {
      const { error: currentError } = await supabase
        .from('telemetry_current')
        .upsert(telemetryData, {
          onConflict: 'device_id,code',
          ignoreDuplicates: false
        });

      if (currentError) {
        console.error('❌ Error upserting telemetry_current:', currentError);
        throw currentError;
      }
    }

    // Insert into telemetry_history
    if (historyData.length > 0) {
      const { error: historyError } = await supabase
        .from('telemetry_history')
        .insert(historyData);

      if (historyError) {
        console.error('❌ Error inserting telemetry_history:', historyError);
        throw historyError;
      }
    }

    console.log(`✅ Successfully stored ${telemetryData.length} telemetry points`);

    return new Response(JSON.stringify({
      ok: true,
      message: 'Scheduled poll completed successfully',
      count: telemetryData.length,
      device_status: deviceStatus,
      timestamp: new Date().toISOString()
    }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (error) {
    console.error('❌ Scheduled poll failed:', error);
    return new Response(JSON.stringify({
      ok: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500
    });
  }
});
