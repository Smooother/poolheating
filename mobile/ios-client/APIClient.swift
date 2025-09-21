import Foundation

class APIClient: ObservableObject {
    private let baseURL: URL
    private let session: URLSession
    
    init(baseURL: String = Config.baseURL) {
        guard let url = URL(string: baseURL) else {
            fatalError("Invalid base URL: \(baseURL)")
        }
        self.baseURL = url
        
        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = 30
        config.timeoutIntervalForResource = 60
        self.session = URLSession(configuration: config)
    }
    
    // MARK: - Health Check
    func fetchHealth() async throws -> HealthResponse {
        let url = baseURL.appendingPathComponent(Config.Endpoints.health)
        return try await performRequest(url: url, method: "GET")
    }
    
    // MARK: - Status
    func fetchStatus() async throws -> StatusResponse {
        let url = baseURL.appendingPathComponent(Config.Endpoints.status)
        return try await performRequest(url: url, method: "GET")
    }
    
    // MARK: - Override Actions
    func overridePower(_ on: Bool) async throws -> OverrideResponse {
        let request = OverrideRequest(action: .setPower, value: on)
        return try await performOverrideRequest(request)
    }
    
    func overrideTemp(_ temperature: Int) async throws -> OverrideResponse {
        guard temperature >= Config.Defaults.minTemperature && 
              temperature <= Config.Defaults.maxTemperature else {
            throw APIError(success: false, error: "Temperature must be between \(Config.Defaults.minTemperature) and \(Config.Defaults.maxTemperature)", code: "INVALID_TEMPERATURE")
        }
        
        let request = OverrideRequest(action: .setTemp, value: temperature)
        return try await performOverrideRequest(request)
    }
    
    func pause() async throws -> OverrideResponse {
        let request = OverrideRequest(action: .pause)
        return try await performOverrideRequest(request)
    }
    
    func resume() async throws -> OverrideResponse {
        let request = OverrideRequest(action: .resume)
        return try await performOverrideRequest(request)
    }
    
    // MARK: - Private Methods
    private func performOverrideRequest(_ request: OverrideRequest) async throws -> OverrideResponse {
        let url = baseURL.appendingPathComponent(Config.Endpoints.override)
        return try await performRequest(url: url, method: "POST", body: request)
    }
    
    private func performRequest<T: Codable, U: Codable>(
        url: URL,
        method: String,
        body: T? = nil,
        responseType: U.Type = U.self
    ) async throws -> U {
        var urlRequest = URLRequest(url: url)
        urlRequest.httpMethod = method
        urlRequest.setValue("application/json", forHTTPHeaderField: "Content-Type")
        urlRequest.setValue("application/json", forHTTPHeaderField: "Accept")
        
        if let body = body {
            do {
                urlRequest.httpBody = try JSONEncoder().encode(body)
            } catch {
                throw APIError(success: false, error: "Failed to encode request body: \(error.localizedDescription)", code: "ENCODING_ERROR")
            }
        }
        
        do {
            let (data, response) = try await session.data(for: urlRequest)
            
            guard let httpResponse = response as? HTTPURLResponse else {
                throw APIError(success: false, error: "Invalid response type", code: "INVALID_RESPONSE")
            }
            
            // Handle HTTP errors
            guard httpResponse.statusCode >= 200 && httpResponse.statusCode < 300 else {
                let errorMessage = "HTTP \(httpResponse.statusCode)"
                throw APIError(success: false, error: errorMessage, code: "HTTP_ERROR")
            }
            
            // Try to decode the response
            do {
                let decoder = JSONDecoder()
                decoder.dateDecodingStrategy = .iso8601
                return try decoder.decode(responseType, from: data)
            } catch {
                // If decoding fails, try to decode as API error
                if let apiError = try? JSONDecoder().decode(APIError.self, from: data) {
                    throw apiError
                }
                
                // If that fails too, throw a generic error
                let responseString = String(data: data, encoding: .utf8) ?? "Unknown error"
                throw APIError(success: false, error: "Failed to decode response: \(responseString)", code: "DECODING_ERROR")
            }
        } catch let error as APIError {
            throw error
        } catch {
            throw APIError(success: false, error: "Network error: \(error.localizedDescription)", code: "NETWORK_ERROR")
        }
    }
}

// MARK: - Convenience Extensions
extension APIClient {
    func testConnection() async -> Bool {
        do {
            let _ = try await fetchHealth()
            return true
        } catch {
            print("Connection test failed: \(error)")
            return false
        }
    }
}
