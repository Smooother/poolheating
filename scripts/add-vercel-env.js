#!/usr/bin/env node

/**
 * Add Tuya environment variables to Vercel using the API
 */

import { execSync } from 'child_process';

const envVars = {
  TUIYA_ACCESS_ID: 'dn98qycejwjndescfprj',
  TUIYA_ACCESS_KEY: '21c50cb2a91a4491b18025373e742272',
  TUIYA_DEVICE_ID: 'bf65ca8db8b207052feu5u',
  TUIYA_ENV: 'TEST'
};

console.log('🚀 Adding Tuya environment variables to Vercel...\n');

try {
  for (const [key, value] of Object.entries(envVars)) {
    console.log(`📝 Adding ${key}...`);
    
    try {
      // Use echo to pipe the value to vercel env add
      execSync(`echo "${value}" | vercel env add ${key} production`, { 
        stdio: 'pipe',
        encoding: 'utf8'
      });
      console.log(`✅ ${key} added successfully`);
    } catch (error) {
      console.log(`⚠️ ${key} might already exist or there was an issue`);
      console.log(`   Error: ${error.message}`);
    }
  }
  
  console.log('\n🎉 Environment variables setup complete!');
  console.log('\n📋 Added variables:');
  Object.entries(envVars).forEach(([key, value]) => {
    console.log(`   ${key} = ${value}`);
  });
  
  console.log('\n🔄 Next steps:');
  console.log('1. Vercel will automatically redeploy with the new environment variables');
  console.log('2. Wait for deployment to complete (check Vercel dashboard)');
  console.log('3. Go to your Dashboard and click "Start Pulsar" button');
  console.log('4. Monitor the Real-time Updates card for connection status');
  
} catch (error) {
  console.error('❌ Failed to add environment variables:', error.message);
  console.log('\n📝 Manual setup instructions:');
  console.log('1. Go to https://vercel.com/dashboard');
  console.log('2. Select your "poolheating" project');
  console.log('3. Go to Settings → Environment Variables');
  console.log('4. Add each variable manually:');
  Object.entries(envVars).forEach(([key, value]) => {
    console.log(`   ${key} = ${value}`);
  });
}
