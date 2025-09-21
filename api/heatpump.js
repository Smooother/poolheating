import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const TUYA_BASE_URL = 'https://openapi.tuyaeu.com';

export default async function handler(req, res) {
  // Enable CORS for mobile app
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (req.method === 'GET') {
      // Get current heat pump status
      const { data: status } = await supabase
        .from('heat_pump_status')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      return res.status(200).json({
        status: status || null,
        lastUpdated: status?.created_at || null
      });
    }

    if (req.method === 'POST') {
      const { action, commands } = req.body;

      switch (action) {
        case 'getStatus':
          const status = await getDeviceStatus();
          return res.status(200).json(status);

        case 'sendCommand':
          const result = await sendDeviceCommand(commands);
          return res.status(200).json(result);

        case 'setTemperature':
          const { temperature } = req.body;
          const tempResult = await setTemperature(temperature);
          return res.status(200).json(tempResult);

        default:
          return res.status(400).json({ error: 'Invalid action' });
      }
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Heat pump API error:', error);
    res.status(500).json({ error: error.message });
  }
}

async function getTuyaConfig() {
  const { data } = await supabase
    .from('tuya_config')
    .select('*')
    .eq('id', 'default')
    .single();

  return data || {};
}

async function getValidToken() {
  // Check if we have a valid token
  const { data: tokenData } = await supabase
    .from('tuya_tokens')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  const now = Date.now();
  
  if (tokenData && tokenData.expires_at > now) {
    return tokenData.access_token;
  }

  // Get new token
  const config = await getTuyaConfig();
  const token = await fetchNewToken(config);
  return token;
}

async function fetchNewToken(config) {
  const timestamp = Date.now().toString();
  const method = 'GET';
  const url = '/v1.0/token?grant_type=1';
  
  const stringToSign = method + '\n' + '\n' + '\n' + url;
  const signStr = config.client_id + timestamp + stringToSign;
  
  const signature = crypto
    .createHmac('sha256', config.client_secret)
    .update(signStr, 'utf8')
    .digest('hex')
    .toUpperCase();

  const response = await fetch(`${TUYA_BASE_URL}${url}`, {
    method: 'GET',
    headers: {
      'client_id': config.client_id,
      'sign': signature,
      'sign_method': 'HMAC-SHA256',
      't': timestamp,
    }
  });

  const data = await response.json();
  
  if (data.success && data.result) {
    const token = data.result.access_token;
    const expiresIn = data.result.expire_time;
    
    await supabase
      .from('tuya_tokens')
      .insert({
        access_token: token,
        refresh_token: data.result.refresh_token,
        expires_in: expiresIn,
        expires_at: Date.now() + (expiresIn * 1000)
      });
    
    return token;
  }
  
  throw new Error('Failed to get access token');
}

async function makeAuthenticatedRequest(endpoint, method = 'GET', body = null) {
  const config = await getTuyaConfig();
  const token = await getValidToken();
  const timestamp = Date.now().toString();
  
  let bodyStr = '';
  if (body) {
    bodyStr = JSON.stringify(body);
  }
  
  const stringToSign = method + '\n' + 
                     crypto.createHash('sha256').update(bodyStr, 'utf8').digest('hex') + '\n' + 
                     '\n' + 
                     endpoint;
  
  const signStr = config.client_id + token + timestamp + stringToSign;
  
  const signature = crypto
    .createHmac('sha256', config.client_secret)
    .update(signStr, 'utf8')
    .digest('hex')
    .toUpperCase();

  const response = await fetch(`${TUYA_BASE_URL}${endpoint}`, {
    method,
    headers: {
      'client_id': config.client_id,
      'access_token': token,
      'sign': signature,
      'sign_method': 'HMAC-SHA256',
      't': timestamp,
      'Content-Type': 'application/json'
    },
    body: bodyStr || undefined
  });

  return await response.json();
}

async function getDeviceStatus() {
  const config = await getTuyaConfig();
  
  if (!config.device_id) {
    throw new Error('No device ID configured');
  }

  const data = await makeAuthenticatedRequest(`/v1.0/devices/${config.device_id}/status`);
  
  if (data.success && data.result) {
    // Store status in database
    const status = parseDeviceStatus(data.result);
    await supabase.from('heat_pump_status').insert({
      device_id: config.device_id,
      current_temp: status.current_temp,
      target_temp: status.target_temp,
      water_temp: status.water_temp,
      power_status: status.power_status,
      mode: status.mode,
      speed_percentage: status.speed_percentage || 0,
      is_online: true
    });
    
    return { success: true, status };
  }
  
  return { success: false, error: data.msg || 'Unknown error' };
}

async function sendDeviceCommand(commands) {
  const config = await getTuyaConfig();
  
  if (!config.device_id) {
    throw new Error('No device ID configured');
  }

  const data = await makeAuthenticatedRequest(
    `/v1.0/devices/${config.device_id}/commands`,
    'POST',
    { commands }
  );
  
  return { success: data.success, message: data.msg };
}

async function setTemperature(temperature) {
  const config = await getTuyaConfig();
  
  const commands = [{
    code: config.dp_settemp_code || 'SetTemp',
    value: Math.round(temperature)
  }];
  
  return await sendDeviceCommand(commands);
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
      case 'CurrentTemp':
        status.current_temp = item.value;
        break;
      case 'WaterTemp':
        status.water_temp = item.value;
        break;
      case 'Power':
        status.power_status = item.value ? 'on' : 'off';
        break;
      case 'SetMode':
        status.mode = item.value;
        break;
      case 'Speed':
        status.speed_percentage = item.value;
        break;
    }
  });
  
  return status;
}