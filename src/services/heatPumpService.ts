// Heat Pump Service - Abstraction for controlling pool heat pumps

export interface HeatPumpData {
  currentTemp: number;
  targetTemp: number;
  status: 'running' | 'idle' | 'error';
  lastUpdate: Date;
}

export interface HeatPumpCommand {
  targetTemp: number;
  reason: string;
  timestamp: Date;
}

export abstract class HeatPumpAdapter {
  protected config: any;

  constructor(config: any) {
    this.config = config;
  }

  abstract connect(): Promise<void>;
  abstract disconnect(): Promise<void>;
  abstract readCurrentData(): Promise<HeatPumpData>;
  abstract writeSetpoint(command: HeatPumpCommand): Promise<boolean>;
  abstract testConnection(): Promise<boolean>;
}

// Simulator adapter for development and testing
export class SimulatorAdapter extends HeatPumpAdapter {
  private mockData: HeatPumpData = {
    currentTemp: 26.5,
    targetTemp: 28.0,
    status: 'running',
    lastUpdate: new Date(),
  };

  async connect(): Promise<void> {
    // Simulate connection delay
    await new Promise(resolve => setTimeout(resolve, 500));
    console.log('Simulator: Connected to heat pump simulator');
  }

  async disconnect(): Promise<void> {
    console.log('Simulator: Disconnected from heat pump simulator');
  }

  async readCurrentData(): Promise<HeatPumpData> {
    // Simulate temperature gradually approaching target
    const tempDiff = this.mockData.targetTemp - this.mockData.currentTemp;
    if (Math.abs(tempDiff) > 0.1) {
      this.mockData.currentTemp += tempDiff * 0.1; // Gradual approach
      this.mockData.currentTemp = Math.round(this.mockData.currentTemp * 10) / 10;
    }
    
    this.mockData.lastUpdate = new Date();
    return { ...this.mockData };
  }

  async writeSetpoint(command: HeatPumpCommand): Promise<boolean> {
    console.log(`Simulator: Setting target temperature to ${command.targetTemp}°C - ${command.reason}`);
    
    // Simulate occasional write failures for testing
    if (Math.random() < 0.05) {
      throw new Error('Simulated write failure - heat pump not responding');
    }
    
    this.mockData.targetTemp = command.targetTemp;
    this.mockData.lastUpdate = new Date();
    return true;
  }

  async testConnection(): Promise<boolean> {
    return true;
  }
}

// Cloud adapter for Pahlén API (placeholder)
export class CloudAdapter extends HeatPumpAdapter {
  private apiUrl: string;
  private apiKey: string;

  constructor(config: { apiUrl: string; apiKey: string }) {
    super(config);
    this.apiUrl = config.apiUrl;
    this.apiKey = config.apiKey;
  }

  async connect(): Promise<void> {
    // Implementation would establish connection to cloud API
    throw new Error('CloudAdapter not implemented - use simulator for testing');
  }

  async disconnect(): Promise<void> {
    // Clean up cloud connection
  }

  async readCurrentData(): Promise<HeatPumpData> {
    // Implementation would call Pahlén cloud API
    throw new Error('CloudAdapter not implemented - use simulator for testing');
  }

  async writeSetpoint(command: HeatPumpCommand): Promise<boolean> {
    // Implementation would send setpoint to cloud API
    throw new Error('CloudAdapter not implemented - use simulator for testing');
  }

  async testConnection(): Promise<boolean> {
    try {
      // Test API endpoint availability
      const response = await fetch(`${this.apiUrl}/health`, {
        headers: { 'Authorization': `Bearer ${this.apiKey}` }
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}

// Local network adapter for direct Modbus communication (placeholder)
export class LocalAdapter extends HeatPumpAdapter {
  private ipAddress: string;
  private port: number;

  constructor(config: { ipAddress: string; port: string }) {
    super(config);
    this.ipAddress = config.ipAddress;
    this.port = parseInt(config.port);
  }

  async connect(): Promise<void> {
    // Implementation would establish Modbus TCP connection
    throw new Error('LocalAdapter not implemented - use simulator for testing');
  }

  async disconnect(): Promise<void> {
    // Close Modbus connection
  }

  async readCurrentData(): Promise<HeatPumpData> {
    // Implementation would read via Modbus
    throw new Error('LocalAdapter not implemented - use simulator for testing');
  }

  async writeSetpoint(command: HeatPumpCommand): Promise<boolean> {
    // Implementation would write via Modbus
    throw new Error('LocalAdapter not implemented - use simulator for testing');
  }

  async testConnection(): Promise<boolean> {
    try {
      // Test network connectivity to heat pump
      // This would use a proper Modbus library in production
      return false; // Placeholder
    } catch {
      return false;
    }
  }
}

// Main Heat Pump Service
export class HeatPumpService {
  private adapter: HeatPumpAdapter;
  private connected: boolean = false;
  private lastSuccessfulRead?: Date;
  private lastSuccessfulWrite?: Date;

  constructor(adapter: HeatPumpAdapter) {
    this.adapter = adapter;
  }

  async connect(): Promise<void> {
    try {
      await this.adapter.connect();
      this.connected = true;
    } catch (error) {
      this.connected = false;
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    await this.adapter.disconnect();
    this.connected = false;
  }

  async getCurrentData(): Promise<HeatPumpData | null> {
    if (!this.connected) {
      throw new Error('Heat pump not connected');
    }

    try {
      const data = await this.adapter.readCurrentData();
      this.lastSuccessfulRead = new Date();
      return data;
    } catch (error) {
      console.error('Failed to read heat pump data:', error);
      return null;
    }
  }

  async setTargetTemperature(targetTemp: number, reason: string): Promise<boolean> {
    if (!this.connected) {
      throw new Error('Heat pump not connected');
    }

    try {
      const command: HeatPumpCommand = {
        targetTemp,
        reason,
        timestamp: new Date(),
      };

      const success = await this.adapter.writeSetpoint(command);
      if (success) {
        this.lastSuccessfulWrite = new Date();
      }
      
      return success;
    } catch (error) {
      console.error('Failed to set heat pump temperature:', error);
      return false;
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      return await this.adapter.testConnection();
    } catch {
      return false;
    }
  }

  getConnectionStatus() {
    return {
      connected: this.connected,
      lastRead: this.lastSuccessfulRead,
      lastWrite: this.lastSuccessfulWrite,
    };
  }
}

// Factory function to create the appropriate adapter
export function createHeatPumpAdapter(
  type: 'simulator' | 'cloud' | 'local',
  config: any
): HeatPumpAdapter {
  switch (type) {
    case 'simulator':
      return new SimulatorAdapter(config);
    case 'cloud':
      return new CloudAdapter(config);
    case 'local':
      return new LocalAdapter(config);
    default:
      throw new Error(`Unknown heat pump adapter type: ${type}`);
  }
}