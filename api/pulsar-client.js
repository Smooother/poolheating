/**
 * Pulsar Client API endpoint for real-time Tuya device updates
 * This endpoint manages the Pulsar connection for receiving real-time device notifications
 */

const { Client } = require('pulsar-client');
const CryptoJS = require('crypto-js');
const { createClient } = require('@supabase/supabase-js');

// Tuya Pulsar configuration
const PULSAR_CONFIG = {
  accessId: process.env.TUYA_ACCESS_ID || 'dn98qycejwjndescfprj',
  accessKey: process.env.TUYA_ACCESS_KEY || '21c50cb2a91a4491b18025373e742272',
  uid: process.env.TUYA_UID || '19DZ10YT',
  region: 'eu', // Europe region
  environment: 'TEST'
};

// Pulsar service URLs by region
const PULSAR_SERVICE_URLS = {
  cn: 'pulsar://mq-cn01-v1.pulsar.tuyacn.com:7285',
  us: 'pulsar://mq-us01-v1.pulsar.tuyaus.com:7285',
  eu: 'pulsar://mq-eu01-v1.pulsar.tuyaeu.com:7285',
  in: 'pulsar://mq-in01-v1.pulsar.tuyain.com:7285'
};

// Global variables for Pulsar connection
let pulsarClient = null;
let consumer = null;
let connectionStatus = {
  connected: false,
  messageCount: 0,
  lastMessage: null,
  error: null
};

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL || 'https://bagcdhlbkicwtepflczr.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
);

/**
 * Initialize Pulsar connection
 */
async function initializePulsar() {
  try {
    console.log('🔄 Initializing Tuya Pulsar client...');
    
    // Get the Pulsar service URL for the region
    const serviceUrl = PULSAR_SERVICE_URLS[PULSAR_CONFIG.region];
    if (!serviceUrl) {
      throw new Error(`Unsupported region: ${PULSAR_CONFIG.region}`);
    }

    console.log(`📡 Connecting to Pulsar service: ${serviceUrl}`);
    
    // Create Pulsar client
    pulsarClient = new Client({
      serviceUrl: serviceUrl,
      operationTimeoutMs: 30000,
      connectionTimeoutMs: 10000
    });

    // Create consumer for the specific UID
    const topicName = `persistent://iot-${PULSAR_CONFIG.environment.toLowerCase()}/iot-${PULSAR_CONFIG.environment.toLowerCase()}-${PULSAR_CONFIG.uid}`;
    console.log(`📨 Subscribing to topic: ${topicName}`);

    consumer = await pulsarClient.subscribe({
      topic: topicName,
      subscription: `sub-${PULSAR_CONFIG.uid}-${Date.now()}`,
      subscriptionType: 'Shared',
      ackTimeoutMs: 10000
    });

    // Start listening for messages
    startMessageListener();
    
    connectionStatus.connected = true;
    connectionStatus.error = null;
    
    console.log('✅ Pulsar client connected successfully');
    return true;
  } catch (error) {
    console.error('❌ Failed to initialize Pulsar client:', error);
    connectionStatus.error = error.message;
    connectionStatus.connected = false;
    return false;
  }
}

/**
 * Start listening for Pulsar messages
 */
function startMessageListener() {
  if (!consumer) {
    console.error('❌ Consumer not initialized');
    return;
  }

  console.log('🔄 Starting message listener...');
  
  // Listen for messages
  consumer.on('message', async (message) => {
    try {
      console.log('📨 Received Pulsar message');
      
      // Get message data
      const messageData = message.getData().toString();
      console.log('Raw message data:', messageData);
      
      // Parse and decrypt the message
      const decryptedMessage = await decryptMessage(messageData);
      if (decryptedMessage) {
        await processMessage(decryptedMessage);
      }
      
      // Acknowledge the message
      consumer.acknowledge(message);
    } catch (error) {
      console.error('❌ Error processing message:', error);
      // Negative acknowledge on error
      consumer.negativeAcknowledge(message);
    }
  });

  consumer.on('error', (error) => {
    console.error('❌ Consumer error:', error);
    connectionStatus.error = error.message;
    connectionStatus.connected = false;
  });
}

/**
 * Decrypt Tuya message using AES
 */
