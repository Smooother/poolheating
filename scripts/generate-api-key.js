#!/usr/bin/env node

import crypto from 'crypto';

// Generate a secure random API key
const apiKey = crypto.randomBytes(32).toString('hex');

console.log('🔑 Generated API Key:');
console.log(apiKey);
console.log('');
console.log('📋 Next steps:');
console.log('1. Add this to your .env file:');
console.log(`   API_KEY=${apiKey}`);
console.log('');
console.log('2. Add to Vercel environment variables:');
console.log(`   API_KEY = ${apiKey}`);
console.log('');
console.log('3. Share this key with authorized users');
console.log('');
console.log('⚠️  Keep this key secure and never commit it to version control!');
