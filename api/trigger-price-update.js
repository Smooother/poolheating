import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('Manual price update triggered...');
    
    // Call the daily setup to collect prices
    const response = await fetch(`${process.env.BASE_URL || 'https://poolheating.vercel.app'}/api/daily-setup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': process.env.API_KEY
      }
    });
    
    const result = await response.json();
    
    if (result.success) {
      return res.status(200).json({
        success: true,
        message: 'Price update completed successfully',
        timestamp: new Date().toISOString(),
        details: result
      });
    } else {
      return res.status(500).json({
        success: false,
        message: 'Price update failed',
        error: result.error || 'Unknown error',
        timestamp: new Date().toISOString()
      });
    }

  } catch (error) {
    console.error('Manual price update error:', error);
    return res.status(500).json({ 
      success: false, 
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}
