import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Thermometer, Zap, TrendingUp, Power, Settings, RefreshCw, ChevronDown, ChevronUp } from "lucide-react";
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

interface DashboardData {
  heatPump: HeatPumpStatus | null;
  priceState: 'low' | 'normal' | 'high';
  currentPrice: number;
  automation: boolean;
  lastUpdate: Date;
}

const DashboardIOS = () => {
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

      if (currentPriceData) {
        const currentPriceValue = parseFloat(currentPriceData.value.toString());
        const { average: avgPrice } = calculateRollingAverage(prices, settings.rollingDays);
        const priceState = classifyPrice(currentPriceValue, avgPrice);
        
        setData(prev => ({
          ...prev,
          currentPrice: currentPriceValue,
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
  }, [settings.biddingZone]);

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
      case 'low': return 'text-green-500';
      case 'high': return 'text-red-500';
      default: return 'text-blue-500';
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
    <div className="min-h-screen bg-gray-50 p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Settings className="h-6 w-6 text-gray-600" />
          <h1 className="text-2xl font-bold text-gray-900">Pool Heating</h1>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchPriceData}
          disabled={loading}
          className="rounded-full px-4 py-2 bg-white border-gray-200"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Connection Status */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          <span className="text-sm text-gray-600">Connected</span>
        </div>
        <span className="text-sm text-gray-500">Updated {data.lastUpdate.toLocaleTimeString()}</span>
      </div>

      {/* Current Status Card */}
      <Card className="p-4 bg-white rounded-2xl shadow-sm border-0">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Current Status</h2>
        
        <div className="space-y-4">
          {/* Power Toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Power className="h-5 w-5 text-gray-600" />
              <span className="text-gray-900">Power</span>
            </div>
            <Switch
              checked={data.heatPump?.power_status === 'on'}
              onCheckedChange={togglePower}
              className="data-[state=checked]:bg-green-500"
            />
          </div>

          {/* Automation Toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Zap className="h-5 w-5 text-gray-600" />
              <span className="text-gray-900">Automation</span>
            </div>
            <Switch
              checked={data.automation}
              onCheckedChange={toggleAutomation}
              className="data-[state=checked]:bg-green-500"
            />
          </div>

          {/* Temperature Display */}
          <div className="flex items-center justify-between pt-2 border-t border-gray-100">
            <div className="flex items-center space-x-3">
              <Thermometer className="h-5 w-5 text-gray-600" />
              <span className="text-gray-900">Water Temperature</span>
            </div>
            <span className="text-lg font-semibold text-gray-900">
              {data.heatPump?.water_temp?.toFixed(1) || '--'}°C
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-gray-600">Target Temperature</span>
            <span className="text-lg font-semibold text-gray-900">
              {data.heatPump?.target_temp || targetTemp}°C
            </span>
          </div>
        </div>
      </Card>

      {/* Temperature Control Card */}
      <Card className="p-4 bg-white rounded-2xl shadow-sm border-0">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Temperature Control</h2>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Target: {targetTemp}°C</span>
            <Button
              onClick={updateTargetTemp}
              className="bg-blue-500 hover:bg-blue-600 text-white rounded-full px-6 py-2"
            >
              Apply
            </Button>
          </div>
          
          <div className="px-2">
            <Slider
              value={[targetTemp]}
              onValueChange={(value) => setTargetTemp(value[0])}
              min={18}
              max={32}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>18°C</span>
              <span>32°C</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Electricity Price Card */}
      <Card className="p-4 bg-white rounded-2xl shadow-sm border-0">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Electricity Price</h2>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Current Price</span>
            <span className="text-lg font-semibold text-gray-900">
              {(data.currentPrice * 100).toFixed(2)} öre/kWh
            </span>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Price State</span>
            <Badge className={`${getPriceStateColor(data.priceState)} bg-transparent border-0 px-0`}>
              {getPriceStateLabel(data.priceState)}
            </Badge>
          </div>

          {/* Region Selection */}
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Region</span>
            <Select
              value={settings.biddingZone}
              onValueChange={(value) => updateSetting('biddingZone', value)}
            >
              <SelectTrigger className="w-24 h-8 text-sm border-gray-200 rounded-lg">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SE1">SE1</SelectItem>
                <SelectItem value="SE2">SE2</SelectItem>
                <SelectItem value="SE3">SE3</SelectItem>
                <SelectItem value="SE4">SE4</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Chart Toggle */}
          <div className="flex items-center justify-between pt-2 border-t border-gray-100">
            <span className="text-gray-600">Price Charts</span>
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
      </Card>

      {/* Collapsible Charts */}
      {showCharts && (
        <div className="space-y-4">
          <Card className="p-4 bg-white rounded-2xl shadow-sm border-0">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Price Chart</h3>
            <PriceChart currentBiddingZone={settings.biddingZone} />
          </Card>

          <Card className="p-4 bg-white rounded-2xl shadow-sm border-0">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Target Forecast</h3>
            <TargetForecast biddingZone={settings.biddingZone} />
          </Card>
        </div>
      )}
    </div>
  );
};

export default DashboardIOS;
