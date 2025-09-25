/**
 * Debug Tuya API credentials
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
    console.log('🧪 Debugging Tuya API...');
    console.log('Config:', TUYA_CONFIG);

    // Test token request
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

    console.log('Timestamp:', timestamp);
    console.log('String to sign:', stringToSign);
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

    const responseText = await response.text();
    console.log('Response status:', response.status);
    console.log('Response text:', responseText);

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      data = { raw: responseText };
    }

    return res.status(200).json({
      success: response.ok,
      status: response.status,
      config: TUYA_CONFIG,
      request: {
        timestamp,
        stringToSign,
        signStr,
        signature,
        url: `${TUYA_BASE_URL}${url}`
      },
      response: data
    });

  } catch (error) {
    console.error('❌ Debug failed:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack
    });
  }
}
