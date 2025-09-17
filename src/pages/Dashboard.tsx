import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Thermometer, Zap, TrendingUp, Power, Plus, Minus } from "lucide-react";
import { PriceChart } from "@/components/dashboard/PriceChart";
import { TargetForecast } from "@/components/dashboard/TargetForecast";
import { useToast } from "@/hooks/use-toast";
import { fetchStoredPrices, getLatestPriceDate, triggerPriceCollection } from "@/services/priceDataService";
import { calculateRollingAverage, classifyPrice } from "@/services/priceService";
import { useSettings } from "@/contexts/SettingsContext";
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
  const { settings, updateSetting } = useSettings();
  const [data, setData] = useState<DashboardData>({
    currentTemp: 26.5,
    targetTemp: settings.baseSetpoint,
    priceState: 'normal',
    currentPrice: 0.45,
    automation: true,
    lastUpdate: new Date(),
  });
  const [loading, setLoading] = useState(false);
  const [priceDataLoading, setPriceDataLoading] = useState(false);

  const handleBiddingZoneChange = (zone: string) => {
    updateSetting('biddingZone', zone);
    toast({
      title: "Bidding Zone Updated",
      description: `Switched to ${zone} - refreshing price data...`,
    });
    fetchCurrentPrice();
  };

  const handleTargetTempChange = (newTemp: number) => {
    if (newTemp >= settings.minTemp && newTemp <= settings.maxTemp) {
      updateSetting('baseSetpoint', newTemp);
      setData(prev => ({ ...prev, targetTemp: newTemp }));
      toast({
        title: "Target Temperature Updated",
        description: `New target: ${newTemp}°C`,
      });
    }
  };

  const triggerDataCollection = async () => {
    setPriceDataLoading(true);
    try {
      await triggerPriceCollection();
      toast({
        title: "Price Data Collection Started",
        description: "Downloading latest price data in the background...",
      });
      // Refresh current price after a short delay
      setTimeout(() => fetchCurrentPrice(), 2000);
    } catch (error) {
      toast({
        title: "Collection Failed",
        description: error instanceof Error ? error.message : "Failed to start price collection",
        variant: "destructive",
      });
    } finally {
      setPriceDataLoading(false);
    }
  };

  // Fetch current price data from Supabase
  const fetchCurrentPrice = async () => {
    try {
      setLoading(true);
      
      const now = new Date();
      const startOfHour = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours());
      const endOfHour = new Date(startOfHour.getTime() + 60 * 60 * 1000);

      // Try to get current price from stored data
      let prices = await fetchStoredPrices(settings.biddingZone, startOfHour, endOfHour);
      
      if (prices.length > 0) {
        const currentPrice = prices[0];
        
        // Get historical prices for classification (last 7 days)
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const historicalPrices = await fetchStoredPrices(settings.biddingZone, sevenDaysAgo, now);
        
        const { average: rollingAvg } = calculateRollingAverage(historicalPrices, settings.rollingDays);
        const priceState = classifyPrice(currentPrice.value, rollingAvg, settings.thresholdMethod === 'delta' ? 'percent' : 'percentile', settings);
        
        setData(prev => ({
          ...prev,
          currentPrice: currentPrice.value,
          priceState,
          lastUpdate: new Date(),
        }));
      } else {
        // No current data available, try to trigger collection
        console.log('No current price data available, triggering collection...');
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

  // Refresh when settings change
  useEffect(() => {
    fetchCurrentPrice();
  }, [settings.biddingZone]);

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
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full sm:w-auto"
              onClick={triggerDataCollection}
              disabled={priceDataLoading}
            >
              {priceDataLoading ? 'Updating...' : 'Update Price Data'}
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
            <div className="flex-1">
              <p className="metric-label">Target Temperature</p>
              <div className="flex items-center space-x-2 mt-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => handleTargetTempChange(settings.baseSetpoint - 0.5)}
                  disabled={settings.baseSetpoint <= settings.minTemp}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="metric-display text-lg min-w-16 text-center">{settings.baseSetpoint}°C</span>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => handleTargetTempChange(settings.baseSetpoint + 0.5)}
                  disabled={settings.baseSetpoint >= settings.maxTemp}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="p-3 bg-accent/10 rounded-full">
              <Thermometer className="h-6 w-6 text-accent" />
            </div>
          </div>
        </Card>

        {/* Current Price */}
        <Card className="status-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="metric-label">Current Price</p>
              <p className="metric-display">
                {loading ? '...' : (data.currentPrice * 100).toFixed(1)} öre/kWh
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
              {CONFIG.priceProvider} • {settings.biddingZone}
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
            <PriceChart currentBiddingZone={settings.biddingZone} />
          </div>
        </Card>

        {/* Temperature Forecast - Full Width */}
        <Card className="status-card">
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4">Temperature Forecast</h3>
            <TargetForecast biddingZone={settings.biddingZone} />
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;