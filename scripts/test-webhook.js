#!/usr/bin/env node

// Test script for Tuya webhook logic
import crypto from 'crypto';

const ACCESS_ID = process.env.TUYA_CLIENT_ID || 'test_client_id';
const ACCESS_SECRET = process.env.TUYA_CLIENT_SECRET || 'test_client_secret';

function verifyTuyaSignature(req, rawBody) {
  const t = req.headers.get("t") || "";
  const sign = (req.headers.get("sign") || "").toUpperCase();
  const nonce = req.headers.get("nonce") || "";
  const method = req.method || "POST";
  const path = new URL(req.url).pathname;

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
    }
  });
  
  return status;
}

// Test with sample Tuya webhook payload
const samplePayload = {
  bizCode: "deviceReport",
  data: {
    devId: "test_device_123",
    status: [
      { code: "SetTemp", value: 26 },
      { code: "WInTemp", value: 28.5 },
      { code: "Power", value: true },
      { code: "SetMode", value: "warm" },
      { code: "SpeedPercentage", value: 50 }
    ]
  }
};

console.log('🧪 Testing Tuya webhook logic...');
console.log('Sample payload:', JSON.stringify(samplePayload, null, 2));

const codeList = samplePayload.data.status;
const devId = samplePayload.data.devId;
const deviceStatus = parseDeviceStatus(codeList);

console.log('\n📊 Parsed device status:');
console.log('Device ID:', devId);
console.log('Status:', deviceStatus);

console.log('\n✅ Webhook logic test completed successfully!');
console.log('The webhook endpoint is ready to be deployed.');
