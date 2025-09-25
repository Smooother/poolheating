#!/usr/bin/env node

/**
 * Test script for Tuya API signature generation
 * This script tests the corrected signature generation algorithm
 */

import crypto from 'crypto';

function generateTuyaSignature(clientId, clientSecret, timestamp, nonce, method, path, body = '', accessToken = '') {
  // Create content hash (SHA256 of body) - use empty string hash if body is empty
  const contentHash = body 
    ? crypto.createHash('sha256').update(body).digest('hex')
    : 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
  
  // stringToSign = METHOD \n contentHash \n \n pathQuery
  const stringToSign = [
    method.toUpperCase(),
    contentHash,
    '',
    path
  ].join('\n');
  
  // BUSINESS signature: clientId + access_token + t + nonce + stringToSign
  const signString = clientId + accessToken + timestamp + nonce + stringToSign;
  
  // HMAC-SHA256 (uppercase hex)
  return crypto.createHmac('sha256', clientSecret).update(signString).digest('hex').toUpperCase();
}

async function testTuyaSignature() {
  console.log('🧪 Testing Tuya API Signature Generation...\n');

  // Test credentials
  const clientId = 'dn98qycejwjndescfprj';
  const clientSecret = '21c50cb2a91a4491b18025373e742272';
  const timestamp = Date.now().toString();
  const nonce = Math.random().toString(36).substring(2);
  const method = 'GET';
  const path = '/v1.0/token?grant_type=1';

  console.log('📋 Test Parameters:');
  console.log('  Client ID:', clientId);
  console.log('  Timestamp:', timestamp);
  console.log('  Nonce:', nonce);
  console.log('  Method:', method);
  console.log('  Path:', path);
  console.log('  Body:', '(empty)');
  console.log('  Access Token:', '(none for token request)');

  // Generate signature
  const signature = generateTuyaSignature(clientId, clientSecret, timestamp, nonce, method, path);
  
  console.log('\n🔐 Generated Signature:');
  console.log('  Signature:', signature);

  // Test the signature with actual API call
  console.log('\n🌐 Testing API Call...');
  
  try {
    const response = await fetch('https://openapi.tuyaeu.com/v1.0/token?grant_type=1', {
      method: 'GET',
      headers: {
        'client_id': clientId,
        'sign': signature,
        't': timestamp,
        'sign_method': 'HMAC-SHA256',
        'nonce': nonce,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();
    
    console.log('📡 API Response:');
    console.log('  Status:', response.status);
    console.log('  Success:', data.success);
    console.log('  Code:', data.code);
    console.log('  Message:', data.msg);
    
    if (data.success) {
      console.log('\n✅ SUCCESS! Signature generation is working correctly!');
      console.log('🎉 Tuya API connection established successfully!');
    } else {
      console.log('\n❌ FAILED! Signature generation still has issues.');
      console.log('🔍 Error details:', data);
    }
    
  } catch (error) {
    console.error('❌ API call failed:', error.message);
  }
}

// Run the test
testTuyaSignature().catch(console.error);
