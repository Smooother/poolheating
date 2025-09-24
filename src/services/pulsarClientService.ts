import { TuyaPulsarService, TuyaDeviceMessage } from './tuyaPulsarService.js';

export interface PulsarConfig {
  url: string;
  accessId: string;
  accessKey: string;
  env: 'TEST' | 'PROD';
}

export interface PulsarConnectionStatus {
  isConnected: boolean;
  lastMessage?: Date;
  messageCount: number;
  errorCount: number;
}

export class PulsarClientService {
  private static instance: PulsarClientService;
  private config: PulsarConfig;
  private isConnected = false;
  private messageCount = 0;
  private errorCount = 0;
  private lastMessage?: Date;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectInterval = 30000; // 30 seconds

  private constructor() {
    this.config = {
      url: process.env.TUIYA_PULSAR_URL || 'pulsar+ssl://mqe.tuyaeu.com:7285/',
      accessId: process.env.TUIYA_ACCESS_ID || '',
      accessKey: process.env.TUIYA_ACCESS_KEY || '',
      env: (process.env.TUIYA_ENV as 'TEST' | 'PROD') || 'TEST'
    };
  }

  static getInstance(): PulsarClientService {
    if (!PulsarClientService.instance) {
      PulsarClientService.instance = new PulsarClientService();
    }
    return PulsarClientService.instance;
  }

  /**
   * Initialize and connect to Pulsar
   */
  async connect(): Promise<boolean> {
    try {
      console.log('🔄 Connecting to Tuya Pulsar...');
      console.log(`📍 URL: ${this.config.url}`);
      console.log(`🌍 Environment: ${this.config.env}`);
      console.log(`🔑 Access ID: ${this.config.accessId.substring(0, 8)}...`);

      // Validate configuration
      if (!this.config.accessId || !this.config.accessKey) {
        throw new Error('Missing Tuya credentials. Please set TUIYA_ACCESS_ID and TUIYA_ACCESS_KEY environment variables.');
      }

      // For now, we'll simulate the connection
      // In a real implementation, you would use the Tuya Pulsar SDK here
      await this.simulateConnection();

      this.isConnected = true;
      this.reconnectAttempts = 0;
      
      console.log('✅ Connected to Tuya Pulsar successfully');
      
      // Start message processing
      await this.startMessageProcessing();
      
      return true;
    } catch (error) {
      console.error('❌ Failed to connect to Tuya Pulsar:', error);
      this.isConnected = false;
      this.errorCount++;
      
      // Attempt to reconnect
      await this.scheduleReconnect();
      
      return false;
    }
  }

  /**
   * Simulate Pulsar connection (for development/testing)
   * In production, this would be replaced with actual Pulsar SDK calls
   */
  private async simulateConnection(): Promise<void> {
    console.log('🔄 Simulating Pulsar connection...');
    
    // Simulate connection delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Simulate authentication
    if (!this.config.accessId || !this.config.accessKey) {
      throw new Error('Invalid credentials');
    }
    
    console.log('✅ Pulsar connection simulation successful');
  }

  /**
   * Start processing messages
   */
  private async startMessageProcessing(): Promise<void> {
    console.log('🎧 Starting message processing...');
    
    // Simulate receiving messages every 30 seconds
    // In production, this would be a real Pulsar consumer
    setInterval(async () => {
      if (this.isConnected) {
        await this.simulateMessage();
      }
    }, 30000);
  }

  /**
   * Simulate receiving a message (for testing)
   */
  private async simulateMessage(): Promise<void> {
    try {
      const mockMessage: TuyaDeviceMessage = {
        dataId: `mock-${Date.now()}`,
        devId: process.env.TUIYA_DEVICE_ID || 'mock-device-id',
        productKey: 'mock-product-key',
        status: [{
          code: 'switch_led',
          t: Date.now(),
          value: Math.random() > 0.5,
          '20': Math.random() > 0.5 ? 'true' : 'false'
        }, {
          code: 'WInTemp',
          t: Date.now(),
          value: (20 + Math.random() * 15).toFixed(1) // Random temp between 20-35°C
        }, {
          code: 'temp_set',
          t: Date.now(),
          value: (25 + Math.random() * 5).toFixed(1) // Random target between 25-30°C
        }, {
          code: 'fan_speed',
          t: Date.now(),
          value: Math.floor(Math.random() * 100) // Random fan speed 0-100%
        }]
      };

      await this.handleMessage(mockMessage);
    } catch (error) {
      console.error('❌ Error simulating message:', error);
      this.errorCount++;
    }
  }

  /**
   * Handle incoming Pulsar message
   */
  private async handleMessage(message: TuyaDeviceMessage): Promise<void> {
    try {
      console.log('📨 Received Pulsar message:', JSON.stringify(message, null, 2));
      
      // Process the message using TuyaPulsarService
      await TuyaPulsarService.processMessage(message);
      
      this.messageCount++;
      this.lastMessage = new Date();
      
      console.log(`✅ Processed message ${this.messageCount} for device ${message.devId}`);
    } catch (error) {
      console.error('❌ Error handling Pulsar message:', error);
      this.errorCount++;
    }
  }

  /**
   * Schedule reconnection attempt
   */
  private async scheduleReconnect(): Promise<void> {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('❌ Max reconnection attempts reached. Stopping reconnection.');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectInterval * this.reconnectAttempts;
    
    console.log(`🔄 Scheduling reconnection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay/1000}s`);
    
    setTimeout(async () => {
      await this.connect();
    }, delay);
  }

  /**
   * Disconnect from Pulsar
   */
  async disconnect(): Promise<void> {
    try {
      console.log('🔌 Disconnecting from Tuya Pulsar...');
      
      this.isConnected = false;
      
      // In a real implementation, you would close the Pulsar consumer here
      console.log('✅ Disconnected from Tuya Pulsar');
    } catch (error) {
      console.error('❌ Error disconnecting from Pulsar:', error);
    }
  }

  /**
   * Get connection status
   */
  getStatus(): PulsarConnectionStatus {
    return {
      isConnected: this.isConnected,
      lastMessage: this.lastMessage,
      messageCount: this.messageCount,
      errorCount: this.errorCount
    };
  }

  /**
   * Get configuration (without sensitive data)
   */
  getConfig(): Omit<PulsarConfig, 'accessKey'> {
    return {
      url: this.config.url,
      accessId: this.config.accessId,
      env: this.config.env
    };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<PulsarConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('🔧 Pulsar configuration updated');
  }
}

export default PulsarClientService;
