import { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { MainLayout } from "./components/layout/MainLayout";
import { ApiKeySetup } from "./components/ApiKeySetup";
import Dashboard from "./pages/Dashboard";
import Control from "./pages/Control";
import Integrations from "./pages/Integrations";
import LogsHistory from "./pages/LogsHistory";
import NotFound from "./pages/NotFound";
import { apiClient } from "./services/apiClient";

const queryClient = new QueryClient();

const App = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    // Check if API key is already set and valid
    const checkAuth = async () => {
      const apiKey = apiClient.getApiKey();
      if (apiKey) {
        try {
          // Test the API key
          await apiClient.request('/api/health');
          setIsAuthenticated(true);
        } catch (error) {
          // API key is invalid, clear it
          apiClient.setApiKey('');
          setIsAuthenticated(false);
        }
      } else {
        setIsAuthenticated(false);
      }
      setIsCheckingAuth(false);
    };

    checkAuth();
  }, []);

  const handleApiKeySet = (apiKey: string) => {
    setIsAuthenticated(true);
  };

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-sm text-muted-foreground">Checking authentication...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <ApiKeySetup onApiKeySet={handleApiKeySet} />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <MainLayout>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/control" element={<Control />} />
              <Route path="/integrations" element={<Integrations />} />
              <Route path="/logs" element={<LogsHistory />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </MainLayout>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
