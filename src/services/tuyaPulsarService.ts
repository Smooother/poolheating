/**
 * Tuya Pulsar SDK Service for Real-time Device Notifications
 * This service connects to Tuya's Pulsar message queue to receive real-time device updates
 */

import { createClient } from '@supabase/supabase-js';
import { Client, Consumer, Message } from 'pulsar-client';
import * as CryptoJS from 'crypto-js';

// Tuya Pulsar SDK types
interface TuyaPulsarConfig {
  accessId: string;
  accessKey: string;
  uid: string;
  region: string;
  environment: 'TEST' | 'PROD';
}

// Tuya Pulsar service URLs by region
const PULSAR_SERVICE_URLS = {
  cn: 'pulsar://mq-cn01-v1.pulsar.tuyacn.com:7285',
  us: 'pulsar://mq-us01-v1.pulsar.tuyaus.com:7285',
  eu: 'pulsar://mq-eu01-v1.pulsar.tuyaeu.com:7285',
  in: 'pulsar://mq-in01-v1.pulsar.tuyain.com:7285'
};

// Tuya message structure
interface TuyaMessageVO {
  protocol: number;
  pv: string;
  sign: string;
  t: number;
  data: string;
}

interface TuyaDeviceMessage {
  deviceId: string;
  productId: string;
  status: Array<{
    code: string;
    value: any;
    t: number;
    [key: string]: any;
  }>;
  ts: number;
}

interface PulsarConnectionStatus {
  connected: boolean;
  lastMessage?: Date;
  messageCount: number;
  error?: string;
}

class TuyaPulsarService {
  private config: TuyaPulsarConfig;
  private supabase: any;
  private connectionStatus: PulsarConnectionStatus = {
    connected: false,
    messageCount: 0
  };
  private pulsarClient: Client | null = null;
  private consumer: Consumer | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 5000; // 5 seconds
  private isConnecting = false;

  constructor() {
    this.config = {
      accessId: process.env.TUYA_ACCESS_ID || 'dn98qycejwjndescfprj',
      accessKey: process.env.TUYA_ACCESS_KEY || '21c50cb2a91a4491b18025373e742272',
      uid: process.env.TUYA_UID || '19DZ10YT',
      region: 'eu', // Europe region
      environment: 'TEST' as const
    };

    // Initialize Supabase client
    this.supabase = createClient(
      process.env.SUPABASE_URL || 'https://bagcdhlbkicwtepflczr.supabase.co',
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJhZ2NkaGxia2ljd3RlcGZsY3pyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgwOTYzNjgsImV4cCI6MjA3MzY3MjM2OH0.JrQKwkxywib7I8149n7Jg6xhRk5aPDKIv3wBVV0MYyU'
    );
  }

  /**
   * Initialize the Pulsar client
   */
  async initialize(): Promise<boolean> {
    if (this.isConnecting) {
      console.log('🔄 Pulsar client is already connecting...');
      return false;
    }

    try {
      this.isConnecting = true;
      console.log('🔄 Initializing Tuya Pulsar client...');
      
      // Get the Pulsar service URL for the region
      const serviceUrl = PULSAR_SERVICE_URLS[this.config.region as keyof typeof PULSAR_SERVICE_URLS];
      if (!serviceUrl) {
        throw new Error(`Unsupported region: ${this.config.region}`);
      }

      console.log(`📡 Connecting to Pulsar service: ${serviceUrl}`);
      
      // Create Pulsar client
      this.pulsarClient = new Client({
        serviceUrl: serviceUrl,
        operationTimeoutMs: 30000,
        connectionTimeoutMs: 10000
      });

      // Create consumer for the specific UID
      const topicName = `persistent://iot-${this.config.environment.toLowerCase()}/iot-${this.config.environment.toLowerCase()}-${this.config.uid}`;
      console.log(`📨 Subscribing to topic: ${topicName}`);

      this.consumer = await this.pulsarClient.subscribe({
        topic: topicName,
        subscription: `sub-${this.config.uid}-${Date.now()}`,
        subscriptionType: 'Shared',
        ackTimeoutMs: 10000
      });

      // Start listening for messages
      this.startMessageListener();
      
      this.connectionStatus.connected = true;
      this.connectionStatus.error = undefined;
      this.reconnectAttempts = 0;
      this.isConnecting = false;
      
      console.log('✅ Pulsar client connected successfully');
      return true;
    } catch (error) {
      this.isConnecting = false;
      console.error('❌ Failed to initialize Pulsar client:', error);
      this.connectionStatus.error = error instanceof Error ? error.message : 'Unknown error';
      this.connectionStatus.connected = false;
      return false;
    }
  }

