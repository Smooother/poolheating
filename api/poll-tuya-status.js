/**
 * Vercel API endpoint for Tuya status polling and telemetry storage
 * This runs every 2 minutes via Vercel cron jobs
 * Uses the existing working heatpump API and stores data in Supabase
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    console.log('🔄 Starting Tuya status poll...');

    // Get device status using the existing working API
    const heatpumpResponse = await fetch(
      'https://poolheating.vercel.app/api/heatpump',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action: 'getStatus' })
      }
    );

    if (!heatpumpResponse.ok) {
      throw new Error(`Heat pump API failed: ${heatpumpResponse.status}`);
    }

    const heatpumpData = await heatpumpResponse.json();
    console.log('✅ Device status retrieved:', heatpumpData);

    if (!heatpumpData.success || !heatpumpData.status) {
      throw new Error('No device status received');
    }

    const status = heatpumpData.status;
    const deviceId = 'bf65ca8db8b207052feu5u';
    const now = new Date().toISOString();
    const timestamp = Date.now();

    // Map the status to telemetry format
    const telemetryData = [
      {
        device_id: deviceId,
        code: 'Power',
        value: status.power_status === 'on',
        updated_at: now
      },
      {
        device_id: deviceId,
        code: 'WInTemp',
        value: status.water_temp,
        updated_at: now
      },
      {
        device_id: deviceId,
        code: 'SetTemp',
        value: status.target_temp,
        updated_at: now
      },
      {
        device_id: deviceId,
        code: 'DCFanSpeed',
        value: status.speed_percentage,
        updated_at: now
      }
    ];

    // Filter out null/undefined values
    const validTelemetryData = telemetryData.filter(item => item.value !== null && item.value !== undefined);

    // Upsert into telemetry_current
    console.log(`💾 Upserting ${validTelemetryData.length} items to telemetry_current...`);
    const { error: currentError } = await supabase
      .from('telemetry_current')
      .upsert(validTelemetryData, { 
        onConflict: 'device_id,code',
        ignoreDuplicates: false 
      });

    if (currentError) {
      console.error('❌ Error upserting telemetry_current:', currentError);
      throw new Error(`Failed to upsert telemetry_current: ${currentError.message}`);
    }

    // Insert into telemetry_history for important metrics
    const historyData = validTelemetryData.map(item => ({
      device_id: item.device_id,
      code: item.code,
      value: item.value,
      ts: timestamp
    }));

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

    console.log('✅ Tuya status poll completed successfully');

    return res.status(200).json({
      success: true,
      message: 'Tuya status poll completed successfully',
      device_id: deviceId,
      current_upserted: validTelemetryData.length,
      history_inserted: historyData.length,
      status: status,
      timestamp: now
    });

  } catch (error) {
    console.error('❌ Tuya status poll failed:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}
