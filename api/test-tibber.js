export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const TIBBER_API_URL = 'https://api.tibber.com/v1-beta/gql';
    const TIBBER_TOKEN = '7C4E8962A1B225186BEF2E7EC5B5D3E5760BC6A789DEE2F020C8C78D7BFEB36D-1';

    const query = `
      query {
        viewer {
          homes {
            address {
              address1
              city
            }
            currentSubscription {
              priceInfo {
                current {
                  total
                  level
                }
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

    console.log('🔄 Testing Tibber API...');
    
    const response = await fetch(TIBBER_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TIBBER_TOKEN}`
      },
      body: JSON.stringify({ query })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (data.errors) {
      return res.status(400).json({
        success: false,
        errors: data.errors,
        message: 'Tibber API returned errors'
      });
    }

    const homes = data.data?.viewer?.homes || [];
    
    // Calculate some statistics
    const stats = homes.map(home => {
      const priceInfo = home.currentSubscription.priceInfo;
      const todayPrices = priceInfo.today.map(p => p.total);
      const minPrice = Math.min(...todayPrices);
      const maxPrice = Math.max(...todayPrices);
      const avgPrice = todayPrices.reduce((a, b) => a + b, 0) / todayPrices.length;
      
      return {
        address: `${home.address.address1}, ${home.address.city}`,
        currentPrice: priceInfo.current.total,
        currentLevel: priceInfo.current.level,
        todayStats: {
          min: minPrice,
          max: maxPrice,
          avg: avgPrice,
          count: todayPrices.length
        },
        tomorrowCount: priceInfo.tomorrow.length
      };
    });

    return res.status(200).json({
      success: true,
      message: 'Tibber API test successful',
      homes: stats,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Tibber API test error:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      message: 'Tibber API test failed'
    });
  }
}
