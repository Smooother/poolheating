import Foundation

// MARK: - Status Response
struct StatusResponse: Codable {
    let now: String
    let area: String
    let priceState: String
    let currentPrice: Double
    let targetC: Int
    let power: Bool
    let waterTemp: Double?
    let mode: String?
    let paused: Bool
    let nextSteps: [PlanStep]?
    let lastAction: LastAction?
    
    struct LastAction: Codable {
        let ts: String
        let targetC: Int
        let state: String
    }
}

// MARK: - Plan Step
struct PlanStep: Codable, Identifiable {
    var id: String { start + "-" + end }
    let start: String
    let end: String
    let state: String
    let targetC: Int
    
    var startDate: Date? {
        ISO8601DateFormatter().date(from: start)
    }
    
    var endDate: Date? {
        ISO8601DateFormatter().date(from: end)
    }
    
    var priceState: Config.PriceState? {
        Config.PriceState(rawValue: state)
    }
}

// MARK: - Override Request
struct OverrideRequest: Codable {
    let action: String
    let value: AnyCodable?
    
    init(action: OverrideAction, value: Any? = nil) {
        self.action = action.rawValue
        self.value = value.map(AnyCodable.init)
    }
}

// MARK: - Override Action
enum OverrideAction: String, CaseIterable {
    case setPower = "setPower"
    case setTemp = "setTemp"
    case pause = "pause"
    case resume = "resume"
}

// MARK: - Override Response
struct OverrideResponse: Codable {
    let success: Bool
    let message: String?
    let error: String?
}

// MARK: - Health Response
struct HealthResponse: Codable {
    let ok: Bool
    let time: String
    let tz: String
    let version: String
    let environment: String?
    let uptime: Double?
    let memory: MemoryUsage?
    let timestamp: Double?
    
    struct MemoryUsage: Codable {
        let rss: Double
        let heapTotal: Double
        let heapUsed: Double
        let external: Double
    }
}

// MARK: - API Error
struct APIError: Error, Codable {
    let success: Bool
    let error: String
    let code: String?
    
    var localizedDescription: String {
        return error
    }
}

// MARK: - Any Codable (for flexible JSON values)
struct AnyCodable: Codable {
    let value: Any
    
    init(_ value: Any) {
        self.value = value
    }
    
    init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        
        if let bool = try? container.decode(Bool.self) {
            value = bool
        } else if let int = try? container.decode(Int.self) {
            value = int
        } else if let double = try? container.decode(Double.self) {
            value = double
        } else if let string = try? container.decode(String.self) {
            value = string
        } else {
            throw DecodingError.typeMismatch(AnyCodable.self, DecodingError.Context(
                codingPath: decoder.codingPath,
                debugDescription: "Unsupported type"
            ))
        }
    }
    
    func encode(to encoder: Encoder) throws {
        var container = encoder.singleValueContainer()
        
        if let bool = value as? Bool {
            try container.encode(bool)
        } else if let int = value as? Int {
            try container.encode(int)
        } else if let double = value as? Double {
            try container.encode(double)
        } else if let string = value as? String {
            try container.encode(string)
        } else {
            throw EncodingError.invalidValue(value, EncodingError.Context(
                codingPath: encoder.codingPath,
                debugDescription: "Unsupported type"
            ))
        }
    }
}
