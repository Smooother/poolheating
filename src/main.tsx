import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { SettingsProvider } from "./contexts/SettingsContext.tsx";

// Test Tuya connection on startup
import { tuyaService } from "./services/tuyaService";
import { triggerPriceCollection } from "./services/priceDataService";

// Test Tuya connection
tuyaService.testConnection().then((connected) => {
  if (connected) {
    console.log('✅ Tuya Cloud connection test successful');
  } else {
    console.warn('⚠️ Tuya Cloud connection test failed - check configuration');
  }
}).catch((error) => {
  console.error('❌ Tuya Cloud connection test error:', error);
});

// Automatically collect price data on startup
triggerPriceCollection().then(() => {
  console.log('✅ Automatic price data collection started');
}).catch((error) => {
  console.error('❌ Automatic price data collection failed:', error);
});

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <SettingsProvider>
      <App />
    </SettingsProvider>
  </React.StrictMode>,
);