  /**
   * Start listening for real Pulsar messages
   */
  private startMessageListener(): void {
    if (!this.consumer) {
      console.error('❌ Consumer not initialized');
      return;
    }

    console.log('🔄 Starting message listener...');
    
    // Listen for messages
    this.consumer.on('message', async (message: Message) => {
      try {
        console.log('📨 Received Pulsar message');
        
        // Get message data
        const messageData = message.getData().toString();
        console.log('Raw message data:', messageData);
        
        // Parse and decrypt the message
        const decryptedMessage = await this.decryptMessage(messageData);
        if (decryptedMessage) {
          await this.processMessage(decryptedMessage);
        }
        
        // Acknowledge the message
        this.consumer?.acknowledge(message);
      } catch (error) {
        console.error('❌ Error processing message:', error);
        // Negative acknowledge on error
        this.consumer?.negativeAcknowledge(message);
      }
    });

    this.consumer.on('error', (error: Error) => {
      console.error('❌ Consumer error:', error);
      this.connectionStatus.error = error.message;
      this.connectionStatus.connected = false;
      
      // Attempt reconnection
      this.reconnect();
    });
  }

  /**
   * Decrypt Tuya message using AES
   */
  private async decryptMessage(encryptedData: string): Promise<TuyaDeviceMessage | null> {
    try {
      // Parse the message structure
      const messageVO: TuyaMessageVO = JSON.parse(encryptedData);
      
      // Extract the encryption key from access key (first 16 characters)
      const encryptionKey = this.config.accessKey.substring(8, 24);
      
      // Decrypt the data
      const decryptedData = CryptoJS.AES.decrypt(messageVO.data, encryptionKey).toString(CryptoJS.enc.Utf8);
      
      if (!decryptedData) {
        console.error('❌ Failed to decrypt message data');
        return null;
      }
      
      console.log('Decrypted message data:', decryptedData);
      
      // Parse the decrypted JSON
      const deviceMessage: TuyaDeviceMessage = JSON.parse(decryptedData);
      
      return deviceMessage;
    } catch (error) {
      console.error('❌ Error decrypting message:', error);
      return null;
    }
  }

  /**
   * Process incoming device message
   */
  private async processMessage(message: TuyaDeviceMessage): Promise<void> {
    try {
      console.log('📨 Processing device message:', message.deviceId);
      
      this.connectionStatus.messageCount++;
      this.connectionStatus.lastMessage = new Date();

      // Map Tuya status codes to our database fields
      const statusMapping: Record<string, string> = {
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
          await this.updateDeviceStatus(message.deviceId, status.code, status.value, status.t);
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
  private async updateDeviceStatus(deviceId: string, code: string, value: any, timestamp: number): Promise<void> {
    try {
      // Update telemetry_current table
      const { error: currentError } = await this.supabase
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
        console.error('❌ Error updating telemetry_current:', currentError);
        return;
      }

      // Insert into telemetry_history table
      const { error: historyError } = await this.supabase
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

      console.log(`✅ Updated ${code}: ${value}`);
    } catch (error) {
      console.error('❌ Error updating device status:', error);
    }
  }

  /**
   * Get connection status
   */
  getStatus(): PulsarConnectionStatus {
    return { ...this.connectionStatus };
  }

  /**
   * Disconnect from Pulsar
   */
  async disconnect(): Promise<void> {
    try {
      console.log('🔄 Disconnecting from Pulsar...');
      
      if (this.consumer) {
        await this.consumer.close();
        this.consumer = null;
      }
      
      if (this.pulsarClient) {
        await this.pulsarClient.close();
        this.pulsarClient = null;
      }
      
      this.connectionStatus.connected = false;
      this.isConnecting = false;
      console.log('✅ Disconnected from Pulsar');
    } catch (error) {
      console.error('❌ Error disconnecting from Pulsar:', error);
    }
  }

  /**
   * Reconnect to Pulsar with exponential backoff
   */
  private async reconnect(): Promise<void> {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('❌ Max reconnection attempts reached');
      this.connectionStatus.error = 'Max reconnection attempts reached';
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    console.log(`🔄 Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    
    setTimeout(async () => {
      try {
        await this.initialize();
      } catch (error) {
        console.error('❌ Reconnection failed:', error);
        await this.reconnect();
      }
    }, delay);
  }
}

// Export singleton instance
export const tuyaPulsarService = new TuyaPulsarService();
export type { TuyaPulsarConfig, TuyaDeviceMessage, PulsarConnectionStatus };