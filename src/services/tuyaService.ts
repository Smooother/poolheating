import { supabase } from '@/integrations/supabase/client';

// Tuya Cloud Configuration
const getTuyaConfig = () => {
  // Try to get from localStorage first
  const storedConfig = localStorage.getItem('tuya_config');
  if (storedConfig) {
    try {
      const parsed = JSON.parse(storedConfig);
      return {
        baseUrl: 'https://openapi.tuyaeu.com',
        clientId: parsed.clientId || '',
        clientSecret: parsed.clientSecret || '',
        uid: parsed.uid || '',
        deviceId: parsed.deviceId || '',
        // DP codes
        powerCode: 'Power',
        setTempCode: 'SetTemp',
        modeCode: 'SetMode',
        silentCode: 'SilentMdoe'
      };
    } catch (error) {
      console.error('Error parsing stored Tuya config:', error);
    }
  }
  
  // Default empty config
  return {
    baseUrl: 'https://openapi.tuyaeu.com',
    clientId: '',
    clientSecret: '',
    uid: '',
    deviceId: '',
    // DP codes
    powerCode: 'Power',
    setTempCode: 'SetTemp',
    modeCode: 'SetMode',
    silentCode: 'SilentMdoe'
  };
};

const TUYA_CONFIG = getTuyaConfig();

interface TuyaToken {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  expires_at: number;
}

interface TuyaDeviceStatus {
  code: string;
  value: any;
}

interface TuyaDeviceInfo {
  id: string;
  name: string;
  online: boolean;
  status: TuyaDeviceStatus[];
}

class TuyaCloudService {
  private token: TuyaToken | null = null;
  private tokenKey = 'tuya_token';
  private config = getTuyaConfig();

  /**
   * Update Tuya configuration
   */
  updateConfig(config: {
    clientId: string;
    clientSecret: string;
    uid: string;
    deviceId: string;
  }): void {
    localStorage.setItem('tuya_config', JSON.stringify(config));
    this.config = getTuyaConfig();
    // Clear existing token when config changes
    this.token = null;
    localStorage.removeItem(this.tokenKey);
  }

  /**
   * Get current configuration
   */
  getConfig() {
    return { ...this.config };
  }

  /**
   * Check if configuration is complete
   */
  isConfigured(): boolean {
    return !!(this.config.clientId && this.config.clientSecret && this.config.uid && this.config.deviceId);
  }

  /**
   * Make request through Supabase Edge Function
   */
  private async makeProxyRequest(action: string, commands?: any): Promise<any> {
    if (!this.isConfigured()) {
      throw new Error('Tuya configuration incomplete. Please configure all required fields.');
    }

    try {
      const { data, error } = await supabase.functions.invoke('tuya-proxy', {
        body: {
          action,
          uid: this.config.uid,
          deviceId: this.config.deviceId,
          commands
        }
      });

      if (error) {
        throw new Error(`Proxy error: ${error.message}`);
      }

      if (!data.success) {
        throw new Error(`Tuya API Error: ${data.msg || 'Unknown error'} (Code: ${data.code || 'UNKNOWN'})`);
      }

      return data;
    } catch (error: any) {
      console.error('Tuya proxy request failed:', error);
      throw error;
    }
  }

  /**
   * Test connection to Tuya Cloud
   */
  async testConnection(): Promise<boolean> {
    try {
      if (!this.isConfigured()) {
        console.error('❌ Tuya Cloud configuration incomplete');
        return false;
      }
      
      console.log('🔄 Testing Tuya Cloud connection...');
      console.log('Config check:', {
        baseUrl: this.config.baseUrl,
        clientId: this.config.clientId.substring(0, 8) + '...',
        hasSecret: !!this.config.clientSecret,
        uid: this.config.uid,
        deviceId: this.config.deviceId
      });
      
      await this.makeProxyRequest('test');
      console.log('✅ Tuya Cloud connection successful');
      return true;
    } catch (error) {
      console.error('❌ Tuya Cloud connection failed:', error);
      return false;
    }
  }

  /**
   * Get device information
   */
  async getDeviceInfo(): Promise<TuyaDeviceInfo> {
    const data = await this.makeProxyRequest('getDeviceInfo');
    return data.result;
  }

  /**
   * Get device status
   */
  async getDeviceStatus(): Promise<TuyaDeviceStatus[]> {
    const data = await this.makeProxyRequest('getDeviceStatus');
    return data.result;
  }

  /**
   * Send command to device
   */
  async sendCommand(commands: { code: string; value: any }[]): Promise<boolean> {
    try {
      await this.makeProxyRequest('sendCommand', commands);
      return true;
    } catch (error) {
      console.error('Failed to send command:', error);
      return false;
    }
  }

  /**
   * Set device power
   */
  async setPower(on: boolean): Promise<boolean> {
    return this.sendCommand([{
      code: this.config.powerCode,
      value: on
    }]);
  }

  /**
   * Set target temperature
   */
  async setTemperature(temperature: number): Promise<boolean> {
    return this.sendCommand([{
      code: this.config.setTempCode,
      value: Math.round(temperature)
    }]);
  }

  /**
   * Set device mode
   */
  async setMode(mode: string): Promise<boolean> {
    return this.sendCommand([{
      code: this.config.modeCode,
      value: mode
    }]);
  }

  /**
   * Set silent mode
   */
  async setSilentMode(silent: boolean): Promise<boolean> {
    return this.sendCommand([{
      code: this.config.silentCode,
      value: silent
    }]);
  }

  /**
   * Get current temperature setting
   */
  async getCurrentTemperature(): Promise<number | null> {
    try {
      const status = await this.getDeviceStatus();
      const tempStatus = status.find(s => s.code === this.config.setTempCode);
      return tempStatus ? Number(tempStatus.value) : null;
    } catch (error) {
      console.error('Failed to get current temperature:', error);
      return null;
    }
  }

  /**
   * Get device power status
   */
  async getPowerStatus(): Promise<boolean | null> {
    try {
      const status = await this.getDeviceStatus();
      const powerStatus = status.find(s => s.code === this.config.powerCode);
      return powerStatus ? Boolean(powerStatus.value) : null;
    } catch (error) {
      console.error('Failed to get power status:', error);
      return null;
    }
  }
}

// Export singleton instance
export const tuyaService = new TuyaCloudService();

// Export types
export type { TuyaDeviceStatus, TuyaDeviceInfo };