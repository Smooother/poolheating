import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Zap, 
  Thermometer,
  Globe,
  Server,
  TestTube,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Wifi,
  Cloud
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface IntegrationStatus {
  connected: boolean;
  lastSync?: Date;
  error?: string;
}

const Integrations = () => {
  const { toast } = useToast();
  
  // Nord Pool Settings
  const [nordPoolConfig, setNordPoolConfig] = useState({
    apiUrl: "https://api.nordpoolgroup.com/api",
    apiKey: "",
    area: "SE3",
    currency: "SEK",
    timezone: "Europe/Stockholm",
    enabled: true,
  });

  const [nordPoolStatus, setNordPoolStatus] = useState<IntegrationStatus>({
    connected: true,
    lastSync: new Date(),
  });

  // Heat Pump Settings
  const [heatPumpConfig, setHeatPumpConfig] = useState({
    adapter: "simulator",
    cloudApiUrl: "",
    cloudApiKey: "",
    localIpAddress: "",
    localPort: "502",
    enabled: true,
  });

  const [heatPumpStatus, setHeatPumpStatus] = useState<IntegrationStatus>({
    connected: true,
    lastSync: new Date(),
  });

  const handleTestNordPool = async () => {
    toast({
      title: "Testing Nord Pool Connection",
      description: "Attempting to fetch current prices...",
    });

    // Simulate API test
    setTimeout(() => {
      toast({
        title: "Test Successful",
        description: "Successfully retrieved hourly prices for SE3",
      });
      setNordPoolStatus({
        connected: true,
        lastSync: new Date(),
      });
    }, 2000);
  };

  const handleTestHeatPump = async () => {
    toast({
      title: "Testing Heat Pump Connection",
      description: "Attempting to read current setpoint...",
    });

    // Simulate API test
    setTimeout(() => {
      if (heatPumpConfig.adapter === "simulator") {
        toast({
          title: "Simulator Active",
          description: "Heat pump simulator is responding normally",
        });
        setHeatPumpStatus({
          connected: true,
          lastSync: new Date(),
        });
      } else {
        toast({
          title: "Test Failed",
          description: "Could not connect to heat pump API",
          variant: "destructive",
        });
        setHeatPumpStatus({
          connected: false,
          error: "Connection timeout",
        });
      }
    }, 2000);
  };

  const StatusBadge = ({ status }: { status: IntegrationStatus }) => {
    if (status.connected) {
      return (
        <Badge className="bg-success/10 text-success border-success/20">
          <CheckCircle className="h-3 w-3 mr-1" />
          Connected
        </Badge>
      );
    } else {
      return (
        <Badge className="bg-destructive/10 text-destructive border-destructive/20">
          <XCircle className="h-3 w-3 mr-1" />
          Disconnected
        </Badge>
      );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Integrations</h1>
          <p className="text-muted-foreground">Configure external services and data sources</p>
        </div>
      </div>

      {/* Warning Banner */}
      <Card className="border-warning/20 bg-warning/5">
        <div className="p-4 flex items-start space-x-3">
          <AlertTriangle className="h-5 w-5 text-warning mt-0.5" />
          <div>
            <p className="text-sm font-medium">Unofficial Integration</p>
            <p className="text-xs text-muted-foreground mt-1">
              This integration is not officially supported by Nord Pool or Pahlén. 
              Please follow vendor terms of service and use at your own risk.
            </p>
          </div>
        </div>
      </Card>

      <Tabs defaultValue="nordpool" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="nordpool">Nord Pool Prices</TabsTrigger>
          <TabsTrigger value="heatpump">Heat Pump Control</TabsTrigger>
        </TabsList>

        {/* Nord Pool Configuration */}
        <TabsContent value="nordpool" className="space-y-6">
          <Card className="status-card">
            <div className="p-6 space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Zap className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">Nord Pool Configuration</h3>
                    <p className="text-sm text-muted-foreground">Electricity price data source</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <StatusBadge status={nordPoolStatus} />
                  <Switch
                    checked={nordPoolConfig.enabled}
                    onCheckedChange={(enabled) => 
                      setNordPoolConfig(prev => ({ ...prev, enabled }))
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>API URL</Label>
                    <Input
                      value={nordPoolConfig.apiUrl}
                      onChange={(e) => setNordPoolConfig(prev => ({ 
                        ...prev, 
                        apiUrl: e.target.value 
                      }))}
                      placeholder="https://api.nordpoolgroup.com/api"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>API Key (Optional)</Label>
                    <Input
                      type="password"
                      value={nordPoolConfig.apiKey}
                      onChange={(e) => setNordPoolConfig(prev => ({ 
                        ...prev, 
                        apiKey: e.target.value 
                      }))}
                      placeholder="Enter API key if required"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Market Area</Label>
                    <Select
                      value={nordPoolConfig.area}
                      onValueChange={(value) => setNordPoolConfig(prev => ({ 
                        ...prev, 
                        area: value 
                      }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="SE1">SE1 - Luleå</SelectItem>
                        <SelectItem value="SE2">SE2 - Sundsvall</SelectItem>
                        <SelectItem value="SE3">SE3 - Stockholm</SelectItem>
                        <SelectItem value="SE4">SE4 - Malmö</SelectItem>
                        <SelectItem value="NO1">NO1 - Oslo</SelectItem>
                        <SelectItem value="NO2">NO2 - Kristiansand</SelectItem>
                        <SelectItem value="DK1">DK1 - West Denmark</SelectItem>
                        <SelectItem value="DK2">DK2 - East Denmark</SelectItem>
                        <SelectItem value="FI">FI - Finland</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Currency</Label>
                    <Select
                      value={nordPoolConfig.currency}
                      onValueChange={(value) => setNordPoolConfig(prev => ({ 
                        ...prev, 
                        currency: value 
                      }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="SEK">SEK - Swedish Krona</SelectItem>
                        <SelectItem value="NOK">NOK - Norwegian Krone</SelectItem>
                        <SelectItem value="DKK">DKK - Danish Krone</SelectItem>
                        <SelectItem value="EUR">EUR - Euro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Timezone</Label>
                    <Select
                      value={nordPoolConfig.timezone}
                      onValueChange={(value) => setNordPoolConfig(prev => ({ 
                        ...prev, 
                        timezone: value 
                      }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Europe/Stockholm">Europe/Stockholm</SelectItem>
                        <SelectItem value="Europe/Oslo">Europe/Oslo</SelectItem>
                        <SelectItem value="Europe/Copenhagen">Europe/Copenhagen</SelectItem>
                        <SelectItem value="Europe/Helsinki">Europe/Helsinki</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {nordPoolStatus.lastSync && (
                    <div className="pt-2">
                      <Label className="text-xs text-muted-foreground">Last Sync</Label>
                      <p className="text-sm">{nordPoolStatus.lastSync.toLocaleString()}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end space-x-3">
                <Button variant="outline" onClick={handleTestNordPool}>
                  <TestTube className="h-4 w-4 mr-2" />
                  Test Connection
                </Button>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Heat Pump Configuration */}
        <TabsContent value="heatpump" className="space-y-6">
          <Card className="status-card">
            <div className="p-6 space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-accent/10 rounded-lg">
                    <Thermometer className="h-5 w-5 text-accent" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">Heat Pump Control</h3>
                    <p className="text-sm text-muted-foreground">Pahlén heat pump integration</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <StatusBadge status={heatPumpStatus} />
                  <Switch
                    checked={heatPumpConfig.enabled}
                    onCheckedChange={(enabled) => 
                      setHeatPumpConfig(prev => ({ ...prev, enabled }))
                    }
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Connection Type</Label>
                  <Select
                    value={heatPumpConfig.adapter}
                    onValueChange={(value) => setHeatPumpConfig(prev => ({ 
                      ...prev, 
                      adapter: value 
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="simulator">
                        <div className="flex items-center space-x-2">
                          <TestTube className="h-4 w-4" />
                          <span>Simulator (Development)</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="cloud">
                        <div className="flex items-center space-x-2">
                          <Cloud className="h-4 w-4" />
                          <span>Cloud API</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="local">
                        <div className="flex items-center space-x-2">
                          <Wifi className="h-4 w-4" />
                          <span>Local Network (Modbus)</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {heatPumpConfig.adapter === "cloud" && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Cloud API URL</Label>
                      <Input
                        value={heatPumpConfig.cloudApiUrl}
                        onChange={(e) => setHeatPumpConfig(prev => ({ 
                          ...prev, 
                          cloudApiUrl: e.target.value 
                        }))}
                        placeholder="https://api.pahlen.com/v1"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>API Key</Label>
                      <Input
                        type="password"
                        value={heatPumpConfig.cloudApiKey}
                        onChange={(e) => setHeatPumpConfig(prev => ({ 
                          ...prev, 
                          cloudApiKey: e.target.value 
                        }))}
                        placeholder="Enter your Pahlén API key"
                      />
                    </div>
                  </div>
                )}

                {heatPumpConfig.adapter === "local" && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>IP Address</Label>
                      <Input
                        value={heatPumpConfig.localIpAddress}
                        onChange={(e) => setHeatPumpConfig(prev => ({ 
                          ...prev, 
                          localIpAddress: e.target.value 
                        }))}
                        placeholder="192.168.1.100"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Modbus Port</Label>
                      <Input
                        value={heatPumpConfig.localPort}
                        onChange={(e) => setHeatPumpConfig(prev => ({ 
                          ...prev, 
                          localPort: e.target.value 
                        }))}
                        placeholder="502"
                      />
                    </div>
                  </div>
                )}

                {heatPumpConfig.adapter === "simulator" && (
                  <div className="p-4 bg-muted/50 rounded-lg border border-dashed">
                    <div className="flex items-center space-x-2">
                      <TestTube className="h-4 w-4 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        Simulator mode active - no real heat pump will be controlled. 
                        All setpoint changes will be logged but not applied to hardware.
                      </p>
                    </div>
                  </div>
                )}

                {heatPumpStatus.lastSync && (
                  <div className="pt-2">
                    <Label className="text-xs text-muted-foreground">Last Communication</Label>
                    <p className="text-sm">{heatPumpStatus.lastSync.toLocaleString()}</p>
                  </div>
                )}

                {heatPumpStatus.error && (
                  <div className="p-3 bg-destructive/5 rounded-lg border border-destructive/20">
                    <p className="text-sm text-destructive">{heatPumpStatus.error}</p>
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-3">
                <Button variant="outline" onClick={handleTestHeatPump}>
                  <TestTube className="h-4 w-4 mr-2" />
                  Test Connection
                </Button>
              </div>
            </div>
          </Card>

          {/* Additional Heat Pump Info */}
          <Card className="status-card">
            <div className="p-6">
              <h4 className="font-semibold mb-3">Supported Operations</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-success" />
                    <span>Read current water temperature</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-success" />
                    <span>Read/write target setpoint</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-success" />
                    <span>Read system status</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-success" />
                    <span>Monitor error states</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-success" />
                    <span>Log all setpoint changes</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-success" />
                    <span>Safety limit enforcement</span>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Integrations;