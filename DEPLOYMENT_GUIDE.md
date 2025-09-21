# Vercel + iOS Deployment Guide

## Backend Setup (Vercel)

### 1. Deploy to Vercel
1. Create a new repository with the API files
2. Connect your GitHub repository to Vercel
3. Deploy the project

### 2. Environment Variables in Vercel
Add these environment variables in your Vercel dashboard:
- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service role key (from secrets)
- `TUYA_CLIENT_ID`: Your Tuya client ID (from secrets)
- `TUYA_CLIENT_SECRET`: Your Tuya client secret (from secrets)

### 3. API Endpoints Available
- `/api/prices` - Price data management
- `/api/heatpump` - Heat pump control
- `/api/automation` - Automation management

## iOS App Development

### 1. Project Structure
Create a new iOS project in Xcode with these main components:

```
iOS App/
├── Models/
│   ├── Price.swift
│   ├── HeatPump.swift
│   └── Automation.swift
├── Services/
│   ├── APIService.swift
│   └── NetworkManager.swift
├── Views/
│   ├── DashboardView.swift
│   ├── ControlView.swift
│   └── SettingsView.swift
└── ViewModels/
    ├── DashboardViewModel.swift
    └── ControlViewModel.swift
```

### 2. Core Models
```swift
// Price.swift
struct Price: Codable, Identifiable {
    let id: String
    let biddingZone: String
    let startTime: String
    let endTime: String
    let priceValue: Double
    let currency: String
    
    enum CodingKeys: String, CodingKey {
        case id, currency
        case biddingZone = "bidding_zone"
        case startTime = "start_time"
        case endTime = "end_time"
        case priceValue = "price_value"
    }
}

// HeatPump.swift
struct HeatPumpStatus: Codable {
    let deviceId: String
    let currentTemp: Double?
    let targetTemp: Double?
    let waterTemp: Double?
    let powerStatus: String
    let mode: String?
    let speedPercentage: Int
    let isOnline: Bool
    
    enum CodingKeys: String, CodingKey {
        case deviceId = "device_id"
        case currentTemp = "current_temp"
        case targetTemp = "target_temp"
        case waterTemp = "water_temp"
        case powerStatus = "power_status"
        case mode
        case speedPercentage = "speed_percentage"
        case isOnline = "is_online"
    }
}
```

### 3. API Service
```swift
// APIService.swift
class APIService: ObservableObject {
    private let baseURL = "https://your-domain.vercel.app/api"
    
    func fetchCurrentPrice() async throws -> PriceData {
        let url = URL(string: "\(baseURL)/prices?zone=SE3")!
        let (data, _) = try await URLSession.shared.data(from: url)
        return try JSONDecoder().decode(PriceData.self, from: data)
    }
    
    func setHeatPumpTemperature(_ temperature: Double) async throws {
        let url = URL(string: "\(baseURL)/heatpump")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        let command = ["action": "setTemperature", "temperature": temperature]
        request.httpBody = try JSONSerialization.data(withJSONObject: command)
        
        let (_, _) = try await URLSession.shared.data(for: request)
    }
}
```

### 4. SwiftUI Views
```swift
// DashboardView.swift
struct DashboardView: View {
    @StateObject private var apiService = APIService()
    @State private var currentPrice: Price?
    
    var body: some View {
        VStack(spacing: 20) {
            if let price = currentPrice {
                PriceCardView(price: price)
            }
            
            HeatPumpStatusView()
        }
        .task {
            await loadData()
        }
    }
    
    private func loadData() async {
        do {
            let priceData = try await apiService.fetchCurrentPrice()
            currentPrice = priceData.currentPrice
        } catch {
            // Handle error
        }
    }
}
```

## Database (Supabase)
Keep using the existing Supabase database - no changes needed. The Vercel API handles all database operations.

## Key Differences from Web App

### 1. No Direct Supabase Client
iOS app only communicates with Vercel API endpoints, never directly with Supabase.

### 2. Native iOS Components
- Use `URLSession` instead of fetch()
- SwiftUI instead of React components
- CoreData or @State for local state management

### 3. Mobile-Specific Features
- Add push notifications for price alerts
- Background app refresh for automation
- Haptic feedback for controls
- Native iOS design patterns

### 4. Security Considerations
- Store API base URL in configuration
- Implement proper error handling
- Add authentication if needed
- Use keychain for sensitive data

## Testing
1. Test all API endpoints with your Vercel deployment
2. Verify data persistence in Supabase
3. Test heat pump commands work correctly
4. Validate automation triggers properly

## Next Steps
1. Deploy backend to Vercel
2. Set up environment variables
3. Create iOS project structure
4. Implement core API service
5. Build SwiftUI interfaces
6. Test integration end-to-end