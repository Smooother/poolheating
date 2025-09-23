import { supabase } from '@/integrations/supabase/client';

export interface HeatPumpCommand {
  code: string;
  value: any;
}

export class HeatPumpCommandService {
  /**
   * Send a command to the heat pump
   */
  static async sendCommand(commands: HeatPumpCommand[]): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      const baseURL = import.meta.env.VITE_API_URL || 'https://poolheating.vercel.app';
      const response = await fetch(`${baseURL}/api/heatpump`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'sendCommand',
          commands
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Command failed');
      }

      console.log('Command sent successfully:', data);
      return { success: true, message: data.message };
    } catch (error) {
      console.error('Error sending heat pump command:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Set target temperature
   */
  static async setTemperature(temperature: number): Promise<{ success: boolean; message?: string; error?: string }> {
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
  static async setPowerState(powerOn: boolean): Promise<{ success: boolean; message?: string; error?: string }> {
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