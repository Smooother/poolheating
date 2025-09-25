/**
 * Tuya API client for Supabase Edge Functions
 */

import { createTuyaHeaders } from './denoCrypto.ts';

export interface TuyaTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  uid: string;
}

export interface TuyaDeviceStatus {
  code: string;
  value: any;
}

export interface TuyaDeviceStatusResponse {
  result: TuyaDeviceStatus[];
  success: boolean;
  t: number;
}

export interface TuyaErrorResponse {
  code: number;
  msg: string;
  success: false;
  t: number;
}

export class TuyaClient {
  private baseUrl: string;
  private clientId: string;
  private clientSecret: string;
  private uid: string;
  private accessToken?: string;
  private tokenExpiresAt?: number;

  constructor(
    baseUrl: string,
    clientId: string,
    clientSecret: string,
    uid: string
  ) {
    this.baseUrl = baseUrl;
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.uid = uid;
  }

  /**
   * Generate HMAC signature using Web Crypto API
   */
  private async generateSignature(message: string, secret: string): Promise<string> {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const messageData = encoder.encode(message);
    
    const key = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    
    const signature = await crypto.subtle.sign('HMAC', key, messageData);
    const signatureArray = Array.from(new Uint8Array(signature));
    return signatureArray.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
  }

  /**
   * Get or refresh access token
   */
  async getAccessToken(): Promise<string> {
    // Check if we have a valid token
    if (this.accessToken && this.tokenExpiresAt && Date.now() < this.tokenExpiresAt) {
      return this.accessToken;
    }

    console.log('🔄 Getting new Tuya access token...');

    const pathWithQuery = `/v1.0/token?grant_type=1`;
    const timestamp = Date.now();
    
    // Use simplified signing like the working Vercel API
    const stringToSign = 'GET' + '\n' + '\n' + '\n' + pathWithQuery;
    const signString = `${this.clientId}${timestamp}${stringToSign}`;
    
    const signature = await this.generateSignature(signString, this.clientSecret);
    
    const headers = {
      'client_id': this.clientId,
      't': timestamp.toString(),
      'sign_method': 'HMAC-SHA256',
      'sign': signature,
      'Content-Type': 'application/json'
    };

    const response = await fetch(`${this.baseUrl}${pathWithQuery}`, {
      method: 'GET',
      headers
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Token request failed: ${response.status} ${errorText}`);
    }

    const data = await response.json() as TuyaTokenResponse;
    
    this.accessToken = data.access_token;
    // Set expiry time with 5 minute buffer
    this.tokenExpiresAt = Date.now() + (data.expires_in - 300) * 1000;
    
    console.log('✅ Tuya access token obtained');
    return this.accessToken;
  }

  /**
   * Get device status
   */
  async getDeviceStatus(deviceId: string): Promise<TuyaDeviceStatus[]> {
    const accessToken = await this.getAccessToken();
    
    const pathWithQuery = `/v1.0/iot-03/devices/${deviceId}/status`;
    const timestamp = Date.now();
    
    // Use simplified signing like the working Vercel API
    const stringToSign = 'GET' + '\n' + '\n' + '\n' + pathWithQuery;
    const signString = `${this.clientId}${accessToken}${timestamp}${stringToSign}`;
    
    const signature = await this.generateSignature(signString, this.clientSecret);
    
    const headers = {
      'client_id': this.clientId,
      'access_token': accessToken,
      't': timestamp.toString(),
      'sign_method': 'HMAC-SHA256',
      'sign': signature,
      'Content-Type': 'application/json'
    };

    console.log(`📡 Fetching device status for ${deviceId}...`);

    const response = await fetch(`${this.baseUrl}${pathWithQuery}`, {
      method: 'GET',
      headers
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Device status request failed: ${response.status} ${errorText}`);
      
      // If token is invalid, try to refresh and retry once
      if (response.status === 401) {
        console.log('🔄 Token invalid, refreshing and retrying...');
        this.accessToken = undefined;
        this.tokenExpiresAt = undefined;
        
        const newAccessToken = await this.getAccessToken();
        const newTimestamp = Date.now();
        const newStringToSign = 'GET' + '\n' + '\n' + '\n' + pathWithQuery;
        const newSignString = `${this.clientId}${newAccessToken}${newTimestamp}${newStringToSign}`;
        const newSignature = await this.generateSignature(newSignString, this.clientSecret);
        
        const newHeaders = {
          'client_id': this.clientId,
          'access_token': newAccessToken,
          't': newTimestamp.toString(),
          'sign_method': 'HMAC-SHA256',
          'sign': newSignature,
          'Content-Type': 'application/json'
        };

        const retryResponse = await fetch(`${this.baseUrl}${pathWithQuery}`, {
          method: 'GET',
          headers: newHeaders
        });

        if (!retryResponse.ok) {
          const retryErrorText = await retryResponse.text();
          throw new Error(`Device status retry failed: ${retryResponse.status} ${retryErrorText}`);
        }

        const retryData = await retryResponse.json() as TuyaDeviceStatusResponse;
        if (!retryData.success) {
          throw new Error(`Device status retry failed: ${JSON.stringify(retryData)}`);
        }

        return retryData.result;
      }
      
      throw new Error(`Device status request failed: ${response.status} ${errorText}`);
    }

    const data = await response.json() as TuyaDeviceStatusResponse;
    
    if (!data.success) {
      throw new Error(`Device status request failed: ${JSON.stringify(data)}`);
    }

    console.log(`✅ Device status retrieved: ${data.result.length} status items`);
    return data.result;
  }

  /**
   * Test connection and credentials
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.getAccessToken();
      return true;
    } catch (error) {
      console.error('❌ Tuya connection test failed:', error);
      return false;
    }
  }
}
