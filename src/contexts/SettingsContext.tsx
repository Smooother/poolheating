import React, { createContext, useContext, useState, useEffect } from 'react';
import { settingsService, AutomationSettings } from '@/services/settingsService';

export interface ControlSettings {
  minTemp: number;
  maxTemp: number;
  lowPriceThreshold: number;
  highPriceThreshold: number;
  lowTempOffset: number;
  highTempOffset: number;
  rollingDays: number;
  biddingZone: string;
  netFeePerKwh: number;
  electricityProvider: string;
  usePricesWithTax: boolean;
  includeTaxes: boolean;
  includeNetFee: boolean;
}

const defaultSettings: ControlSettings = {
  minTemp: 18.0,
  maxTemp: 32.0,
  lowPriceThreshold: 0.7,
  highPriceThreshold: 1.3,
  lowTempOffset: 2.0,
  highTempOffset: 2.0,
  rollingDays: 7,
  biddingZone: 'SE3',
  netFeePerKwh: 0.30,
  electricityProvider: 'tibber',
  usePricesWithTax: true,
  includeTaxes: true,
  includeNetFee: true,
};

interface SettingsContextType {
  settings: ControlSettings;
  updateSetting: <K extends keyof ControlSettings>(key: K, value: ControlSettings[K]) => void;
  resetToDefaults: () => void;
  saveSettings: () => void;
  syncWithBackend: () => Promise<void>;
  isSyncing: boolean;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<ControlSettings>(() => {
    // Load settings from localStorage if available
    try {
      const saved = localStorage.getItem('heatpump-settings');
      return saved ? { ...defaultSettings, ...JSON.parse(saved) } : defaultSettings;
    } catch {
      return defaultSettings;
    }
  });
  const [isSyncing, setIsSyncing] = useState(false);

  const updateSetting = <K extends keyof ControlSettings>(key: K, value: ControlSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const resetToDefaults = () => {
    setSettings(defaultSettings);
  };

  const saveSettings = () => {
    try {
      localStorage.setItem('heatpump-settings', JSON.stringify(settings));
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  };

  const syncWithBackend = async () => {
    setIsSyncing(true);
    try {
      // Sync bidding zone to backend
      await settingsService.updateBiddingZone(settings.biddingZone);
      console.log('Settings synced with backend');
    } catch (error) {
      console.error('Failed to sync settings with backend:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  // Auto-save settings when they change
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      saveSettings();
    }, 500); // Debounce saves by 500ms

    return () => clearTimeout(timeoutId);
  }, [settings]);

  return (
    <SettingsContext.Provider value={{ settings, updateSetting, resetToDefaults, saveSettings, syncWithBackend, isSyncing }}>
      {children}
    </SettingsContext.Provider>
  );
};