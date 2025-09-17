import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Thermometer, Zap, TrendingUp, Power, Plus, Minus, DollarSign } from "lucide-react";
import { PriceChart } from "@/components/dashboard/PriceChart";
import { TargetForecast } from "@/components/dashboard/TargetForecast";
import { useToast } from "@/hooks/use-toast";
import { fetchStoredPrices, getLatestPriceDate, triggerPriceCollection } from "@/services/priceDataService";
import { calculateRollingAverage, classifyPrice } from "@/services/priceService";
import { useSettings } from "@/contexts/SettingsContext";
import { CONFIG } from "@/lib/config";
import { HeatPumpStatusService, HeatPumpStatus } from "@/services/heatPumpStatusService";

interface DashboardData {
  heatPump: HeatPumpStatus | null;
  priceState: 'low' | 'normal' | 'high';
  currentPrice: number;
  automation: boolean;
  lastUpdate: Date;
}

const Dashboard = () => {
  const { toast } = useToast();
  const { settings, updateSetting } = useSettings();
  const [data, setData] = useState<DashboardData>({
    heatPump: null,
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
      toast({
        title: "Target Temperature Updated",
        description: `New target: ${newTemp}°C`,
      });
    }
  };

  // Fetch initial heat pump status
  const fetchHeatPumpStatus = async () => {
    try {
      const status = await HeatPumpStatusService.getLatestStatus();
      setData(prev => ({
        ...prev,
        heatPump: status,
        lastUpdate: new Date(),
      }));
    } catch (error) {
      console.error('Failed to fetch heat pump status:', error);
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
    // Trigger a status update immediately on load
    HeatPumpStatusService.triggerStatusUpdate();
    fetchHeatPumpStatus();
    
    // Refresh prices every 30 minutes
    const priceInterval = setInterval(fetchCurrentPrice, 30 * 60 * 1000);
    
    // Trigger heat pump status updates more frequently (every 2 minutes)
    const heatPumpInterval = setInterval(() => {
      HeatPumpStatusService.triggerStatusUpdate();
    }, 2 * 60 * 1000);
    
    return () => {
      clearInterval(priceInterval);
      clearInterval(heatPumpInterval);
    };
  }, []);

  // Set up real-time heat pump status subscription
  useEffect(() => {
    const unsubscribe = HeatPumpStatusService.subscribeToStatusChanges((status) => {
      setData(prev => ({
        ...prev,
        heatPump: status,
        lastUpdate: new Date(),
      }));
    });

    return unsubscribe;
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
          <div className="flex flex-col space-y-3 sm:flex-row sm:items-center sm:space-y-0 sm:space-x-6">
            <div className="flex items-center space-x-2">
              <Switch 
                checked={data.automation}
                onCheckedChange={handleAutomationToggle}
              />
              <span className="text-sm font-medium">Automation</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${
                data.heatPump?.power_status === 'on' && HeatPumpStatusService.isDeviceOnline(data.heatPump) ? 'bg-success animate-pulse' :
                data.heatPump?.power_status === 'standby' && HeatPumpStatusService.isDeviceOnline(data.heatPump) ? 'bg-warning' : 'bg-muted-foreground'
              }`} />
              <Power className={`h-4 w-4 ${
                data.heatPump?.power_status === 'on' ? 'text-success' :
                data.heatPump?.power_status === 'standby' ? 'text-warning' : 'text-muted-foreground'
              }`} />
              <span className="text-sm font-medium capitalize">
                {data.heatPump 
                  ? HeatPumpStatusService.isDeviceOnline(data.heatPump) 
                    ? data.heatPump.power_status 
                    : 'Offline'
                  : 'Unknown'
                }
              </span>
            </div>
          </div>
        </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Target Temperature */}
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
              <p className="text-sm text-muted-foreground">Target Temperature</p>
              <p className="text-3xl font-bold text-primary">
                {data.heatPump ? `${data.heatPump.target_temp}°C` : `${settings.baseSetpoint}°C`}
              </p>
            </div>
            <div className="flex items-center justify-center space-x-3">
              <Button
                variant="outline" 
                size="sm"
                onClick={() => handleTargetTempChange(settings.baseSetpoint - 1)}
                disabled={settings.baseSetpoint <= settings.minTemp}
                className="h-8 w-8 p-0"
              >
                <Minus className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium min-w-[3rem] text-center">
                {settings.baseSetpoint}°C
              </span>
              <Button
                variant="outline" 
                size="sm"
                onClick={() => handleTargetTempChange(settings.baseSetpoint + 1)}
                disabled={settings.baseSetpoint >= settings.maxTemp}
                className="h-8 w-8 p-0"
              >
                <Plus className="h-4 w-4" />
              </Button>
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
              <div className={`w-3 h-3 rounded-full ${
                data.heatPump && data.heatPump.water_temp > 20 ? 'bg-success' : 
                data.heatPump && data.heatPump.is_online ? 'bg-warning' : 'bg-muted-foreground'
              }`} />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Water Temperature</p>
              <p className="text-3xl font-bold text-blue-500">
                {data.heatPump ? `${data.heatPump.water_temp}°C` : '---'}
              </p>
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
                  data.heatPump && data.heatPump.speed_percentage > 80 ? 'from-red-500 to-red-300' :
                  data.heatPump && data.heatPump.speed_percentage > 50 ? 'from-yellow-500 to-yellow-300' :
                  'from-green-500 to-green-300'
                }`} />
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Pump Speed</p>
              <p className="text-3xl font-bold text-accent">
                {data.heatPump ? `${data.heatPump.speed_percentage}%` : '---'}
              </p>
            </div>
          </div>
        </Card>

        {/* Current Price */}
        <Card className="p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="p-3 bg-warning/10 rounded-full">
                <DollarSign className="h-6 w-6 text-warning" />
              </div>
              <Badge className={`${getPriceStateColor(data.priceState)}`}>
                {getPriceStateLabel(data.priceState)}
              </Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Current Price</p>
              <p className="text-3xl font-bold text-warning">
                {loading ? '...' : (data.currentPrice * 100).toFixed(1)}
                <span className="text-sm font-normal ml-1">öre/kWh</span>
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground">
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
            <h3 className="text-lg font-semibold mb-4">Electricity Price</h3>
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