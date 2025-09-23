import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Thermometer, 
  TrendingUp, 
  TrendingDown, 
  Settings2,
  DollarSign,
  PlayCircle,
  AlertTriangle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useSettings } from "@/contexts/SettingsContext";
import { AutomationService } from "@/services/automationService";
import { calculateConsumerPrice, getPriceBreakdown, PriceComponents } from "@/services/priceCalculationService";
import { useState, useEffect } from "react";

const Control = () => {
  const { toast } = useToast();
  const { settings, updateSetting, resetToDefaults, saveSettings } = useSettings();
  const [isTestingAutomation, setIsTestingAutomation] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [currentPriceData, setCurrentPriceData] = useState<any>(null);
  const [priceComponents, setPriceComponents] = useState<PriceComponents | null>(null);
  const [loadingPrice, setLoadingPrice] = useState(false);

  // Provider to net fee mapping
  const getProviderNetFee = (provider: string): number => {
    const providerFees: { [key: string]: number } = {
      'tibber': 0.32,
      'vattenfall': 0.25,
      'e.on': 0.28,
      'fortum': 0.30,
      'ellakraft': 0.26,
      'göteborg_energi': 0.29,
      'stockholm_exergi': 0.31
    };
    return providerFees[provider] || 0.30;
  };

  const handleSettingChange = <K extends keyof typeof settings>(
    key: K,
    value: typeof settings[K]
  ) => {
    updateSetting(key, value);
    
    // Auto-set net fee when provider changes
    if (key === 'electricityProvider') {
      const netFee = getProviderNetFee(value as string);
      updateSetting('netFeePerKwh', netFee);
    }
    
    // Recalculate price components when settings change
    if (currentPriceData && (
      key === 'netFeePerKwh' || 
      key === 'electricityProvider' || 
      key === 'usePricesWithTax' ||
      key === 'includeTaxes' ||
      key === 'includeNetFee'
    )) {
      calculatePriceComponents();
    }
  };

  // Fetch current price data from database
  const fetchCurrentPrice = async () => {
    try {
      setLoadingPrice(true);
      const baseURL = import.meta.env.VITE_API_URL || 'https://poolheating.vercel.app';
      
      // Get current hour price data with all components
      const now = new Date();
      const currentHour = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours());
      const startTime = currentHour.toISOString();
      const endTime = new Date(currentHour.getTime() + 60 * 60 * 1000).toISOString();
      
      const response = await fetch(`${baseURL}/api/prices?zone=${settings.biddingZone}&start=${startTime}&end=${endTime}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Find the current hour price data
      const currentPrice = data.prices?.find((p: any) => {
        const priceTime = new Date(p.start_time);
        return priceTime.getTime() === currentHour.getTime();
      });
      
      setCurrentPriceData(currentPrice);
      
      if (currentPrice) {
        calculatePriceComponents();
      }
    } catch (error) {
      console.error('Failed to fetch current price:', error);
      toast({
        title: "Price Data Error",
        description: "Failed to fetch current electricity price",
        variant: "destructive",
      });
    } finally {
      setLoadingPrice(false);
    }
  };

  // Calculate price components
  const calculatePriceComponents = () => {
    if (!currentPriceData) return;

    // Get energy price from database
    const energyPrice = currentPriceData.energy_price ? parseFloat(currentPriceData.energy_price) : null;
    const taxPrice = currentPriceData.tax_price ? parseFloat(currentPriceData.tax_price) : null;
    
    // Get net fee from dropdown selection (linked to provider)
    const netFee = settings.includeNetFee ? settings.netFeePerKwh : 0;
    
    // Calculate total based on switches - only use actual data from database
    let totalPrice = 0;
    if (energyPrice) {
      totalPrice = energyPrice;
      
      // Add tax if enabled and available in database (no estimation)
      if (settings.includeTaxes && taxPrice) {
        totalPrice += taxPrice;
      }
      
      // Add net fee if enabled (from dropdown selection)
      if (settings.includeNetFee) {
        totalPrice += netFee;
      }
    } else {
      // Fallback to stored price value
      totalPrice = parseFloat(currentPriceData.price_value);
    }

    const components: PriceComponents = {
      energy_price: energyPrice,
      tax_price: settings.includeTaxes ? taxPrice : null, // Only actual tax from database
      net_fee: settings.includeNetFee ? netFee : null,
      total_consumer_price: totalPrice,
      source: currentPriceData.source || 'unknown'
    };
    
    setPriceComponents(components);
  };

  // Load current price on component mount and when bidding zone changes
  useEffect(() => {
    fetchCurrentPrice();
  }, [settings.biddingZone]);

  const handleSaveSettings = () => {
    saveSettings();
    toast({
      title: "Settings Saved",
      description: "Control parameters have been updated successfully.",
    });
  };

  const handleResetDefaults = () => {
    resetToDefaults();
    toast({
      title: "Settings Reset",
      description: "All parameters have been reset to defaults.",
    });
  };

  const handleTestAutomation = async () => {
    setIsTestingAutomation(true);
    setTestResult(null);
    try {
      const result = await AutomationService.triggerAutomation();
      
      if (result.success) {
        setTestResult(result);
        toast({
          title: "Automation Test Successful",
          description: "Price automation has been manually triggered. Check the result below.",
        });
      } else {
        setTestResult(result);
        toast({
          title: "Automation Test Failed",
          description: "Failed to trigger automation. Check the result below.",
          variant: "destructive",
        });
      }
    } catch (error) {
      const errorResult = {
        success: false,
        message: "Test failed",
        error: error instanceof Error ? error.message : "Unknown error"
      };
      setTestResult(errorResult);
      toast({
        title: "Error",
        description: "An unexpected error occurred during automation test",
        variant: "destructive",
      });
    } finally {
      setIsTestingAutomation(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Control Settings</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Configure temperature limits and price-based adjustments</p>
        </div>
        <div className="flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-3">
          <Button variant="outline" onClick={handleResetDefaults} className="w-full sm:w-auto">
            Reset Defaults
          </Button>
          <Button onClick={handleSaveSettings} className="w-full sm:w-auto">
            Save Settings
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Temperature Limits */}
        <Card className="status-card">
          <div className="p-6 space-y-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Thermometer className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Temperature Limits</h3>
                <p className="text-sm text-muted-foreground">Safe operating range for the heat pump</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Min Temperature</Label>
                <div className="flex items-center space-x-2">
                  <Slider
                    value={[settings.minTemp]}
                    onValueChange={([value]) => handleSettingChange('minTemp', value)}
                    min={15}
                    max={25}
                    step={1}
                    className="flex-1"
                  />
                  <Badge variant="outline">{settings.minTemp}°C</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  System shuts down below this temperature
                </p>
              </div>
              <div className="space-y-2">
                <Label>Max Temperature</Label>
                <div className="flex items-center space-x-2">
                  <Slider
                    value={[settings.maxTemp]}
                    onValueChange={([value]) => handleSettingChange('maxTemp', value)}
                    min={30}
                    max={35}
                    step={1}
                    className="flex-1"
                  />
                  <Badge variant="outline">{settings.maxTemp}°C</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  System shuts down above this temperature
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Price Thresholds */}
        <Card className="status-card">
          <div className="p-6 space-y-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-warning/10 rounded-lg">
                <Settings2 className="h-5 w-5 text-warning" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Price Thresholds</h3>
                <p className="text-sm text-muted-foreground">When to adjust heating based on electricity prices</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Low Price Threshold</Label>
                  <Badge variant="outline">{Math.round(settings.lowPriceThreshold * 100)}% of average</Badge>
                </div>
                <Slider
                  value={[settings.lowPriceThreshold]}
                  onValueChange={([value]) => handleSettingChange('lowPriceThreshold', value)}
                  min={0.5}
                  max={0.9}
                  step={0.05}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  Prices below this threshold trigger aggressive heating
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>High Price Threshold</Label>
                  <Badge variant="outline">{Math.round(settings.highPriceThreshold * 100)}% of average</Badge>
                </div>
                <Slider
                  value={[settings.highPriceThreshold]}
                  onValueChange={([value]) => handleSettingChange('highPriceThreshold', value)}
                  min={1.1}
                  max={1.8}
                  step={0.05}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  Prices above this threshold trigger reduced heating
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Temperature Adjustments */}
        <Card className="status-card">
          <div className="p-6 space-y-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-accent/10 rounded-lg">
                <TrendingUp className="h-5 w-5 text-accent" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Temperature Adjustments</h3>
                <p className="text-sm text-muted-foreground">How much to adjust temperature based on price</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center space-x-2">
                    <TrendingUp className="h-4 w-4 text-success" />
                    <span>Low Price Boost</span>
                  </Label>
                  <Badge variant="outline" className="text-success">+{settings.lowTempOffset}°C</Badge>
                </div>
                <Slider
                  value={[settings.lowTempOffset]}
                  onValueChange={([value]) => handleSettingChange('lowTempOffset', value)}
                  min={1}
                  max={5}
                  step={0.5}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  Additional heating during cheap electricity hours
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center space-x-2">
                    <TrendingDown className="h-4 w-4 text-destructive" />
                    <span>High Price Reduction</span>
                  </Label>
                  <Badge variant="outline" className="text-destructive">-{settings.highTempOffset}°C</Badge>
                </div>
                <Slider
                  value={[settings.highTempOffset]}
                  onValueChange={([value]) => handleSettingChange('highTempOffset', value)}
                  min={1}
                  max={5}
                  step={0.5}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  Temperature reduction during expensive electricity hours
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Price Analysis */}
        <Card className="status-card">
          <div className="p-6 space-y-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-accent/10 rounded-lg">
                <Settings2 className="h-5 w-5 text-accent" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Price Analysis</h3>
                <p className="text-sm text-muted-foreground">How to calculate price averages</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Rolling Average Period</Label>
                <Badge variant="outline">{settings.rollingDays} days</Badge>
              </div>
              <Slider
                value={[settings.rollingDays]}
                onValueChange={([value]) => handleSettingChange('rollingDays', value)}
                min={3}
                max={30}
                step={1}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                Historical period for calculating price averages and thresholds
              </p>
            </div>
          </div>
        </Card>

        {/* Price Configuration */}
        <Card className="status-card">
          <div className="p-6 space-y-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-warning/10 rounded-lg">
                <DollarSign className="h-5 w-5 text-warning" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Price Configuration</h3>
                <p className="text-sm text-muted-foreground">Configure net fees and price sources</p>
              </div>
            </div>

            {/* Current Price Display */}
            {loadingPrice ? (
              <div className="p-4 bg-muted/5 rounded-lg border">
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-sm text-muted-foreground">Loading current price...</span>
                </div>
              </div>
            ) : priceComponents ? (
              <div className="p-4 bg-muted/5 rounded-lg border">
                <div className="space-y-3">
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Energy Price:</span>
                      <span>{priceComponents.energy_price ? `${(priceComponents.energy_price * 100).toFixed(2)} öre` : 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Tax:</span>
                      <span>
                        {priceComponents.tax_price ? `${(priceComponents.tax_price * 100).toFixed(2)} öre` : 
                         settings.includeTaxes ? 'Not available' : 'Excluded'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Net Distribution Fee:</span>
                      <span>
                        {settings.includeNetFee ? `${(priceComponents.net_fee * 100).toFixed(2)} öre` : 'Excluded'}
                      </span>
                    </div>
                    <div className="border-t pt-2 flex justify-between font-medium">
                      <span>Total Price:</span>
                      <span>{(priceComponents.total_consumer_price * 100).toFixed(2)} öre/kWh</span>
                    </div>
                  </div>
                  
                  <div className="text-xs text-muted-foreground">
                    <p>Source: {priceComponents.source} | Data: {currentPriceData?.start_time ? new Date(currentPriceData.start_time).toLocaleString() : 'Current hour'}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-muted/5 rounded-lg border">
                <div className="text-sm text-muted-foreground text-center">
                  No current price data available
                </div>
              </div>
            )}

            <div className="space-y-4">
              {/* Net Fee Configuration */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Network Fee</Label>
                  <Badge variant="outline">{settings.netFeePerKwh || 0.30} SEK/kWh</Badge>
                </div>
                <Slider
                  value={[settings.netFeePerKwh || 0.30]}
                  onValueChange={([value]) => handleSettingChange('netFeePerKwh', value)}
                  min={0.10}
                  max={0.60}
                  step={0.01}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  Network transmission fee (typically 20-60 öre/kWh)
                </p>
              </div>

              {/* Provider Selection */}
              <div className="space-y-2">
                <Label>Electricity Provider</Label>
                <Select
                  value={settings.electricityProvider || 'tibber'}
                  onValueChange={(value) => handleSettingChange('electricityProvider', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tibber">Tibber (32 öre/kWh)</SelectItem>
                    <SelectItem value="vattenfall">Vattenfall (25 öre/kWh)</SelectItem>
                    <SelectItem value="e.on">E.ON (28 öre/kWh)</SelectItem>
                    <SelectItem value="fortum">Fortum (30 öre/kWh)</SelectItem>
                    <SelectItem value="ellakraft">Elakraft (26 öre/kWh)</SelectItem>
                    <SelectItem value="göteborg_energi">Göteborg Energi (29 öre/kWh)</SelectItem>
                    <SelectItem value="stockholm_exergi">Stockholm Exergi (31 öre/kWh)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Select your electricity provider for accurate net fee calculation
                </p>
              </div>

              {/* Tax Inclusion Switch */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>Include Taxes</Label>
                    <p className="text-xs text-muted-foreground">
                      Add tax component to total price calculation
                    </p>
                  </div>
                  <Switch
                    checked={settings.includeTaxes}
                    onCheckedChange={(checked) => handleSettingChange('includeTaxes', checked)}
                    className="data-[state=checked]:bg-success"
                  />
                </div>
              </div>

              {/* Net Distribution Fee Switch */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>Include Net Distribution Fee</Label>
                    <p className="text-xs text-muted-foreground">
                      Add network transmission fee to total price calculation
                    </p>
                  </div>
                  <Switch
                    checked={settings.includeNetFee}
                    onCheckedChange={(checked) => handleSettingChange('includeNetFee', checked)}
                    className="data-[state=checked]:bg-success"
                  />
                </div>
              </div>


              {/* Refresh Button */}
              <Button 
                variant="outline" 
                size="sm" 
                onClick={fetchCurrentPrice}
                disabled={loadingPrice}
                className="w-full"
              >
                {loadingPrice ? "Refreshing..." : "Refresh Current Price"}
              </Button>
            </div>
          </div>
        </Card>

        {/* Test Automation */}
        <Card className="status-card">
          <div className="p-6 space-y-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-accent/10 rounded-lg">
                <PlayCircle className="h-5 w-5 text-accent" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Test Automation</h3>
                <p className="text-sm text-muted-foreground">Manually trigger price automation</p>
              </div>
            </div>

            <div className="space-y-4">
              <Button 
                onClick={handleTestAutomation}
                disabled={isTestingAutomation}
                className="w-full"
              >
                {isTestingAutomation ? "Testing..." : "Test Price Automation"}
              </Button>
              
              {testResult && (
                <div className="p-4 bg-muted/5 rounded-lg border">
                  <div className="flex items-center space-x-2 mb-2">
                    {testResult.success ? (
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-red-500" />
                    )}
                    <span className="font-medium">
                      {testResult.success ? 'Test Successful' : 'Test Failed'}
                    </span>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <p><strong>Message:</strong> {testResult.message}</p>
                    {testResult.currentPrice && (
                      <p><strong>Current Price:</strong> {testResult.currentPrice.toFixed(3)} SEK/kWh</p>
                    )}
                    {testResult.averagePrice && (
                      <p><strong>Average Price:</strong> {testResult.averagePrice.toFixed(3)} SEK/kWh</p>
                    )}
                    {testResult.currentTemp && (
                      <p><strong>Current Temp:</strong> {testResult.currentTemp}°C</p>
                    )}
                    {testResult.newTemp && (
                      <p><strong>New Temp:</strong> {testResult.newTemp}°C</p>
                    )}
                    {testResult.reason && (
                      <p><strong>Reason:</strong> {testResult.reason}</p>
                    )}
                    {testResult.error && (
                      <p className="text-red-600"><strong>Error:</strong> {testResult.error}</p>
                    )}
                  </div>
                </div>
              )}
              
              <p className="text-sm text-muted-foreground">
                This will run the automation logic once and show the results above. 
                The test is connected to the actual automation system.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Control;