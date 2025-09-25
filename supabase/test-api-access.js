import crypto from 'crypto';

// Your main account credentials
const CLIENT_ID = 'dn98qycejwjndescfprj';
const CLIENT_SECRET = '21c50cb2c8b8b8b8b8b8b8b8b8b8b8b8b';
const UID = 'bf65ca8db8b207052feu5u';
const DEVICE_ID = 'bf65ca8db8b207052feu5u';

function generateSignature(method, path, headers, body = '') {
  const timestamp = Date.now().toString();
  const nonce = crypto.randomUUID();
  
  // Create string to sign
  const stringToSign = method + '\n' + 
    (headers['Content-SHA256'] || 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855') + '\n' +
    headers['Content-Type'] + '\n' +
    timestamp + '\n' +
    nonce + '\n' +
    path;
  
  console.log('String to sign:', stringToSign);
  
  // Generate signature
  const signature = crypto
    .createHmac('sha256', CLIENT_SECRET)
    .update(stringToSign)
    .digest('base64');
  
  return {
    signature,
    timestamp,
    nonce,
    stringToSign
  };
}

async function testTuyaAPI() {
  console.log('🧪 Testing Tuya API Access...');
  console.log('');
  
  const method = 'GET';
  const path = `/v1.0/devices/${DEVICE_ID}/status`;
  const headers = {
    'Content-Type': 'application/json',
    'Content-SHA256': 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
  };
  
  const { signature, timestamp, nonce } = generateSignature(method, path, headers);
  
  console.log('📋 Request Details:');
  console.log('  Method:', method);
  console.log('  Path:', path);
  console.log('  Client ID:', CLIENT_ID);
  console.log('  Device ID:', DEVICE_ID);
  console.log('  Timestamp:', timestamp);
  console.log('  Nonce:', nonce);
  console.log('  Signature:', signature);
  console.log('');
  
  const url = `https://openapi.tuyaeu.com${path}`;
  const authHeaders = {
    'client_id': CLIENT_ID,
    't': timestamp,
    'nonce': nonce,
    'sign': signature,
    'sign_method': 'HMAC-SHA256',
    'access_token': 'YOUR_ACCESS_TOKEN_HERE' // You need to get this
  };
  
  console.log('🔗 Request URL:', url);
  console.log('📤 Auth Headers:', authHeaders);
  console.log('');
  console.log('💡 Next Steps:');
  console.log('  1. Get a fresh access token from Tuya');
  console.log('  2. Replace YOUR_ACCESS_TOKEN_HERE with the token');
  console.log('  3. Test the API call');
  console.log('  4. Check if signature is valid');
}

testTuyaAPI().catch(console.error);
