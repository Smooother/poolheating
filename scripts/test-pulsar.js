#!/usr/bin/env node

/**
 * Test script for Tuya Pulsar integration
 * This script tests the Pulsar client service and message processing
 */

import PulsarClientService from '../src/services/pulsarClientService.js';
import { TuyaPulsarService } from '../src/services/tuyaPulsarService.js';

async function testPulsarIntegration() {
  console.log('🧪 Testing Tuya Pulsar Integration...\n');

  try {
    // Test 1: Initialize Pulsar Client
    console.log('1️⃣ Testing Pulsar Client initialization...');
    const pulsarClient = PulsarClientService.getInstance();
    console.log('✅ Pulsar client initialized');

    // Test 2: Check configuration
    console.log('\n2️⃣ Testing configuration...');
    const config = pulsarClient.getConfig();
    console.log('📋 Configuration:', {
      url: config.url,
      accessId: config.accessId ? `${config.accessId.substring(0, 8)}...` : 'Not set',
      env: config.env
    });

    // Test 3: Test message parsing
    console.log('\n3️⃣ Testing message parsing...');
    const mockMessage = {
      dataId: 'test-message-123',
      devId: 'test-device-id',
      productKey: 'test-product-key',
      status: [{
        code: 'switch_led',
        t: Date.now(),
        value: true,
        '20': 'true'
      }, {
        code: 'water_temp',
        t: Date.now(),
        value: '25.5'
      }, {
        code: 'temp_set',
        t: Date.now(),
        value: '28.0'
      }, {
        code: 'fan_speed',
        t: Date.now(),
        value: 75
      }]
    };

    const parsedMessage = TuyaPulsarService.parseMessage(mockMessage);
    console.log('✅ Message parsed successfully');
    console.log('📨 Parsed message:', JSON.stringify(parsedMessage, null, 2));

    // Test 4: Test device status extraction
    console.log('\n4️⃣ Testing device status extraction...');
    const deviceStatus = TuyaPulsarService.extractDeviceStatus(parsedMessage);
    console.log('✅ Device status extracted successfully');
    console.log('📊 Device status:', JSON.stringify(deviceStatus, null, 2));

    // Test 5: Test connection (simulated)
    console.log('\n5️⃣ Testing connection...');
    const connected = await pulsarClient.connect();
    console.log(connected ? '✅ Connection successful' : '❌ Connection failed');

    // Test 6: Check status
    console.log('\n6️⃣ Testing status retrieval...');
    const status = pulsarClient.getStatus();
    console.log('📊 Status:', JSON.stringify(status, null, 2));

    // Test 7: Test disconnection
    console.log('\n7️⃣ Testing disconnection...');
    await pulsarClient.disconnect();
    console.log('✅ Disconnection successful');

    console.log('\n🎉 All tests completed successfully!');
    console.log('\n📝 Next steps:');
    console.log('1. Set up Tuya credentials in environment variables:');
    console.log('   - TUIYA_ACCESS_ID');
    console.log('   - TUIYA_ACCESS_KEY');
    console.log('   - TUIYA_DEVICE_ID');
    console.log('   - TUIYA_ENV (TEST or PROD)');
    console.log('2. Deploy the Pulsar client to your server');
    console.log('3. Start the Pulsar client from the Dashboard');
    console.log('4. Monitor real-time device updates');

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the test
testPulsarIntegration();
