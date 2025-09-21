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
import { HeatPumpCommandService } from "@/services/heatPumpCommandService";
import { AutomationService, AutomationSettings } from "@/services/automationService";
import { supabase } from "@/integrations/supabase/client";

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
  const [automationSettings, setAutomationSettings] = useState<AutomationSettings | null>(null);
  
  // Load automation settings on mount
  useEffect(() => {
    const loadAutomationSettings = async () => {
      const settings = await AutomationService.getSettings();
      if (settings) {
        setAutomationSettings(settings);
        setData(prev => ({ ...prev, automation: settings.automation_enabled }));
      }
    };
    
    loadAutomationSettings();
  }, []);
  
  // Set up real-time automation settings updates
  useEffect(() => {
    let unsubscribe: (() => void) | null = null;
    
    const setupRealTimeUpdates = () => {
      unsubscribe = AutomationService.subscribeToSettingsChanges((newSettings) => {
        if (newSettings) {
          setAutomationSettings(newSettings);
          setData(prev => ({ ...prev, automation: newSettings.automation_enabled }));
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
  
  // Set up real-time heat pump status updates
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

  const handlePowerToggle = async (powerOn: boolean) => {
    try {
      // Optimistically update the UI immediately
      setData(prev => ({
        ...prev,
        heatPump: prev.heatPump ? {
          ...prev.heatPump,
          power_status: powerOn ? 'on' : 'off'
        } : null
      }));
      
      // Send command to heat pump
      await HeatPumpCommandService.setPowerState(powerOn);
      
      toast({
        title: powerOn ? "Heat Pump Turned On" : "Heat Pump Turned Off",
        description: `Heat pump power ${powerOn ? 'enabled' : 'disabled'} successfully`,
      });
      
      // Trigger status refresh after a short delay
      setTimeout(() => {
        HeatPumpStatusService.triggerStatusUpdate();
      }, 2000);
      
    } catch (error: any) {
      console.error('Error sending power command:', error);
      toast({
        title: "Power Command Failed",
        description: error.message || "Failed to send power command to heat pump",
        variant: "destructive",
      });
      
      // Revert the optimistic update on error
      HeatPumpStatusService.triggerStatusUpdate();
    }
  };

  const handleBiddingZoneChange = (zone: string) => {
    updateSetting('biddingZone', zone);
    toast({
      title: "Bidding Zone Updated",
      description: `Switched to ${zone} - refreshing price data...`,
    });
    fetchCurrentPrice();
  };

  const handleTargetTempChange = async (newTemp: number) => {
    if (newTemp >= settings.minTemp && newTemp <= settings.maxTemp) {
      try {
        // Update local setting (this is the user's internal target)
        updateSetting('baseSetpoint', newTemp);
        
        // Update automation settings (this is the user's desired pool temperature)
        if (automationSettings) {
          await AutomationService.updateSettings({ target_pool_temp: newTemp });
          
          // Update the local automation settings state immediately for UI responsiveness
          setAutomationSettings(prev => prev ? { ...prev, target_pool_temp: newTemp } : null);
        }
        
        toast({
          title: "Target Temperature Updated",
          description: `Pool target set to ${newTemp}°C. Automation will adjust pump setting based on electricity prices.`,
        });
        
        // Trigger automation to recalculate pump setting based on new target
        if (data.automation) {
          setTimeout(() => {
            AutomationService.triggerAutomation();
          }, 1000);
          
          // Wait for automation to process and then update pump setting display
          setTimeout(async () => {
            try {
              // Trigger status update to get the new pump setting
              await HeatPumpStatusService.triggerStatusUpdate();
              
              // Wait a bit more for the status to be updated
              setTimeout(async () => {
                const currentStatus = await HeatPumpStatusService.getLatestStatus();
                
                if (currentStatus) {
                  // Update UI with actual pump setting from automation
                  setData(prev => ({
                    ...prev,
                    heatPump: prev.heatPump ? {
                      ...prev.heatPump,
                      target_temp: currentStatus.target_temp
                    } : null
                  }));
                }
              }, 1500); // Additional delay for status to be recorded
            } catch (error) {
              console.error('Error updating pump setting display:', error);
            }
          }, 3000); // Wait 3 seconds for automation to process
        }
        
      } catch (error: any) {
        console.error('Error updating target temperature:', error);
        toast({
          title: "Update Failed",
          description: error.message || "Failed to update target temperature",
          variant: "destructive",
        });
      }
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


  // Fetch current price data from database (Integration tab keeps it updated)
  const fetchCurrentPrice = async () => {
    try {
      setLoading(true);
      console.log('🔄 Dashboard: Starting price fetch...');
      
      const now = new Date();
      
      // First try to get current hour price
      const startOfHour = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours());
      const endOfHour = new Date(startOfHour.getTime() + 60 * 60 * 1000);
      
      console.log(`🔍 Dashboard: Looking for current hour data ${startOfHour.toISOString()} - ${endOfHour.toISOString()}`);
      
      let prices = await fetchStoredPrices(settings.biddingZone, startOfHour, endOfHour);
      let currentPrice = prices.length > 0 ? prices[0] : null;
      
      console.log(`📊 Dashboard: Found ${prices.length} current hour prices:`, currentPrice ? {
        start: currentPrice.start.toISOString(),
        value: currentPrice.value,
        currency: currentPrice.currency
      } : 'none');
      
      // If no current hour data, get the most recent available
      if (!currentPrice) {
        const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const recentPrices = await fetchStoredPrices(settings.biddingZone, oneDayAgo, now);
        
        console.log(`📋 Dashboard: Found ${recentPrices.length} prices in last 24 hours`);
        
        if (recentPrices.length > 0) {
          currentPrice = recentPrices[recentPrices.length - 1];
          const dataAge = now.getTime() - currentPrice.start.getTime();
          const hoursOld = Math.round(dataAge / (60 * 60 * 1000));
          
          console.log(`⚠️ Dashboard: Using most recent price (${hoursOld}h old):`, {
            start: currentPrice.start.toISOString(),
            value: currentPrice.value,
            currency: currentPrice.currency
          });
          
          if (hoursOld > 2) {
            toast({
              title: "Price Data May Be Outdated",
              description: `Using ${hoursOld}-hour old price data. Check Integration tab to refresh.`,
              variant: "default",
            });
          }
        }
      }
      
      if (currentPrice) {
        // Convert price to öre (multiply by 100 if in SEK/kWh)
        const priceInOre = currentPrice.currency === 'SEK' ? currentPrice.value * 100 : currentPrice.value;
        
        console.log(`💰 Dashboard: Final price calculation: ${currentPrice.value} ${currentPrice.currency} = ${priceInOre.toFixed(1)} öre/kWh`);
        
        // Get historical prices for classification (last 7 days)
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const historicalPrices = await fetchStoredPrices(settings.biddingZone, sevenDaysAgo, now);
        
        const { average: rollingAvg } = calculateRollingAverage(historicalPrices, settings.rollingDays);
        const priceState = classifyPrice(currentPrice.value, rollingAvg, settings.thresholdMethod === 'delta' ? 'percent' : 'percentile', settings);
        
        console.log(`📊 Dashboard: Updating UI with price: ${priceInOre.toFixed(1)} öre/kWh, state: ${priceState}`);
        
        setData(prev => ({
          ...prev,
          currentPrice: priceInOre, // Store in öre for display
          priceState,
          lastUpdate: new Date(),
        }));
        
        console.log(`✅ Dashboard: Current price updated: ${priceInOre.toFixed(1)} öre/kWh (${currentPrice.value.toFixed(4)} ${currentPrice.currency}/kWh)`);
      } else {
        // No price data available
        console.log('🚨 Dashboard: No price data available. Visit Integration tab to fetch fresh data.');
        
        toast({
          title: "No Price Data Available",
          description: "Please visit the Integration tab to fetch current electricity prices.",
          variant: "default",
        });
        
        setData(prev => ({
          ...prev,
          priceState: 'normal',
          lastUpdate: new Date(),
        }));
      }
    } catch (error) {
      console.error('💥 Dashboard: Failed to fetch current price:', error);
      toast({
        title: "Price Fetch Error",
        description: "Error loading electricity prices",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      console.log('🏁 Dashboard: Price fetch completed');
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
    
    // Check data availability every hour if automation is enabled
    const dataCheckInterval = setInterval(async () => {
      if (data.automation) {
        const validation = await AutomationService.validateDataAvailability(settings.biddingZone);
        if (!validation.isValid) {
          console.warn('Data validation failed, disabling automation:', validation.message);
          
          // Automatically disable automation
          const success = await AutomationService.updateSettings({ automation_enabled: false });
          if (success) {
            setData(prev => ({ ...prev, automation: false }));
            
            // Send base temperature to pump when auto-disabling automation
            try {
              const baseTemp = automationSettings?.target_pool_temp || settings.baseSetpoint;
              await HeatPumpCommandService.setTargetTemperature(baseTemp);
              
              toast({
                title: "Automation Auto-Disabled",
                description: `${validation.message || "Automation disabled due to insufficient data"}. Pump set to target temperature ${baseTemp}°C`,
                variant: "destructive",
              });
            } catch (tempError) {
              console.error('Failed to set base temperature on auto-disable:', tempError);
              toast({
                title: "Automation Auto-Disabled",
                description: validation.message || "Automation disabled due to insufficient data",
                variant: "destructive",
              });
            }
          }
        }
      }
    }, 60 * 60 * 1000); // Check every hour
    
    return () => {
      clearInterval(priceInterval);
      clearInterval(heatPumpInterval);
      clearInterval(dataCheckInterval);
    };
  }, [data.automation, settings.biddingZone]);

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

  const handleAutomationToggle = async (enabled: boolean) => {
    try {
      // Use the validation method when enabling automation
      if (enabled) {
        const result = await AutomationService.updateSettingsWithValidation(
          { automation_enabled: enabled }, 
          settings.biddingZone
        );
        
        if (!result.success) {
          toast({
            title: "Automation Cannot Be Enabled",
            description: result.message || "Unable to enable automation due to data issues",
            variant: "destructive",
          });
          return; // Don't update UI state if validation failed
        }
        
        setData(prev => ({ ...prev, automation: enabled }));
        toast({
          title: "Automation Enabled",
          description: "Heat pump will automatically adjust based on electricity prices",
        });
        
        // Trigger an immediate automation run when enabling
        setTimeout(() => {
          AutomationService.triggerAutomation();
        }, 1000);
      } else {
        // For disabling, use regular update method
        const success = await AutomationService.updateSettings({ automation_enabled: enabled });
        
        if (success) {
          setData(prev => ({ ...prev, automation: enabled }));
          
        // Send base/normal temperature to pump when disabling automation
        try {
          const baseTemp = automationSettings?.target_pool_temp || settings.baseSetpoint;
          await HeatPumpCommandService.setTargetTemperature(baseTemp);
          
          toast({
            title: "Automation Disabled",
            description: `Manual control mode activated. Pump set to target temperature ${baseTemp}°C`,
          });
        } catch (tempError) {
          console.error('Failed to set base temperature:', tempError);
          toast({
            title: "Automation Disabled",
            description: "Manual control mode activated, but failed to set pump temperature",
            variant: "destructive",
          });
        }
        } else {
          toast({
            title: "Update Failed",
            description: "Failed to update automation settings",
            variant: "destructive",
          });
        }
      }
    } catch (error: any) {
      console.error('Error toggling automation:', error);
      toast({
        title: "Automation Toggle Failed",
        description: error?.message || "An unexpected error occurred. Please check your connection and try again.",
        variant: "destructive",
      });
    }
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
              <Switch 
                checked={data.heatPump?.power_status === 'on'}
                onCheckedChange={handlePowerToggle}
                disabled={!data.heatPump || !HeatPumpStatusService.isDeviceOnline(data.heatPump)}
              />
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
              <p className="text-sm text-muted-foreground">Pool Target Temperature</p>
              <p className="text-3xl font-bold text-primary">
                {automationSettings 
                  ? `${automationSettings.target_pool_temp}°C` 
                  : `${settings.baseSetpoint}°C`
                }
              </p>
              {data.automation && data.heatPump && (
                <div className="text-xs text-muted-foreground mt-1 space-y-1">
                  <p>Pump Setting: {data.heatPump.target_temp}°C</p>
                  {Math.abs(data.heatPump.target_temp - (automationSettings?.target_pool_temp || settings.baseSetpoint)) > 0.5 && (
                    <div className="flex items-center space-x-1">
                      <div className="w-2 h-2 rounded-full bg-warning animate-pulse"></div>
                      <p className="text-warning">
                        Auto-adjustment: {data.heatPump.target_temp > (automationSettings?.target_pool_temp || settings.baseSetpoint) ? '+' : ''}
                        {(data.heatPump.target_temp - (automationSettings?.target_pool_temp || settings.baseSetpoint)).toFixed(1)}°C
                      </p>
                    </div>
                  )}
                  {Math.abs(data.heatPump.target_temp - (automationSettings?.target_pool_temp || settings.baseSetpoint)) <= 0.5 && (
                    <div className="flex items-center space-x-1">
                      <div className="w-2 h-2 rounded-full bg-success"></div>
                      <p className="text-success">Pump at target</p>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="flex items-center justify-center space-x-4">
              <Button
                variant="outline" 
                size="sm"
                onClick={() => handleTargetTempChange((automationSettings?.target_pool_temp || settings.baseSetpoint) - 1)}
                disabled={(automationSettings?.target_pool_temp || settings.baseSetpoint) <= settings.minTemp}
                className="h-10 w-10 p-0 rounded-full"
              >
                <Minus className="h-4 w-4" />
              </Button>
              <Button
                variant="outline" 
                size="sm"
                onClick={() => handleTargetTempChange((automationSettings?.target_pool_temp || settings.baseSetpoint) + 1)}
                disabled={(automationSettings?.target_pool_temp || settings.baseSetpoint) >= settings.maxTemp}
                className="h-10 w-10 p-0 rounded-full"
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
                {loading ? '...' : data.currentPrice.toFixed(1)}
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