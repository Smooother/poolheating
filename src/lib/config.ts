export const CONFIG = {
  // Price data source settings
  priceProvider: 'mock' as 'mock' | 'entsoe' | 'elpriset' | 'nordpool',
  biddingZone: 'SE3',
  currency: 'SEK' as 'EUR' | 'SEK',
  timezone: 'Europe/Stockholm',
  
  // Price analysis settings
  rollingDays: 7,
  priceMethod: 'percent' as 'percent' | 'percentile',
  deltaPercent: 15,
  percentileLow: 30,
  percentileHigh: 70,

  // Temperature control
  baseSetpointC: 28,
  lowPriceOffsetC: 2,
  highPriceOffsetC: -2,
  hysteresisC: 0.4,
  antiShortCycleMin: 30,
  maxDeltaPerHourC: 2,
  minTempC: 20,
  maxTempC: 32,

  // Heat pump settings
  heatPumpAdapter: 'simulator' as 'simulator' | 'cloud' | 'local',

  // Currency conversion
  eurToSekRate: 11.50,
};