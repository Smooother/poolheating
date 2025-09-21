# Pool Heating System

A smart pool heating system that automatically optimizes heat pump operation based on real-time electricity prices from the Swedish electricity market (Elpriset just nu). The system uses Tuya Cloud integration to control heat pump devices and provides both web and mobile interfaces.

## 🏊‍♂️ Features

- **Smart Automation**: Automatically adjusts heat pump temperature based on electricity prices
- **Real-time Price Data**: Fetches current and forecasted electricity prices from Elpriset just nu
- **Tuya Integration**: Controls heat pumps via Tuya Cloud API
- **Web Dashboard**: React-based web interface for monitoring and control
- **iOS App**: Native SwiftUI app for mobile control
- **Price Classification**: Categorizes prices as LOW, NORMAL, or HIGH for optimal heating strategy
- **Automation Logging**: Tracks all automation decisions with reasoning

## 🏗️ Architecture

- **Frontend**: Vite + React + TypeScript + Tailwind CSS + shadcn/ui
- **Backend**: Vercel Functions + Supabase (PostgreSQL + Edge Functions)
- **Device Integration**: Tuya Cloud API
- **Price Data**: Elpriset just nu API (Swedish electricity prices)
- **Deployment**: Vercel (frontend) + Supabase (backend)
- **Mobile**: SwiftUI iOS app

## 📋 Prerequisites

- Node.js 18+ and npm
- Supabase account
- Tuya Cloud developer account
- Vercel account (for deployment)

## 🚀 Quick Start

### 1. Clone and Install

```bash
git clone <YOUR_GIT_URL>
cd poolheating
npm install
```

### 2. Environment Setup

Copy the example environment file and configure your settings:

```bash
cp .env.example .env
```

Edit `.env` with your actual values:

```bash
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_ANON_KEY=your-anon-key

# Tuya Cloud Configuration
TUYA_CLIENT_ID=your-tuya-client-id
TUYA_CLIENT_SECRET=your-tuya-client-secret

# Application Configuration
PRICE_AREA=SE3
TIMEZONE=Europe/Stockholm
BASE_URL=http://localhost:8080
```

### 3. Database Setup

The database schema is automatically managed through Supabase migrations. Ensure your Supabase project is set up and the migrations have been applied.

### 4. Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:8080`.

## 📱 iOS App Setup

The iOS client is located in `mobile/ios-client/`. To use it:

1. Open Xcode and create a new iOS project
2. Copy the Swift files from `mobile/ios-client/` to your project
3. Update the `baseURL` in `Config.swift` with your API endpoint
4. Build and run on your device or simulator

See `mobile/ios-client/README.md` for detailed setup instructions.

## 🔧 API Endpoints

### Core Endpoints

- `GET /api/health` - System health check
- `GET /api/status` - Comprehensive system status
- `POST /api/override` - Manual control (power, temperature, automation)

### Legacy Endpoints

- `GET/POST /api/heatpump` - Heat pump status and commands
- `GET/POST /api/prices` - Price data collection and retrieval
- `GET/POST /api/automation` - Automation control and logs

See `docs/BACKEND_API.md` for complete API documentation.

## ⚙️ Configuration

### Tuya Device Setup

1. Create a Tuya Cloud developer account
2. Register your heat pump device
3. Get your client ID, client secret, and device ID
4. Configure the device in the web interface or directly in the database

### Automation Settings

Configure automation behavior in the `automation_settings` table:

- `target_pool_temp`: Desired pool temperature (default: 28°C)
- `automation_enabled`: Enable/disable automation (default: true)
- `price_sensitivity`: How aggressively to respond to prices (default: 1.0)
- `temp_tolerance`: Temperature adjustment limits (default: 2.0°C)
- `min_pump_temp`: Minimum pump temperature (default: 18°C)
- `max_pump_temp`: Maximum pump temperature (default: 35°C)

## 📊 How It Works

### Price-Based Automation

1. **Daily Price Collection**: Fetches electricity prices for the next 24-48 hours
2. **Price Classification**: Categorizes prices as LOW, NORMAL, or HIGH
3. **Temperature Optimization**: Adjusts heat pump target temperature based on price state:
   - **LOW prices**: Heat aggressively (target + tolerance)
   - **NORMAL prices**: Standard heating (target temperature)
   - **HIGH prices**: Conservative heating (target - tolerance)
4. **15-Minute Execution**: Applies automation decisions every 15 minutes

### Tuya Integration

- **Authentication**: OAuth2 flow with automatic token refresh
- **Device Control**: Power on/off, temperature setting, mode control
- **Status Monitoring**: Real-time device status updates
- **Error Handling**: Robust error handling and retry logic

## 🚀 Deployment

### Vercel Deployment

1. Connect your GitHub repository to Vercel
2. Configure environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Supabase Setup

1. Create a new Supabase project
2. Run the migrations in `supabase/migrations/`
3. Deploy Edge Functions in `supabase/functions/`
4. Configure cron jobs for automation

## 📚 Documentation

- [Architecture Overview](docs/ARCHITECTURE.md) - System architecture and data flow
- [Backend API](docs/BACKEND_API.md) - Complete API documentation
- [iOS Client](mobile/ios-client/README.md) - iOS app setup and usage

## 🔍 Monitoring

### Health Checks

- `GET /api/health` - Basic system health
- Supabase Edge Function logs
- Vercel function logs

### Automation Logs

All automation decisions are logged in the `automation_log` table with:
- Current and forecasted prices
- Temperature adjustments
- Decision reasoning
- Timestamps

## 🛠️ Development

### Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
```

### Project Structure

```
poolheating/
├── api/                    # Vercel API routes
├── src/                    # React application
├── supabase/              # Database and Edge Functions
├── mobile/ios-client/     # iOS SwiftUI app
├── docs/                  # Documentation
└── public/               # Static assets
```

## 🔒 Security

The pool heating system implements comprehensive security measures:

### Database Security
- **Row Level Security (RLS)** enabled on all tables
- **Service role** for backend operations with restricted access
- **Extensions isolated** in dedicated `extensions` schema
- **Audit logging** for sensitive operations
- **Security hardening** following PostgreSQL best practices

### API Security
- **Environment variables** for sensitive configuration
- **CORS** properly configured for API endpoints
- **Input validation** on all API endpoints
- **Error handling** without information leakage

### Production Security
- **Vercel environment** with secure deployment
- **Supabase** with proper RLS policies
- **Tuya API** integration with secure token management
- **Price data** collection with rate limiting

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For issues or questions:

1. Check the documentation in the `docs/` directory
2. Review the API documentation
3. Check the GitHub issues
4. Create a new issue with detailed information

## 🔮 Future Enhancements

- **Android App**: Native Android application
- **Advanced Analytics**: Price prediction and optimization algorithms
- **Multi-Device Support**: Support for multiple heat pumps
- **Weather Integration**: Weather-based heating adjustments
- **User Management**: Multi-user support with individual settings
- **Push Notifications**: Real-time alerts for price changes
- **Historical Data**: Charts and graphs for price trends
