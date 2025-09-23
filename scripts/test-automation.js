#!/usr/bin/env node

// Test automation logic with current price data
const currentPrice = 1.12279; // Current price from API (112 öre = 1.12 SEK/kWh)
const averagePrice = 0.463; // Today's average price (real data from elprisetjustnu.se)

// Current settings
const highPriceThreshold = 1.50; // Absolute threshold for shutdown
const lowMultiplier = 0.80; // 80% of average = LOW (aggressive heating)
const highMultiplier = 1.30; // 130% of average = HIGH (reduced heating)

function classifyPrice(currentPrice, averagePrice, highPriceThreshold) {
  // Absolute high price threshold - pump shutdown
  if (currentPrice >= highPriceThreshold) {
    return 'shutdown';
  }
  
  // Relative thresholds based on average
  const LOW_THRESHOLD = averagePrice * lowMultiplier;   // At or below average = LOW
  const HIGH_THRESHOLD = averagePrice * highMultiplier;  // 60% above average = HIGH
  
  if (currentPrice <= LOW_THRESHOLD) return 'low';
  if (currentPrice >= HIGH_THRESHOLD) return 'high';
  return 'normal';
}

function calculateOptimalPumpTemp(currentPrice, averagePrice, currentPumpTemp, targetPoolTemp, settings) {
  const baselineTemp = currentPumpTemp || targetPoolTemp;
  let newTemp = baselineTemp;
  let shouldShutdown = false;
  let reason = '';

  const priceClassification = classifyPrice(currentPrice, averagePrice, settings.high_price_threshold);
  
  if (priceClassification === 'shutdown') {
    shouldShutdown = true;
    reason = `SHUTDOWN price (${currentPrice.toFixed(3)} SEK/kWh) - pump turned off (threshold: ${settings.high_price_threshold} SEK/kWh)`;
  } else if (priceClassification === 'low') {
    newTemp = Math.min(settings.max_pump_temp, baselineTemp + 2);
    reason = `LOW price (${currentPrice.toFixed(3)} SEK/kWh) - aggressive heating +2°C (avg: ${averagePrice.toFixed(3)})`;
  } else if (priceClassification === 'high') {
    newTemp = Math.max(settings.min_pump_temp, baselineTemp - 2);
    reason = `HIGH price (${currentPrice.toFixed(3)} SEK/kWh) - reduced heating -2°C (avg: ${averagePrice.toFixed(3)})`;
  } else {
    newTemp = baselineTemp;
    reason = `NORMAL price (${currentPrice.toFixed(3)} SEK/kWh) - baseline temperature (avg: ${averagePrice.toFixed(3)})`;
  }

  return {
    newTemp: Math.round(newTemp),
    shouldShutdown,
    reason,
    classification: priceClassification
  };
}

// Test with current settings
console.log('🔍 Current Automation Analysis');
console.log('================================');
console.log(`Current Price: ${currentPrice} SEK/kWh`);
console.log(`Estimated 7-day Average: ${averagePrice} SEK/kWh`);
console.log(`High Price Threshold: ${highPriceThreshold} SEK/kWh`);
console.log('');

const settings = {
  high_price_threshold: highPriceThreshold,
  min_pump_temp: 18,
  max_pump_temp: 35
};

const result = calculateOptimalPumpTemp(currentPrice, averagePrice, 28, 28, settings);

console.log(`Price Classification: ${result.classification.toUpperCase()}`);
console.log(`Reason: ${result.reason}`);
console.log(`New Temperature: ${result.newTemp}°C`);
console.log(`Should Shutdown: ${result.shouldShutdown}`);
console.log('');

// Test with more aggressive settings
console.log('🛠️  Suggested Adjustments');
console.log('==========================');

// Option 1: Lower the high multiplier (more sensitive to high prices)
const newHighMultiplier = 1.15; // 115% instead of 130%
const newHighThreshold = averagePrice * newHighMultiplier;

console.log(`Option 1: Lower high multiplier to ${newHighMultiplier}`);
console.log(`New HIGH threshold: ${newHighThreshold.toFixed(3)} SEK/kWh`);
console.log(`Current price ${currentPrice} vs threshold ${newHighThreshold.toFixed(3)}: ${currentPrice >= newHighThreshold ? 'HIGH' : 'NORMAL'}`);
console.log('');

// Option 2: Lower the absolute high price threshold
const newAbsoluteThreshold = 0.80; // 0.80 instead of 1.50
console.log(`Option 2: Lower absolute threshold to ${newAbsoluteThreshold} SEK/kWh`);
console.log(`Current price ${currentPrice} vs threshold ${newAbsoluteThreshold}: ${currentPrice >= newAbsoluteThreshold ? 'SHUTDOWN' : 'NORMAL'}`);
console.log('');

// Option 3: Use absolute thresholds instead of relative
const absoluteHighThreshold = 0.60; // 0.60 SEK/kWh = HIGH
const absoluteLowThreshold = 0.30;  // 0.30 SEK/kWh = LOW

console.log(`Option 3: Use absolute thresholds`);
console.log(`LOW: ≤ ${absoluteLowThreshold} SEK/kWh`);
console.log(`HIGH: ≥ ${absoluteHighThreshold} SEK/kWh`);
console.log(`Current price ${currentPrice}: ${currentPrice <= absoluteLowThreshold ? 'LOW' : currentPrice >= absoluteHighThreshold ? 'HIGH' : 'NORMAL'}`);
console.log('');

console.log('💡 Recommendation:');
console.log('Based on your expectation of -1 to -2°C adjustment at current price,');
console.log('I recommend Option 3 (absolute thresholds) with HIGH threshold around 0.60-0.70 SEK/kWh');
