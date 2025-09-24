import { createClient } from '@/integrations/supabase/client';

const supabase = createClient();

export interface TuyaDeviceMessage {
  dataId: string;
  devId: string;
  productKey: string;
  status: TuyaStatusUpdate[];
}

export interface TuyaStatusUpdate {
  code: string;
  t: number;
  value: any;
  [key: string]: any;
}

export interface ParsedDeviceStatus {
  deviceId: string;
  powerStatus: 'on' | 'off' | 'standby';
  currentTemp?: number;
  waterTemp?: number;
  targetTemp?: number;
  speedPercentage?: number;
  isOnline: boolean;
  lastUpdate: Date;
}

export class TuyaPulsarService {
  private static instance: TuyaPulsarService;
  private isConnected = false;
  private messageHandlers: Map<string, (message: TuyaDeviceMessage) => void> = new Map();

  // Tuya status code mappings
  private static readonly STATUS_CODE_MAPPING = {
    'switch_led': 'powerStatus',
    'temp_set': 'targetTemp',
    'temp_current': 'currentTemp',
    'water_temp': 'waterTemp',
    'fan_speed': 'speedPercentage',
    'online': 'isOnline'
  };

  private constructor() {}

  static getInstance(): TuyaPulsarService {
    if (!TuyaPulsarService.instance) {
      TuyaPulsarService.instance = new TuyaPulsarService();
    }
    return TuyaPulsarService.instance;
  }

  /**
   * Parse raw Tuya message data
   */
  static parseMessage(rawMessage: any): TuyaDeviceMessage | null {
    try {
      // The raw message should contain encrypted data that needs to be decrypted
      // For now, we'll assume the message is already parsed
      if (typeof rawMessage === 'string') {
        return JSON.parse(rawMessage);
      }
      return rawMessage;
    } catch (error) {
      console.error('❌ Failed to parse Tuya message:', error);
      return null;
    }
  }

  /**
   * Extract device status from Tuya message
   */
  static extractDeviceStatus(message: TuyaDeviceMessage): ParsedDeviceStatus {
    const { devId, status } = message;
    
    const deviceStatus: ParsedDeviceStatus = {
      deviceId: devId,
      powerStatus: 'off',
      isOnline: true,
      lastUpdate: new Date()
    };

    // Process each status update
    for (const statusUpdate of status) {
      const { code, value, t } = statusUpdate;
      
      // Map Tuya codes to our status fields
      switch (code) {
        case 'switch_led':
          deviceStatus.powerStatus = value ? 'on' : 'off';
          break;
        case 'temp_set':
          deviceStatus.targetTemp = parseFloat(value);
          break;
        case 'temp_current':
          deviceStatus.currentTemp = parseFloat(value);
          break;
        case 'water_temp':
          deviceStatus.waterTemp = parseFloat(value);
          break;
        case 'fan_speed':
          deviceStatus.speedPercentage = parseInt(value);
          break;
        case 'online':
          deviceStatus.isOnline = Boolean(value);
          break;
        default:
          console.log(`ℹ️ Unknown status code: ${code} = ${value}`);
      }

      // Update timestamp if available
      if (t) {
        deviceStatus.lastUpdate = new Date(t);
      }
    }

    return deviceStatus;
  }

  /**
   * Store device status in database
   */
  static async storeDeviceStatus(status: ParsedDeviceStatus): Promise<void> {
    try {
      const { error } = await supabase
        .from('heat_pump_status')
        .upsert({
          device_id: status.deviceId,
          current_temp: status.currentTemp || 0,
          water_temp: status.waterTemp || 0,
          target_temp: status.targetTemp || 0,
          speed_percentage: status.speedPercentage || 0,
          power_status: status.powerStatus,
          is_online: status.isOnline,
          last_communication: status.lastUpdate.toISOString(),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'device_id'
        });

      if (error) {
        console.error('❌ Failed to store device status:', error);
        throw error;
      }

      console.log(`✅ Stored device status for ${status.deviceId}`);
    } catch (error) {
      console.error('❌ Error storing device status:', error);
      throw error;
    }
  }

  /**
   * Update system info table with device data
   */
  static async updateSystemInfo(status: ParsedDeviceStatus): Promise<void> {
    try {
      const updates = [
        {
          data_point: 'heat_pump_power',
          value: status.powerStatus,
          unit: 'status',
          status: status.isOnline ? 'online' : 'offline'
        },
        {
          data_point: 'heat_pump_water_temp',
          value: (status.waterTemp || 0).toString(),
          unit: '°C',
          status: status.isOnline ? 'online' : 'offline'
        },
        {
          data_point: 'heat_pump_target_temp',
          value: (status.targetTemp || 0).toString(),
          unit: '°C',
          status: status.isOnline ? 'online' : 'offline'
        },
        {
          data_point: 'heat_pump_fan_speed',
          value: (status.speedPercentage || 0).toString(),
          unit: '%',
          status: status.isOnline ? 'online' : 'offline'
        },
        {
          data_point: 'heat_pump_online',
          value: status.isOnline.toString(),
          unit: 'status',
          status: status.isOnline ? 'online' : 'offline'
        }
      ];

      for (const update of updates) {
        const { error } = await supabase
          .from('system_info')
          .upsert({
            ...update,
            last_fetched: new Date().toISOString()
          }, {
            onConflict: 'data_point'
          });

        if (error) {
          console.error(`❌ Failed to update system info ${update.data_point}:`, error);
        }
      }

      console.log(`✅ Updated system info for device ${status.deviceId}`);
    } catch (error) {
      console.error('❌ Error updating system info:', error);
      throw error;
    }
  }

  /**
   * Process a complete Tuya message
   */
  static async processMessage(rawMessage: any): Promise<void> {
    try {
      // Parse the message
      const message = TuyaPulsarService.parseMessage(rawMessage);
      if (!message) {
        console.warn('⚠️ Failed to parse message, skipping');
        return;
      }

      // Extract device status
      const deviceStatus = TuyaPulsarService.extractDeviceStatus(message);
      
      // Store in database
      await TuyaPulsarService.storeDeviceStatus(deviceStatus);
      
      // Update system info
      await TuyaPulsarService.updateSystemInfo(deviceStatus);

      console.log(`✅ Processed message for device ${deviceStatus.deviceId}`);
    } catch (error) {
      console.error('❌ Error processing Tuya message:', error);
      throw error;
    }
  }

  /**
   * Add message handler
   */
  addMessageHandler(handlerId: string, handler: (message: TuyaDeviceMessage) => void): void {
    this.messageHandlers.set(handlerId, handler);
  }

  /**
   * Remove message handler
   */
  removeMessageHandler(handlerId: string): void {
    this.messageHandlers.delete(handlerId);
  }

  /**
   * Notify all handlers of a new message
   */
  private notifyHandlers(message: TuyaDeviceMessage): void {
    for (const [handlerId, handler] of this.messageHandlers) {
      try {
        handler(message);
      } catch (error) {
        console.error(`❌ Error in message handler ${handlerId}:`, error);
      }
    }
  }

  /**
   * Get connection status
   */
  getConnectionStatus(): boolean {
    return this.isConnected;
  }

  /**
   * Set connection status
   */
  setConnectionStatus(connected: boolean): void {
    this.isConnected = connected;
  }
}

export default TuyaPulsarService;
