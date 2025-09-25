/**
 * Hybrid Tuya Service - Prioritizes Pulsar over API calls
 * Minimizes API usage while maintaining full functionality
 */

import { supabase } from '@/integrations/supabase/client';

export interface TuyaDeviceStatus {
  device_id: string;
  power_status: 'on' | 'off' | 'standby';
  water_temp: number;
  target_temp: number;
  speed_percentage: number;
  mode: string;
  is_online: boolean;
  last_updated: string;
}

export class HybridTuyaService {
  private static readonly API_QUOTA_WARNING_THRESHOLD = 5; // Remaining API calls
  private static apiCallCount = 0;
  private static lastApiCall = 0;

  /**
   * Get device status - Pulsar first, API as fallback
   */
  static async getDeviceStatus(): Promise<TuyaDeviceStatus | null> {
    try {
      // 1. Try Pulsar data first (no API quota used)
      const pulsarStatus = await this.getStatusFromPulsar();
      if (pulsarStatus) {
        console.log('✅ Using Pulsar data (no API quota used)');
        return pulsarStatus;
      }

      // 2. Fallback to API only if Pulsar fails
      if (this.canMakeApiCall()) {
        console.log('⚠️ Using API fallback (quota used)');
        return await this.getStatusFromApi();
      }

      // 3. Use cached database data
      console.log('📊 Using cached database data');
      return await this.getStatusFromDatabase();
    } catch (error) {
      console.error('Failed to get device status:', error);
      return null;
    }
  }

  /**
   * Send command - API only for critical operations
   */
  static async sendCommand(command: {
    action: 'setTemperature' | 'setPower' | 'emergency';
    value: any;
  }): Promise<boolean> {
    try {
      // Check if this is a critical command
      const isCritical = command.action === 'emergency' || 
                        (command.action === 'setPower' && command.value === false);

      if (isCritical && this.canMakeApiCall()) {
        console.log('🚨 Critical command - using API');
        return await this.sendCommandViaApi(command);
      }

      // For non-critical commands, rely on Pulsar to detect changes
      console.log('📡 Non-critical command - will be detected via Pulsar');
      
      // Store command intent in database for Pulsar to process
      await this.storeCommandIntent(command);
      return true;
    } catch (error) {
      console.error('Failed to send command:', error);
      return false;
    }
  }

  /**
   * Get status from Pulsar (no API quota used)
   */
  private static async getStatusFromPulsar(): Promise<TuyaDeviceStatus | null> {
    try {
      // Get latest data from telemetry_current table (populated by Pulsar)
      const { data, error } = await supabase
        .from('telemetry_current')
        .select('*')
        .eq('device_id', 'bf65ca8db8b207052feu5u')
        .order('updated_at', { ascending: false })
        .limit(10);

      if (error || !data || data.length === 0) {
        return null;
      }

      // Convert telemetry data to device status
      const status: Partial<TuyaDeviceStatus> = {
        device_id: 'bf65ca8db8b207052feu5u',
        is_online: true,
        last_updated: new Date().toISOString()
      };

      // Parse telemetry data
      data.forEach(item => {
        switch (item.code) {
          case 'switch_led':
            status.power_status = item.value ? 'on' : 'off';
            break;
          case 'WInTemp':
            status.water_temp = parseFloat(item.value);
            break;
          case 'temp_set':
            status.target_temp = parseFloat(item.value);
            break;
          case 'fan_speed':
            status.speed_percentage = parseFloat(item.value);
            break;
        }
      });

      // Check if we have recent data (within last 5 minutes)
      const latestUpdate = new Date(data[0].updated_at);
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      
      if (latestUpdate < fiveMinutesAgo) {
        console.log('⚠️ Pulsar data is stale, falling back to API');
        return null;
      }

      return status as TuyaDeviceStatus;
    } catch (error) {
      console.error('Failed to get status from Pulsar:', error);
      return null;
    }
  }

  /**
   * Get status from API (uses quota)
   */
  private static async getStatusFromApi(): Promise<TuyaDeviceStatus | null> {
    try {
      const response = await fetch('https://poolheating.vercel.app/api/heatpump', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'getStatus' })
      });

      if (!response.ok) {
        throw new Error(`API call failed: ${response.status}`);
      }

      this.apiCallCount++;
      this.lastApiCall = Date.now();
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('API call failed:', error);
      return null;
    }
  }

  /**
   * Get status from cached database
   */
  private static async getStatusFromDatabase(): Promise<TuyaDeviceStatus | null> {
    try {
      const { data, error } = await supabase
        .from('heat_pump_status')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();

      if (error || !data) {
        return null;
      }

      return {
        device_id: data.device_id,
        power_status: data.power_status,
        water_temp: data.water_temp,
        target_temp: data.target_temp,
        speed_percentage: data.speed_percentage,
        mode: data.mode,
        is_online: data.is_online,
        last_updated: data.updated_at
      };
    } catch (error) {
      console.error('Failed to get status from database:', error);
      return null;
    }
  }

  /**
   * Check if we can make an API call
   */
  private static canMakeApiCall(): boolean {
    // Don't make API calls if we're close to quota limit
    if (this.apiCallCount >= this.API_QUOTA_WARNING_THRESHOLD) {
      console.log('⚠️ API quota limit reached, using Pulsar only');
      return false;
    }

    // Don't make API calls more than once per minute
    const oneMinuteAgo = Date.now() - 60 * 1000;
    if (this.lastApiCall > oneMinuteAgo) {
      console.log('⏱️ API call rate limited, using Pulsar only');
      return false;
    }

    return true;
  }

  /**
   * Send command via API (uses quota)
   */
  private static async sendCommandViaApi(command: any): Promise<boolean> {
    try {
      const response = await fetch('https://poolheating.vercel.app/api/heatpump', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(command)
      });

      this.apiCallCount++;
      this.lastApiCall = Date.now();
      
      return response.ok;
    } catch (error) {
      console.error('Failed to send command via API:', error);
      return false;
    }
  }

  /**
   * Store command intent for Pulsar to process
   */
  private static async storeCommandIntent(command: any): Promise<void> {
    try {
      await supabase
        .from('command_queue')
        .insert({
          device_id: 'bf65ca8db8b207052feu5u',
          command: command,
          status: 'pending',
          created_at: new Date().toISOString()
        });
    } catch (error) {
      console.error('Failed to store command intent:', error);
    }
  }

  /**
   * Get API usage statistics
   */
  static getApiUsageStats() {
    return {
      callsMade: this.apiCallCount,
      lastCall: this.lastApiCall,
      canMakeCall: this.canMakeApiCall(),
      quotaRemaining: Math.max(0, this.API_QUOTA_WARNING_THRESHOLD - this.apiCallCount)
    };
  }
}
