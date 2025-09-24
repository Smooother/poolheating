/**
 * Supabase Edge Function: Get Current Tuya Device Status
 * 
 * Manual trigger function to get current device status for testing
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { TuyaClient } from '../lib/tuya/client.ts';

// Environment variables
const TUYA_BASE_URL = Deno.env.get('TUYA_BASE_URL') || 'https://openapi.tuyaeu.com';
const TUYA_CLIENT_ID = Deno.env.get('TUYA_CLIENT_ID');
const TUYA_CLIENT_SECRET = Deno.env.get('TUYA_CLIENT_SECRET');
const UID = Deno.env.get('UID');
const DEVICE_ID = Deno.env.get('DEVICE_ID');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

serve(async (req) => {
  const startTime = Date.now();
  
  try {
    // Validate environment variables
    if (!TUYA_CLIENT_ID || !TUYA_CLIENT_SECRET || !UID || !DEVICE_ID || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Missing required environment variables');
    }

    console.log(`🔍 Getting current Tuya device status for device: ${DEVICE_ID}`);

    // Initialize Tuya client
    const tuyaClient = new TuyaClient(
      TUYA_BASE_URL,
      TUYA_CLIENT_ID,
      TUYA_CLIENT_SECRET,
      UID
    );

    // Test connection first
    const connectionOk = await tuyaClient.testConnection();
    if (!connectionOk) {
      throw new Error('Failed to connect to Tuya API');
    }

    // Get device status from Tuya
    const deviceStatus = await tuyaClient.getDeviceStatus(DEVICE_ID);
    
    if (!deviceStatus || deviceStatus.length === 0) {
      return new Response(JSON.stringify({ 
        ok: true, 
        count: 0, 
        message: 'No device status received',
        device_id: DEVICE_ID,
        duration: Date.now() - startTime
      }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200
      });
    }

    // Get current telemetry from database for comparison
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: currentTelemetry, error: telemetryError } = await supabase
      .from('telemetry_current')
      .select('*')
      .eq('device_id', DEVICE_ID);

    if (telemetryError) {
      console.warn('⚠️ Could not fetch current telemetry from database:', telemetryError);
    }

    const duration = Date.now() - startTime;
    console.log(`✅ Status retrieved successfully in ${duration}ms`);

    return new Response(JSON.stringify({
      ok: true,
      count: deviceStatus.length,
      device_id: DEVICE_ID,
      duration,
      live_status: deviceStatus,
      database_status: currentTelemetry || [],
      status_summary: {
        power: deviceStatus.find(s => s.code === 'Power')?.value,
        water_temp: deviceStatus.find(s => s.code === 'WInTemp')?.value,
        target_temp: deviceStatus.find(s => s.code === 'SetTemp')?.value,
        fan_speed: deviceStatus.find(s => s.code === 'DCFanSpeed' || s.code === 'ACFanSpeed')?.value
      }
    }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    console.error('❌ Status request failed:', error);
    
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
