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

interface HeatPumpLiveData {
  currentTemp: number;
  waterTemp: number;
  speedPercentage: number;
  powerStatus: 'on' | 'off' | 'standby';
  targetTemp: number;
}

interface DashboardData {
  heatPump: HeatPumpLiveData;
  priceState: 'low' | 'normal' | 'high';
  currentPrice: number;
  automation: boolean;
  lastUpdate: Date;
}

const Dashboard = () => {
  const { toast } = useToast();
  const { settings, updateSetting } = useSettings();
  const [data, setData] = useState<DashboardData>({
    heatPump: {
      currentTemp: 26.5,
      waterTemp: 24.8,
      speedPercentage: 75,
      powerStatus: 'on',
      targetTemp: settings.baseSetpoint,
    },
    priceState: 'normal',
    currentPrice: 0.45,
    automation: true,
    lastUpdate: new Date(),
  });
  const [loading, setLoading] = useState(false);
  

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
      setData(prev => ({ 
        ...prev, 
        heatPump: { ...prev.heatPump, targetTemp: newTemp }
      }));
      toast({
        title: "Target Temperature Updated",
        description: `New target: ${newTemp}°C`,
      });
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
          </div>
        </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Current Temperature */}
        <Card className="p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="p-3 bg-primary/10 rounded-full">
                <Thermometer className="h-6 w-6 text-primary" />
              </div>
              <Badge className={`${data.automation ? 'bg-success/10 text-success border-success/20' : 'bg-muted/10 text-muted-foreground border-muted/20'}`}>
                {data.automation ? 'Auto' : 'Manual'}
              </Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Current Temperature</p>
              <p className="text-3xl font-bold text-primary">{data.heatPump.currentTemp}°C</p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-muted-foreground">Target:</span>
                <span className="ml-1 font-medium">{data.heatPump.targetTemp}°C</span>
              </div>
              <div>
                <span className="text-muted-foreground">Status:</span>
                <span className="ml-1 font-medium capitalize">{data.heatPump.powerStatus}</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Water Temperature */}
        <Card className="p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="p-3 bg-blue-500/10 rounded-full">
                <Thermometer className="h-6 w-6 text-blue-500" />
              </div>
              <div className={`w-3 h-3 rounded-full ${data.heatPump.waterTemp > 20 ? 'bg-success' : 'bg-warning'}`} />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Water Temperature</p>
              <p className="text-3xl font-bold text-blue-500">{data.heatPump.waterTemp}°C</p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-muted-foreground">Min:</span>
                <span className="ml-1 font-medium">18°C</span>
              </div>
              <div>
                <span className="text-muted-foreground">Max:</span>
                <span className="ml-1 font-medium">32°C</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Speed Percentage */}
        <Card className="p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="p-3 bg-accent/10 rounded-full">
                <TrendingUp className="h-6 w-6 text-accent" />
              </div>
              <div className="text-right">
                <div className={`w-2 h-6 rounded-full bg-gradient-to-t ${
                  data.heatPump.speedPercentage > 80 ? 'from-red-500 to-red-300' :
                  data.heatPump.speedPercentage > 50 ? 'from-yellow-500 to-yellow-300' :
                  'from-green-500 to-green-300'
                }`} />
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Pump Speed</p>
              <p className="text-3xl font-bold text-accent">{data.heatPump.speedPercentage}%</p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-muted-foreground">Mode:</span>
                <span className="ml-1 font-medium">Variable</span>
              </div>
              <div>
                <span className="text-muted-foreground">Load:</span>
                <span className="ml-1 font-medium">{data.heatPump.speedPercentage > 75 ? 'High' : data.heatPump.speedPercentage > 40 ? 'Medium' : 'Low'}</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Power & Price */}
        <Card className="p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="p-3 bg-warning/10 rounded-full">
                <Power className="h-6 w-6 text-warning" />
              </div>
              <div className={`flex items-center space-x-1 ${
                data.heatPump.powerStatus === 'on' ? 'text-success' :
                data.heatPump.powerStatus === 'standby' ? 'text-warning' : 'text-muted-foreground'
              }`}>
                <div className={`w-2 h-2 rounded-full ${
                  data.heatPump.powerStatus === 'on' ? 'bg-success animate-pulse' :
                  data.heatPump.powerStatus === 'standby' ? 'bg-warning' : 'bg-muted-foreground'
                }`} />
                <span className="text-xs font-medium capitalize">{data.heatPump.powerStatus}</span>
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Current Price</p>
              <p className="text-2xl font-bold text-warning">
                {loading ? '...' : (data.currentPrice * 100).toFixed(1)}
                <span className="text-sm font-normal ml-1">öre/kWh</span>
              </p>
            </div>
            <div className="space-y-1">
              <Badge className={`w-full justify-center ${getPriceStateColor(data.priceState)}`}>
                {getPriceStateLabel(data.priceState)}
              </Badge>
              <p className="text-xs text-center text-muted-foreground">
                {CONFIG.priceProvider} • {settings.biddingZone}
              </p>
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