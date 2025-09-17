import { supabase } from '@/integrations/supabase/client';

export interface HeatPumpCommand {
  code: string;
  value: any;
}

export class HeatPumpCommandService {
  /**
   * Send a command to the heat pump
   */
  static async sendCommand(commands: HeatPumpCommand[]): Promise<boolean> {
    try {
      // Get Tuya configuration
      const { data: config, error: configError } = await supabase
        .from('tuya_config')
        .select('device_id, uid')
        .eq('id', 'default')
        .single();

      if (configError || !config?.device_id || !config?.uid) {
        console.error('Tuya configuration error:', configError);
        throw new Error('Heat pump device not configured properly');
      }

      // Send command via tuya-proxy
      const { data, error } = await supabase.functions.invoke('tuya-proxy', {
        body: { 
          action: 'sendCommand',
          deviceId: config.device_id,
          uid: config.uid,
          commands
        }
      });

      if (error) {
        console.error('Failed to send command:', error);
        throw new Error(`Command failed: ${error.message}`);
      }

      if (!data?.success) {
        console.error('Tuya API error:', data);
        throw new Error(`Heat pump rejected command: ${data?.error || 'Unknown error'}`);
      }

      console.log('Command sent successfully:', data);
      return true;
    } catch (error) {
      console.error('Error sending heat pump command:', error);
      throw error;
    }
  }

  /**
   * Set target temperature
   */
  static async setTargetTemperature(temperature: number): Promise<boolean> {
    return this.sendCommand([
      {
        code: 'SetTemp',
        value: temperature
      }
    ]);
  }

  /**
   * Set heat pump power state
   */
  static async setPowerState(powerOn: boolean): Promise<boolean> {
    return this.sendCommand([
      {
        code: 'Power',
        value: powerOn
      }
    ]);
  }

  /**
   * Set heat pump mode
   */
  static async setMode(mode: string): Promise<boolean> {
    return this.sendCommand([
      {
        code: 'SetMode',
        value: mode
      }
    ]);
  }

  /**
   * Set silent mode
   */
  static async setSilentMode(silent: boolean): Promise<boolean> {
    return this.sendCommand([
      {
        code: 'SilentMdoe', // Note: This is the actual field name from Tuya (typo in their API)
        value: silent
      }
    ]);
  }
}