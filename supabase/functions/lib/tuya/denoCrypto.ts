/**
 * Tuya API signing utilities for Deno using Web Crypto API
 */

export interface TuyaSignParams {
  clientId: string;
  accessToken?: string;
  timestamp: number;
  nonce: string;
  method: string;
  body: string;
  pathWithQuery: string;
}

/**
 * Convert string to SHA256 hash (hex uppercase)
 */
export async function sha256Hex(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
}

/**
 * Generate HMAC-SHA256 signature
 */
export async function hmacSha256(message: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(message);
  
  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign('HMAC', key, messageData);
  const signatureArray = Array.from(new Uint8Array(signature));
  return signatureArray.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
}

/**
 * Generate Tuya API signature (simplified version that matches working Vercel API)
 */
export async function generateTuyaSignature(
  params: TuyaSignParams,
  clientSecret: string
): Promise<string> {
  const { clientId, accessToken, timestamp, method, pathWithQuery } = params;
  
  // Use the same signing algorithm as the working Vercel API
  const stringToSign = method + '\n' + '\n' + '\n' + pathWithQuery;
  
  // Create sign string (no nonce, no body hash)
  const signString = accessToken 
    ? `${clientId}${accessToken}${timestamp}${stringToSign}`
    : `${clientId}${timestamp}${stringToSign}`;
  
  // Generate HMAC signature
  return await hmacSha256(signString, clientSecret);
}

/**
 * Generate random nonce
 */
export function generateNonce(): string {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
}

/**
 * Get current timestamp in milliseconds
 */
export function getTimestamp(): number {
  return Date.now();
}

/**
 * Create Tuya API headers
 */
export async function createTuyaHeaders(
  clientId: string,
  clientSecret: string,
  accessToken?: string,
  method: string = 'GET',
  body: string = '',
  pathWithQuery: string = ''
): Promise<Record<string, string>> {
  const timestamp = getTimestamp();
  const nonce = generateNonce();
  
  const signature = await generateTuyaSignature({
    clientId,
    accessToken,
    timestamp,
    nonce,
    method,
    body,
    pathWithQuery
  }, clientSecret);
  
  const headers: Record<string, string> = {
    'client_id': clientId,
    't': timestamp.toString(),
    'sign_method': 'HMAC-SHA256',
    'nonce': nonce,
    'sign': signature,
    'Content-Type': 'application/json'
  };
  
  if (accessToken) {
    headers['access_token'] = accessToken;
  }
  
  return headers;
}
