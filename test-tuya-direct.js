import crypto from 'crypto';

// Your credentials
const CLIENT_ID = 'dn98qycejwjndescfprj';
const CLIENT_SECRET = '21c50cb2c8b8b8b8b8b8b8b8b8b8b8b8b';
const DEVICE_ID = 'bf65ca8db8b207052feu5u';
const BASE_URL = 'https://openapi.tuyaeu.com';

function generateSignature(method, path, timestamp, nonce) {
  // Create string to sign
  const stringToSign = [
    method.toUpperCase(),
    'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    'application/json',
    timestamp,
    nonce,
    path
  ].join('\n');
  
  console.log('🔍 String to sign:');
  console.log(stringToSign);
  console.log('');
  
  // Generate HMAC-SHA256 signature
  const signature = crypto
    .createHmac('sha256', CLIENT_SECRET)
    .update(stringToSign)
    .digest('base64');
  
  return signature;
}

async function testTuyaAPI(accessToken) {
  console.log('🧪 Testing Tuya API Direct Access...');
  console.log('');
  
  const method = 'GET';
  const path = `/v1.0/devices/${DEVICE_ID}/status`;
  const timestamp = Date.now().toString();
  const nonce = crypto.randomUUID();
  
  const signature = generateSignature(method, path, timestamp, nonce);
  
  const url = `${BASE_URL}${path}`;
  const headers = {
    'client_id': CLIENT_ID,
    't': timestamp,
    'nonce': nonce,
    'sign': signature,
    'sign_method': 'HMAC-SHA256',
    'access_token': accessToken
  };
  
  console.log('📋 Request Details:');
  console.log('  URL:', url);
  console.log('  Method:', method);
  console.log('  Headers:', JSON.stringify(headers, null, 2));
  console.log('');
  
  try {
    const response = await fetch(url, {
      method: method,
      headers: headers
    });
    
    const data = await response.json();
    
    console.log('📊 Response:');
    console.log('  Status:', response.status);
    console.log('  Data:', JSON.stringify(data, null, 2));
    
    if (data.success) {
      console.log('✅ SUCCESS: API access working!');
    } else {
      console.log('❌ ERROR:', data.msg || 'Unknown error');
    }
    
  } catch (error) {
    console.log('❌ NETWORK ERROR:', error.message);
  }
}

// Usage: node test-tuya-direct.js YOUR_ACCESS_TOKEN
const accessToken = process.argv[2];

if (!accessToken) {
  console.log('❌ Please provide your access token:');
  console.log('   node test-tuya-direct.js YOUR_ACCESS_TOKEN');
  console.log('');
  console.log('💡 To get an access token:');
  console.log('   1. Go to Tuya IoT Platform');
  console.log('   2. Navigate to Cloud > Development');
  console.log('   3. Get access token for your project');
  process.exit(1);
}

testTuyaAPI(accessToken).catch(console.error);
