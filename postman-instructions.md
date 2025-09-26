# Tuya API Test - Postman Instructions

## 🚀 Quick Setup

### 1. Import Collection
1. Open Postman
2. Click "Import" button
3. Select the `postman-tuya-test.json` file
4. The collection will be imported with all variables

### 2. Set Your Access Token
1. In the collection, go to "Variables" tab
2. Find `access_token` variable
3. Replace `YOUR_ACCESS_TOKEN_HERE` with your actual Tuya access token
4. Save the collection

### 3. Run the Test
1. Select "Get Device Status" request
2. Click "Send"
3. The signature will be generated automatically
4. Check the response

## 📋 Manual Setup (Alternative)

If you prefer to create the request manually:

### Request Details
- **Method**: `GET`
- **URL**: `https://openapi.tuyaeu.com/v1.0/devices/bf65ca8db8b207052feu5u/status`

### Headers
```
client_id: dn98qycejwjndescfprj
t: {{timestamp}}
nonce: {{nonce}}
sign: {{signature}}
sign_method: HMAC-SHA256
access_token: {{access_token}}
```

### Pre-request Script
```javascript
// Generate timestamp
const timestamp = Date.now().toString();
pm.environment.set('timestamp', timestamp);

// Generate nonce (UUID)
const nonce = pm.variables.replace('{{$randomUUID}}');
pm.environment.set('nonce', nonce);

// Get request details
const method = pm.request.method;
const path = pm.request.url.getPath();

// Create string to sign
const stringToSign = [
    method.toUpperCase(),
    'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    'application/json',
    timestamp,
    nonce,
    path
].join('\n');

console.log('String to sign:', stringToSign);

// Generate HMAC-SHA256 signature
const signature = CryptoJS.HmacSHA256(stringToSign, pm.environment.get('client_secret')).toString(CryptoJS.enc.Base64);
pm.environment.set('signature', signature);

console.log('Generated signature:', signature);
```

### Environment Variables
Create these environment variables in Postman:

| Variable | Value |
|----------|-------|
| `base_url` | `https://openapi.tuyaeu.com` |
| `client_id` | `dn98qycejwjndescfprj` |
| `client_secret` | `21c50cb2c8b8b8b8b8b8b8b8b8b8b8b8b` |
| `device_id` | `bf65ca8db8b207052feu5u` |
| `access_token` | `YOUR_ACTUAL_ACCESS_TOKEN` |

## 🔧 Signature Generation Details

The signature is generated using this exact format:

```
String to sign:
GET
e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
application/json
[timestamp]
[nonce]
/v1.0/devices/bf65ca8db8b207052feu5u/status
```

**HMAC-SHA256** with secret: `21c50cb2c8b8b8b8b8b8b8b8b8b8b8b8b`
**Output format**: `base64`

## 🧪 Testing Steps

1. **Get Access Token**: First get a fresh access token from Tuya
2. **Set Token**: Update the `access_token` variable
3. **Run Request**: Send the request
4. **Check Response**: Should return device status or error details

## 📊 Expected Responses

### Success Response
```json
{
  "success": true,
  "result": [
    {
      "code": "WInTemp",
      "value": 25.5
    },
    {
      "code": "temp_set",
      "value": 28.0
    },
    {
      "code": "switch_led",
      "value": true
    }
  ]
}
```

### Error Responses
- **Sign Invalid**: `{"code": 1004, "msg": "sign invalid"}`
- **Quota Exceeded**: `{"code": 28841004, "msg": "Please upgrade to the official version: Your quota of Trial Edition is used up."}`
- **Token Invalid**: `{"code": 1010, "msg": "token invalid"}`

## 🐛 Troubleshooting

1. **"sign invalid"**: Check signature generation script
2. **"token invalid"**: Get a fresh access token
3. **"quota exceeded"**: Check your Tuya API usage
4. **Network errors**: Check internet connection and URL

## 📝 Notes

- The signature is generated automatically by the pre-request script
- Each request gets a new timestamp and nonce
- The access token needs to be refreshed periodically
- Check the Postman console for debug information
