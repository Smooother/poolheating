/**
 * Pulsar Service for frontend integration
 * This service provides methods to interact with the Pulsar API
 */

export interface PulsarStatus {
  success: boolean;
  connected: boolean;
  message: string;
  messageCount?: number;
  lastMessage?: string;
  error?: string;
}

export interface PulsarHealth {
  success: boolean;
  health: {
    running: boolean;
    connected: boolean;
    messageCount: number;
    lastMessage?: string;
    error?: string;
  };
  timestamp: string;
}

class PulsarService {
  private baseUrl = 'https://poolheating.vercel.app/api/pulsar-client';

  /**
   * Start Pulsar connection
   */
  async start(): Promise<PulsarStatus> {
    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action: 'start' })
      });

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error starting Pulsar:', error);
      return {
        success: false,
        connected: false,
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Stop Pulsar connection
   */
  async stop(): Promise<PulsarStatus> {
    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action: 'stop' })
      });

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error stopping Pulsar:', error);
      return {
        success: false,
        connected: false,
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get Pulsar connection status
   */
  async getStatus(): Promise<PulsarStatus> {
    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action: 'status' })
      });

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error getting Pulsar status:', error);
      return {
        success: false,
        connected: false,
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get Pulsar health information
   */
  async getHealth(): Promise<PulsarHealth> {
    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action: 'health' })
      });

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error getting Pulsar health:', error);
      return {
        success: false,
        health: {
          running: false,
          connected: false,
          messageCount: 0,
          error: error instanceof Error ? error.message : 'Unknown error'
        },
        timestamp: new Date().toISOString()
      };
    }
  }
}

export const pulsarService = new PulsarService();
export default pulsarService;
