export type Resolution = 'PT60M' | 'PT15M';

export interface PricePoint {
  start: Date;
  end: Date;
  value: number;
  currency: string;
  resolution: Resolution;
}

export interface BiddingZone {
  code: string;
  eic: string;
  name: string;
  country: string;
}

// Swedish bidding zones with ENTSO-E EIC codes
export const SWEDISH_BIDDING_ZONES: BiddingZone[] = [
  { code: 'SE1', eic: '10Y1001A1001A44P', name: 'Northern Sweden', country: 'Sweden' },
  { code: 'SE2', eic: '10Y1001A1001A45N', name: 'Central Sweden', country: 'Sweden' },
  { code: 'SE3', eic: '10Y1001A1001A46L', name: 'Southern Sweden', country: 'Sweden' },
  { code: 'SE4', eic: '10Y1001A1001A47J', name: 'Malmö Area', country: 'Sweden' },
];

// Currency conversion rates (EUR to SEK)
export const EUR_TO_SEK_RATE = 11.50; // Default rate, should be configurable

export interface PriceProviderConfig {
  biddingZone: string;
  currency: 'EUR' | 'SEK';
  timezone: string;
  apiKey?: string;
}

export interface PriceProvider {
  name: string;
  fetchPrices(start: Date, end: Date, config: PriceProviderConfig): Promise<PricePoint[]>;
  isAvailable(): Promise<boolean>;
}

// Mock data for demo/offline use
export const MOCK_PRICE_DATA: PricePoint[] = [
  { start: new Date('2024-01-15T00:00:00Z'), end: new Date('2024-01-15T01:00:00Z'), value: 45.6, currency: 'SEK', resolution: 'PT60M' },
  { start: new Date('2024-01-15T01:00:00Z'), end: new Date('2024-01-15T02:00:00Z'), value: 42.1, currency: 'SEK', resolution: 'PT60M' },
  { start: new Date('2024-01-15T02:00:00Z'), end: new Date('2024-01-15T03:00:00Z'), value: 38.5, currency: 'SEK', resolution: 'PT60M' },
  { start: new Date('2024-01-15T03:00:00Z'), end: new Date('2024-01-15T04:00:00Z'), value: 35.2, currency: 'SEK', resolution: 'PT60M' },
  { start: new Date('2024-01-15T04:00:00Z'), end: new Date('2024-01-15T05:00:00Z'), value: 33.8, currency: 'SEK', resolution: 'PT60M' },
  { start: new Date('2024-01-15T05:00:00Z'), end: new Date('2024-01-15T06:00:00Z'), value: 36.4, currency: 'SEK', resolution: 'PT60M' },
  { start: new Date('2024-01-15T06:00:00Z'), end: new Date('2024-01-15T07:00:00Z'), value: 41.2, currency: 'SEK', resolution: 'PT60M' },
  { start: new Date('2024-01-15T07:00:00Z'), end: new Date('2024-01-15T08:00:00Z'), value: 55.8, currency: 'SEK', resolution: 'PT60M' },
  { start: new Date('2024-01-15T08:00:00Z'), end: new Date('2024-01-15T09:00:00Z'), value: 68.3, currency: 'SEK', resolution: 'PT60M' },
  { start: new Date('2024-01-15T09:00:00Z'), end: new Date('2024-01-15T10:00:00Z'), value: 72.1, currency: 'SEK', resolution: 'PT60M' },
  { start: new Date('2024-01-15T10:00:00Z'), end: new Date('2024-01-15T11:00:00Z'), value: 69.5, currency: 'SEK', resolution: 'PT60M' },
  { start: new Date('2024-01-15T11:00:00Z'), end: new Date('2024-01-15T12:00:00Z'), value: 71.2, currency: 'SEK', resolution: 'PT60M' },
  { start: new Date('2024-01-15T12:00:00Z'), end: new Date('2024-01-15T13:00:00Z'), value: 73.8, currency: 'SEK', resolution: 'PT60M' },
  { start: new Date('2024-01-15T13:00:00Z'), end: new Date('2024-01-15T14:00:00Z'), value: 75.4, currency: 'SEK', resolution: 'PT60M' },
  { start: new Date('2024-01-15T14:00:00Z'), end: new Date('2024-01-15T15:00:00Z'), value: 78.9, currency: 'SEK', resolution: 'PT60M' },
  { start: new Date('2024-01-15T15:00:00Z'), end: new Date('2024-01-15T16:00:00Z'), value: 82.1, currency: 'SEK', resolution: 'PT60M' },
  { start: new Date('2024-01-15T16:00:00Z'), end: new Date('2024-01-15T17:00:00Z'), value: 89.3, currency: 'SEK', resolution: 'PT60M' },
  { start: new Date('2024-01-15T17:00:00Z'), end: new Date('2024-01-15T18:00:00Z'), value: 95.7, currency: 'SEK', resolution: 'PT60M' },
  { start: new Date('2024-01-15T18:00:00Z'), end: new Date('2024-01-15T19:00:00Z'), value: 105.2, currency: 'SEK', resolution: 'PT60M' },
  { start: new Date('2024-01-15T19:00:00Z'), end: new Date('2024-01-15T20:00:00Z'), value: 98.6, currency: 'SEK', resolution: 'PT60M' },
  { start: new Date('2024-01-15T20:00:00Z'), end: new Date('2024-01-15T21:00:00Z'), value: 87.4, currency: 'SEK', resolution: 'PT60M' },
  { start: new Date('2024-01-15T21:00:00Z'), end: new Date('2024-01-15T22:00:00Z'), value: 73.2, currency: 'SEK', resolution: 'PT60M' },
  { start: new Date('2024-01-15T22:00:00Z'), end: new Date('2024-01-15T23:00:00Z'), value: 61.8, currency: 'SEK', resolution: 'PT60M' },
  { start: new Date('2024-01-15T23:00:00Z'), end: new Date('2024-01-16T00:00:00Z'), value: 52.3, currency: 'SEK', resolution: 'PT60M' },
];

