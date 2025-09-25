/**
 * Pulsar Client Service for managing Tuya real-time connections
 * This service provides a high-level interface for the Pulsar connection
 */

import { tuyaPulsarService, PulsarConnectionStatus } from './tuyaPulsarService.js';

class PulsarClientService {
  private isInitialized = false;
  private status: PulsarConnectionStatus = {
    connected: false,
    messageCount: 0
  };

  /**
   * Initialize the Pulsar connection
   */
  async start(): Promise<{ success: boolean; message: string }> {
    try {
      if (this.isInitialized) {
        return { success: true, message: 'Pulsar client already initialized' };
      }

      console.log('🔄 Starting Pulsar client...');
      
      const success = await tuyaPulsarService.initialize();
      
      if (success) {
        this.isInitialized = true;
        this.updateStatus();
        return { success: true, message: 'Pulsar client started successfully' };
      } else {
        return { success: false, message: 'Failed to initialize Pulsar client' };
      }
    } catch (error) {
      console.error('❌ Error starting Pulsar client:', error);
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Stop the Pulsar connection
   */
  async stop(): Promise<{ success: boolean; message: string }> {
    try {
      if (!this.isInitialized) {
        return { success: true, message: 'Pulsar client not running' };
      }

      console.log('🔄 Stopping Pulsar client...');
      
      await tuyaPulsarService.disconnect();
      this.isInitialized = false;
      this.updateStatus();
      
      return { success: true, message: 'Pulsar client stopped successfully' };
    } catch (error) {
      console.error('❌ Error stopping Pulsar client:', error);
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Get current connection status
   */
  getStatus(): PulsarConnectionStatus {
    this.updateStatus();
    return { ...this.status };
  }

  /**
   * Update status from the Pulsar service
   */
  private updateStatus(): void {
    this.status = tuyaPulsarService.getStatus();
  }

  /**
   * Check if the client is running
   */
  isRunning(): boolean {
    return this.isInitialized && this.status.connected;
  }

  /**
   * Get connection health info
   */
  getHealthInfo(): {
    running: boolean;
    connected: boolean;
    messageCount: number;
    lastMessage?: Date;
    error?: string;
    uptime?: number;
  } {
    this.updateStatus();
    
    return {
      running: this.isInitialized,
      connected: this.status.connected,
      messageCount: this.status.messageCount,
      lastMessage: this.status.lastMessage,
      error: this.status.error
    };
  }
}

// Export singleton instance
export const pulsarClientService = new PulsarClientService();
export default pulsarClientService;