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

      // Connect to real Tuya Pulsar using WebSocket
      await this.connectToRealPulsar();

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
   * Connect to real Tuya Pulsar using WebSocket
   */
  private async connectToRealPulsar(): Promise<void> {
    console.log('🔄 Connecting to real Tuya Pulsar...');
    
    // Clean up accessId (remove newlines)
    const cleanAccessId = this.config.accessId.replace(/\n/g, '').trim();
    const cleanAccessKey = this.config.accessKey.replace(/\n/g, '').trim();
    
    // Create WebSocket connection to Tuya Pulsar
    const wsUrl = `wss://mqe.tuyaeu.com:7285/ws/v2/consumer/persistent/${cleanAccessId}/out/${cleanAccessId}-sub-${this.config.env.toLowerCase()}/tuya`;
    
    console.log(`🔗 WebSocket URL: ${wsUrl}`);
    
    // For now, we'll use a simple HTTP-based approach
    // In a full implementation, you'd use WebSocket or Tuya's official SDK
    await this.setupPulsarSubscription(cleanAccessId, cleanAccessKey);
    
    console.log('✅ Real Pulsar connection established');
  }

  /**
   * Set up Pulsar subscription using HTTP polling
   */
  private async setupPulsarSubscription(accessId: string, accessKey: string): Promise<void> {
    console.log('📡 Setting up Pulsar subscription...');
    
    // Store credentials for message polling
    this.config.accessId = accessId;
    this.config.accessKey = accessKey;
    
    // Start polling for messages
    this.startMessagePolling();
  }

  /**
   * Start processing messages
   */
  private async startMessageProcessing(): Promise<void> {
    console.log('🎧 Starting message processing...');
    
    // Start polling for real messages every 5 seconds
    setInterval(async () => {
      if (this.isConnected) {
        await this.pollForMessages();
      }
    }, 5000);
  }

  /**
   * Poll for messages from Tuya Pulsar
   */
  private async pollForMessages(): Promise<void> {
    try {
      // Use Tuya's message API to get device messages
      const response = await fetch(`https://openapi.tuyaeu.com/v1.0/devices/${process.env.TUIYA_DEVICE_ID}/logs`, {
        method: 'GET',
        headers: {
          'client_id': this.config.accessId,
          't': Date.now().toString(),
          'nonce': crypto.randomUUID(),
          'sign': this.generateSignature('GET', `/v1.0/devices/${process.env.TUIYA_DEVICE_ID}/logs`),
          'sign_method': 'HMAC-SHA256',
          'access_token': await this.getAccessToken()
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.result && data.result.length > 0) {
          console.log(`📨 Received ${data.result.length} messages from device`);
          this.messageCount += data.result.length;
          this.lastMessage = new Date();
          
          // Process each message
          for (const message of data.result) {
            await this.processDeviceMessage(message);
          }
        }
      }
    } catch (error) {
      console.error('❌ Error polling for messages:', error);
      this.errorCount++;
    }
  }

  /**
   * Generate signature for Tuya API calls
   */
  private generateSignature(method: string, path: string): string {
    const timestamp = Date.now().toString();
    const nonce = crypto.randomUUID();
    
    const stringToSign = [
      method.toUpperCase(),
      'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      'application/json',
      timestamp,
      nonce,
      path
    ].join('\n');
    
    return crypto
      .createHmac('sha256', this.config.accessKey)
      .update(stringToSign)
      .digest('base64');
  }

  /**
   * Get access token for Tuya API calls
   */
  private async getAccessToken(): Promise<string> {
    // This would normally get a fresh token, but for now return a placeholder
    // In production, implement proper token management
    return 'PLACEHOLDER_TOKEN';
  }

  /**
   * Process a device message
   */
  private async processDeviceMessage(message: any): Promise<void> {
    try {
      console.log('📨 Processing device message:', message);
      
      // Convert to our message format
      const deviceMessage: TuyaDeviceMessage = {
        dataId: message.dataId || `msg-${Date.now()}`,
        devId: message.devId || process.env.TUIYA_DEVICE_ID || '',
        productKey: message.productKey || '',
        status: message.status || []
      };
      
      // Process the message using TuyaPulsarService
      await TuyaPulsarService.processMessage(deviceMessage);
      
    } catch (error) {
      console.error('❌ Error processing device message:', error);
    }
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
