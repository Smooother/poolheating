#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkPriceAverage() {
  console.log('🔍 Checking current price data and 7-day average...');
  
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
  
  console.log(`📅 Date range: ${sevenDaysAgo.toISOString()} to ${now.toISOString()}`);
  
  // Get all price data for SE3 in the last 7 days
  const { data: priceData, error } = await supabase
    .from('price_data')
    .select('*')
    .eq('bidding_zone', 'SE3')
    .gte('start_time', sevenDaysAgo.toISOString())
    .lte('start_time', now.toISOString())
    .order('start_time', { ascending: true });
  
  if (error) {
    console.error('❌ Error fetching price data:', error);
    return;
  }
  
  if (!priceData || priceData.length === 0) {
    console.log('⚠️  No price data found in the last 7 days');
    return;
  }
  
  console.log(`📊 Found ${priceData.length} price points in the last 7 days`);
  
  // Calculate average
  const total = priceData.reduce((sum, p) => sum + parseFloat(p.price_value), 0);
  const average = total / priceData.length;
  
  console.log(`📈 7-day average price: ${average.toFixed(4)} SEK/kWh`);
  
  // Get current price
  const currentHour = new Date();
  currentHour.setMinutes(0, 0, 0);
  
  const currentPrice = priceData.find(p => {
    const priceTime = new Date(p.start_time);
    return priceTime.getTime() === currentHour.getTime();
  });
  
  if (currentPrice) {
    console.log(`⚡ Current price: ${parseFloat(currentPrice.price_value).toFixed(4)} SEK/kWh`);
    console.log(`🕐 Current hour: ${currentPrice.start_time}`);
  } else {
    console.log('⚠️  No current hour price found');
  }
  
  // Show price range
  const prices = priceData.map(p => parseFloat(p.price_value));
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  
  console.log(`📊 Price range: ${minPrice.toFixed(4)} - ${maxPrice.toFixed(4)} SEK/kWh`);
  
  // Show recent prices (last 6 hours)
  const recentPrices = priceData.slice(-6);
  console.log('\n🕐 Recent prices (last 6 hours):');
  recentPrices.forEach(p => {
    const time = new Date(p.start_time);
    const price = parseFloat(p.price_value);
    console.log(`  ${time.toLocaleString('sv-SE')}: ${price.toFixed(4)} SEK/kWh`);
  });
}

checkPriceAverage().catch(console.error);
