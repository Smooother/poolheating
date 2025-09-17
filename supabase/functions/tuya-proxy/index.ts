import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { createHmac, createHash } from "node:crypto";

interface TuyaConfig {
  clientId: string;
  clientSecret: string;
  uid: string;
  deviceId: string;
}

interface TuyaToken {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  expires_at: number;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TUYA_BASE_URL = 'https://openapi.tuyaeu.com';

// Initialize Supabase client for storing tokens
const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

function generateSignature(
  clientId: string,
  secret: string,
  timestamp: string,
  nonce: string,
  method: string,
  path: string,
  body: string = '',
  accessToken: string = ''
): string {
  // Create content hash (SHA256 of body)
  const contentHash = createHash('sha256').update(body || '').digest('hex');
  
  // stringToSign = METHOD \n contentHash \n \n pathQuery
  const signStr = [
    method.toUpperCase(),
    contentHash,
    '',
    path
  ].join('\n');
  
  // BUSINESS signature: clientId + access_token + t + nonce + stringToSign
  const stringToSign = clientId + accessToken + timestamp + nonce + signStr;
  
  // HMAC-SHA256 (uppercase hex)
  return createHmac('sha256', secret).update(stringToSign).digest('hex').toUpperCase();
}

function generateHeaders(
  clientId: string,
  secret: string,
  method: string,
  path: string,
  body: string = '',
  accessToken: string = ''
): Record<string, string> {
  const timestamp = Date.now().toString();
  const nonce = Math.random().toString(36).substring(2);
  
  const sign = generateSignature(clientId, secret, timestamp, nonce, method, path, body, accessToken);
  
  const headersObj: Record<string, string> = {
    'client_id': clientId,
    'sign': sign,
    't': timestamp,
    'sign_method': 'HMAC-SHA256',
    'nonce': nonce,
    'Content-Type': 'application/json'
  };
  
  if (accessToken) {
    headersObj['access_token'] = accessToken;
  }
  
  return headersObj;
}

async function getStoredToken(): Promise<TuyaToken | null> {
  try {
    const { data, error } = await supabase
      .from('tuya_tokens')
      .select('*')
      .single();
    
    if (error || !data) return null;
    return data as TuyaToken;
  } catch {
    return null;
  }
}

async function storeToken(token: TuyaToken): Promise<void> {
  await supabase
    .from('tuya_tokens')
    .upsert(token, { onConflict: 'access_token' });
}

async function getAccessToken(config: TuyaConfig): Promise<string> {
  const path = '/v1.0/token?grant_type=1';
  const headers = generateHeaders(config.clientId, config.clientSecret, 'GET', path);
  
  console.log('Getting new access token...');
  
  const response = await fetch(`${TUYA_BASE_URL}${path}`, {
    method: 'GET',
    headers
  });
  
  const data = await response.json();
  console.log('Token response:', data);
  
  if (!data.success) {
    throw new Error(`Tuya API error: ${data.msg || 'Unknown error'}`);
  }
  
  const token: TuyaToken = {
    access_token: data.result.access_token,
    refresh_token: data.result.refresh_token,
    expires_in: data.result.expire_time,
    expires_at: Date.now() + (data.result.expire_time * 1000)
  };
  
  await storeToken(token);
  return token.access_token;
}

async function getValidToken(config: TuyaConfig): Promise<string> {
  const storedToken = await getStoredToken();
  
  // Check if token exists and is not expired (with 5 minute buffer)
  if (storedToken && storedToken.expires_at > Date.now() + 300000) {
    console.log('Using cached access token');
    return storedToken.access_token;
  }
  
  console.log('Getting new access token');
  return await getAccessToken(config);
}

async function makeAuthenticatedRequest(
  config: TuyaConfig,
  method: string,
  path: string,
  body: any = null
): Promise<any> {
  const accessToken = await getValidToken(config);
  const bodyStr = body ? JSON.stringify(body) : '';
  const headers = generateHeaders(config.clientId, config.clientSecret, method, path, bodyStr, accessToken);
  
  console.log(`Making ${method} request to ${path}`);
  console.log('Request headers:', headers);
  console.log('Request body:', bodyStr);
  
  const response = await fetch(`${TUYA_BASE_URL}${path}`, {
    method,
    headers,
    body: bodyStr || undefined
  });
  
  const responseData = await response.json();
  console.log('Response:', responseData);
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${JSON.stringify(responseData)}`);
  }
  
  return responseData;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    const clientId = Deno.env.get('TUYA_CLIENT_ID');
    const clientSecret = Deno.env.get('TUYA_CLIENT_SECRET');
    
    if (!clientId || !clientSecret) {
      throw new Error('Missing Tuya credentials in environment variables');
    }
    
    const requestBody = await req.json();
    const { action, uid, deviceId, commands } = requestBody;
    
    console.log('Request:', { action, uid, deviceId, commands });
    
    if (!uid || !deviceId) {
      throw new Error('Missing uid or deviceId in request');
    }
    
    const config: TuyaConfig = { clientId, clientSecret, uid, deviceId };
    
    let result;
    
    switch (action) {
      case 'test':
        // Test connection by getting user devices
        result = await makeAuthenticatedRequest(config, 'GET', `/v1.0/users/${uid}/devices`);
        break;
        
      case 'getDeviceInfo':
        // Get device information
        result = await makeAuthenticatedRequest(config, 'GET', `/v1.0/devices/${deviceId}`);
        break;
        
      case 'getDeviceStatus':
        // Get device status
        result = await makeAuthenticatedRequest(config, 'GET', `/v1.0/devices/${deviceId}/status`);
        break;
        
      case 'sendCommand':
        // Send command to device
        if (!commands || !Array.isArray(commands)) {
          throw new Error('Commands array is required for sendCommand action');
        }
        result = await makeAuthenticatedRequest(
          config,
          'POST',
          `/v1.0/iot-03/devices/${deviceId}/commands`,
          { commands }
        );
        break;
        
      default:
        throw new Error(`Unknown action: ${action}`);
    }
    
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    console.error('Tuya proxy error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});