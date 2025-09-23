import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export interface TibberPrice {
  startsAt: string;
  total: number;
  energy: number;
  tax: number;
  currency: string;
}

export interface TibberResponse {
  data: {
    viewer: {
      homes: Array<{
        currentSubscription: {
          priceInfo: {
            today: TibberPrice[];
            tomorrow: TibberPrice[];
          };
        };
      }>;
    };
  };
}

export class TibberService {
  private static readonly TIBBER_API_URL = 'https://api.tibber.com/v1-beta/gql';
  private static readonly TIBBER_TOKEN = process.env.TIBBER_API_TOKEN;

  /**
   * Fetch electricity prices from Tibber API
   */
  static async fetchPrices(): Promise<TibberPrice[]> {
    if (!this.TIBBER_TOKEN) {
      throw new Error('Tibber API token not configured');
    }

    const query = `
      query {
        viewer {
          homes {
            currentSubscription {
              priceInfo {
                today {
                  startsAt
                  total
                  energy
                  tax
                  currency
                }
                tomorrow {
                  startsAt
                  total
                  energy
                  tax
                  currency
                }
              }
            }
          }
        }
      }
    `;

    try {
      const response = await fetch(this.TIBBER_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.TIBBER_TOKEN}`
        },
        body: JSON.stringify({ query })
      });

      if (!response.ok) {
        throw new Error(`Tibber API error: ${response.status} ${response.statusText}`);
      }

      const data: TibberResponse = await response.json();
      
      if (data.data?.viewer?.homes?.[0]?.currentSubscription?.priceInfo) {
        const priceInfo = data.data.viewer.homes[0].currentSubscription.priceInfo;
        return [...priceInfo.today, ...priceInfo.tomorrow];
      }

      throw new Error('No price data received from Tibber');
    } catch (error) {
      console.error('Tibber API error:', error);
      throw error;
    }
  }

  /**
   * Store Tibber prices in database
   */
  static async storePrices(prices: TibberPrice[], biddingZone: string = 'SE3'): Promise<void> {
    const priceData = prices.map(price => ({
      bidding_zone: biddingZone,
      start_time: new Date(price.startsAt).toISOString(),
      price_value: price.total.toString(),
      currency: price.currency,
      energy_price: price.energy.toString(),
      tax_price: price.tax.toString(),
      source: 'tibber'
    }));

    const { error } = await supabase
      .from('price_data')
      .upsert(priceData, { 
        onConflict: 'bidding_zone,start_time',
        ignoreDuplicates: false 
      });

    if (error) {
      console.error('Failed to store Tibber prices:', error);
      throw error;
    }

    console.log(`✅ Stored ${priceData.length} Tibber prices`);
  }

  /**
   * Fetch and store today's prices from Tibber
   */
  static async fetchAndStoreTodayPrices(biddingZone: string = 'SE3'): Promise<{
    success: boolean;
    pricesCount: number;
    message: string;
  }> {
    try {
      console.log('🔄 Fetching prices from Tibber...');
      
      const prices = await this.fetchPrices();
      
      // Filter for today and tomorrow only
      const today = new Date();
      const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
      
      const relevantPrices = prices.filter(price => {
        const priceDate = new Date(price.startsAt);
        return priceDate >= today && priceDate < tomorrow;
      });

      if (relevantPrices.length === 0) {
        return {
          success: false,
          pricesCount: 0,
          message: 'No relevant prices found for today/tomorrow'
        };
      }

      await this.storePrices(relevantPrices, biddingZone);

      return {
        success: true,
        pricesCount: relevantPrices.length,
        message: `Successfully fetched and stored ${relevantPrices.length} prices from Tibber`
      };
    } catch (error) {
      console.error('Tibber price fetch failed:', error);
      return {
        success: false,
        pricesCount: 0,
        message: `Failed to fetch Tibber prices: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Check if Tibber prices are available (after 13:20)
   */
  static isPriceDataAvailable(): boolean {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const priceReleaseTime = new Date(today.getTime() + (13 * 60 + 20) * 60 * 1000); // 13:20
    
    return now >= priceReleaseTime;
  }

  /**
   * Get next price release time
   */
  static getNextPriceReleaseTime(): Date {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const priceReleaseTime = new Date(today.getTime() + (13 * 60 + 20) * 60 * 1000); // 13:20
    
    // If it's already past 13:20 today, return tomorrow's 13:20
    if (now >= priceReleaseTime) {
      return new Date(priceReleaseTime.getTime() + 24 * 60 * 60 * 1000);
    }
    
    return priceReleaseTime;
  }
}
