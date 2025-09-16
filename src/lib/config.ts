// Environment configuration and default settings for PoolHeat

export interface AppConfig {
  // Nord Pool Configuration
  nordPool: {
    apiUrl: string;
    apiKey?: string;
    area: string;
    currency: string;
    timezone: string;
  };
  
  // Heat Pump Configuration
  heatPump: {
    adapter: 'cloud' | 'local' | 'simulator';
    cloudApiUrl?: string;
    cloudApiKey?: string;
    localIpAddress?: string;
    localPort?: string;
  };
  
  // Price Analysis
  price: {
    method: 'delta' | 'percentile';
    deltaPercent: number;
    percentileLow: number;
    percentileHigh: number;
    rollingDays: number;
  };
  
  // Control Settings
  control: {
    baseSetpoint: number;
    lowPriceOffset: number;
    highPriceOffset: number;
    hysteresis: number;
    antiShortCycleMin: number;
    maxChangePerHour: number;
    minTemp: number;
    maxTemp: number;
  };
}

// Default configuration
export const defaultConfig: AppConfig = {
  nordPool: {
    apiUrl: "https://api.nordpoolgroup.com/api",
    area: "SE3",
    currency: "SEK",
    timezone: "Europe/Stockholm",
  },
  
  heatPump: {
    adapter: "simulator",
    localPort: "502",
  },
  
  price: {
    method: "delta",
    deltaPercent: 15,
    percentileLow: 30,
    percentileHigh: 70,
    rollingDays: 7,
  },
  
  control: {
    baseSetpoint: 28.0,
    lowPriceOffset: 2.0,
    highPriceOffset: 2.0,
    hysteresis: 0.4,
    antiShortCycleMin: 30,
    maxChangePerHour: 2.0,
    minTemp: 20.0,
    maxTemp: 32.0,
  },
};

// Environment variable mappings (for production deployment)
export const getConfigFromEnv = (): Partial<AppConfig> => {
  return {
    nordPool: {
      apiUrl: process.env.NORDPOOL_API_URL || defaultConfig.nordPool.apiUrl,
      apiKey: process.env.NORDPOOL_API_KEY,
      area: process.env.NORDPOOL_AREA || defaultConfig.nordPool.area,
      currency: process.env.NORDPOOL_CURRENCY || defaultConfig.nordPool.currency,
      timezone: process.env.APP_TIMEZONE || defaultConfig.nordPool.timezone,
    },
    
    heatPump: {
      adapter: (process.env.PAHLEN_ADAPTER as any) || defaultConfig.heatPump.adapter,
      cloudApiUrl: process.env.PAHLEN_API_URL,
      cloudApiKey: process.env.PAHLEN_API_KEY,
    },
    
    price: {
      method: (process.env.PRICE_METHOD as any) || defaultConfig.price.method,
      deltaPercent: Number(process.env.DELTA_PERCENT) || defaultConfig.price.deltaPercent,
      percentileLow: Number(process.env.PERCENTILE_LOW) || defaultConfig.price.percentileLow,
      percentileHigh: Number(process.env.PERCENTILE_HIGH) || defaultConfig.price.percentileHigh,
      rollingDays: Number(process.env.ROLLING_DAYS_X) || defaultConfig.price.rollingDays,
    },
    
    control: {
      baseSetpoint: Number(process.env.BASE_SETPOINT_C) || defaultConfig.control.baseSetpoint,
      lowPriceOffset: defaultConfig.control.lowPriceOffset,
      highPriceOffset: defaultConfig.control.highPriceOffset,
      hysteresis: Number(process.env.HYSTERESIS_C) || defaultConfig.control.hysteresis,
      antiShortCycleMin: Number(process.env.ANTI_SHORT_CYCLE_MIN) || defaultConfig.control.antiShortCycleMin,
      maxChangePerHour: Number(process.env.MAX_DELTA_PER_HOUR_C) || defaultConfig.control.maxChangePerHour,
      minTemp: Number(process.env.MIN_TEMP_C) || defaultConfig.control.minTemp,
      maxTemp: Number(process.env.MAX_TEMP_C) || defaultConfig.control.maxTemp,
    },
  };
};

// Helper to merge default config with environment overrides
export const getConfig = (): AppConfig => {
  const envConfig = getConfigFromEnv();
  
  return {
    nordPool: { ...defaultConfig.nordPool, ...envConfig.nordPool },
    heatPump: { ...defaultConfig.heatPump, ...envConfig.heatPump },
    price: { ...defaultConfig.price, ...envConfig.price },
    control: { ...defaultConfig.control, ...envConfig.control },
  };
};