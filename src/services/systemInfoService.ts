import { supabase } from '@/integrations/supabase/client';

export interface SystemInfoData {
  id: string;
  data_point: string;
  value: string;
  unit?: string;
  status?: string;
  last_fetched: string;
  created_at: string;
}

export class SystemInfoService {
  /**
   * Get all system info data points
   */
  static async getSystemInfo(): Promise<SystemInfoData[]> {
    try {
      const { data, error } = await supabase
        .from('system_info')
        .select('*')
        .order('data_point', { ascending: true });

      if (error) {
        console.error('Failed to fetch system info:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching system info:', error);
      return [];
    }
  }

  /**
   * Update a specific system info data point
   */
  static async updateDataPoint(
    dataPoint: string, 
    value: string, 
    unit?: string, 
    status?: string
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('system_info')
        .upsert({
          data_point: dataPoint,
          value: value,
          unit: unit,
          status: status,
          last_fetched: new Date().toISOString()
        }, {
          onConflict: 'data_point'
        });

      if (error) {
        console.error('Failed to update system info:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error updating system info:', error);
      return false;
    }
  }

  /**
   * Update multiple system info data points at once
   */
  static async updateMultipleDataPoints(updates: {
    dataPoint: string;
    value: string;
    unit?: string;
    status?: string;
  }[]): Promise<boolean> {
    try {
      const dataPoints = updates.map(update => ({
        data_point: update.dataPoint,
        value: update.value,
        unit: update.unit,
        status: update.status,
        last_fetched: new Date().toISOString()
      }));

      const { error } = await supabase
        .from('system_info')
        .upsert(dataPoints, {
          onConflict: 'data_point'
        });

      if (error) {
        console.error('Failed to update system info:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error updating system info:', error);
      return false;
    }
  }

  /**
   * Get a specific data point
   */
  static async getDataPoint(dataPoint: string): Promise<SystemInfoData | null> {
    try {
      const { data, error } = await supabase
        .from('system_info')
        .select('*')
        .eq('data_point', dataPoint)
        .single();

      if (error) {
        console.error('Failed to fetch data point:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error fetching data point:', error);
      return null;
    }
  }
}
