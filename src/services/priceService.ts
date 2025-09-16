// Price Service - Abstraction for Nord Pool price data

export interface PriceData {
  timestamp: Date;
  price: number;
  currency: string;
  area: string;
}

export interface PriceThresholds {
  low: number;
  high: number;
  average: number;
}

export type PriceState = 'low' | 'normal' | 'high';

export interface PriceServiceConfig {
  area: string;
  currency: string;
  rollingDays: number;
  thresholdMethod: 'delta' | 'percentile';
  deltaPercent?: number;
  percentileLow?: number;
  percentileHigh?: number;
}

export abstract class PriceProvider {
  protected config: PriceServiceConfig;

  constructor(config: PriceServiceConfig) {
    this.config = config;
  }

  abstract fetchPrices(fromDate: Date, toDate: Date): Promise<PriceData[]>;
  
  protected calculateThresholds(prices: PriceData[]): PriceThresholds {
    const priceValues = prices.map(p => p.price).sort((a, b) => a - b);
    const average = priceValues.reduce((sum, price) => sum + price, 0) / priceValues.length;

    if (this.config.thresholdMethod === 'delta') {
      const delta = this.config.deltaPercent || 15;
      return {
        low: average * (1 - delta / 100),
        high: average * (1 + delta / 100),
        average
      };
    } else {
      // Percentile method
      const lowPerc = this.config.percentileLow || 30;
      const highPerc = this.config.percentileHigh || 70;
      const lowIndex = Math.floor(priceValues.length * lowPerc / 100);
      const highIndex = Math.floor(priceValues.length * highPerc / 100);
      
      return {
        low: priceValues[lowIndex],
        high: priceValues[highIndex],
        average
      };
    }
  }

  public classifyPrice(currentPrice: number, thresholds: PriceThresholds): PriceState {
    if (currentPrice < thresholds.low) return 'low';
    if (currentPrice > thresholds.high) return 'high';
    return 'normal';
  }
}

// Mock adapter for development
export class MockNordPoolAdapter extends PriceProvider {
  async fetchPrices(fromDate: Date, toDate: Date): Promise<PriceData[]> {
    // Generate mock data for the date range
    const prices: PriceData[] = [];
    const current = new Date(fromDate);
    
    while (current <= toDate) {
      // Generate realistic hourly prices with daily pattern
      const hour = current.getHours();
      const basePrice = 0.35; // Base price in SEK/kWh
      
      // Daily price pattern: low at night, high during peak hours
      let multiplier = 1;
      if (hour >= 0 && hour <= 6) multiplier = 0.5 + Math.random() * 0.3; // Night: low
      else if (hour >= 7 && hour <= 9) multiplier = 0.8 + Math.random() * 0.4; // Morning: medium
      else if (hour >= 10 && hour <= 15) multiplier = 0.7 + Math.random() * 0.3; // Day: medium-low
      else if (hour >= 16 && hour <= 20) multiplier = 1.2 + Math.random() * 0.8; // Peak: high
      else multiplier = 0.6 + Math.random() * 0.4; // Evening: medium-low
      
      prices.push({
        timestamp: new Date(current),
        price: parseFloat((basePrice * multiplier).toFixed(3)),
        currency: this.config.currency,
        area: this.config.area
      });
      
      current.setHours(current.getHours() + 1);
    }
    
    return prices;
  }
}

// HTTP adapter for real Nord Pool API
export class HttpNordPoolAdapter extends PriceProvider {
  private apiUrl: string;
  private apiKey?: string;

  constructor(config: PriceServiceConfig, apiUrl: string, apiKey?: string) {
    super(config);
    this.apiUrl = apiUrl;
    this.apiKey = apiKey;
  }

  async fetchPrices(fromDate: Date, toDate: Date): Promise<PriceData[]> {
    // Implementation would call real Nord Pool API
    // For now, fallback to mock data
    console.warn('HttpNordPoolAdapter not implemented, using mock data');
    const mockAdapter = new MockNordPoolAdapter(this.config);
    return mockAdapter.fetchPrices(fromDate, toDate);
  }
}

// Main Price Service
export class PriceService {
  private provider: PriceProvider;
  private cachedPrices: PriceData[] = [];
  private cachedThresholds?: PriceThresholds;
  private lastFetch?: Date;

  constructor(provider: PriceProvider) {
    this.provider = provider;
  }

  async getCurrentPriceState(): Promise<{
    currentPrice: PriceData | null;
    state: PriceState;
    thresholds: PriceThresholds;
    prices: PriceData[];
  }> {
    await this.refreshPricesIfNeeded();
    
    const now = new Date();
    const currentHour = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours());
    const currentPrice = this.cachedPrices.find(p => 
      p.timestamp.getTime() === currentHour.getTime()
    ) || null;

    if (!this.cachedThresholds) {
      this.cachedThresholds = this.provider['calculateThresholds'](this.cachedPrices);
    }

    const state = currentPrice 
      ? this.provider.classifyPrice(currentPrice.price, this.cachedThresholds)
      : 'normal';

    return {
      currentPrice,
      state,
      thresholds: this.cachedThresholds,
      prices: this.cachedPrices
    };
  }

  private async refreshPricesIfNeeded(): Promise<void> {
    const now = new Date();
    const shouldRefresh = !this.lastFetch || 
      (now.getTime() - this.lastFetch.getTime()) > 60 * 60 * 1000; // 1 hour

    if (shouldRefresh) {
      const fromDate = new Date(now);
      fromDate.setDate(fromDate.getDate() - this.provider['config'].rollingDays);
      
      const toDate = new Date(now);
      toDate.setDate(toDate.getDate() + 2); // Include next 48 hours if available

      try {
        this.cachedPrices = await this.provider.fetchPrices(fromDate, toDate);
        this.cachedThresholds = undefined; // Reset to recalculate
        this.lastFetch = now;
      } catch (error) {
        console.error('Failed to fetch prices:', error);
        // Keep using cached data if available
      }
    }
  }

  async getNext24HourForecast(): Promise<PriceData[]> {
    await this.refreshPricesIfNeeded();
    
    const now = new Date();
    const next24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    
    return this.cachedPrices.filter(p => 
      p.timestamp >= now && p.timestamp <= next24Hours
    );
  }
}
