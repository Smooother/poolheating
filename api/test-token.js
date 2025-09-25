/**
 * Simple test to check Tuya API token
 */

import crypto from 'crypto';

const TUYA_BASE_URL = 'https://openapi.tuyaeu.com';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Your Tuya credentials
    const clientId = 'dn98qycejwjndescfprj';
    const clientSecret = '21c50cb2a91a4491b18025373e742272';
    
    const timestamp = Date.now().toString();
    const method = 'GET';
    const url = '/v1.0/token?grant_type=1';
    
    const stringToSign = method + '\n' + '\n' + '\n' + url;
    const signStr = clientId + timestamp + stringToSign;
    
    const signature = crypto
      .createHmac('sha256', clientSecret)
      .update(signStr, 'utf8')
      .digest('hex')
      .toUpperCase();

    console.log('Testing Tuya API token request...');
    console.log('Client ID:', clientId);
    console.log('Timestamp:', timestamp);
    console.log('String to sign:', stringToSign);
    console.log('Sign string:', signStr);
    console.log('Signature:', signature);

    const response = await fetch(`${TUYA_BASE_URL}${url}`, {
      method: 'GET',
      headers: {
        'client_id': clientId,
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
      request: {
        clientId,
        timestamp,
        stringToSign,
        signStr,
        signature,
        url: `${TUYA_BASE_URL}${url}`
      },
      response: data
    });

  } catch (error) {
    console.error('Token test failed:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack
    });
  }
}