async function decryptMessage(encryptedData) {
  try {
    // Parse the message structure
    const messageVO = JSON.parse(encryptedData);
    
    // Extract the encryption key from access key (first 16 characters)
    const encryptionKey = PULSAR_CONFIG.accessKey.substring(8, 24);
    
    // Decrypt the data
    const decryptedData = CryptoJS.AES.decrypt(messageVO.data, encryptionKey).toString(CryptoJS.enc.Utf8);
    
    if (!decryptedData) {
      console.error('❌ Failed to decrypt message data');
      return null;
    }
    
    console.log('Decrypted message data:', decryptedData);
    
    // Parse the decrypted JSON
    const deviceMessage = JSON.parse(decryptedData);
    
    return deviceMessage;
  } catch (error) {
    console.error('❌ Error decrypting message:', error);
    return null;
  }
}

/**
 * Process incoming device message
 */
async function processMessage(message) {
  try {
    console.log('📨 Processing device message:', message.deviceId);
    
    connectionStatus.messageCount++;
    connectionStatus.lastMessage = new Date();

    // Map Tuya status codes to our database fields
    const statusMapping = {
      'switch_led': 'power_status',
      'temp_set': 'target_temp',
      'temp_current': 'current_temp',
      'WInTemp': 'water_temp',
      'fan_speed': 'speed_percentage',
      'online': 'is_online'
    };

    // Process each status update
    for (const status of message.status) {
      const dbField = statusMapping[status.code];
      if (dbField) {
        await updateDeviceStatus(message.deviceId, status.code, status.value, status.t);
      }
    }

    console.log(`✅ Processed ${message.status.length} status updates`);
  } catch (error) {
    console.error('❌ Error processing message:', error);
  }
}

/**
 * Update device status in database
 */
async function updateDeviceStatus(deviceId, code, value, timestamp) {
  try {
    console.log(`✅ Device ${deviceId} - ${code}: ${value} (${new Date(timestamp).toISOString()})`);
    
    // Update telemetry_current table
    const { error: currentError } = await supabase
      .from('telemetry_current')
      .upsert({
        device_id: deviceId,
        code: code,
        value: value,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'device_id,code',
        ignoreDuplicates: false
      });

    if (currentError) {
      console.error('❌ Error upserting telemetry_current:', currentError);
      return;
    }

    // Insert into telemetry_history table
    const { error: historyError } = await supabase
      .from('telemetry_history')
      .insert({
        device_id: deviceId,
        code: code,
        value: value,
        ts: timestamp
      });

    if (historyError) {
      console.error('❌ Error inserting telemetry_history:', historyError);
      return;
    }

    console.log(`✅ Stored ${code}: ${value} in database`);
    
  } catch (error) {
    console.error('❌ Error updating device status:', error);
  }
}

/**
 * Disconnect from Pulsar
 */
async function disconnectPulsar() {
  try {
    console.log('🔄 Disconnecting from Pulsar...');
    
    if (consumer) {
      await consumer.close();
      consumer = null;
    }
    
    if (pulsarClient) {
      await pulsarClient.close();
      pulsarClient = null;
    }
    
    connectionStatus.connected = false;
    console.log('✅ Disconnected from Pulsar');
  } catch (error) {
    console.error('❌ Error disconnecting from Pulsar:', error);
  }
}

/**
 * Get connection status
 */
function getStatus() {
  return { ...connectionStatus };
}

// API handler
export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const { action } = req.body || {};

    switch (action) {
      case 'start':
        const startResult = await initializePulsar();
        return res.status(200).json({
          success: startResult,
          message: startResult ? 'Pulsar connection started successfully' : 'Failed to start Pulsar connection',
          status: getStatus()
        });

      case 'stop':
        await disconnectPulsar();
        return res.status(200).json({
          success: true,
          message: 'Pulsar connection stopped successfully',
          status: getStatus()
        });

      case 'status':
        return res.status(200).json({
          success: true,
          status: getStatus(),
          timestamp: new Date().toISOString()
        });

      case 'health':
        return res.status(200).json({
          success: true,
          health: {
            running: connectionStatus.connected,
            connected: connectionStatus.connected,
            messageCount: connectionStatus.messageCount,
            lastMessage: connectionStatus.lastMessage,
            error: connectionStatus.error
          },
          timestamp: new Date().toISOString()
        });

      default:
        return res.status(400).json({
          success: false,
          error: 'Invalid action. Use: start, stop, status, or health'
        });
    }
  } catch (error) {
    console.error('❌ Pulsar client error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
}