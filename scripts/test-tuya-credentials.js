#!/usr/bin/env node

/**
 * Test Tuya credentials with the correct UID
 */

const TUIYA_ACCESS_ID = 'dn98qycejwjndescfprj';
const TUIYA_ACCESS_KEY = '21c50cb2a91a4491b18025373e742272';
const UID = '19DZ10YT';
const DEVICE_ID = 'bf65ca8db8b207052feu5u';

async function testTuyaCredentials() {
  console.log('🧪 Testing Tuya credentials with UID...\n');

  try {
    const crypto = await import('crypto');
    
    // Test 1: Get access token
    console.log('1️⃣ Getting access token...');
    
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
      console.log('✅ Access token obtained successfully!');
      console.log('Full response:', JSON.stringify(data, null, 2));
      
      if (data.uid) {
        console.log(`   UID: ${data.uid}`);
      }
      if (data.access_token) {
        console.log(`   Access Token: ${data.access_token.substring(0, 20)}...`);
      }
      if (data.expires_in) {
        console.log(`   Expires In: ${data.expires_in} seconds`);
      }
      
      if (!data.access_token) {
        console.log('❌ No access token in response');
        return;
      }
      
      // Test 2: Get device status
      console.log('\n2️⃣ Getting device status...');
      
      const devicePath = `/v1.0/iot-03/devices/${DEVICE_ID}/status`;
      const deviceTimestamp = Date.now();
      const deviceNonce = Math.random().toString(36).substring(2, 15);
      const deviceBody = '';
      const deviceBodyHash = crypto.default.createHash('sha256').update(deviceBody).digest('hex').toUpperCase();
      const deviceStringToSign = ['GET', deviceBodyHash, '', devicePath].join('\n');
      const deviceSignString = `${TUIYA_ACCESS_ID}${data.access_token}${deviceTimestamp}${deviceNonce}${deviceStringToSign}`;
      const deviceSignature = crypto.default.createHmac('sha256', TUIYA_ACCESS_KEY).update(deviceSignString).digest('hex').toUpperCase();
      
      const deviceHeaders = {
        'client_id': TUIYA_ACCESS_ID,
        'access_token': data.access_token,
        't': deviceTimestamp.toString(),
        'sign_method': 'HMAC-SHA256',
        'nonce': deviceNonce,
        'sign': deviceSignature,
        'Content-Type': 'application/json'
      };

      const deviceResponse = await fetch(`https://openapi.tuyaeu.com${devicePath}`, {
        method: 'GET',
        headers: deviceHeaders
      });

      if (deviceResponse.ok) {
        const deviceData = await deviceResponse.json();
        console.log('✅ Device status retrieved successfully!');
        console.log(`   Device ID: ${DEVICE_ID}`);
        console.log(`   Status Items: ${deviceData.result.length}`);
        
        if (deviceData.result.length > 0) {
          console.log('\n📊 Device Status:');
          deviceData.result.forEach(status => {
            console.log(`   ${status.code}: ${status.value}`);
          });
        }
        
        console.log('\n🎉 All tests passed! Your credentials are working correctly.');
        console.log('\n📝 Next steps:');
        console.log('1. Add environment variables to Supabase Edge Functions');
        console.log('2. Deploy the poll-status and status-now functions');
        console.log('3. Set up the scheduled function to run every 2 minutes');
        
      } else {
        const deviceError = await deviceResponse.text();
        console.log(`❌ Device status request failed: ${deviceResponse.status} ${deviceError}`);
      }
      
    } else {
      const errorText = await response.text();
      console.log(`❌ Token request failed: ${response.status} ${errorText}`);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testTuyaCredentials();