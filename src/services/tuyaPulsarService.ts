/**
 * Tuya Pulsar SDK Service for Real-time Device Notifications
 * This service connects to Tuya's Pulsar message queue to receive real-time device updates
 */

import { createClient } from '@supabase/supabase-js';

// Tuya Pulsar SDK types
interface TuyaPulsarConfig {
  accessId: string;
  accessKey: string;
  uid: string;
  region: string;
  environment: 'TEST' | 'PROD';
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
  private pulsarClient: any = null;
  private consumer: any = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 5000; // 5 seconds

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
    try {
      console.log('🔄 Initializing Tuya Pulsar client...');
      
      // For now, we'll simulate the Pulsar connection
      // In a real implementation, you would use the actual Tuya Pulsar SDK
      await this.simulatePulsarConnection();
      
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize Pulsar client:', error);
      this.connectionStatus.error = error instanceof Error ? error.message : 'Unknown error';
      return false;
    }
  }

  /**
   * Simulate Pulsar connection (placeholder for real implementation)
   */
  private async simulatePulsarConnection(): Promise<void> {
    console.log('📡 Simulating Pulsar connection...');
    
    // Simulate connection delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    this.connectionStatus.connected = true;
    this.connectionStatus.error = undefined;
    this.reconnectAttempts = 0;
    
    console.log('✅ Pulsar connection simulated successfully');
    
    // Start simulating messages
    this.startMessageSimulation();
  }

  /**
   * Start simulating device messages (placeholder for real message consumption)
   */
  private startMessageSimulation(): void {
    console.log('🔄 Starting message simulation...');
    
    // Simulate receiving messages every 30 seconds
    setInterval(() => {
      this.simulateMessage();
    }, 30000);
  }

  /**
   * Simulate a device message (placeholder for real message processing)
   */
  private async simulateMessage(): Promise<void> {
    try {
      const mockMessage: TuyaDeviceMessage = {
        deviceId: 'bf65ca8db8b207052feu5u',
        productId: 'mock-product-id',
        status: [
          {
            code: 'switch_led',
            t: Date.now(),
            value: Math.random() > 0.5,
            '20': Math.random() > 0.5 ? 'true' : 'false'
          },
          {
            code: 'WInTemp',
            t: Date.now(),
            value: (20 + Math.random() * 15).toFixed(1) // Random temp between 20-35°C
          },
          {
            code: 'temp_set',
            t: Date.now(),
            value: (25 + Math.random() * 5).toFixed(1) // Random target between 25-30°C
          },
          {
            code: 'fan_speed',
            t: Date.now(),
            value: Math.floor(Math.random() * 100) // Random fan speed 0-100%
          }
        ],
        ts: Date.now()
      };

      await this.processMessage(mockMessage);
    } catch (error) {
      console.error('❌ Error simulating message:', error);
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