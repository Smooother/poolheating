/**
 * Status Service - Uses the working /api/status endpoint
 */

export interface StatusData {
  now: string;
  area: string;
  priceState: 'LOW' | 'NORMAL' | 'HIGH' | 'SHUTDOWN';
  currentPrice: number;
  targetC: number;
  power: boolean;
  waterTemp: number;
  mode: string;
  paused: boolean;
  nextSteps: any[];
  lastAction: {
    ts: string;
    targetC: number;
    state: string;
  };
}

export class StatusService {
  private static baseUrl = 'https://poolheating.vercel.app';

  /**
   * Get current system status
   */
  static async getStatus(): Promise<StatusData | null> {
    try {
      const response = await fetch(`${this.baseUrl}/api/status`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Failed to fetch status:', error);
      return null;
    }
  }

  /**
   * Convert status data to heat pump status format
   */
  static convertToHeatPumpStatus(status: StatusData) {
    return {
      id: 'current',
      device_id: 'bf65ca8db8b207052feu5u',
      current_temp: status.waterTemp,
      water_temp: status.waterTemp,
      target_temp: status.targetC,
      speed_percentage: 0, // Not available in status API
      power_status: status.power ? 'on' : 'off' as 'on' | 'off' | 'standby',
      mode: status.mode,
      is_online: true,
      last_communication: status.now,
      created_at: status.now,
      updated_at: status.now
    };
  }
}