// Mock Adapter
export class MockPriceAdapter implements PriceProvider {
  name = 'Mock Provider';

  async isAvailable(): Promise<boolean> {
    return true;
  }

  async fetchPrices(start: Date, end: Date, config: PriceProviderConfig): Promise<PricePoint[]> {
    // Return mock data filtered by date range
    return MOCK_PRICE_DATA.filter(point => 
      point.start >= start && point.start <= end
    );
  }
}

// ENTSO-E Adapter
export class EntsoeAdapter implements PriceProvider {
  name = 'ENTSO-E Transparency Platform';
  private baseUrl = 'https://web-api.tp.entsoe.eu/api';

  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(this.baseUrl, { method: 'HEAD' });
      return response.ok;
    } catch {
      return false;
    }
  }

  async fetchPrices(start: Date, end: Date, config: PriceProviderConfig): Promise<PricePoint[]> {
    if (!config.apiKey) {
      throw new Error('ENTSO-E API key is required');
    }

    const biddingZone = SWEDISH_BIDDING_ZONES.find(zone => zone.code === config.biddingZone);
    if (!biddingZone) {
      throw new Error(`Invalid bidding zone: ${config.biddingZone}`);
    }

    const params = new URLSearchParams({
      securityToken: config.apiKey,
      documentType: 'A44', // Day-ahead prices
      in_Domain: biddingZone.eic,
      out_Domain: biddingZone.eic,
      periodStart: this.formatDate(start),
      periodEnd: this.formatDate(end),
    });

    const response = await fetch(`${this.baseUrl}?${params}`);
    
    if (!response.ok) {
      throw new Error(`ENTSO-E API error: ${response.status} ${response.statusText}`);
    }

    const xmlText = await response.text();
    return this.parseXmlResponse(xmlText, config);
  }

  private formatDate(date: Date): string {
    // ENTSO-E expects format: yyyyMMddHHmm
    return date.toISOString()
      .slice(0, 16)
      .replace(/[-:T]/g, '')
      .slice(0, 12);
  }

  private parseXmlResponse(xml: string, config: PriceProviderConfig): PricePoint[] {
    // Basic XML parsing for day-ahead prices
    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, 'text/xml');
    
    const points: PricePoint[] = [];
    const timeSeries = doc.querySelectorAll('TimeSeries');
    
    timeSeries.forEach(series => {
      const resolutionNode = series.querySelector('Period > resolution');
      const resolution = (resolutionNode?.textContent || 'PT60M') as Resolution;
      
      const periodStart = series.querySelector('Period > timeInterval > start')?.textContent;
      if (!periodStart) return;
      
      const baseDate = new Date(periodStart);
      const pricePoints = series.querySelectorAll('Period > Point');
      
      pricePoints.forEach(point => {
        const position = parseInt(point.querySelector('position')?.textContent || '1');
        const price = parseFloat(point.querySelector('price\\.amount')?.textContent || '0');
        
        // Calculate start time based on position (1-based)
        const hourOffset = (position - 1);
        const start = new Date(baseDate.getTime() + hourOffset * 60 * 60 * 1000);
        const end = new Date(start.getTime() + 60 * 60 * 1000); // Add 1 hour
        
        let value = price;
        let currency = config.currency;
        
        // Convert EUR to SEK if needed
        if (config.currency === 'SEK' && price > 0) {
          value = price * EUR_TO_SEK_RATE;
        } else if (config.currency === 'EUR') {
          currency = 'EUR';
        }
        
        points.push({
          start,
          end,
          value,
          currency,
          resolution
        });
      });
    });
    
    return points.sort((a, b) => a.start.getTime() - b.start.getTime());
  }
}

