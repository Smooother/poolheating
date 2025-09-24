import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing required environment variables');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Tuya Pulsar Configuration
const TUIYA_PULSAR_CONFIG = {
  // EU endpoint for European users
  url: 'pulsar+ssl://mqe.tuyaeu.com:7285/',
  accessId: process.env.TUIYA_ACCESS_ID,
  accessKey: process.env.TUIYA_ACCESS_KEY,
  // Test environment for development
  env: process.env.TUIYA_ENV || 'TEST' // TEST or PROD
};

// Message types we're interested in
const MESSAGE_TYPES = {
  DEVICE_STATUS: 'status',
  DEVICE_ONLINE: 'online',
  DEVICE_OFFLINE: 'offline',
  DEVICE_DATA: 'data'
};

class TuyaPulsarClient {
  constructor() {
    this.isConnected = false;
    this.consumer = null;
    this.messageHandlers = new Map();
  }

  /**
   * Initialize the Pulsar client connection
   */
  async connect() {
    try {
      console.log('🔄 Connecting to Tuya Pulsar message queue...');
      
      // For now, we'll simulate the Pulsar connection
      // In a real implementation, you would use the Tuya Pulsar SDK
      this.isConnected = true;
      console.log('✅ Connected to Tuya Pulsar (simulated)');
      
      // Start listening for messages
      await this.startMessageListener();
      
      return true;
    } catch (error) {
      console.error('❌ Failed to connect to Tuya Pulsar:', error);
      this.isConnected = false;
      return false;
    }
  }

  /**
   * Start listening for messages from Tuya devices
   */
  async startMessageListener() {
    console.log('🎧 Starting message listener...');
    
    // Simulate receiving messages every 30 seconds for testing
    // In production, this would be a real Pulsar consumer
    setInterval(async () => {
      if (this.isConnected) {
        await this.simulateDeviceMessage();
      }
    }, 30000);
  }

  /**
   * Simulate receiving a device message (for testing)
   * In production, this would be called by the real Pulsar consumer
   */
  async simulateDeviceMessage() {
    const mockMessage = {
      dataId: `mock-${Date.now()}`,
      devId: process.env.TUIYA_DEVICE_ID || 'mock-device-id',
      productKey: 'mock-product-key',
      status: [{
        code: 'switch_led',
        t: Date.now(),
        value: Math.random() > 0.5, // Random on/off
        '20': Math.random() > 0.5 ? 'true' : 'false'
      }]
    };

    await this.handleDeviceMessage(mockMessage);
  }

  /**
   * Handle incoming device messages
   */
  async handleDeviceMessage(message) {
    try {
      console.log('📨 Received device message:', JSON.stringify(message, null, 2));

      const { devId, status } = message;
      
      if (!devId || !status) {
        console.warn('⚠️ Invalid message format');
        return;
      }

      // Process each status update
      for (const statusUpdate of status) {
        await this.processStatusUpdate(devId, statusUpdate);
      }

    } catch (error) {
      console.error('❌ Error handling device message:', error);
    }
  }

  /**
   * Process individual status updates
   */
  async processStatusUpdate(deviceId, statusUpdate) {
    try {
      const { code, value, t } = statusUpdate;
      
      console.log(`🔄 Processing status update: ${code} = ${value}`);

      // Map Tuya status codes to our database fields
      const statusMapping = {
        'switch_led': 'power_status',
        'temp_set': 'target_temp',
        'temp_current': 'current_temp',
        'WInTemp': 'water_temp',  // Correct Tuya status code for water temperature
        'fan_speed': 'speed_percentage'
      };

      const dbField = statusMapping[code];
      if (!dbField) {
        console.log(`ℹ️ Unknown status code: ${code}`);
        return;
      }

      // Update the heat pump status in database
      await this.updateHeatPumpStatus(deviceId, dbField, value, t);

      // Update system info table
      await this.updateSystemInfo(deviceId, dbField, value);

    } catch (error) {
      console.error('❌ Error processing status update:', error);
    }
  }

  /**
   * Update heat pump status in database
   */
  async updateHeatPumpStatus(deviceId, field, value, timestamp) {
    try {
      const updateData = {
        [field]: value,
        last_communication: new Date(timestamp).toISOString(),
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('heat_pump_status')
        .upsert({
          device_id: deviceId,
          ...updateData
        }, {
          onConflict: 'device_id'
        });

      if (error) {
        console.error('❌ Failed to update heat pump status:', error);
      } else {
        console.log(`✅ Updated heat pump status: ${field} = ${value}`);
      }

    } catch (error) {
      console.error('❌ Error updating heat pump status:', error);
    }
  }

  /**
   * Update system info table with latest device data
   */
  async updateSystemInfo(deviceId, field, value) {
    try {
      const systemInfoMapping = {
        'power_status': 'heat_pump_power',
        'water_temp': 'heat_pump_water_temp',
        'target_temp': 'heat_pump_target_temp',
        'speed_percentage': 'heat_pump_fan_speed'
      };

      const systemInfoField = systemInfoMapping[field];
      if (!systemInfoField) return;

      const { error } = await supabase
        .from('system_info')
        .upsert({
          data_point: systemInfoField,
          value: value.toString(),
          unit: field === 'power_status' ? 'status' : 
                field === 'water_temp' || field === 'target_temp' ? '°C' : 
                field === 'speed_percentage' ? '%' : 'unknown',
          status: 'online',
          last_fetched: new Date().toISOString()
        }, {
          onConflict: 'data_point'
        });

      if (error) {
        console.error('❌ Failed to update system info:', error);
      } else {
        console.log(`✅ Updated system info: ${systemInfoField} = ${value}`);
      }

    } catch (error) {
      console.error('❌ Error updating system info:', error);
    }
  }

  /**
   * Disconnect from Pulsar
   */
  async disconnect() {
    try {
      console.log('🔌 Disconnecting from Tuya Pulsar...');
      this.isConnected = false;
      
      if (this.consumer) {
        await this.consumer.close();
        this.consumer = null;
      }
      
      console.log('✅ Disconnected from Tuya Pulsar');
    } catch (error) {
      console.error('❌ Error disconnecting from Pulsar:', error);
    }
  }
}

// Export the client instance
export const pulsarClient = new TuyaPulsarClient();

// API endpoint to start/stop the Pulsar client
export default async function handler(req, res) {
  if (req.method === 'POST') {
    try {
      const { action } = req.body;
      
      if (action === 'start') {
        const connected = await pulsarClient.connect();
        return res.status(200).json({
          success: connected,
          message: connected ? 'Pulsar client started successfully' : 'Failed to start Pulsar client'
        });
      } else if (action === 'stop') {
        await pulsarClient.disconnect();
        return res.status(200).json({
          success: true,
          message: 'Pulsar client stopped successfully'
        });
      } else if (action === 'status') {
        return res.status(200).json({
          success: true,
          connected: pulsarClient.isConnected,
          message: pulsarClient.isConnected ? 'Pulsar client is connected' : 'Pulsar client is disconnected'
        });
      } else {
        return res.status(400).json({
          success: false,
          message: 'Invalid action. Use: start, stop, or status'
        });
      }
    } catch (error) {
      console.error('❌ Pulsar client API error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  } else {
    return res.status(405).json({
      success: false,
      message: 'Method not allowed. Use POST.'
    });
  }
}
