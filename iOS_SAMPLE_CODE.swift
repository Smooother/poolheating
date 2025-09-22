// MARK: - Data Models
import Foundation

struct HeatPumpStatus: Codable {
    let id: String
    let deviceId: String
    let currentTemp: Double?
    let waterTemp: Double
    let targetTemp: Double
    let speedPercentage: Int
    let powerStatus: String
    let mode: String
    let isOnline: Bool
    let lastCommunication: String
    
    enum CodingKeys: String, CodingKey {
        case id, mode
        case deviceId = "device_id"
        case currentTemp = "current_temp"
        case waterTemp = "water_temp"
        case targetTemp = "target_temp"
        case speedPercentage = "speed_percentage"
        case powerStatus = "power_status"
        case isOnline = "is_online"
        case lastCommunication = "last_communication"
    }
}

struct SystemStatus: Codable {
    let now: String
    let area: String
    let priceState: String
    let currentPrice: Double
    let targetC: Double
    let power: Bool
    let waterTemp: Double
    let mode: String
    let paused: Bool
    let nextSteps: [ScheduledAction]
    let lastAction: LastAction?
}

struct ScheduledAction: Codable {
    let start: String
    let end: String
    let state: String
    let targetC: Double
}

struct LastAction: Codable {
    let ts: String
    let targetC: Double
    let state: String
}

struct PriceData: Codable {
    let id: String
    let biddingZone: String
    let startTime: String
    let endTime: String
    let priceValue: Double
    let currency: String
    let provider: String
    
    enum CodingKeys: String, CodingKey {
        case id, currency, provider
        case biddingZone = "bidding_zone"
        case startTime = "start_time"
        case endTime = "end_time"
        case priceValue = "price_value"
    }
}

// MARK: - API Client
class PoolHeatingAPI {
    static let shared = PoolHeatingAPI()
    private let baseURL = "https://poolheating.vercel.app"
    private let apiKey = "51d8b75d372e1801b9697b75de131721072076911fe3e3c8d3b43a3fabf8f7db"
    
    private init() {}
    
    private func makeRequest<T: Codable>(
        endpoint: String,
        method: String = "GET",
        body: Data? = nil,
        responseType: T.Type
    ) async throws -> T {
        guard let url = URL(string: "\(baseURL)\(endpoint)") else {
            throw APIError.invalidURL
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = method
        request.setValue(apiKey, forHTTPHeaderField: "X-API-Key")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        if let body = body {
            request.httpBody = body
        }
        
        let (data, response) = try await URLSession.shared.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }
        
        guard httpResponse.statusCode == 200 else {
            throw APIError.httpError(httpResponse.statusCode)
        }
        
        do {
            let result = try JSONDecoder().decode(T.self, from: data)
            return result
        } catch {
            throw APIError.decodingError(error)
        }
    }
    
    // MARK: - API Methods
    
    func getSystemStatus() async throws -> SystemStatus {
        return try await makeRequest(
            endpoint: "/api/status",
            responseType: SystemStatus.self
        )
    }
    
    func getHeatPumpStatus() async throws -> HeatPumpResponse {
        return try await makeRequest(
            endpoint: "/api/heatpump",
            responseType: HeatPumpResponse.self
        )
    }
    
    func setTemperature(_ temperature: Double) async throws -> APIResponse {
        let body = [
            "action": "setTemperature",
            "temperature": temperature
        ]
        
        let jsonData = try JSONSerialization.data(withJSONObject: body)
        
        return try await makeRequest(
            endpoint: "/api/heatpump",
            method: "POST",
            body: jsonData,
            responseType: APIResponse.self
        )
    }
    
    func togglePower() async throws -> APIResponse {
        let body = [
            "action": "sendCommand",
            "commands": [
                ["code": "Power", "value": true]
            ]
        ]
        
        let jsonData = try JSONSerialization.data(withJSONObject: body)
        
        return try await makeRequest(
            endpoint: "/api/heatpump",
            method: "POST",
            body: jsonData,
            responseType: APIResponse.self
        )
    }
    
    func getPrices(zone: String = "SE3", hours: Int = 24) async throws -> PriceResponse {
        return try await makeRequest(
            endpoint: "/api/prices?zone=\(zone)&hours=\(hours)",
            responseType: PriceResponse.self
        )
    }
    
    func getSettings() async throws -> SettingsResponse {
        return try await makeRequest(
            endpoint: "/api/settings",
            responseType: SettingsResponse.self
        )
    }
    
    func updateSettings(_ settings: [String: Any]) async throws -> APIResponse {
        let jsonData = try JSONSerialization.data(withJSONObject: settings)
        
        return try await makeRequest(
            endpoint: "/api/settings",
            method: "POST",
            body: jsonData,
            responseType: APIResponse.self
        )
    }
}

// MARK: - Response Models
struct HeatPumpResponse: Codable {
    let status: HeatPumpStatus?
    let lastUpdated: String?
}

struct PriceResponse: Codable {
    let currentPrice: PriceData
    let prices: [PriceData]
    let zone: String
    let lastUpdated: String
}

struct SettingsResponse: Codable {
    let settings: AutomationSettings
}

