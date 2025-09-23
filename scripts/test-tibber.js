#!/usr/bin/env node

// Test Tibber API integration
const TIBBER_API_URL = 'https://api.tibber.com/v1-beta/gql';
const TIBBER_TOKEN = '7C4E8962A1B225186BEF2E7EC5B5D3E5760BC6A789DEE2F020C8C78D7BFEB36D-1';

if (!TIBBER_TOKEN) {
  console.error('❌ TIBBER_API_TOKEN not found in environment variables');
  console.log('Please add TIBBER_API_TOKEN to your .env file');
  process.exit(1);
}

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

async function testTibberAPI() {
  console.log('🔄 Testing Tibber API integration...');
  console.log(`Token: ${TIBBER_TOKEN.substring(0, 10)}...`);

  try {
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
      console.error('❌ Tibber API Errors:');
      data.errors.forEach(error => {
        console.error(`  - ${error.message}`);
      });
      return;
    }

    console.log('✅ Tibber API connection successful!');
    
    const homes = data.data?.viewer?.homes || [];
    console.log(`📊 Found ${homes.length} homes`);
    
    homes.forEach((home, index) => {
      console.log(`\n🏠 Home ${index + 1}:`);
      console.log(`   Address: ${home.address.address1}, ${home.address.city}`);
      
      const priceInfo = home.currentSubscription.priceInfo;
      console.log(`   Current Price: ${priceInfo.current.total.toFixed(4)} SEK/kWh (${priceInfo.current.level})`);
      console.log(`   Today's Prices: ${priceInfo.today.length} hours`);
      console.log(`   Tomorrow's Prices: ${priceInfo.tomorrow.length} hours`);
      
      // Show price range for today
      const todayPrices = priceInfo.today.map(p => p.total);
      const minPrice = Math.min(...todayPrices);
      const maxPrice = Math.max(...todayPrices);
      const avgPrice = todayPrices.reduce((a, b) => a + b, 0) / todayPrices.length;
      
      console.log(`   Today's Range: ${(minPrice * 100).toFixed(1)} - ${(maxPrice * 100).toFixed(1)} öre/kWh`);
      console.log(`   Today's Average: ${(avgPrice * 100).toFixed(1)} öre/kWh`);
    });

    // Test price data availability
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const priceReleaseTime = new Date(today.getTime() + (13 * 60 + 20) * 60 * 1000); // 13:20
    
    console.log(`\n⏰ Price Data Availability:`);
    console.log(`   Current Time: ${now.toLocaleString('sv-SE')}`);
    console.log(`   Price Release Time: ${priceReleaseTime.toLocaleString('sv-SE')}`);
    console.log(`   Data Available: ${now >= priceReleaseTime ? '✅ Yes' : '⏰ Not yet (released at 13:20)'}`);
    
    if (now >= priceReleaseTime && homes.length > 0) {
      console.log(`\n📈 Sample Prices for Today:`);
      const priceInfo = homes[0].currentSubscription.priceInfo;
      const samplePrices = priceInfo.today.slice(0, 5);
      samplePrices.forEach(price => {
        const time = new Date(price.startsAt).toLocaleTimeString('sv-SE');
        const priceInOre = (price.total * 100).toFixed(1);
        console.log(`   ${time}: ${priceInOre} öre/kWh`);
      });
    }

  } catch (error) {
    console.error('❌ Tibber API Test Failed:');
    console.error(`   Error: ${error.message}`);
  }
}

testTibberAPI();
