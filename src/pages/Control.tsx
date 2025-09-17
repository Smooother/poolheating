import { Card } from "@/components/ui/card";
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
  Clock,
  Shield,
  AlertTriangle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useSettings } from "@/contexts/SettingsContext";

const Control = () => {
  const { toast } = useToast();
  const { settings, updateSetting, resetToDefaults, saveSettings } = useSettings();

  const handleSettingChange = <K extends keyof typeof settings>(
    key: K,
    value: typeof settings[K]
  ) => {
    updateSetting(key, value);
  };

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Control Settings</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Configure temperature targets and price-based adjustments</p>
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
        {/* Temperature Control */}
        <Card className="status-card">
          <div className="p-6 space-y-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Thermometer className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Temperature Settings</h3>
                <p className="text-sm text-muted-foreground">Base setpoint and adjustment ranges</p>
              </div>
            </div>

            {/* Base Setpoint */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Base Setpoint</Label>
                <Badge variant="outline">{settings.baseSetpoint}°C</Badge>
              </div>
              <Slider
                value={[settings.baseSetpoint]}
                onValueChange={([value]) => handleSettingChange('baseSetpoint', value)}
                min={settings.minTemp}
                max={settings.maxTemp}
                step={0.5}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                Target temperature during normal price periods
              </p>
            </div>

            {/* Low Price Offset */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="flex items-center space-x-2">
                  <TrendingUp className="h-4 w-4 text-success" />
                  <span>Low Price Boost</span>
                </Label>
                <Badge variant="outline" className="text-success">+{settings.lowPriceOffset}°C</Badge>
              </div>
              <Slider
                value={[settings.lowPriceOffset]}
                onValueChange={([value]) => handleSettingChange('lowPriceOffset', value)}
                min={0}
                max={5}
                step={0.5}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                Additional heating during cheap electricity hours
              </p>
            </div>

            {/* High Price Offset */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="flex items-center space-x-2">
                  <TrendingDown className="h-4 w-4 text-destructive" />
                  <span>High Price Reduction</span>
                </Label>
                <Badge variant="outline" className="text-destructive">-{settings.highPriceOffset}°C</Badge>
              </div>
              <Slider
                value={[settings.highPriceOffset]}
                onValueChange={([value]) => handleSettingChange('highPriceOffset', value)}
                min={0}
                max={5}
                step={0.5}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                Temperature reduction during expensive electricity hours
              </p>
            </div>

            {/* Temperature Limits */}
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
              </div>
              <div className="space-y-2">
                <Label>Max Temperature</Label>
                <div className="flex items-center space-x-2">
                  <Slider
                    value={[settings.maxTemp]}
                    onValueChange={([value]) => handleSettingChange('maxTemp', value)}
                    min={30}
                    max={40}
                    step={1}
                    className="flex-1"
                  />
                  <Badge variant="outline">{settings.maxTemp}°C</Badge>
                </div>
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
                <h3 className="text-lg font-semibold">Price Analysis</h3>
                <p className="text-sm text-muted-foreground">How to classify electricity prices</p>
              </div>
            </div>

            {/* Threshold Method */}
            <div className="space-y-3">
              <Label>Threshold Method</Label>
              <Select
                value={settings.thresholdMethod}
                onValueChange={(value: 'delta' | 'percentile') => 
                  handleSettingChange('thresholdMethod', value)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="delta">Delta Percentage</SelectItem>
                  <SelectItem value="percentile">Percentiles</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {settings.thresholdMethod === 'delta' ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Delta Percentage</Label>
                  <Badge variant="outline">±{settings.deltaPercent}%</Badge>
                </div>
                <Slider
                  value={[settings.deltaPercent]}
                  onValueChange={([value]) => handleSettingChange('deltaPercent', value)}
                  min={5}
                  max={50}
                  step={5}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  Low: &lt; avg - {settings.deltaPercent}%, High: &gt; avg + {settings.deltaPercent}%
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Low Percentile</Label>
                  <div className="flex items-center space-x-2">
                    <Slider
                      value={[settings.percentileLow]}
                      onValueChange={([value]) => handleSettingChange('percentileLow', value)}
                      min={10}
                      max={40}
                      step={5}
                      className="flex-1"
                    />
                    <Badge variant="outline">{settings.percentileLow}%</Badge>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>High Percentile</Label>
                  <div className="flex items-center space-x-2">
                    <Slider
                      value={[settings.percentileHigh]}
                      onValueChange={([value]) => handleSettingChange('percentileHigh', value)}
                      min={60}
                      max={90}
                      step={5}
                      className="flex-1"
                    />
                    <Badge variant="outline">{settings.percentileHigh}%</Badge>
                  </div>
                </div>
              </div>
            )}

            {/* Rolling Days */}
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
                Historical period for calculating price averages
              </p>
            </div>
          </div>
        </Card>

        {/* Safety & Smoothing */}
        <Card className="status-card">
          <div className="p-6 space-y-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-destructive/10 rounded-lg">
                <Shield className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Safety Controls</h3>
                <p className="text-sm text-muted-foreground">Prevent rapid changes and protect equipment</p>
              </div>
            </div>

            {/* Hysteresis */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Hysteresis</Label>
                <Badge variant="outline">{settings.hysteresis}°C</Badge>
              </div>
              <Slider
                value={[settings.hysteresis]}
                onValueChange={([value]) => handleSettingChange('hysteresis', value)}
                min={0.1}
                max={2.0}
                step={0.1}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                Prevents oscillation around setpoint changes
              </p>
            </div>

            {/* Anti-Short-Cycle */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Anti-Short-Cycle</Label>
                <Badge variant="outline">{settings.antiShortCycle} min</Badge>
              </div>
              <Slider
                value={[settings.antiShortCycle]}
                onValueChange={([value]) => handleSettingChange('antiShortCycle', value)}
                min={5}
                max={120}
                step={5}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                Minimum time between setpoint changes
              </p>
            </div>

            {/* Max Change Per Hour */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Max Change Per Hour</Label>
                <Badge variant="outline">{settings.maxChangePerHour}°C</Badge>
              </div>
              <Slider
                value={[settings.maxChangePerHour]}
                onValueChange={([value]) => handleSettingChange('maxChangePerHour', value)}
                min={0.5}
                max={5.0}
                step={0.5}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                Limits rate of temperature changes
              </p>
            </div>
          </div>
        </Card>

        {/* Current Preview */}
        <Card className="status-card">
          <div className="p-6 space-y-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-accent/10 rounded-lg">
                <Clock className="h-5 w-5 text-accent" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Current Settings Preview</h3>
                <p className="text-sm text-muted-foreground">How these settings affect your pool</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-success/5 rounded-lg border border-success/20">
                <div className="flex items-center space-x-2">
                  <TrendingUp className="h-4 w-4 text-success" />
                  <span className="text-sm font-medium">Low Price Period</span>
                </div>
                <Badge className="bg-success/10 text-success">
                  {settings.baseSetpoint + settings.lowPriceOffset}°C
                </Badge>
              </div>

              <div className="flex items-center justify-between p-3 bg-muted/5 rounded-lg border">
                <div className="flex items-center space-x-2">
                  <span className="w-4 h-4 bg-muted-foreground rounded-full"></span>
                  <span className="text-sm font-medium">Normal Price Period</span>
                </div>
                <Badge variant="outline">
                  {settings.baseSetpoint}°C
                </Badge>
              </div>

              <div className="flex items-center justify-between p-3 bg-destructive/5 rounded-lg border border-destructive/20">
                <div className="flex items-center space-x-2">
                  <TrendingDown className="h-4 w-4 text-destructive" />
                  <span className="text-sm font-medium">High Price Period</span>
                </div>
                <Badge className="bg-destructive/10 text-destructive">
                  {Math.max(settings.minTemp, settings.baseSetpoint - settings.highPriceOffset)}°C
                </Badge>
              </div>
            </div>

            <div className="pt-4 border-t border-border">
              <div className="flex items-start space-x-2">
                <AlertTriangle className="h-4 w-4 text-warning mt-0.5" />
                <div className="text-xs text-muted-foreground">
                  <p className="font-medium">Safety Limits Active:</p>
                  <p>• Temperature range: {settings.minTemp}°C - {settings.maxTemp}°C</p>
                  <p>• Changes limited to {settings.maxChangePerHour}°C/hour</p>
                  <p>• Minimum {settings.antiShortCycle} minutes between adjustments</p>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Control;