struct AutomationSettings: Codable {
    let userId: String
    let targetPoolTemp: Double
    let automationEnabled: Bool
    let priceSensitivity: Double
    let tempTolerance: Double
    let minPumpTemp: Double
    let maxPumpTemp: Double
    let optimizationHorizonHours: Int
    let averageDays: Int
    let highPriceThreshold: Double
    let lowPriceMultiplier: Double
    let highPriceMultiplier: Double
    let biddingZone: String
    
    enum CodingKeys: String, CodingKey {
        case userId = "user_id"
        case targetPoolTemp = "target_pool_temp"
        case automationEnabled = "automation_enabled"
        case priceSensitivity = "price_sensitivity"
        case tempTolerance = "temp_tolerance"
        case minPumpTemp = "min_pump_temp"
        case maxPumpTemp = "max_pump_temp"
        case optimizationHorizonHours = "optimization_horizon_hours"
        case averageDays = "average_days"
        case highPriceThreshold = "high_price_threshold"
        case lowPriceMultiplier = "low_price_multiplier"
        case highPriceMultiplier = "high_price_multiplier"
        case biddingZone = "bidding_zone"
    }
}

struct APIResponse: Codable {
    let success: Bool
    let message: String?
    let error: String?
}

// MARK: - Error Handling
enum APIError: Error, LocalizedError {
    case invalidURL
    case invalidResponse
    case httpError(Int)
    case decodingError(Error)
    case networkError(Error)
    
    var errorDescription: String? {
        switch self {
        case .invalidURL:
            return "Invalid URL"
        case .invalidResponse:
            return "Invalid response"
        case .httpError(let code):
            return "HTTP Error: \(code)"
        case .decodingError(let error):
            return "Decoding Error: \(error.localizedDescription)"
        case .networkError(let error):
            return "Network Error: \(error.localizedDescription)"
        }
    }
}

// MARK: - View Model Example
@MainActor
class PoolHeatingViewModel: ObservableObject {
    @Published var systemStatus: SystemStatus?
    @Published var heatPumpStatus: HeatPumpStatus?
    @Published var currentPrice: PriceData?
    @Published var isLoading = false
    @Published var errorMessage: String?
    
    private let api = PoolHeatingAPI.shared
    private var statusTimer: Timer?
    
    init() {
        startStatusPolling()
    }
    
    deinit {
        statusTimer?.invalidate()
    }
    
    func startStatusPolling() {
        statusTimer = Timer.scheduledTimer(withTimeInterval: 30, repeats: true) { _ in
            Task {
                await self.refreshStatus()
            }
        }
    }
    
    func refreshStatus() async {
        isLoading = true
        errorMessage = nil
        
        do {
            async let systemStatusTask = api.getSystemStatus()
            async let heatPumpStatusTask = api.getHeatPumpStatus()
            async let priceTask = api.getPrices()
            
            let (systemStatus, heatPumpResponse, priceResponse) = try await (
                systemStatusTask,
                heatPumpStatusTask,
                priceTask
            )
            
            self.systemStatus = systemStatus
            self.heatPumpStatus = heatPumpResponse.status
            self.currentPrice = priceResponse.currentPrice
            
        } catch {
            errorMessage = error.localizedDescription
        }
        
        isLoading = false
    }
    
    func adjustTemperature(_ delta: Double) async {
        guard let currentTemp = heatPumpStatus?.targetTemp else { return }
        
        let newTemp = currentTemp + delta
        let clampedTemp = max(18.0, min(35.0, newTemp))
        
        do {
            let response = try await api.setTemperature(clampedTemp)
            if response.success {
                // Update UI optimistically
                heatPumpStatus?.targetTemp = clampedTemp
                
                // Refresh after delay
                DispatchQueue.main.asyncAfter(deadline: .now() + 2) {
                    Task {
                        await self.refreshStatus()
                    }
                }
            }
        } catch {
            errorMessage = error.localizedDescription
        }
    }
    
    func togglePower() async {
        do {
            let response = try await api.togglePower()
            if response.success {
                // Refresh status
                await refreshStatus()
            }
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}

// MARK: - SwiftUI View Example
import SwiftUI

struct DashboardView: View {
    @StateObject private var viewModel = PoolHeatingViewModel()
    
    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 20) {
                    // Current Status Card
                    StatusCard(
                        waterTemp: viewModel.heatPumpStatus?.waterTemp ?? 0,
                        targetTemp: viewModel.heatPumpStatus?.targetTemp ?? 0,
                        powerStatus: viewModel.heatPumpStatus?.powerStatus ?? "off"
                    )
                    
                    // Price Information Card
                    PriceCard(
                        currentPrice: viewModel.currentPrice?.priceValue ?? 0,
                        priceState: viewModel.systemStatus?.priceState ?? "NORMAL"
                    )
                    
                    // Quick Controls
                    QuickControlsView(
                        onTemperatureUp: { await viewModel.adjustTemperature(1) },
                        onTemperatureDown: { await viewModel.adjustTemperature(-1) },
                        onPowerToggle: { await viewModel.togglePower() }
                    )
                    
                    // Next Steps
                    if let nextSteps = viewModel.systemStatus?.nextSteps {
                        NextStepsView(steps: Array(nextSteps.prefix(4)))
                    }
                }
                .padding()
            }
            .navigationTitle("Pool Heating")
            .refreshable {
                await viewModel.refreshStatus()
            }
            .task {
                await viewModel.refreshStatus()
            }
        }
    }
}

