import { supabase } from '@/integrations/supabase/client';

export interface AutomationSettings {
  id: string;
  user_id: string;
  target_pool_temp: number;
  automation_enabled: boolean;
  price_sensitivity: number;
  temp_tolerance: number;
  min_pump_temp: number;
  max_pump_temp: number;
  optimization_horizon_hours: number;
  created_at: string;
  updated_at: string;
}

export interface AutomationLog {
  id: string;
  user_id: string;
  timestamp: string;
  current_pool_temp: number | null;
  target_pool_temp: number;
  current_pump_temp: number | null;
  new_pump_temp: number;
  current_price: number;
  avg_price_forecast: number;
  price_classification: 'low' | 'normal' | 'high';
  action_reason: string;
  created_at: string;
}

export class AutomationService {
  /**
   * Get current automation settings
   */
  static async getSettings(): Promise<AutomationSettings | null> {
    try {
      const { data, error } = await supabase
        .from('automation_settings')
        .select('*')
        .eq('user_id', 'default')
        .single();

      if (error) {
        console.error('Failed to fetch automation settings:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error fetching automation settings:', error);
      return null;
    }
  }

  /**
   * Update automation settings
   */
  static async updateSettings(settings: Partial<AutomationSettings>): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('automation_settings')
        .update({
          ...settings,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', 'default');

      if (error) {
        console.error('Failed to update automation settings:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error updating automation settings:', error);
      return false;
    }
  }

  /**
   * Check if sufficient price data is available for automation
   */
  static async validateDataAvailability(biddingZone: string): Promise<{ isValid: boolean; message?: string }> {
    try {
      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      
      // Check for recent price data
      const { data: recentData, error: recentError } = await supabase
        .from('price_data')
        .select('id')
        .eq('bidding_zone', biddingZone)
        .eq('provider', 'elpriset')
        .gte('start_time', oneDayAgo.toISOString())
        .limit(1);

      if (recentError) {
        console.error('Error checking recent price data:', recentError);
        return { 
          isValid: false, 
          message: 'Unable to verify price data availability. Database connection error.' 
        };
      }

      if (!recentData || recentData.length === 0) {
        return { 
          isValid: false, 
          message: `No recent price data available for ${biddingZone}. Automation requires electricity price data to function properly.` 
        };
      }

      // Check for current hour data
      const startOfHour = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours());
      const endOfHour = new Date(startOfHour.getTime() + 60 * 60 * 1000);
      
      const { data: currentData, error: currentError } = await supabase
        .from('price_data')
        .select('id')
        .eq('bidding_zone', biddingZone)
        .eq('provider', 'elpriset')
        .gte('start_time', startOfHour.toISOString())
        .lt('start_time', endOfHour.toISOString())
        .limit(1);

      if (currentError) {
        console.error('Error checking current price data:', currentError);
        return { 
          isValid: false, 
          message: 'Unable to verify current price data. Database connection error.' 
        };
      }

      if (!currentData || currentData.length === 0) {
        console.warn('No current hour price data available, but recent data exists');
        // This is a warning but not a blocker since we have recent data
      }

      return { isValid: true };
    } catch (error) {
      console.error('Error validating data availability:', error);
      return { 
        isValid: false, 
        message: 'Failed to validate price data availability. Please check your connection and try again.' 
      };
    }
  }

  /**
   * Update automation settings with data validation
   */
  static async updateSettingsWithValidation(
    settings: Partial<AutomationSettings>, 
    biddingZone?: string
  ): Promise<{ success: boolean; message?: string }> {
    try {
      // If enabling automation, validate data availability first
      if (settings.automation_enabled === true && biddingZone) {
        const validation = await this.validateDataAvailability(biddingZone);
        if (!validation.isValid) {
          return { 
            success: false, 
            message: validation.message || 'Insufficient data to enable automation' 
          };
        }
      }

      const { error } = await supabase
        .from('automation_settings')
        .update({
          ...settings,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', 'default');

      if (error) {
        console.error('Failed to update automation settings:', error);
        return { 
          success: false, 
          message: 'Failed to update automation settings. Please try again.' 
        };
      }

      return { success: true };
    } catch (error) {
      console.error('Error updating automation settings:', error);
      return { 
        success: false, 
        message: 'An unexpected error occurred while updating settings.' 
      };
    }
  }

  /**
   * Get automation logs (recent activity)
   */
  static async getLogs(limit: number = 50): Promise<AutomationLog[]> {
    try {
      const { data, error } = await supabase
        .from('automation_log')
        .select('*')
        .eq('user_id', 'default')
        .order('timestamp', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Failed to fetch automation logs:', error);
        return [];
      }

      return (data || []).map(log => ({
        ...log,
        price_classification: log.price_classification as 'low' | 'normal' | 'high'
      }));
    } catch (error) {
      console.error('Error fetching automation logs:', error);
      return [];
    }
  }

  /**
   * Trigger manual automation run
   */
  static async triggerAutomation(): Promise<boolean> {
    try {
      const { data, error } = await supabase.functions.invoke('price-automation');

      if (error) {
        console.error('Failed to trigger automation:', error);
        return false;
      }

      return data?.success === true;
    } catch (error) {
      console.error('Error triggering automation:', error);
      return false;
    }
  }

  /**
   * Subscribe to automation settings changes
   */
  static subscribeToSettingsChanges(
    callback: (settings: AutomationSettings | null) => void
  ): () => void {
    const channel = supabase
      .channel('automation-settings-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'automation_settings',
          filter: 'user_id=eq.default'
        },
        (payload) => {
          console.log('Automation settings changed:', payload);
          
          if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
            callback(payload.new as AutomationSettings);
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
   * Subscribe to automation log changes (for real-time activity feed)
   */
  static subscribeToLogChanges(
    callback: (log: AutomationLog) => void
  ): () => void {
    const channel = supabase
      .channel('automation-log-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'automation_log',
          filter: 'user_id=eq.default'
        },
        (payload) => {
          console.log('New automation log entry:', payload);
          callback(payload.new as AutomationLog);
        }
      )
      .subscribe();

    // Return cleanup function
    return () => {
      supabase.removeChannel(channel);
    };
  }

  /**
   * Format price classification for display
   */
  static formatPriceClassification(classification: string): string {
    switch (classification) {
      case 'low': return 'Low Price';
      case 'high': return 'High Price';
      default: return 'Normal Price';
    }
  }

  /**
   * Get price classification color
   */
  static getPriceClassificationColor(classification: string): string {
    switch (classification) {
      case 'low': return 'text-success';
      case 'high': return 'text-destructive';
      default: return 'text-muted-foreground';
    }
  }
}