#!/usr/bin/env node

/**
 * Script to help find your Tuya UID
 * This script will attempt to get your UID using your existing credentials
 */

const TUIYA_ACCESS_ID = 'dn98qycejwjndescfprj';
const TUIYA_ACCESS_KEY = '21c50cb2a91a4491b18025373e742272';

async function getTuyaUID() {
  console.log('🔍 Finding your Tuya UID...\n');

  try {
    // Method 1: Try to get UID from token endpoint
    console.log('1️⃣ Attempting to get UID from token endpoint...');
    
    const crypto = await import('crypto');
    
    // Generate signature for token request
    const timestamp = Date.now();
    const nonce = Math.random().toString(36).substring(2, 15);
    const method = 'GET';
    const body = '';
    const pathWithQuery = '/v1.0/token?grant_type=1';
    
    // Create stringToSign
    const bodyHash = crypto.default.createHash('sha256').update(body).digest('hex').toUpperCase();
    const stringToSign = [method, bodyHash, '', pathWithQuery].join('\n');
    
    // Create sign string (no access_token for token request)
    const signString = `${TUIYA_ACCESS_ID}${timestamp}${nonce}${stringToSign}`;
    
    // Generate HMAC signature
    const signature = crypto.default.createHmac('sha256', TUIYA_ACCESS_KEY).update(signString).digest('hex').toUpperCase();
    
    const headers = {
      'client_id': TUIYA_ACCESS_ID,
      't': timestamp.toString(),
      'sign_method': 'HMAC-SHA256',
      'nonce': nonce,
      'sign': signature,
      'Content-Type': 'application/json'
    };

    const response = await fetch('https://openapi.tuyaeu.com/v1.0/token?grant_type=1', {
      method: 'GET',
      headers
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Token response received:');
      console.log('Full response:', JSON.stringify(data, null, 2));
      
      if (data.access_token) {
        console.log(`   Access Token: ${data.access_token.substring(0, 20)}...`);
      }
      if (data.uid) {
        console.log(`   UID: ${data.uid}`);
        console.log('\n🎉 Found your UID!');
        console.log(`UID = ${data.uid}`);
        return data.uid;
      }
      if (data.expires_in) {
        console.log(`   Expires In: ${data.expires_in} seconds`);
      }
    } else {
      const errorText = await response.text();
      console.log(`❌ Token request failed: ${response.status} ${errorText}`);
    }

  } catch (error) {
    console.error('❌ Error getting UID:', error.message);
  }

  console.log('\n📝 Alternative methods to find your UID:');
  console.log('1. Check your Tuya IoT project dashboard');
  console.log('2. Look in your Tuya Smart Life app settings');
  console.log('3. Check your existing API calls/logs');
  console.log('4. Contact Tuya support with your Access ID');
  
  console.log('\n🔧 Manual steps:');
  console.log('1. Go to https://iot.tuya.com/');
  console.log('2. Login with your Tuya account');
  console.log('3. Go to your project dashboard');
  console.log('4. Look for "User ID" or "UID" in project settings');
  console.log('5. Or check the "API Explorer" section');
}

// Run the script
getTuyaUID();
