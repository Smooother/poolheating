/**
 * Supabase Edge Function: Poll Tuya Device Status
 * 
 * This function runs every 2 minutes to:
 * 1. Get device status from Tuya API
 * 2. Upsert into telemetry_current table
 * 3. Insert into telemetry_history for important metrics
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { TuyaClient } from '../lib/tuya/client.ts';

interface TelemetryData {
  device_id: string;
  code: string;
  value: any;
  updated_at: string;
}

interface HistoryData {
  device_id: string;
  code: string;
  value: any;
  ts: number;
}

// Environment variables
const TUYA_BASE_URL = Deno.env.get('TUYA_BASE_URL') || 'https://openapi.tuyaeu.com';
const TUYA_CLIENT_ID = Deno.env.get('TUYA_CLIENT_ID');
const TUYA_CLIENT_SECRET = Deno.env.get('TUYA_CLIENT_SECRET');
const UID = Deno.env.get('UID');
const DEVICE_ID = Deno.env.get('DEVICE_ID');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const POLL_MINUTES = parseInt(Deno.env.get('POLL_MINUTES') || '2');

// Important status codes to track in history
const IMPORTANT_CODES = new Set(['WInTemp', 'Power', 'SetTemp', 'DCFanSpeed', 'ACFanSpeed']);

serve(async (req) => {
  const startTime = Date.now();
  
  try {
    // Validate environment variables
    if (!TUYA_CLIENT_ID || !TUYA_CLIENT_SECRET || !UID || !DEVICE_ID || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Missing required environment variables');
    }

    console.log(`🔄 Starting Tuya device status poll for device: ${DEVICE_ID}`);

    // Initialize Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Initialize Tuya client
    const tuyaClient = new TuyaClient(
      TUYA_BASE_URL,
      TUYA_CLIENT_ID,
      TUYA_CLIENT_SECRET,
      UID
    );

    // Get device status from Tuya
    const deviceStatus = await tuyaClient.getDeviceStatus(DEVICE_ID);
    
    if (!deviceStatus || deviceStatus.length === 0) {
      console.log('⚠️ No device status received');
      return new Response(JSON.stringify({ 
        ok: true, 
        count: 0, 
        message: 'No device status received',
        duration: Date.now() - startTime
      }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200
      });
    }

    console.log(`📊 Received ${deviceStatus.length} status items:`, 
      deviceStatus.map(s => `${s.code}=${s.value}`).join(', '));

    const now = new Date().toISOString();
    const timestamp = Date.now();

    // Prepare telemetry data for upsert
    const telemetryData: TelemetryData[] = deviceStatus.map(status => ({
      device_id: DEVICE_ID,
      code: status.code,
      value: status.value,
      updated_at: now
    }));

    // Prepare history data for important metrics
    const historyData: HistoryData[] = deviceStatus
      .filter(status => IMPORTANT_CODES.has(status.code))
      .map(status => ({
        device_id: DEVICE_ID,
        code: status.code,
        value: status.value,
        ts: timestamp
      }));

    // Upsert into telemetry_current
    console.log(`💾 Upserting ${telemetryData.length} items to telemetry_current...`);
    const { error: currentError } = await supabase
      .from('telemetry_current')
      .upsert(telemetryData, { 
        onConflict: 'device_id,code',
        ignoreDuplicates: false 
      });

    if (currentError) {
      console.error('❌ Error upserting telemetry_current:', currentError);
      throw new Error(`Failed to upsert telemetry_current: ${currentError.message}`);
    }

    // Insert into telemetry_history for important metrics
    if (historyData.length > 0) {
      console.log(`📈 Inserting ${historyData.length} items to telemetry_history...`);
      const { error: historyError } = await supabase
        .from('telemetry_history')
        .insert(historyData);

      if (historyError) {
        console.error('❌ Error inserting telemetry_history:', historyError);
        // Don't throw here, as current data is more important
      }
    }

    const duration = Date.now() - startTime;
    console.log(`✅ Poll completed successfully in ${duration}ms`);

    return new Response(JSON.stringify({
      ok: true,
      count: deviceStatus.length,
      current_upserted: telemetryData.length,
      history_inserted: historyData.length,
      duration,
      device_id: DEVICE_ID,
      status_codes: deviceStatus.map(s => s.code)
    }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    console.error('❌ Poll failed:', error);
    
    return new Response(JSON.stringify({
      ok: false,
      error: error.message,
      duration,
      device_id: DEVICE_ID
    }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500
    });
  }
});
