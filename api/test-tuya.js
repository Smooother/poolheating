/**
 * Test Tuya API credentials directly
 */

import crypto from 'crypto';

const TUYA_BASE_URL = 'https://openapi.tuyaeu.com';

// Your Tuya credentials
const TUYA_CONFIG = {
  client_id: 'dn98qycejwjndescfprj',
  client_secret: '21c50cb2a91a4491b18025373e742272',
  device_id: 'bf65ca8db8b207052feu5u',
  uid: '19DZ10YT'
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    console.log('🧪 Testing Tuya API credentials...');

    // Test 1: Get access token
    console.log('1️⃣ Testing access token...');
    const token = await fetchNewToken();
    console.log('✅ Access token received:', token.substring(0, 20) + '...');

    // Test 2: Get device status
    console.log('2️⃣ Testing device status...');
    const deviceStatus = await getDeviceStatus(token);
    console.log('✅ Device status received:', deviceStatus);

    return res.status(200).json({
      success: true,
      message: 'Tuya API test successful',
      token: token.substring(0, 20) + '...',
      deviceStatus: deviceStatus
    });

  } catch (error) {
    console.error('❌ Tuya API test failed:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack
    });
  }
}

async function fetchNewToken() {
  const timestamp = Date.now().toString();
  const method = 'GET';
  const url = '/v1.0/token?grant_type=1';
  
  const stringToSign = method + '\n' + '\n' + '\n' + url;
  const signStr = TUYA_CONFIG.client_id + timestamp + stringToSign;
  
  const signature = crypto
    .createHmac('sha256', TUYA_CONFIG.client_secret)
    .update(signStr, 'utf8')
    .digest('hex')
    .toUpperCase();

  console.log('📡 Making token request...');
  console.log('Sign string:', signStr);
  console.log('Signature:', signature);

  const response = await fetch(`${TUYA_BASE_URL}${url}`, {
    method: 'GET',
    headers: {
      'client_id': TUYA_CONFIG.client_id,
      'sign': signature,
      'sign_method': 'HMAC-SHA256',
      't': timestamp,
    }
  });

  const data = await response.json();
  console.log('Token response:', data);
  
  if (data.success && data.result) {
    return data.result.access_token;
  }
  
  throw new Error(`Failed to get access token: ${JSON.stringify(data)}`);
}

async function getDeviceStatus(accessToken) {
  const timestamp = Date.now().toString();
  const method = 'GET';
  const url = `/v1.0/devices/${TUYA_CONFIG.device_id}/status`;
  
  const stringToSign = method + '\n' + '\n' + '\n' + url;
  const signStr = TUYA_CONFIG.client_id + accessToken + timestamp + stringToSign;
  
  const signature = crypto
    .createHmac('sha256', TUYA_CONFIG.client_secret)
    .update(signStr, 'utf8')
    .digest('hex')
    .toUpperCase();

  console.log('📡 Making device status request...');
  console.log('Sign string:', signStr);
  console.log('Signature:', signature);

  const response = await fetch(`${TUYA_BASE_URL}${url}`, {
    method: 'GET',
    headers: {
      'client_id': TUYA_CONFIG.client_id,
      'access_token': accessToken,
      'sign': signature,
      'sign_method': 'HMAC-SHA256',
      't': timestamp,
    }
  });

  const data = await response.json();
  console.log('Device status response:', data);
  
  if (data.success && data.result) {
    return data.result;
  }
  
  throw new Error(`Failed to get device status: ${JSON.stringify(data)}`);
}
