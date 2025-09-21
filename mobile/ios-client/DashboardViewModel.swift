import Foundation
import Combine

@MainActor
class DashboardViewModel: ObservableObject {
    @Published var status: StatusResponse?
    @Published var isLoading = false
    @Published var errorMessage: String?
    @Published var lastUpdated: Date?
    @Published var isConnected = false
    
    private let apiClient: APIClient
    private var cancellables = Set<AnyCancellable>()
    private var refreshTimer: Timer?
    
    init(apiClient: APIClient = APIClient()) {
        self.apiClient = apiClient
        setupRefreshTimer()
    }
    
    deinit {
        refreshTimer?.invalidate()
    }
    
    // MARK: - Public Methods
    func loadStatus() async {
        isLoading = true
        errorMessage = nil
        
        do {
            let newStatus = try await apiClient.fetchStatus()
            self.status = newStatus
            self.lastUpdated = Date()
            self.isConnected = true
        } catch {
            self.errorMessage = error.localizedDescription
            self.isConnected = false
            print("Failed to load status: \(error)")
        }
        
        isLoading = false
    }
    
    func refreshStatus() async {
        await loadStatus()
    }
    
    func setPower(_ on: Bool) async {
        do {
            let response = try await apiClient.overridePower(on)
            if response.success {
                await loadStatus() // Refresh status after successful change
            } else {
                errorMessage = response.error ?? "Failed to set power"
            }
        } catch {
            errorMessage = error.localizedDescription
        }
    }
    
    func setTemperature(_ temperature: Int) async {
        do {
            let response = try await apiClient.overrideTemp(temperature)
            if response.success {
                await loadStatus() // Refresh status after successful change
            } else {
                errorMessage = response.error ?? "Failed to set temperature"
            }
        } catch {
            errorMessage = error.localizedDescription
        }
    }
    
    func pauseAutomation() async {
        do {
            let response = try await apiClient.pause()
            if response.success {
                await loadStatus()
            } else {
                errorMessage = response.error ?? "Failed to pause automation"
            }
        } catch {
            errorMessage = error.localizedDescription
        }
    }
    
    func resumeAutomation() async {
        do {
            let response = try await apiClient.resume()
            if response.success {
                await loadStatus()
            } else {
                errorMessage = response.error ?? "Failed to resume automation"
            }
        } catch {
            errorMessage = error.localizedDescription
        }
    }
    
    func testConnection() async {
        isConnected = await apiClient.testConnection()
    }
    
    // MARK: - Computed Properties
    var currentTemperature: Double? {
        status?.waterTemp
    }
    
    var targetTemperature: Int {
        status?.targetC ?? Config.Defaults.defaultTargetTemperature
    }
    
    var isPowerOn: Bool {
        status?.power ?? false
    }
    
    var currentPrice: Double {
        status?.currentPrice ?? 0.0
    }
    
    var priceState: Config.PriceState? {
        guard let stateString = status?.priceState else { return nil }
        return Config.PriceState(rawValue: stateString)
    }
    
    var isAutomationPaused: Bool {
        status?.paused ?? false
    }
    
    var nextSteps: [PlanStep] {
        status?.nextSteps ?? []
    }
    
    var lastAction: StatusResponse.LastAction? {
        status?.lastAction
    }
    
    var priceArea: String {
        status?.area ?? "SE3"
    }
    
    // MARK: - Private Methods
    private func setupRefreshTimer() {
        refreshTimer = Timer.scheduledTimer(withTimeInterval: Config.Defaults.refreshInterval, repeats: true) { [weak self] _ in
            Task { @MainActor in
                await self?.loadStatus()
            }
        }
    }
    
    private func clearError() {
        errorMessage = nil
    }
}

// MARK: - Convenience Extensions
extension DashboardViewModel {
    var temperatureRange: ClosedRange<Int> {
        Config.Defaults.minTemperature...Config.Defaults.maxTemperature
    }
    
    var priceStateColor: String {
        priceState?.color ?? "gray"
    }
    
    var priceStateDisplayName: String {
        priceState?.displayName ?? "Unknown"
    }
    
    var formattedCurrentPrice: String {
        String(format: "%.2f SEK/kWh", currentPrice)
    }
    
    var formattedCurrentTemperature: String {
        guard let temp = currentTemperature else { return "N/A" }
        return String(format: "%.1f°C", temp)
    }
    
    var formattedLastUpdated: String {
        guard let lastUpdated = lastUpdated else { return "Never" }
        let formatter = DateFormatter()
        formatter.timeStyle = .short
        formatter.dateStyle = .none
        return "Updated \(formatter.string(from: lastUpdated))"
    }
}
