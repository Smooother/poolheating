import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Thermometer, Zap, TrendingUp, Power, Plus, Minus, DollarSign, RefreshCw, Settings, MapPin, ChevronDown, ChevronUp } from "lucide-react";
import { PriceChart } from "@/components/dashboard/PriceChart";
import { TargetForecast } from "@/components/dashboard/TargetForecast";
import { useToast } from "@/hooks/use-toast";
import { fetchStoredPrices, getLatestPriceDate, triggerPriceCollection } from "@/services/priceDataService";
import { calculateRollingAverage, classifyPrice } from "@/services/priceService";
import { useSettings } from "@/contexts/SettingsContext";
import { CONFIG } from "@/lib/config";
import { HeatPumpStatusService, HeatPumpStatus } from "@/services/heatPumpStatusService";
import { HeatPumpCommandService } from "@/services/heatPumpCommandService";
import { AutomationService, AutomationSettings } from "@/services/automationService";
import { calculateConsumerPrice, getPriceBreakdown } from "@/services/priceCalculationService";

interface DashboardData {
  heatPump: HeatPumpStatus | null;
  priceState: 'low' | 'normal' | 'high';
  currentPrice: number;
  priceBreakdown: string;
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
    priceBreakdown: '',
    automation: true,
    lastUpdate: new Date(),
  });
  const [loading, setLoading] = useState(false);
  const [automationSettings, setAutomationSettings] = useState<AutomationSettings | null>(null);
  const [showCharts, setShowCharts] = useState(false);
  const [targetTemp, setTargetTemp] = useState(28);
  
  // Load automation settings on mount
  useEffect(() => {
    const loadAutomationSettings = async () => {
      const settings = await AutomationService.getSettings();
      if (settings) {
        setAutomationSettings(settings);
        setData(prev => ({ ...prev, automation: settings.automation_enabled }));
        setTargetTemp(settings.target_pool_temp || 28);
      }
    };
    
    loadAutomationSettings();
  }, []);
  
  // Set up real-time updates
  useEffect(() => {
    let unsubscribe: (() => void) | null = null;
    
    const setupRealTimeUpdates = () => {
      unsubscribe = HeatPumpStatusService.subscribeToStatusChanges((newStatus) => {
        if (newStatus) {
          setData(prev => ({
            ...prev,
            heatPump: newStatus,
            lastUpdate: new Date()
          }));
        }
      });
    };
    
    setupRealTimeUpdates();
    
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  // Set up periodic refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchHeatPumpStatus();
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, []);

  // Fetch price data
  const fetchPriceData = async () => {
    try {
      setLoading(true);
      const now = new Date();
      const startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const endDate = new Date(now.getTime() + 48 * 60 * 60 * 1000);

      const prices = await fetchStoredPrices(settings.biddingZone, startDate, endDate);
      
      if (prices.length === 0) {
        console.warn('No price data available');
        return;
      }

      // Find current hour price
      const currentHour = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours());
      const currentPriceData = prices.find(p => {
        const priceTime = new Date(p.start);
        return priceTime.getTime() === currentHour.getTime();
      });

      if (currentPriceData && automationSettings) {
        // Calculate price based on user's tax preference
        const priceComponents = calculateConsumerPrice(currentPriceData, automationSettings, settings.usePricesWithTax);
        const { average: avgPrice } = calculateRollingAverage(prices, settings.rollingDays);
        const priceState = classifyPrice(priceComponents.total_consumer_price, avgPrice);
        
        setData(prev => ({
          ...prev,
          currentPrice: priceComponents.total_consumer_price,
          priceBreakdown: getPriceBreakdown(priceComponents),
          priceState: priceState,
          lastUpdate: new Date()
        }));
      }
    } catch (error) {
      console.error('Failed to fetch price data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load initial data
  useEffect(() => {
    fetchPriceData();
    fetchHeatPumpStatus();
  }, [settings.biddingZone]);

  // Fetch fresh heat pump status
  const fetchHeatPumpStatus = async () => {
    try {
      const status = await HeatPumpStatusService.getLatestStatus();
      if (status) {
        setData(prev => ({
          ...prev,
          heatPump: status,
          lastUpdate: new Date()
        }));
      }
    } catch (error) {
      console.error('Failed to fetch heat pump status:', error);
    }
  };

  // Trigger fresh status update from Tuya
  const refreshHeatPumpStatus = async () => {
    try {
      setLoading(true);
      const success = await HeatPumpStatusService.triggerStatusUpdate();
      if (success) {
        // Wait a moment for the status to be updated, then fetch it
        setTimeout(async () => {
          await fetchHeatPumpStatus();
        }, 2000);
        toast({
          title: "Status Updated",
          description: "Heat pump status refreshed from device",
        });
      } else {
        toast({
          title: "Update Failed",
          description: "Failed to refresh heat pump status",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Failed to refresh heat pump status:', error);
      toast({
        title: "Error",
        description: "Failed to refresh heat pump status",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Toggle automation
  const toggleAutomation = async () => {
    try {
      if (automationSettings) {
        const newSettings = {
          ...automationSettings,
          automation_enabled: !automationSettings.automation_enabled
        };
        await AutomationService.updateSettings(newSettings);
        setData(prev => ({ ...prev, automation: newSettings.automation_enabled }));
      }
    } catch (error) {
      console.error('Failed to toggle automation:', error);
      toast({
        title: "Error",
        description: "Failed to update automation settings",
        variant: "destructive",
      });
    }
  };

  // Toggle power
  const togglePower = async () => {
    try {
      const currentPower = data.heatPump?.power_status === 'on';
      const result = await HeatPumpCommandService.sendCommand([{
        code: 'Power',
        value: !currentPower
      }]);
      
      if (result.success) {
        setData(prev => ({
          ...prev,
          heatPump: prev.heatPump ? {
            ...prev.heatPump,
            power_status: !currentPower ? 'on' : 'off'
          } : null
        }));
      }
    } catch (error) {
      console.error('Failed to toggle power:', error);
      toast({
        title: "Error",
        description: "Failed to toggle power",
        variant: "destructive",
      });
    }
  };

  // Update target temperature
  const updateTargetTemp = async () => {
    try {
      const result = await HeatPumpCommandService.setTemperature(targetTemp);
      if (result.success) {
        setData(prev => ({
          ...prev,
          heatPump: prev.heatPump ? {
            ...prev.heatPump,
            target_temp: targetTemp
          } : null
        }));
        toast({
          title: "Temperature Updated",
          description: `Target temperature set to ${targetTemp}°C`,
        });
      }
    } catch (error) {
      console.error('Failed to update temperature:', error);
      toast({
        title: "Error",
        description: "Failed to update temperature",
        variant: "destructive",
      });
    }
  };

  const getPriceStateColor = (state: string) => {
    switch (state) {
      case 'low': return 'text-success';
      case 'high': return 'text-destructive';
      default: return 'text-primary';
    }
  };

  const getPriceStateLabel = (state: string) => {
    switch (state) {
      case 'low': return 'Low';
      case 'high': return 'High';
      default: return 'Normal';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Pool Heating Dashboard</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Monitor and control your pool heating system</p>
        </div>
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${
              data.heatPump?.is_online ? 'bg-success' : 'bg-destructive'
            }`}></div>
            <span className="text-sm text-muted-foreground">
              {data.heatPump?.is_online ? 'Device Online' : 'Device Offline'}
            </span>
          </div>
          <Button
            variant="outline"
            onClick={async () => {
              await Promise.all([
                fetchPriceData(),
                refreshHeatPumpStatus()
              ]);
            }}
            disabled={loading}
            className="w-full sm:w-auto"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh All
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Current Status */}
        <Card className="status-card">
          <div className="p-6 space-y-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Power className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Current Status</h3>
                <p className="text-sm text-muted-foreground">System power and automation state</p>
              </div>
            </div>

            <div className="space-y-4">
              {/* Power Toggle */}
              <div className="flex items-center justify-between p-3 bg-muted/5 rounded-lg border">
                <div className="flex items-center space-x-3">
                  <Power className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Power</span>
                </div>
                <Switch
                  checked={data.heatPump?.power_status === 'on'}
                  onCheckedChange={togglePower}
                  className="data-[state=checked]:bg-success"
                />
              </div>

              {/* Automation Toggle */}
              <div className="flex items-center justify-between p-3 bg-muted/5 rounded-lg border">
                <div className="flex items-center space-x-3">
                  <Zap className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Automation</span>
                </div>
                <Switch
                  checked={data.automation}
                  onCheckedChange={toggleAutomation}
                  className="data-[state=checked]:bg-success"
                />
              </div>

              {/* Temperature Display */}
              <div className="flex items-center justify-between p-3 bg-primary/5 rounded-lg border border-primary/20">
                <div className="flex items-center space-x-3">
                  <Thermometer className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Water Temperature</span>
                </div>
                <Badge className="bg-primary/10 text-primary">
                  {data.heatPump?.water_temp?.toFixed(1) || '--'}°C
                </Badge>
              </div>

              <div className="flex items-center justify-between p-3 bg-muted/5 rounded-lg border">
                <span className="text-sm font-medium">Target Temperature</span>
                <Badge variant="outline">
                  {data.heatPump?.target_temp || targetTemp}°C
                </Badge>
              </div>

              {/* Device Status */}
              <div className="flex items-center justify-between p-3 bg-muted/5 rounded-lg border">
                <span className="text-sm font-medium">Device Status</span>
                <Badge className={`${
                  data.heatPump?.is_online 
                    ? 'bg-success/10 text-success' 
                    : 'bg-destructive/10 text-destructive'
                }`}>
                  {data.heatPump?.is_online ? 'Online' : 'Offline'}
                </Badge>
              </div>

              {/* Last Communication */}
              {data.heatPump?.updated_at && (
                <div className="flex items-center justify-between p-3 bg-muted/5 rounded-lg border">
                  <span className="text-sm font-medium">Last Update</span>
                  <Badge variant="outline">
                    {new Date(data.heatPump.updated_at).toLocaleTimeString()}
                  </Badge>
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Temperature Control */}
        <Card className="status-card">
          <div className="p-6 space-y-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-accent/10 rounded-lg">
                <Thermometer className="h-5 w-5 text-accent" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Temperature Control</h3>
                <p className="text-sm text-muted-foreground">Set your desired pool temperature</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Target Temperature</span>
                <Badge variant="outline">{targetTemp}°C</Badge>
              </div>
              
              <Slider
                value={[targetTemp]}
                onValueChange={(value) => setTargetTemp(value[0])}
                min={18}
                max={32}
                step={1}
                className="w-full"
              />
              
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>18°C</span>
                <span>32°C</span>
              </div>

              <Button
                onClick={updateTargetTemp}
                className="w-full"
              >
                Apply Temperature
              </Button>
            </div>
          </div>
        </Card>

        {/* Electricity Price */}
        <Card className="status-card">
          <div className="p-6 space-y-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-warning/10 rounded-lg">
                <DollarSign className="h-5 w-5 text-warning" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Electricity Price</h3>
                <p className="text-sm text-muted-foreground">Current pricing and regional data</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-primary/5 rounded-lg border border-primary/20">
                <span className="text-sm font-medium">Current Price</span>
                <Badge className="bg-primary/10 text-primary">
                  {(data.currentPrice * 100).toFixed(2)} öre/kWh
                </Badge>
              </div>
              
              {/* Price Breakdown */}
              {data.priceBreakdown && (
                <div className="p-3 bg-muted/5 rounded-lg border">
                  <div className="text-xs text-muted-foreground mb-1">
                    Price Breakdown ({settings.usePricesWithTax ? 'Consumer Price' : 'Base Price'}):
                  </div>
                  <div className="text-sm font-mono">{data.priceBreakdown}</div>
                </div>
              )}
              
              <div className="flex items-center justify-between p-3 bg-muted/5 rounded-lg border">
                <span className="text-sm font-medium">Price State</span>
                <Badge className={`${getPriceStateColor(data.priceState)} bg-transparent border-0 px-0`}>
                  {getPriceStateLabel(data.priceState)}
                </Badge>
              </div>

              {/* Region Selection */}
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Bidding Zone</span>
                </div>
                <Select
                  value={settings.biddingZone}
                  onValueChange={(value) => updateSetting('biddingZone', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SE1">SE1 - Northern Sweden</SelectItem>
                    <SelectItem value="SE2">SE2 - Central Sweden</SelectItem>
                    <SelectItem value="SE3">SE3 - Southern Sweden</SelectItem>
                    <SelectItem value="SE4">SE4 - Malmö Area</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Chart Toggle */}
              <div className="flex items-center justify-between p-3 bg-muted/5 rounded-lg border">
                <span className="text-sm font-medium">Price Charts</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowCharts(!showCharts)}
                  className="p-1 h-8 w-8"
                >
                  {showCharts ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </div>
        </Card>

        {/* System Information */}
        <Card className="status-card">
          <div className="p-6 space-y-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-accent/10 rounded-lg">
                <Settings className="h-5 w-5 text-accent" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">System Information</h3>
                <p className="text-sm text-muted-foreground">Current system status and settings</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-muted/5 rounded-lg border">
                <span className="text-sm font-medium">Last Update</span>
                <Badge variant="outline">
                  {data.lastUpdate.toLocaleTimeString()}
                </Badge>
              </div>

              <div className="flex items-center justify-between p-3 bg-muted/5 rounded-lg border">
                <span className="text-sm font-medium">Base Setpoint</span>
                <Badge variant="outline">
                  {settings.baseSetpoint}°C
                </Badge>
              </div>

              <div className="flex items-center justify-between p-3 bg-success/5 rounded-lg border border-success/20">
                <div className="flex items-center space-x-2">
                  <TrendingUp className="h-4 w-4 text-success" />
                  <span className="text-sm font-medium">Low Price Boost</span>
                </div>
                <Badge className="bg-success/10 text-success">
                  +{settings.lowPriceOffset}°C
                </Badge>
              </div>

              <div className="flex items-center justify-between p-3 bg-destructive/5 rounded-lg border border-destructive/20">
                <div className="flex items-center space-x-2">
                  <TrendingUp className="h-4 w-4 text-destructive rotate-180" />
                  <span className="text-sm font-medium">High Price Reduction</span>
                </div>
                <Badge className="bg-destructive/10 text-destructive">
                  -{settings.highPriceOffset}°C
                </Badge>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Collapsible Charts */}
      {showCharts && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="status-card">
            <div className="p-6 space-y-6">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Price Chart</h3>
                  <p className="text-sm text-muted-foreground">Historical and forecasted electricity prices</p>
                </div>
              </div>
              <PriceChart currentBiddingZone={settings.biddingZone} />
            </div>
          </Card>

          <Card className="status-card">
            <div className="p-6 space-y-6">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-accent/10 rounded-lg">
                  <Thermometer className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Target Forecast</h3>
                  <p className="text-sm text-muted-foreground">Predicted temperature adjustments</p>
                </div>
              </div>
              <TargetForecast biddingZone={settings.biddingZone} />
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default Dashboard;