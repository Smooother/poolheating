import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (req.method === 'POST') {
      // Fetch and store historical Tibber prices
      const result = await fetchHistoricalTibberPrices();
      return res.status(200).json(result);
    }

    if (req.method === 'GET') {
      // Get historical data status
      const status = await getHistoricalDataStatus();
      return res.status(200).json(status);
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Tibber historical API error:', error);
    res.status(500).json({ error: error.message });
  }
}

async function fetchHistoricalTibberPrices() {
  const TIBBER_API_URL = 'https://api.tibber.com/v1-beta/gql';
  const TIBBER_TOKEN = process.env.TIBBER_API_TOKEN;

  if (!TIBBER_TOKEN) {
    return {
      success: false,
      message: 'Tibber API token not configured. Please add TIBBER_API_TOKEN to environment variables.'
    };
  }

  // Query for last 30 days of historical data (720 hours)
  const query = `
    query {
      viewer {
        homes {
          currentSubscription {
            priceInfo {
              range(resolution: HOURLY, last: 720) {
                nodes {
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
    }
  `;

  try {
    console.log('🔄 Fetching historical prices from Tibber (last 30 days)...');
    
    const response = await fetch(TIBBER_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TIBBER_TOKEN}`
      },
      body: JSON.stringify({ query })
    });

    if (!response.ok) {
      throw new Error(`Tibber API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    if (data.data?.viewer?.homes?.[0]?.currentSubscription?.priceInfo?.range?.nodes) {
      const historicalPrices = data.data.viewer.homes[0].currentSubscription.priceInfo.range.nodes;
      
      if (historicalPrices.length === 0) {
        return {
          success: false,
          message: 'No historical price data available from Tibber'
        };
      }

      // Store historical prices in database
      const priceData = historicalPrices.map(price => {
        const startTime = new Date(price.startsAt);
        const endTime = new Date(startTime.getTime() + 60 * 60 * 1000); // 1 hour later
        
        return {
          bidding_zone: 'SE3', // Default to SE3, can be made configurable
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString(),
          price_value: price.total.toString(),
          currency: price.currency,
          energy_price: price.energy.toString(),
          tax_price: price.tax.toString(),
          net_fee: null, // Tibber doesn't provide net fee separately
          source: 'tibber',
          provider: 'tibber',
          resolution: 'PT60M'
        };
      });

      const { error } = await supabase
        .from('price_data')
        .upsert(priceData, { 
          onConflict: 'bidding_zone,start_time,provider',
          ignoreDuplicates: false 
        });

      if (error) {
        console.error('Failed to store historical Tibber prices:', error);
        throw error;
      }

      console.log(`✅ Stored ${priceData.length} historical Tibber prices`);

      // Calculate date range
      const oldestPrice = historicalPrices[historicalPrices.length - 1];
      const newestPrice = historicalPrices[0];
      const dateRange = {
        from: new Date(oldestPrice.startsAt).toISOString(),
        to: new Date(newestPrice.startsAt).toISOString()
      };

      return {
        success: true,
        pricesCount: historicalPrices.length,
        message: `Successfully fetched and stored ${historicalPrices.length} historical prices from Tibber`,
        dateRange: dateRange,
        samplePrices: historicalPrices.slice(0, 3).map(p => ({
          time: p.startsAt,
          price: p.total,
          currency: p.currency
        }))
      };
    }

    throw new Error('No historical price data received from Tibber');
  } catch (error) {
    console.error('Tibber historical API error:', error);
    return {
      success: false,
      message: `Failed to fetch historical Tibber prices: ${error.message}`
    };
  }
}

async function getHistoricalDataStatus() {
  try {
    // Check how much historical Tibber data we have
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: tibberData, error } = await supabase
      .from('price_data')
      .select('start_time, price_value')
      .eq('provider', 'tibber')
      .gte('start_time', thirtyDaysAgo.toISOString())
      .order('start_time', { ascending: true });

    if (error) {
      throw error;
    }

    const { data: elprisetData } = await supabase
      .from('price_data')
      .select('start_time, price_value')
      .eq('provider', 'elpriset')
      .gte('start_time', thirtyDaysAgo.toISOString())
      .order('start_time', { ascending: true });

    return {
      success: true,
      tibber: {
        count: tibberData?.length || 0,
        hasData: (tibberData?.length || 0) > 0,
        oldestDate: tibberData?.[0]?.start_time || null,
        newestDate: tibberData?.[tibberData.length - 1]?.start_time || null
      },
      elpriset: {
        count: elprisetData?.length || 0,
        hasData: (elprisetData?.length || 0) > 0,
        oldestDate: elprisetData?.[0]?.start_time || null,
        newestDate: elprisetData?.[elprisetData.length - 1]?.start_time || null
      },
      message: 'Historical data status retrieved successfully'
    };
  } catch (error) {
    console.error('Failed to get historical data status:', error);
    return {
      success: false,
      message: `Failed to get historical data status: ${error.message}`
    };
  }
}
