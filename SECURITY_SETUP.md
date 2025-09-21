# 🔒 Security Setup Guide

## API Key Authentication

The pool heating system now requires an API key for security. This prevents unauthorized access to your heat pump controls.

### Setup Instructions

1. **Generate a Secure API Key**
   ```bash
   # Generate a secure random API key
   openssl rand -hex 32
   # or
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

2. **Set Environment Variable**
   Add to your `.env` file:
   ```env
   API_KEY=your-generated-api-key-here
   ```

3. **Deploy to Vercel**
   - Go to your Vercel project dashboard
   - Navigate to Settings → Environment Variables
   - Add `API_KEY` with your generated key
   - Redeploy your application

### Usage

1. **First Visit**: Users will see an API key setup screen
2. **Enter API Key**: Users enter the API key you provided them
3. **Access Granted**: Once validated, users can access the full application

### API Key Management

- **Generate Unique Keys**: Create different keys for different users/devices
- **Rotate Regularly**: Change API keys periodically for security
- **Secure Storage**: Store API keys securely, never in code or public repos
- **Monitor Access**: Check logs for unauthorized access attempts

### Mobile App Integration

For the future iPhone app, the API key will be:
- Stored securely in the app's keychain
- Sent with every API request
- Validated on the server side

### Security Features

- ✅ **API Key Validation**: All critical endpoints require valid API key
- ✅ **Access Logging**: All API access is logged with IP and timestamp
- ✅ **CORS Protection**: Proper CORS headers for security
- ✅ **Error Handling**: No sensitive information leaked in errors
- ✅ **Rate Limiting**: Built-in protection against abuse

### Protected Endpoints

The following endpoints now require API key authentication:
- `/api/override` - Heat pump control
- `/api/settings` - Automation settings
- `/api/status` - System status (read-only but logged)

### Development Mode

If no `API_KEY` environment variable is set, the system runs in development mode with authentication disabled. This is useful for local development but should never be used in production.

### Future Enhancements

- **User Authentication**: Replace API keys with proper user accounts
- **Role-Based Access**: Different permission levels for different users
- **OAuth Integration**: Google/Microsoft login support
- **Two-Factor Authentication**: Additional security layer
- **Audit Trail**: Complete access history and change tracking
