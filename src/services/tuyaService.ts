import CryptoJS from 'crypto-js';

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
   * Generate signature for Tuya API requests
   */
  private generateSignature(
    clientId: string,
    timestamp: string,
    nonce: string,
    stringToSign: string,
    clientSecret: string,
    accessToken?: string
  ): string {
    const str = clientId + (accessToken || '') + timestamp + nonce + stringToSign;
    return CryptoJS.HmacSHA256(str, clientSecret).toString(CryptoJS.enc.Hex).toUpperCase();
  }

  /**
   * Generate headers for Tuya API requests
   */
  private generateHeaders(method: string, path: string, body?: any, accessToken?: string) {
    const timestamp = Date.now().toString();
    const nonce = Math.random().toString(36).substring(2, 15);
    const stringToSign = method + '\n' + 
                        CryptoJS.SHA256(body ? JSON.stringify(body) : '').toString(CryptoJS.enc.Hex) + '\n' +
                        '' + '\n' + path;

    const signature = this.generateSignature(
      this.config.clientId,
      timestamp,
      nonce,
      stringToSign,
      this.config.clientSecret,
      accessToken
    );

    return {
      'Content-Type': 'application/json',
      'client_id': this.config.clientId,
      't': timestamp,
      'sign_method': 'HMAC-SHA256',
      'nonce': nonce,
      'sign': signature,
      ...(accessToken && { 'access_token': accessToken })
    };
  }

  /**
   * Make authenticated request to Tuya API
   */
  private async makeRequest(method: string, path: string, body?: any): Promise<any> {
    const token = await this.getValidToken();
    const headers = this.generateHeaders(method, path, body, token.access_token);
    
    try {
      const response = await fetch(`${this.config.baseUrl}${path}`, {
        method,
        headers,
        mode: 'cors',
        ...(body && { body: JSON.stringify(body) })
      });

      // Check if the response is ok and not blocked by CORS
      if (!response.ok) {
        if (response.status === 0) {
          throw new Error('CORS_ERROR: Cannot connect to Tuya API from browser. This requires a backend service.');
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.success) {
        // If token expired, try to refresh and retry once
        if (data.code === 1010) {
          await this.refreshToken();
          const newToken = await this.getValidToken();
          const newHeaders = this.generateHeaders(method, path, body, newToken.access_token);
          
          const retryResponse = await fetch(`${this.config.baseUrl}${path}`, {
            method,
            headers: newHeaders,
            mode: 'cors',
            ...(body && { body: JSON.stringify(body) })
          });

          if (!retryResponse.ok) {
            throw new Error(`HTTP ${retryResponse.status}: ${retryResponse.statusText}`);
          }

          const retryData = await retryResponse.json();
          if (!retryData.success) {
            throw new Error(`Tuya API Error: ${retryData.msg} (Code: ${retryData.code})`);
          }
          return retryData;
        }
        throw new Error(`Tuya API Error: ${data.msg} (Code: ${data.code})`);
      }

      return data;
    } catch (error: any) {
      // Handle network errors (CORS, etc.)
      if (error.name === 'TypeError' && error.message === 'Load failed') {
        throw new Error('CORS_ERROR: Cannot connect to Tuya API from browser. The Tuya Cloud API does not allow direct browser access due to CORS restrictions. You need a backend service or proxy to make these API calls.');
      }
      throw error;
    }
  }

  /**
   * Get access token from Tuya Cloud
   */
  private async getAccessToken(): Promise<TuyaToken> {
    const path = '/v1.0/token?grant_type=1';
    const headers = this.generateHeaders('GET', path);

    try {
      const response = await fetch(`${this.config.baseUrl}${path}`, {
        method: 'GET',
        headers,
        mode: 'cors'
      });

      if (!response.ok) {
        if (response.status === 0) {
          throw new Error('CORS_ERROR: Cannot connect to Tuya API from browser. This requires a backend service.');
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(`Failed to get Tuya token: ${data.msg} (Code: ${data.code})`);
      }

      const token: TuyaToken = {
        access_token: data.result.access_token,
        refresh_token: data.result.refresh_token,
        expires_in: data.result.expire_time,
        expires_at: Date.now() + (data.result.expire_time * 1000)
      };

      // Store token in localStorage
      localStorage.setItem(this.tokenKey, JSON.stringify(token));
      this.token = token;

      return token;
    } catch (error: any) {
      if (error.name === 'TypeError' && error.message === 'Load failed') {
        throw new Error('CORS_ERROR: Cannot connect to Tuya API from browser. The Tuya Cloud API does not allow direct browser access due to CORS restrictions. You need a backend service or proxy to make these API calls.');
      }
      throw error;
    }
  }

  /**
   * Refresh access token
   */
  private async refreshToken(): Promise<TuyaToken> {
    const currentToken = this.getStoredToken();
    if (!currentToken?.refresh_token) {
      return this.getAccessToken();
    }

    const path = `/v1.0/token/${currentToken.refresh_token}`;
    const headers = this.generateHeaders('GET', path);

    try {
      const response = await fetch(`${this.config.baseUrl}${path}`, {
        method: 'GET',
        headers,
        mode: 'cors'
      });

      if (!response.ok) {
        if (response.status === 0) {
          throw new Error('CORS_ERROR: Cannot connect to Tuya API from browser.');
        }
        // If refresh fails, get new token
        return this.getAccessToken();
      }

      const data = await response.json();

      if (!data.success) {
        // If refresh fails, get new token
        return this.getAccessToken();
      }

      const token: TuyaToken = {
        access_token: data.result.access_token,
        refresh_token: data.result.refresh_token,
        expires_in: data.result.expire_time,
        expires_at: Date.now() + (data.result.expire_time * 1000)
      };

      localStorage.setItem(this.tokenKey, JSON.stringify(token));
      this.token = token;

      return token;
    } catch (error: any) {
      if (error.name === 'TypeError' && error.message === 'Load failed') {
        throw new Error('CORS_ERROR: Cannot connect to Tuya API from browser.');
      }
      // If refresh fails, get new token
      return this.getAccessToken();
    }
  }

  /**
   * Get stored token from localStorage
   */
  private getStoredToken(): TuyaToken | null {
    try {
      const stored = localStorage.getItem(this.tokenKey);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error('Error parsing stored token:', error);
    }
    return null;
  }

  /**
   * Get a valid token (refresh if needed)
   */
  private async getValidToken(): Promise<TuyaToken> {
    let token = this.token || this.getStoredToken();

    if (!token) {
      return this.getAccessToken();
    }

    // Check if token is about to expire (refresh 5 minutes before expiry)
    const fiveMinutesFromNow = Date.now() + (5 * 60 * 1000);
    if (token.expires_at < fiveMinutesFromNow) {
      return this.refreshToken();
    }

    this.token = token;
    return token;
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
      
      const token = await this.getValidToken();
      console.log('✅ Tuya Cloud connection successful');
      console.log('Access token:', token.access_token.substring(0, 20) + '...');
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
    const path = `/v1.0/devices/${this.config.deviceId}`;
    const data = await this.makeRequest('GET', path);
    return data.result;
  }

  /**
   * Get device status
   */
  async getDeviceStatus(): Promise<TuyaDeviceStatus[]> {
    const path = `/v1.0/devices/${this.config.deviceId}/status`;
    const data = await this.makeRequest('GET', path);
    return data.result;
  }

  /**
   * Send command to device
   */
  async sendCommand(commands: { code: string; value: any }[]): Promise<boolean> {
    const path = `/v1.0/devices/${this.config.deviceId}/commands`;
    const body = { commands };

    try {
      await this.makeRequest('POST', path, body);
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