export interface AutomationSettings {
  user_id: string;
  target_pool_temp: number;
  automation_enabled: boolean;
  price_sensitivity: number;
  temp_tolerance: number;
  min_pump_temp: number;
  max_pump_temp: number;
  optimization_horizon_hours: number;
  net_fee_per_kwh: number;
  electricity_provider: string;
  low_price_threshold: number;
  high_price_threshold: number;
  low_temp_offset: number;
  high_temp_offset: number;
  rolling_days: number;
  bidding_zone: string;
  created_at?: string;
  updated_at?: string;
}

export interface SettingsResponse {
  settings: AutomationSettings;
}

export interface SettingsUpdateResponse {
  success: boolean;
  message?: string;
  error?: string;
  settings?: AutomationSettings;
}

class SettingsService {
  private baseURL: string;

  constructor() {
    this.baseURL = import.meta.env.VITE_API_URL || '';
  }

  async getSettings(): Promise<SettingsResponse> {
    const response = await fetch(`${this.baseURL}/api/settings`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch settings: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async updateSettings(updates: Partial<AutomationSettings>): Promise<SettingsUpdateResponse> {
    const response = await fetch(`${this.baseURL}/api/settings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Failed to update settings: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async updateBiddingZone(biddingZone: string): Promise<SettingsUpdateResponse> {
    return this.updateSettings({ bidding_zone: biddingZone });
  }

  async updateTargetTemperature(targetTemp: number): Promise<SettingsUpdateResponse> {
    return this.updateSettings({ target_pool_temp: targetTemp });
  }

  async toggleAutomation(enabled: boolean): Promise<SettingsUpdateResponse> {
    return this.updateSettings({ automation_enabled: enabled });
  }
}

export const settingsService = new SettingsService();
