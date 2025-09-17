import CryptoJS from 'crypto-js';

// Tuya Cloud Configuration
const TUYA_CONFIG = {
  baseUrl: 'https://openapi.tuyaeu.com',
  clientId: process.env.TUYA_CLIENT_ID || '',
  clientSecret: process.env.TUYA_CLIENT_SECRET || '',
  uid: process.env.TUYA_UID || '',
  deviceId: process.env.TUYA_DEVICE_ID || '',
  // DP codes
  powerCode: 'Power',
  setTempCode: 'SetTemp',
  modeCode: 'SetMode',
  silentCode: 'SilentMdoe'
};

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
      TUYA_CONFIG.clientId,
      timestamp,
      nonce,
      stringToSign,
      TUYA_CONFIG.clientSecret,
      accessToken
    );

    return {
      'Content-Type': 'application/json',
      'client_id': TUYA_CONFIG.clientId,
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
    
    const response = await fetch(`${TUYA_CONFIG.baseUrl}${path}`, {
      method,
      headers,
      ...(body && { body: JSON.stringify(body) })
    });

    const data = await response.json();

    if (!data.success) {
      // If token expired, try to refresh and retry once
      if (data.code === 1010) {
        await this.refreshToken();
        const newToken = await this.getValidToken();
        const newHeaders = this.generateHeaders(method, path, body, newToken.access_token);
        
        const retryResponse = await fetch(`${TUYA_CONFIG.baseUrl}${path}`, {
          method,
          headers: newHeaders,
          ...(body && { body: JSON.stringify(body) })
        });

        const retryData = await retryResponse.json();
        if (!retryData.success) {
          throw new Error(`Tuya API Error: ${retryData.msg} (Code: ${retryData.code})`);
        }
        return retryData;
      }
      throw new Error(`Tuya API Error: ${data.msg} (Code: ${data.code})`);
    }

    return data;
  }

  /**
   * Get access token from Tuya Cloud
   */
  private async getAccessToken(): Promise<TuyaToken> {
    const path = '/v1.0/token?grant_type=1';
    const headers = this.generateHeaders('GET', path);

    const response = await fetch(`${TUYA_CONFIG.baseUrl}${path}`, {
      method: 'GET',
      headers
    });

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
      const response = await fetch(`${TUYA_CONFIG.baseUrl}${path}`, {
        method: 'GET',
        headers
      });

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
    } catch (error) {
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
    const path = `/v1.0/devices/${TUYA_CONFIG.deviceId}`;
    const data = await this.makeRequest('GET', path);
    return data.result;
  }

  /**
   * Get device status
   */
  async getDeviceStatus(): Promise<TuyaDeviceStatus[]> {
    const path = `/v1.0/devices/${TUYA_CONFIG.deviceId}/status`;
    const data = await this.makeRequest('GET', path);
    return data.result;
  }

  /**
   * Send command to device
   */
  async sendCommand(commands: { code: string; value: any }[]): Promise<boolean> {
    const path = `/v1.0/devices/${TUYA_CONFIG.deviceId}/commands`;
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
      code: TUYA_CONFIG.powerCode,
      value: on
    }]);
  }

  /**
   * Set target temperature
   */
  async setTemperature(temperature: number): Promise<boolean> {
    return this.sendCommand([{
      code: TUYA_CONFIG.setTempCode,
      value: Math.round(temperature)
    }]);
  }

  /**
   * Set device mode
   */
  async setMode(mode: string): Promise<boolean> {
    return this.sendCommand([{
      code: TUYA_CONFIG.modeCode,
      value: mode
    }]);
  }

  /**
   * Set silent mode
   */
  async setSilentMode(silent: boolean): Promise<boolean> {
    return this.sendCommand([{
      code: TUYA_CONFIG.silentCode,
      value: silent
    }]);
  }

  /**
   * Get current temperature setting
   */
  async getCurrentTemperature(): Promise<number | null> {
    try {
      const status = await this.getDeviceStatus();
      const tempStatus = status.find(s => s.code === TUYA_CONFIG.setTempCode);
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
      const powerStatus = status.find(s => s.code === TUYA_CONFIG.powerCode);
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