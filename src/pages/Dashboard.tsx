import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Thermometer, Zap, TrendingUp, Power, Settings } from "lucide-react";
import { PriceChart } from "@/components/dashboard/PriceChart";
import { TargetForecast } from "@/components/dashboard/TargetForecast";
import { useToast } from "@/hooks/use-toast";
import { fetchPrices, calculateRollingAverage, classifyPrice, PriceProviderConfig } from "@/services/priceService";
import { CONFIG } from "@/lib/config";

interface DashboardData {
  currentTemp: number;
  targetTemp: number;
  priceState: 'low' | 'normal' | 'high';
  currentPrice: number;
  automation: boolean;
  lastUpdate: Date;
}

const Dashboard = () => {
  const { toast } = useToast();
  const [data, setData] = useState<DashboardData>({
    currentTemp: 26.5,
    targetTemp: 28.0,
    priceState: 'normal',
    currentPrice: 0.45,
    automation: true,
    lastUpdate: new Date(),
  });
  const [loading, setLoading] = useState(false);
  const [currentBiddingZone, setCurrentBiddingZone] = useState(CONFIG.biddingZone);

  const handleBiddingZoneChange = (zone: string) => {
    setCurrentBiddingZone(zone);
    // Update CONFIG or trigger refresh - for now just update local state
    toast({
      title: "Bidding Zone Updated",
      description: `Switched to ${zone} - refreshing price data...`,
    });
    // Trigger price refresh
    fetchCurrentPrice(zone);
  };

  // Fetch live price data for current hour
  const fetchCurrentPrice = async (biddingZone = currentBiddingZone) => {
    try {
      setLoading(true);
      
      const now = new Date();
      const startOfHour = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours());
      const endOfHour = new Date(startOfHour.getTime() + 60 * 60 * 1000);

      const config: PriceProviderConfig = {
        biddingZone: biddingZone,
        currency: CONFIG.currency,
        timezone: CONFIG.timezone,
      };

      const prices = await fetchPrices(CONFIG.priceProvider, config, startOfHour, endOfHour);
      
      if (prices.length > 0) {
        const currentPrice = prices[0];
        
        // Get historical prices for classification
        const yesterday = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const historicalPrices = await fetchPrices(CONFIG.priceProvider, config, yesterday, now);
        
        const { average: rollingAvg } = calculateRollingAverage(historicalPrices, CONFIG.rollingDays);
        const priceState = classifyPrice(currentPrice.value, rollingAvg, CONFIG.priceMethod, CONFIG);
        
        setData(prev => ({
          ...prev,
          currentPrice: currentPrice.value,
          priceState,
          lastUpdate: new Date(),
        }));
      }
    } catch (error) {
      console.error('Failed to fetch current price:', error);
    } finally {
      setLoading(false);
    }
  };

  // Initial load and periodic refresh
  useEffect(() => {
    fetchCurrentPrice();
    
    // Refresh every 30 minutes
    const interval = setInterval(fetchCurrentPrice, 30 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  // Refresh when provider changes
  useEffect(() => {
    fetchCurrentPrice();
  }, [CONFIG.priceProvider, currentBiddingZone]);

  const handleAutomationToggle = (enabled: boolean) => {
    setData(prev => ({ ...prev, automation: enabled }));
    toast({
      title: enabled ? "Automation Enabled" : "Automation Disabled",
      description: enabled ? "Heat pump will adjust based on electricity prices" : "Manual control mode activated",
    });
  };

  const getPriceStateColor = (state: string) => {
    switch (state) {
      case 'low': return 'bg-success/10 text-success border-success/20';
      case 'high': return 'bg-destructive/10 text-destructive border-destructive/20';
      default: return 'bg-muted text-muted-foreground border-border';
    }
  };

  const getPriceStateLabel = (state: string) => {
    switch (state) {
      case 'low': return 'Low Price';
      case 'high': return 'High Price';
      default: return 'Normal Price';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Pool Control</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Dynamic heat pump control based on electricity prices</p>
        </div>
        <div className="flex flex-col space-y-3 sm:flex-row sm:items-center sm:space-y-0 sm:space-x-4">
          <div className="flex items-center space-x-2">
            <Switch
              checked={data.automation}
              onCheckedChange={handleAutomationToggle}
            />
            <span className="text-sm font-medium">Automation</span>
          </div>
          <Button variant="outline" size="sm" className="w-full sm:w-auto">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Current Temperature */}
        <Card className="status-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="metric-label">Current Temperature</p>
              <p className="metric-display text-primary">{data.currentTemp}°C</p>
            </div>
            <div className="p-3 bg-primary/10 rounded-full">
              <Thermometer className="h-6 w-6 text-primary" />
            </div>
          </div>
        </Card>

        {/* Target Temperature */}
        <Card className="status-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="metric-label">Target Temperature</p>
              <p className="metric-display">{data.targetTemp}°C</p>
            </div>
            <div className="p-3 bg-accent/10 rounded-full">
              <Power className="h-6 w-6 text-accent" />
            </div>
          </div>
        </Card>

        {/* Current Price */}
        <Card className="status-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="metric-label">Current Price</p>
              <p className="metric-display">
                {loading ? '...' : data.currentPrice.toFixed(3)} SEK/kWh
              </p>
              <Badge className={`mt-2 ${getPriceStateColor(data.priceState)}`}>
                {getPriceStateLabel(data.priceState)}
              </Badge>
            </div>
            <div className="p-3 bg-warning/10 rounded-full">
              <Zap className="h-6 w-6 text-warning" />
            </div>
          </div>
              <div className="mt-2">
            <p className="text-xs text-muted-foreground">
              {CONFIG.priceProvider} • {currentBiddingZone}
            </p>
          </div>
        </Card>

        {/* Automation Status */}
        <Card className="status-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="metric-label">System Status</p>
              <p className="metric-display text-sm">
                {data.automation ? 'Auto Control' : 'Manual Mode'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Last update: {data.lastUpdate.toLocaleTimeString()}
              </p>
            </div>
            <div className={`p-3 rounded-full ${data.automation ? 'bg-success/10' : 'bg-muted/10'}`}>
              <TrendingUp className={`h-6 w-6 ${data.automation ? 'text-success' : 'text-muted-foreground'}`} />
            </div>
          </div>
        </Card>
      </div>

      {/* Charts Section - Stacked Vertically */}
      <div className="space-y-6">
        {/* Live Price Chart - Full Width */}
        <Card className="status-card">
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4">Live Price Data</h3>
            <PriceChart currentBiddingZone={currentBiddingZone} />
          </div>
        </Card>

        {/* Temperature Forecast - Full Width */}
        <Card className="status-card">
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4">Temperature Forecast</h3>
            <TargetForecast biddingZone={currentBiddingZone} />
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;