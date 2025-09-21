import Foundation

struct Config {
    // MARK: - API Configuration
    static let baseURL = "https://poolheating.vercel.app"
    
    // MARK: - API Endpoints
    struct Endpoints {
        static let health = "/api/health"
        static let status = "/api/status"
        static let override = "/api/override"
    }
    
    // MARK: - Default Values
    struct Defaults {
        static let minTemperature: Int = 18
        static let maxTemperature: Int = 35
        static let defaultTargetTemperature: Int = 28
        static let refreshInterval: TimeInterval = 30 // seconds
    }
    
    // MARK: - Price States
    enum PriceState: String, CaseIterable {
        case low = "LOW"
        case normal = "NORMAL"
        case high = "HIGH"
        
        var displayName: String {
            switch self {
            case .low: return "Low"
            case .normal: return "Normal"
            case .high: return "High"
            }
        }
        
        var color: String {
            switch self {
            case .low: return "green"
            case .normal: return "orange"
            case .high: return "red"
            }
        }
    }
    
    // MARK: - Heat Pump Modes
    enum HeatPumpMode: String, CaseIterable {
        case warm = "warm"
        case cool = "cool"
        case smart = "smart"
        
        var displayName: String {
            switch self {
            case .warm: return "Warm"
            case .cool: return "Cool"
            case .smart: return "Smart"
            }
        }
    }
}