struct StatusCard: View {
    let waterTemp: Double
    let targetTemp: Double
    let powerStatus: String
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Current Status")
                .font(.headline)
            
            HStack {
                VStack(alignment: .leading) {
                    Text("Water Temperature")
                        .font(.caption)
                        .foregroundColor(.secondary)
                    Text("\(waterTemp, specifier: "%.1f")°C")
                        .font(.title)
                        .fontWeight(.bold)
                }
                
                Spacer()
                
                VStack(alignment: .trailing) {
                    Text("Target")
                        .font(.caption)
                        .foregroundColor(.secondary)
                    Text("\(targetTemp, specifier: "%.1f")°C")
                        .font(.title2)
                        .fontWeight(.semibold)
                }
            }
            
            HStack {
                Circle()
                    .fill(powerStatus == "on" ? .green : .red)
                    .frame(width: 12, height: 12)
                
                Text(powerStatus == "on" ? "Pump ON" : "Pump OFF")
                    .font(.subheadline)
                    .fontWeight(.medium)
            }
        }
        .padding()
        .background(Color(.systemGray6))
        .cornerRadius(12)
    }
}

struct PriceCard: View {
    let currentPrice: Double
    let priceState: String
    
    private var priceColor: Color {
        switch priceState {
        case "LOW": return .green
        case "NORMAL": return .blue
        case "HIGH": return .orange
        case "SHUTDOWN": return .red
        default: return .gray
        }
    }
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Electricity Price")
                .font(.headline)
            
            HStack {
                VStack(alignment: .leading) {
                    Text("Current Price")
                        .font(.caption)
                        .foregroundColor(.secondary)
                    Text("\(currentPrice, specifier: "%.3f") SEK/kWh")
                        .font(.title2)
                        .fontWeight(.bold)
                }
                
                Spacer()
                
                VStack(alignment: .trailing) {
                    Text("Status")
                        .font(.caption)
                        .foregroundColor(.secondary)
                    Text(priceState)
                        .font(.subheadline)
                        .fontWeight(.semibold)
                        .foregroundColor(priceColor)
                }
            }
        }
        .padding()
        .background(Color(.systemGray6))
        .cornerRadius(12)
    }
}

struct QuickControlsView: View {
    let onTemperatureUp: () async -> Void
    let onTemperatureDown: () async -> Void
    let onPowerToggle: () async -> Void
    
    var body: some View {
        VStack(spacing: 16) {
            Text("Quick Controls")
                .font(.headline)
            
            HStack(spacing: 20) {
                // Temperature Controls
                VStack(spacing: 8) {
                    Button(action: { Task { await onTemperatureUp() } }) {
                        Image(systemName: "plus.circle.fill")
                            .font(.title)
                            .foregroundColor(.blue)
                    }
                    
                    Text("Temp +1°C")
                        .font(.caption)
                        .foregroundColor(.secondary)
                    
                    Button(action: { Task { await onTemperatureDown() } }) {
                        Image(systemName: "minus.circle.fill")
                            .font(.title)
                            .foregroundColor(.blue)
                    }
                    
                    Text("Temp -1°C")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                
                Spacer()
                
                // Power Toggle
                VStack(spacing: 8) {
                    Button(action: { Task { await onPowerToggle() } }) {
                        Image(systemName: "power")
                            .font(.title)
                            .foregroundColor(.red)
                    }
                    
                    Text("Power Toggle")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }
        }
        .padding()
        .background(Color(.systemGray6))
        .cornerRadius(12)
    }
}

struct NextStepsView: View {
    let steps: [ScheduledAction]
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Next Steps")
                .font(.headline)
            
            ForEach(Array(steps.enumerated()), id: \.offset) { index, step in
                HStack {
                    VStack(alignment: .leading) {
                        Text(formatTime(step.start))
                            .font(.subheadline)
                            .fontWeight(.medium)
                        Text(step.state)
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                    
                    Spacer()
                    
                    Text("\(step.targetC, specifier: "%.0f")°C")
                        .font(.subheadline)
                        .fontWeight(.semibold)
                }
                .padding(.vertical, 4)
                
                if index < steps.count - 1 {
                    Divider()
                }
            }
        }
        .padding()
        .background(Color(.systemGray6))
        .cornerRadius(12)
    }
    
    private func formatTime(_ timeString: String) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd'T'HH:mm:ssZ"
        
        if let date = formatter.date(from: timeString) {
            let displayFormatter = DateFormatter()
            displayFormatter.dateFormat = "HH:mm"
            return displayFormatter.string(from: date)
        }
        
        return timeString
    }
}

// MARK: - App Entry Point
@main
struct PoolHeatingApp: App {
    var body: some Scene {
        WindowGroup {
            DashboardView()
        }
    }
}
