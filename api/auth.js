import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Simple API key validation
export function validateApiKey(apiKey) {
  const validApiKey = process.env.API_KEY;
  
  if (!validApiKey) {
    console.warn('No API_KEY environment variable set - API key validation disabled');
    return true; // Allow access if no API key is configured (development mode)
  }
  
  return apiKey === validApiKey;
}

// Middleware for API key validation
export function withApiKeyAuth(handler) {
  return async (req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key');

    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }

    // Check for API key in headers
    const apiKey = req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '');
    
    if (!validateApiKey(apiKey)) {
      return res.status(401).json({ 
        error: 'Unauthorized', 
        message: 'Valid API key required' 
      });
    }

    // API key is valid, proceed with the original handler
    return handler(req, res);
  };
}

// Log API access for security monitoring
export function logApiAccess(req, endpoint, success = true) {
  const timestamp = new Date().toISOString();
  const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  const userAgent = req.headers['user-agent'];
  
  console.log(`[${timestamp}] API Access: ${endpoint} - ${success ? 'SUCCESS' : 'FAILED'} - IP: ${ip} - UA: ${userAgent}`);
  
  // Optionally store in database for audit trail
  // supabase.from('api_access_log').insert({
  //   endpoint,
  //   ip_address: ip,
  //   user_agent: userAgent,
  //   success,
  //   timestamp
  // });
}