// Nord Pool Adapter (optional, behind feature flag)
export class NordPoolAdapter implements PriceProvider {
  name = 'Nord Pool (Commercial)';
  private baseUrl = 'https://api.nordpoolgroup.com/api/dayahead/1';

  async isAvailable(): Promise<boolean> {
    return false; // Feature flagged - requires commercial license
  }

  async fetchPrices(start: Date, end: Date, config: PriceProviderConfig): Promise<PricePoint[]> {
    throw new Error('Nord Pool adapter requires commercial license');
  }
}

// ElprisetJustNu Adapter (Free Swedish prices)
export class ElprisetJustNuAdapter implements PriceProvider {
  name = 'Elpriset Just Nu (Free Swedish)';
  private baseUrl = 'https://www.elprisetjustnu.se/api/v1/prices';

  async isAvailable(): Promise<boolean> {
    try {
      // Test with a recent date to check if service is available
      const testDate = new Date();
      testDate.setDate(testDate.getDate() - 1); // Yesterday should be available
      const dateStr = this.formatDate(testDate);
      const response = await fetch(`${this.baseUrl}/${testDate.getFullYear()}/${dateStr}_SE3.json`, { method: 'HEAD' });
      return response.ok;
    } catch {
      return false;
    }
  }

  async fetchPrices(start: Date, end: Date, config: PriceProviderConfig): Promise<PricePoint[]> {
    const biddingZone = SWEDISH_BIDDING_ZONES.find(zone => zone.code === config.biddingZone);
    if (!biddingZone) {
      throw new Error(`Invalid bidding zone: ${config.biddingZone}`);
    }

    const points: PricePoint[] = [];
    const currentDate = new Date(start);
    
    // Fetch data for each day in the range
    while (currentDate <= end) {
      try {
        const dateStr = this.formatDate(currentDate);
        const year = currentDate.getFullYear();
        const url = `${this.baseUrl}/${year}/${dateStr}_${config.biddingZone}.json`;
        
        const response = await fetch(url);
        if (!response.ok) {
          console.warn(`ElprisetJustNu: No data available for ${dateStr} ${config.biddingZone}`);
          currentDate.setDate(currentDate.getDate() + 1);
          continue;
        }

        const data = await response.json();
        const dayPoints = this.parseApiResponse(data, config);
        
        // Filter points within the requested time range
        const filteredPoints = dayPoints.filter(point => 
          point.start >= start && point.start <= end
        );
        
        points.push(...filteredPoints);
      } catch (error) {
        console.warn(`ElprisetJustNu: Failed to fetch data for ${this.formatDate(currentDate)}:`, error);
      }
      
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return points.sort((a, b) => a.start.getTime() - b.start.getTime());
  }

  private formatDate(date: Date): string {
    // Format as MM-DD for API endpoint
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${month}-${day}`;
  }

  private parseApiResponse(data: any[], config: PriceProviderConfig): PricePoint[] {
    if (!Array.isArray(data)) {
      throw new Error('Invalid API response format');
    }

    return data.map(item => {
      const start = new Date(item.time_start);
      const end = new Date(item.time_end);
      
      // Use the appropriate currency based on config
      let value: number;
      let currency: string;
      
      if (config.currency === 'EUR') {
        value = item.EUR_per_kWh;
        currency = 'EUR';
      } else {
        value = item.SEK_per_kWh;
        currency = 'SEK';
      }

      // Determine resolution based on time difference
      const duration = end.getTime() - start.getTime();
      const resolution: Resolution = duration === 15 * 60 * 1000 ? 'PT15M' : 'PT60M';

      return {
        start,
        end,
        value,
        currency,
        resolution
      };
    });
  }
}

// Price Provider Factory
export class PriceProviderFactory {
  private providers: Map<string, PriceProvider> = new Map([
    ['mock', new MockPriceAdapter()],
    ['entsoe', new EntsoeAdapter()],
    ['elpriset', new ElprisetJustNuAdapter()],
    ['nordpool', new NordPoolAdapter()],
  ]);

  getProvider(name: string): PriceProvider {
    const provider = this.providers.get(name);
    if (!provider) {
      throw new Error(`Unknown price provider: ${name}`);
    }
    return provider;
  }

  getAvailableProviders(): string[] {
    return Array.from(this.providers.keys());
  }
}

// Updated utility functions for new PricePoint interface
export function calculateRollingAverage(prices: PricePoint[], days: number): { average: number, actualDays: number } {
  if (prices.length === 0) return { average: 0, actualDays: 0 };
  
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  
  const recentPrices = prices.filter(p => p.start >= cutoffDate);
  
  // If we don't have enough data for the requested days, use all available data
  let actualDays = days;
  if (recentPrices.length === 0) {
    // Use all available prices if no recent data
    const allPrices = prices.slice();
    if (allPrices.length === 0) return { average: 0, actualDays: 0 };
    
    // Calculate how many days of data we actually have
    const oldestPrice = Math.min(...allPrices.map(p => p.start.getTime()));
    const newestPrice = Math.max(...allPrices.map(p => p.start.getTime()));
    const availableDays = Math.ceil((newestPrice - oldestPrice) / (24 * 60 * 60 * 1000)) + 1;
    actualDays = Math.min(days, availableDays);
    
    const sum = allPrices.reduce((acc, p) => acc + p.value, 0);
    return { average: sum / allPrices.length, actualDays };
  }
  
  // Calculate actual days of data we have
  if (recentPrices.length > 0) {
    const oldestRecent = Math.min(...recentPrices.map(p => p.start.getTime()));
    const newestRecent = Math.max(...recentPrices.map(p => p.start.getTime()));
    const availableDays = Math.ceil((newestRecent - oldestRecent) / (24 * 60 * 60 * 1000)) + 1;
    actualDays = Math.min(days, availableDays);
  }
  
  const sum = recentPrices.reduce((acc, p) => acc + p.value, 0);
  return { average: sum / recentPrices.length, actualDays };
}

export function classifyPrice(currentPrice: number, rollingAverage: number, method: 'percent' | 'percentile', config: any): 'low' | 'normal' | 'high' {
  if (method === 'percent') {
    const deltaPercent = config.deltaPercent || 15;
    const lowThreshold = rollingAverage * (1 - deltaPercent / 100);
    const highThreshold = rollingAverage * (1 + deltaPercent / 100);
    
    if (currentPrice < lowThreshold) return 'low';
    if (currentPrice > highThreshold) return 'high';
    return 'normal';
  } else {
    // Percentile method would need historical data for percentile calculation
    // For now, use the same logic as percent method
    return classifyPrice(currentPrice, rollingAverage, 'percent', config);
  }
}

// Main service function using the provider pattern
export async function fetchPrices(
  provider: string = 'mock',
  config: PriceProviderConfig,
  start?: Date,
  end?: Date
): Promise<PricePoint[]> {
  const factory = new PriceProviderFactory();
  const priceProvider = factory.getProvider(provider);
  
  const startDate = start || new Date();
  const endDate = end || new Date(startDate.getTime() + 24 * 60 * 60 * 1000); // Next 24h
  
  return priceProvider.fetchPrices(startDate, endDate, config);
}