import { supabase } from "@/integrations/supabase/client";
import { PricePoint } from "./priceService";

export interface StoredPriceData {
  id: string;
  bidding_zone: string;
  start_time: string;
  end_time: string;
  price_value: number;
  currency: string;
  provider: string;
  resolution: string;
  created_at: string;
  updated_at: string;
}

// Convert stored data to PricePoint format
export function convertToPricePoint(stored: StoredPriceData): PricePoint {
  return {
    start: new Date(stored.start_time),
    end: new Date(stored.end_time),
    value: stored.price_value,
    currency: stored.currency,
    resolution: stored.resolution as 'PT60M' | 'PT15M'
  };
}

// Fetch price data from Supabase
export async function fetchStoredPrices(
  biddingZone: string,
  startDate: Date,
  endDate: Date,
  provider = 'elpriset'
): Promise<PricePoint[]> {
  const { data, error } = await supabase
    .from('price_data')
    .select('*')
    .eq('bidding_zone', biddingZone)
    .eq('provider', provider)
    .gte('start_time', startDate.toISOString())
    .lte('start_time', endDate.toISOString())
    .order('start_time', { ascending: true });

  if (error) {
    console.error('Error fetching stored prices:', error);
    throw new Error(`Failed to fetch price data: ${error.message}`);
  }

  return data.map(convertToPricePoint);
}

// Get the latest available price data date
export async function getLatestPriceDate(biddingZone: string, provider = 'elpriset'): Promise<Date | null> {
  const { data, error } = await supabase
    .from('price_data')
    .select('start_time')
    .eq('bidding_zone', biddingZone)
    .eq('provider', provider)
    .order('start_time', { ascending: false })
    .limit(1);

  if (error) {
    console.error('Error fetching latest price date:', error);
    return null;
  }

  return data.length > 0 ? new Date(data[0].start_time) : null;
}

// Trigger daily price collection
export async function triggerPriceCollection(): Promise<void> {
  const { data, error } = await supabase.functions.invoke('daily-price-collector');
  
  if (error) {
    console.error('Error triggering price collection:', error);
    throw new Error(`Failed to trigger price collection: ${error.message}`);
  }
  
  console.log('Price collection triggered:', data);
}