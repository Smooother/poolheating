import { HeatPumpAdapter, HeatPumpData, HeatPumpCommand } from './heatPumpService';
import { tuyaService } from './tuyaService';

export class TuyaAdapter extends HeatPumpAdapter {
  private isConnected: boolean = false;
  private mockData: HeatPumpData = {
    currentTemp: 26.5,
    targetTemp: 28.0,
    status: 'idle',
    lastUpdate: new Date(),
  };

  constructor(config: any) {
    super(config);
  }

  async connect(): Promise<void> {
    try {
      console.log('🔌 TuyaAdapter: Connecting to Tuya Cloud...');
      
      const connected = await tuyaService.testConnection();
      if (!connected) {
        throw new Error('Failed to connect to Tuya Cloud');
      }

      console.log('✅ TuyaAdapter: Connected to Tuya Cloud successfully');
      this.isConnected = true;

      // Get initial device state
      await this.syncDeviceState();

    } catch (error) {
      this.isConnected = false;
      console.error('❌ TuyaAdapter: Connection failed:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    this.isConnected = false;
    console.log('🔌 TuyaAdapter: Disconnected from Tuya Cloud');
  }

  async readCurrentData(): Promise<HeatPumpData> {
    if (!this.isConnected) {
      throw new Error('TuyaAdapter: Not connected to Tuya Cloud');
    }

    try {
      await this.syncDeviceState();
      return { ...this.mockData };
    } catch (error) {
      console.error('❌ TuyaAdapter: Failed to read device data:', error);
      // Return last known state on error
      return { ...this.mockData };
    }
  }

  async writeSetpoint(command: HeatPumpCommand): Promise<boolean> {
    if (!this.isConnected) {
      throw new Error('TuyaAdapter: Not connected to Tuya Cloud');
    }

    try {
      console.log(`🌡️ TuyaAdapter: Setting target temperature to ${command.targetTemp}°C - ${command.reason}`);
      
      const success = await tuyaService.setTemperature(command.targetTemp);
      
      if (success) {
        this.mockData.targetTemp = command.targetTemp;
        this.mockData.lastUpdate = new Date();
        console.log('✅ TuyaAdapter: Temperature set successfully');
        
        // Update status to running if we're changing temperature
        this.mockData.status = 'running';
        
        return true;
      } else {
        console.error('❌ TuyaAdapter: Failed to set temperature');
        return false;
      }
    } catch (error) {
      console.error('❌ TuyaAdapter: Error setting temperature:', error);
      return false;
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      return await tuyaService.testConnection();
    } catch (error) {
      console.error('❌ TuyaAdapter: Connection test failed:', error);
      return false;
    }
  }

  /**
   * Sync local state with actual device status
   */
  private async syncDeviceState(): Promise<void> {
    try {
      const deviceInfo = await tuyaService.getDeviceInfo();
      const deviceStatus = await tuyaService.getDeviceStatus();

      // Update connection status based on device online status
      if (!deviceInfo.online) {
        this.mockData.status = 'error';
        console.warn('⚠️ TuyaAdapter: Device is offline');
        return;
      }

      // Parse device status
      for (const statusItem of deviceStatus) {
        switch (statusItem.code) {
          case 'SetTemp':
            this.mockData.targetTemp = Number(statusItem.value);
            break;
          case 'Power':
            this.mockData.status = statusItem.value ? 'running' : 'idle';
            break;
          case 'CurrentTemp':
          case 'current_temp':
            this.mockData.currentTemp = Number(statusItem.value);
            break;
          // Add more mappings as needed based on your device's DP codes
        }
      }

      this.mockData.lastUpdate = new Date();
      
      console.log('📊 TuyaAdapter: Device state synced:', {
        currentTemp: this.mockData.currentTemp,
        targetTemp: this.mockData.targetTemp,
        status: this.mockData.status,
        online: deviceInfo.online
      });

    } catch (error) {
      console.error('❌ TuyaAdapter: Failed to sync device state:', error);
      this.mockData.status = 'error';
    }
  }

  /**
   * Get additional device information for debugging
   */
  async getDeviceInfo() {
    if (!this.isConnected) {
      throw new Error('TuyaAdapter: Not connected');
    }

    try {
      const deviceInfo = await tuyaService.getDeviceInfo();
      const deviceStatus = await tuyaService.getDeviceStatus();
      
      return {
        deviceInfo,
        deviceStatus,
        adapterStatus: {
          connected: this.isConnected,
          lastUpdate: this.mockData.lastUpdate
        }
      };
    } catch (error) {
      console.error('❌ TuyaAdapter: Failed to get device info:', error);
      throw error;
    }
  }

  /**
   * Manual device control methods
   */
  async setPowerState(on: boolean): Promise<boolean> {
    if (!this.isConnected) {
      throw new Error('TuyaAdapter: Not connected');
    }

    try {
      const success = await tuyaService.setPower(on);
      if (success) {
        this.mockData.status = on ? 'running' : 'idle';
        this.mockData.lastUpdate = new Date();
      }
      return success;
    } catch (error) {
      console.error('❌ TuyaAdapter: Failed to set power state:', error);
      return false;
    }
  }

  async setMode(mode: string): Promise<boolean> {
    if (!this.isConnected) {
      throw new Error('TuyaAdapter: Not connected');
    }

    try {
      return await tuyaService.setMode(mode);
    } catch (error) {
      console.error('❌ TuyaAdapter: Failed to set mode:', error);
      return false;
    }
  }
}