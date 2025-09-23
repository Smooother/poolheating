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
      // Fetch and store Tibber prices
      const result = await fetchTibberPrices();
      return res.status(200).json(result);
    }

    if (req.method === 'GET') {
      // Check Tibber integration status
      const hasToken = !!process.env.TIBBER_API_TOKEN;
      const isAvailable = isPriceDataAvailable();
      
      return res.status(200).json({
        success: true,
        has_token: hasToken,
        price_data_available: isAvailable,
        next_release_time: getNextPriceReleaseTime().toISOString(),
        message: hasToken ? 'Tibber integration ready' : 'Tibber API token not configured'
      });
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Tibber prices API error:', error);
    res.status(500).json({ error: error.message });
  }
}

async function fetchTibberPrices() {
  const TIBBER_API_URL = 'https://api.tibber.com/v1-beta/gql';
  const TIBBER_TOKEN = process.env.TIBBER_API_TOKEN;

  if (!TIBBER_TOKEN) {
    return {
      success: false,
      message: 'Tibber API token not configured. Please add TIBBER_API_TOKEN to environment variables.'
    };
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
    console.log('🔄 Fetching prices from Tibber...');
    
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
    
    if (data.data?.viewer?.homes?.[0]?.currentSubscription?.priceInfo) {
      const priceInfo = data.data.viewer.homes[0].currentSubscription.priceInfo;
      
      // Get all available prices: today, tomorrow, and historical range
      const todayPrices = priceInfo.today || [];
      const tomorrowPrices = priceInfo.tomorrow || [];
      const historicalPrices = priceInfo.range?.nodes || [];
      
      // Combine all prices
      const allPrices = [...todayPrices, ...tomorrowPrices, ...historicalPrices];
      
      // Filter for last 30 days (720 hours) to avoid duplicates and limit data
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const relevantPrices = allPrices.filter(price => {
        const priceDate = new Date(price.startsAt);
        return priceDate >= thirtyDaysAgo;
      });

      if (relevantPrices.length === 0) {
        return {
          success: false,
          message: 'No relevant prices found in the last 30 days'
        };
      }

      // Store prices in database
      const priceData = relevantPrices.map(price => {
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
          onConflict: 'bidding_zone,start_time',
          ignoreDuplicates: false 
        });

      if (error) {
        console.error('Failed to store Tibber prices:', error);
        throw error;
      }

      console.log(`✅ Stored ${priceData.length} Tibber prices`);

      return {
        success: true,
        pricesCount: relevantPrices.length,
        message: `Successfully fetched and stored ${relevantPrices.length} prices from Tibber (last 30 days)`,
        prices: relevantPrices.slice(0, 5).map(p => ({ // Show only first 5 for preview
          time: p.startsAt,
          price: p.total,
          currency: p.currency
        })),
        historicalData: true,
        dateRange: {
          from: thirtyDaysAgo.toISOString(),
          to: new Date().toISOString()
        }
      };
    }

    throw new Error('No price data received from Tibber');
  } catch (error) {
    console.error('Tibber API error:', error);
    return {
      success: false,
      message: `Failed to fetch Tibber prices: ${error.message}`
    };
  }
}

function isPriceDataAvailable() {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const priceReleaseTime = new Date(today.getTime() + (13 * 60 + 20) * 60 * 1000); // 13:20
  
  return now >= priceReleaseTime;
}

function getNextPriceReleaseTime() {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const priceReleaseTime = new Date(today.getTime() + (13 * 60 + 20) * 60 * 1000); // 13:20
  
  // If it's already past 13:20 today, return tomorrow's 13:20
  if (now >= priceReleaseTime) {
    return new Date(priceReleaseTime.getTime() + 24 * 60 * 60 * 1000);
  }
  
  return priceReleaseTime;
}
