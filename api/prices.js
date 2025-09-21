import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  // Enable CORS for mobile app
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (req.method === 'GET') {
      const { zone = 'SE3', hours = 24 } = req.query;
      
      // Get current and future price data
      const now = new Date();
      const startTime = new Date(now.getTime() - 3600000); // 1 hour ago
      const endTime = new Date(now.getTime() + (hours * 3600000));

      const { data: prices } = await supabase
        .from('price_data')
        .select('*')
        .eq('bidding_zone', zone)
        .gte('start_time', startTime.toISOString())
        .lte('start_time', endTime.toISOString())
        .order('start_time', { ascending: true });

      // Get current price
      const currentHour = new Date();
      currentHour.setMinutes(0, 0, 0);
      
      const currentPrice = prices.find(p => {
        const priceTime = new Date(p.start_time);
        return priceTime.getTime() === currentHour.getTime();
      });

      return res.status(200).json({
        currentPrice: currentPrice || null,
        prices: prices || [],
        zone,
        lastUpdated: new Date().toISOString()
      });
    }

    if (req.method === 'POST') {
      // Trigger price collection
      const result = await collectPriceData();
      return res.status(200).json(result);
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Prices API error:', error);
    res.status(500).json({ error: error.message });
  }
}

async function collectPriceData() {
  const BIDDING_ZONES = ['SE1', 'SE2', 'SE3', 'SE4'];
  let totalSaved = 0;

  for (const zone of BIDDING_ZONES) {
    try {
      // Get the last data date for this zone
      const { data: lastData } = await supabase
        .from('price_data')
        .select('start_time')
        .eq('bidding_zone', zone)
        .order('start_time', { ascending: false })
        .limit(1);

      let startDate = new Date();
      startDate.setHours(0, 0, 0, 0);
      
      if (lastData && lastData.length > 0) {
        const lastDate = new Date(lastData[0].start_time);
        startDate = new Date(lastDate.getTime() + 24 * 60 * 60 * 1000);
      }

      // Fetch data for today and tomorrow
      const today = new Date();
      const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
      
      for (const date of [today, tomorrow]) {
        const prices = await fetchElprisetData(zone, date);
        if (prices.length > 0) {
          await savePriceData(prices, zone);
          totalSaved += prices.length;
        }
        
        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    } catch (error) {
      console.error(`Error collecting data for zone ${zone}:`, error);
    }
  }

  return {
    success: true,
    message: `Collected and saved ${totalSaved} price points`,
    timestamp: new Date().toISOString()
  };
}

async function fetchElprisetData(zone, date) {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const dateStr = `${month}-${day}`;
  
  const url = `https://www.elprisetjustnu.se/api/v1/prices/${year}/${dateStr}_${zone}.json`;
  
  try {
    console.log(`Fetching price data for ${zone} on ${dateStr}:`, url);
    const response = await fetch(url);
    if (!response.ok) {
      console.warn(`No data available for ${zone} on ${dateStr}: ${response.status}`);
      return [];
    }
    
    const data = await response.json();
    
    if (!Array.isArray(data)) {
      console.error(`Invalid response format for ${zone} on ${dateStr}`);
      return [];
    }
    
    return data.map(item => ({
      start: new Date(item.time_start),
      end: new Date(item.time_end),
      value: item.SEK_per_kWh,
      currency: 'SEK',
      resolution: 'PT60M'
    }));
  } catch (error) {
    console.error(`Error fetching data for ${zone} on ${dateStr}:`, error);
    return [];
  }
}

async function savePriceData(prices, zone) {
  if (prices.length === 0) return;

  const data = prices.map(point => ({
    bidding_zone: zone,
    start_time: point.start.toISOString(),
    end_time: point.end.toISOString(),
    price_value: point.value,
    currency: point.currency,
    provider: 'elpriset',
    resolution: point.resolution
  }));

  // Use upsert to handle duplicates
  const { data: result, error } = await supabase
    .from('price_data')
    .upsert(data, { 
      onConflict: 'bidding_zone,start_time,provider',
      ignoreDuplicates: false 
    });

  if (error) {
    console.error(`Failed to save price data for ${zone}:`, error);
    throw error;
  }

  console.log(`Saved ${data.length} price points for ${zone}`);
}