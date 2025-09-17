import { supabase } from '@/integrations/supabase/client';

export interface HeatPumpStatus {
  id: string;
  device_id: string;
  current_temp: number;
  water_temp: number;
  target_temp: number;
  speed_percentage: number;
  power_status: 'on' | 'off' | 'standby';
  mode?: string;
  is_online: boolean;
  last_communication: string;
  created_at: string;
  updated_at: string;
}

export class HeatPumpStatusService {
  /**
   * Get the latest heat pump status from the database
   */
  static async getLatestStatus(): Promise<HeatPumpStatus | null> {
    try {
      const { data, error } = await supabase
        .from('heat_pump_status')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(1);

      if (error) {
        console.error('Failed to fetch heat pump status:', error);
        return null;
      }

      const rawStatus = data?.[0];
      if (!rawStatus) return null;

      // Ensure all numeric fields are properly converted and power_status is typed
      const powerStatus = ['on', 'off', 'standby'].includes(rawStatus.power_status) 
        ? rawStatus.power_status as 'on' | 'off' | 'standby'
        : 'off';

      return {
        ...rawStatus,
        current_temp: Number(rawStatus.current_temp) || 0,
        water_temp: Number(rawStatus.water_temp) || 0,
        target_temp: Number(rawStatus.target_temp) || 0,
        speed_percentage: Number(rawStatus.speed_percentage) || 0,
        power_status: powerStatus
      } as HeatPumpStatus;
    } catch (error) {
      console.error('Error fetching heat pump status:', error);
      return null;
    }
  }

  /**
   * Trigger a manual heat pump status update
   */
  static async triggerStatusUpdate(): Promise<boolean> {
    try {
      const { data, error } = await supabase.functions.invoke('heat-pump-monitor', {
        body: { action: 'monitor' }
      });

      if (error) {
        console.error('Failed to trigger status update:', error);
        return false;
      }

      return (data as any)?.success === true;
    } catch (error) {
      console.error('Error triggering status update:', error);
      return false;
    }
  }

  /**
   * Subscribe to real-time heat pump status changes
   */
  static subscribeToStatusChanges(
    callback: (status: HeatPumpStatus | null) => void
  ): () => void {
    const channel = supabase
      .channel('heat-pump-status-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'heat_pump_status'
        },
        (payload) => {
          console.log('Heat pump status changed:', payload);
          
          if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
            const rawStatus = payload.new;
            // Ensure all numeric fields are properly converted and power_status is typed
            const powerStatus = ['on', 'off', 'standby'].includes(rawStatus.power_status) 
              ? rawStatus.power_status as 'on' | 'off' | 'standby'
              : 'off';
            
            const typedStatus = {
              ...rawStatus,
              current_temp: Number(rawStatus.current_temp) || 0,
              water_temp: Number(rawStatus.water_temp) || 0,
              target_temp: Number(rawStatus.target_temp) || 0,
              speed_percentage: Number(rawStatus.speed_percentage) || 0,
              power_status: powerStatus
            } as HeatPumpStatus;
            
            callback(typedStatus);
          } else if (payload.eventType === 'DELETE') {
            callback(null);
          }
        }
      )
      .subscribe();

    // Return cleanup function
    return () => {
      supabase.removeChannel(channel);
    };
  }

  /**
   * Check if the device is online based on last communication time
   */
  static isDeviceOnline(status: HeatPumpStatus): boolean {
    if (!status.is_online) return false;
    
    const lastCommunication = new Date(status.last_communication);
    const now = new Date();
    const diffMinutes = (now.getTime() - lastCommunication.getTime()) / (1000 * 60);
    
    // Consider device offline if no communication for more than 5 minutes
    return diffMinutes < 5;
  }

  /**
   * Get a human-readable status description
   */
  static getStatusDescription(status: HeatPumpStatus): string {
    if (!this.isDeviceOnline(status)) {
      return 'Device Offline';
    }

    switch (status.power_status) {
      case 'on':
        return `Running at ${status.speed_percentage}%`;
      case 'standby':
        return 'On Standby';
      case 'off':
        return 'Powered Off';
      default:
        return 'Unknown Status';
    }
  }
}