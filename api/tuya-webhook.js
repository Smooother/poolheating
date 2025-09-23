import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const ACCESS_ID = process.env.TUYA_CLIENT_ID;
const ACCESS_SECRET = process.env.TUYA_CLIENT_SECRET;

function verifyTuyaSignature(req, rawBody) {
  // Tuya sends headers: t, sign, sign_method, nonce (and sometimes signature_headers)
  const t = req.headers["t"] || "";
  const sign = (req.headers["sign"] || "").toUpperCase();
  const nonce = req.headers["nonce"] || "";
  const method = req.method || "POST";
  const path = req.url || "/api/tuya-webhook";

  const contentHash = crypto.createHash("sha256").update(rawBody).digest("hex");
  const stringToSign = [method, contentHash, "", path].join("\n");
  const toSign = ACCESS_ID + t + nonce + stringToSign;
  const calc = crypto.createHmac("sha256", ACCESS_SECRET).update(toSign).digest("hex").toUpperCase();
  return calc === sign;
}

function parseDeviceStatus(statusArray) {
  const status = {
    current_temp: null,
    target_temp: null,
    water_temp: null,
    power_status: 'unknown',
    mode: null,
    speed_percentage: null
  };
  
  statusArray.forEach(item => {
    switch (item.code) {
      case 'SetTemp':
        status.target_temp = item.value;
        break;
      case 'WInTemp':
        // WInTemp is the actual water temperature
        status.water_temp = item.value;
        break;
      case 'Power':
        status.power_status = item.value ? 'on' : 'off';
        break;
      case 'SetMode':
        status.mode = item.value;
        break;
      case 'SpeedPercentage':
        status.speed_percentage = item.value;
        break;
      // Keep some legacy mappings for backward compatibility
      case 'CurrentTemp':
        status.current_temp = item.value;
        break;
      case 'WaterTemp':
        status.water_temp = item.value;
        break;
      case 'Speed':
        status.speed_percentage = item.value;
        break;
    }
  });
  
  return status;
}

export default async function handler(req, res) {
  // Enable CORS - Tuya webhook endpoint
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, t, sign, sign_method, nonce');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get raw body for signature verification
    const rawBody = JSON.stringify(req.body);
    
    // Verify Tuya signature
    if (!verifyTuyaSignature(req, rawBody)) {
      console.error('Invalid Tuya signature');
      return res.status(401).json({ ok: false, err: "bad sign" });
    }

    const msg = req.body;

    // Extract device data from webhook payload
    const codeList = msg?.data?.status || msg?.status || msg?.data?.data || [];
    const devId = msg?.data?.devId || msg?.device_id || msg?.devId;

    if (!devId || !codeList.length) {
      console.log('No device data in webhook payload');
      return res.status(200).json({ ok: true, message: 'No device data' });
    }

    // Parse the device status
    const deviceStatus = parseDeviceStatus(codeList);
    
    console.log('WEBHOOK received:', {
      devId,
      status: deviceStatus,
      timestamp: new Date().toISOString()
    });

    // Store in Supabase heat_pump_status table
    const { error } = await supabase
      .from('heat_pump_status')
      .insert({
        device_id: devId,
        current_temp: deviceStatus.current_temp,
        target_temp: deviceStatus.target_temp,
        water_temp: deviceStatus.water_temp,
        power_status: deviceStatus.power_status,
        mode: deviceStatus.mode,
        speed_percentage: deviceStatus.speed_percentage || 0,
        is_online: true,
        source: 'webhook'
      });

    if (error) {
      console.error('Failed to store webhook data:', error);
      return res.status(500).json({ ok: false, err: 'Database error' });
    }

    // Also store in telemetry_history for historical tracking
    const { error: historyError } = await supabase
      .from('telemetry_history')
      .insert({
        device_id: devId,
        data: deviceStatus,
        timestamp: new Date().toISOString(),
        source: 'webhook'
      });

    if (historyError) {
      console.error('Failed to store telemetry history:', historyError);
      // Don't fail the webhook for history errors
    }

    return res.status(200).json({ 
      ok: true, 
      message: 'Webhook processed successfully',
      deviceId: devId,
      status: deviceStatus
    });

  } catch (error) {
    console.error('Webhook processing error:', error);
    return res.status(500).json({ 
      ok: false, 
      err: error?.message || String(error) 
    });
  }
}
