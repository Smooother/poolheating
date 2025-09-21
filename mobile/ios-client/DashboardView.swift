import SwiftUI

struct DashboardView: View {
    @StateObject private var viewModel = DashboardViewModel()
    @State private var showingTemperaturePicker = false
    @State private var tempSliderValue: Double = 28
    
    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 20) {
                    // Connection Status
                    connectionStatusView
                    
                    // Main Status Card
                    mainStatusCard
                    
                    // Temperature Control
                    temperatureControlCard
                    
                    // Power Control
                    powerControlCard
                    
                    // Price Information
                    priceInfoCard
                    
                    // Next Steps
                    if !viewModel.nextSteps.isEmpty {
                        nextStepsCard
                    }
                    
                    // Last Action
                    if let lastAction = viewModel.lastAction {
                        lastActionCard(lastAction)
                    }
                }
                .padding()
            }
            .navigationTitle("Pool Heating")
            .navigationBarTitleDisplayMode(.large)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Refresh") {
                        Task {
                            await viewModel.refreshStatus()
                        }
                    }
                    .disabled(viewModel.isLoading)
                }
            }
            .refreshable {
                await viewModel.refreshStatus()
            }
            .onAppear {
                Task {
                    await viewModel.loadStatus()
                }
            }
            .alert("Error", isPresented: .constant(viewModel.errorMessage != nil)) {
                Button("OK") {
                    viewModel.errorMessage = nil
                }
            } message: {
                Text(viewModel.errorMessage ?? "")
            }
        }
    }
    
    // MARK: - Connection Status View
    private var connectionStatusView: some View {
        HStack {
            Circle()
                .fill(viewModel.isConnected ? Color.green : Color.red)
                .frame(width: 12, height: 12)
            
            Text(viewModel.isConnected ? "Connected" : "Disconnected")
                .font(.caption)
                .foregroundColor(.secondary)
            
            Spacer()
            
            Text(viewModel.formattedLastUpdated)
                .font(.caption)
                .foregroundColor(.secondary)
        }
        .padding(.horizontal)
    }
    
    // MARK: - Main Status Card
    private var mainStatusCard: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack {
                Text("Current Status")
                    .font(.headline)
                Spacer()
                if viewModel.isLoading {
                    ProgressView()
                        .scaleEffect(0.8)
                }
            }
            
            HStack {
                VStack(alignment: .leading) {
                    Text("Water Temperature")
                        .font(.caption)
                        .foregroundColor(.secondary)
                    Text(viewModel.formattedCurrentTemperature)
                        .font(.title2)
                        .fontWeight(.semibold)
                }
                
                Spacer()
                
                VStack(alignment: .trailing) {
                    Text("Target Temperature")
                        .font(.caption)
                        .foregroundColor(.secondary)
                    Text("\(viewModel.targetTemperature)°C")
                        .font(.title2)
                        .fontWeight(.semibold)
                }
            }
            
            HStack {
                VStack(alignment: .leading) {
                    Text("Power Status")
                        .font(.caption)
                        .foregroundColor(.secondary)
                    Text(viewModel.isPowerOn ? "ON" : "OFF")
                        .font(.title3)
                        .fontWeight(.semibold)
                        .foregroundColor(viewModel.isPowerOn ? .green : .red)
                }
                
                Spacer()
                
                VStack(alignment: .trailing) {
                    Text("Automation")
                        .font(.caption)
                        .foregroundColor(.secondary)
                    Text(viewModel.isAutomationPaused ? "PAUSED" : "ACTIVE")
                        .font(.title3)
                        .fontWeight(.semibold)
                        .foregroundColor(viewModel.isAutomationPaused ? .orange : .green)
                }
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(12)
        .shadow(color: .black.opacity(0.1), radius: 2, x: 0, y: 1)
    }
    
    // MARK: - Temperature Control Card
    private var temperatureControlCard: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Temperature Control")
                .font(.headline)
            
            HStack {
                Text("Target: \(viewModel.targetTemperature)°C")
                    .font(.title3)
                    .fontWeight(.medium)
                
                Spacer()
                
                Button("Set") {
                    showingTemperaturePicker = true
                    tempSliderValue = Double(viewModel.targetTemperature)
                }
                .buttonStyle(.borderedProminent)
            }
            
            Slider(
                value: $tempSliderValue,
                in: Double(viewModel.temperatureRange.lowerBound)...Double(viewModel.temperatureRange.upperBound),
                step: 1
            ) {
                Text("Temperature")
            } minimumValueLabel: {
                Text("\(viewModel.temperatureRange.lowerBound)°C")
                    .font(.caption)
            } maximumValueLabel: {
                Text("\(viewModel.temperatureRange.upperBound)°C")
                    .font(.caption)
            }
            .disabled(viewModel.isLoading)
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(12)
        .shadow(color: .black.opacity(0.1), radius: 2, x: 0, y: 1)
        .sheet(isPresented: $showingTemperaturePicker) {
            temperaturePickerSheet
        }
    }
    
    // MARK: - Power Control Card
    private var powerControlCard: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Power Control")
                .font(.headline)
            
            HStack {
                Button(action: {
                    Task {
                        await viewModel.setPower(!viewModel.isPowerOn)
                    }
                }) {
                    HStack {
                        Image(systemName: viewModel.isPowerOn ? "power" : "power")
                            .foregroundColor(viewModel.isPowerOn ? .white : .red)
                        Text(viewModel.isPowerOn ? "Turn OFF" : "Turn ON")
                            .fontWeight(.semibold)
                    }
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(viewModel.isPowerOn ? Color.red : Color.green)
                    .foregroundColor(.white)
                    .cornerRadius(8)
                }
                .disabled(viewModel.isLoading)
                
                Spacer()
                
                Button(action: {
                    Task {
                        if viewModel.isAutomationPaused {
                            await viewModel.resumeAutomation()
                        } else {
                            await viewModel.pauseAutomation()
                        }
                    }
                }) {
                    HStack {
                        Image(systemName: viewModel.isAutomationPaused ? "play.fill" : "pause.fill")
                        Text(viewModel.isAutomationPaused ? "Resume" : "Pause")
                            .fontWeight(.semibold)
                    }
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(viewModel.isAutomationPaused ? Color.green : Color.orange)
                    .foregroundColor(.white)
                    .cornerRadius(8)
                }
                .disabled(viewModel.isLoading)
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(12)
        .shadow(color: .black.opacity(0.1), radius: 2, x: 0, y: 1)
    }
    
    // MARK: - Price Info Card
    private var priceInfoCard: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Electricity Price")
                .font(.headline)
            
            HStack {
                VStack(alignment: .leading) {
                    Text("Current Price")
                        .font(.caption)
                        .foregroundColor(.secondary)
                    Text(viewModel.formattedCurrentPrice)
                        .font(.title2)
                        .fontWeight(.semibold)
                }
                
                Spacer()
                
                VStack(alignment: .trailing) {
                    Text("Price State")
                        .font(.caption)
                        .foregroundColor(.secondary)
                    Text(viewModel.priceStateDisplayName)
                        .font(.title3)
                        .fontWeight(.semibold)
                        .foregroundColor(priceStateColor)
                }
            }
            
            Text("Area: \(viewModel.priceArea)")
                .font(.caption)
                .foregroundColor(.secondary)
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(12)
        .shadow(color: .black.opacity(0.1), radius: 2, x: 0, y: 1)
    }
    
    // MARK: - Next Steps Card
    private var nextStepsCard: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Upcoming Schedule")
                .font(.headline)
            
            ForEach(viewModel.nextSteps.prefix(3)) { step in
                HStack {
                    VStack(alignment: .leading) {
                        Text(formatTime(step.start))
                            .font(.caption)
                            .foregroundColor(.secondary)
                        Text("\(step.targetC)°C")
                            .font(.title3)
                            .fontWeight(.semibold)
                    }
                    
                    Spacer()
                    
                    Text(step.priceState?.displayName ?? step.state)
                        .font(.caption)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(priceStateColor.opacity(0.2))
                        .foregroundColor(priceStateColor)
                        .cornerRadius(4)
                }
                .padding(.vertical, 4)
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(12)
        .shadow(color: .black.opacity(0.1), radius: 2, x: 0, y: 1)
    }
    
    // MARK: - Last Action Card
    private func lastActionCard(_ action: StatusResponse.LastAction) -> some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Last Action")
                .font(.headline)
            
            HStack {
                VStack(alignment: .leading) {
                    Text("Temperature")
                        .font(.caption)
                        .foregroundColor(.secondary)
                    Text("\(action.targetC)°C")
                        .font(.title3)
                        .fontWeight(.semibold)
                }
                
                Spacer()
                
                VStack(alignment: .trailing) {
                    Text("Price State")
                        .font(.caption)
                        .foregroundColor(.secondary)
                    Text(action.state)
                        .font(.title3)
                        .fontWeight(.semibold)
                        .foregroundColor(priceStateColor)
                }
            }
            
            Text("Time: \(formatTime(action.ts))")
                .font(.caption)
                .foregroundColor(.secondary)
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(12)
        .shadow(color: .black.opacity(0.1), radius: 2, x: 0, y: 1)
    }
    
    // MARK: - Temperature Picker Sheet
    private var temperaturePickerSheet: some View {
        NavigationView {
            VStack(spacing: 20) {
                Text("Set Target Temperature")
                    .font(.title2)
                    .fontWeight(.semibold)
                
                Text("\(Int(tempSliderValue))°C")
                    .font(.largeTitle)
                    .fontWeight(.bold)
                    .foregroundColor(.blue)
                
                Slider(
                    value: $tempSliderValue,
                    in: Double(viewModel.temperatureRange.lowerBound)...Double(viewModel.temperatureRange.upperBound),
                    step: 1
                ) {
                    Text("Temperature")
                } minimumValueLabel: {
                    Text("\(viewModel.temperatureRange.lowerBound)°C")
                        .font(.caption)
                } maximumValueLabel: {
                    Text("\(viewModel.temperatureRange.upperBound)°C")
                        .font(.caption)
                }
                .padding()
                
                Spacer()
            }
            .padding()
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") {
                        showingTemperaturePicker = false
                    }
                }
                
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Set") {
                        Task {
                            await viewModel.setTemperature(Int(tempSliderValue))
                            showingTemperaturePicker = false
                        }
                    }
                    .fontWeight(.semibold)
                }
            }
        }
    }
    
    // MARK: - Helper Methods
    private var priceStateColor: Color {
        switch viewModel.priceState {
        case .low: return .green
        case .normal: return .orange
        case .high: return .red
        case .none: return .gray
        }
    }
    
    private func formatTime(_ timeString: String) -> String {
        guard let date = ISO8601DateFormatter().date(from: timeString) else {
            return timeString
        }
        
        let formatter = DateFormatter()
        formatter.timeStyle = .short
        formatter.dateStyle = .none
        return formatter.string(from: date)
    }
}

// MARK: - Preview
struct DashboardView_Previews: PreviewProvider {
    static var previews: some View {
        DashboardView()
    }
}
