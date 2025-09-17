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
  Cloud,
  Activity
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { LivePriceTest } from "@/components/integrations/LivePriceTest";
import { TuyaTest } from "@/components/integrations/TuyaTest";

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
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Integrations</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Configure external services and data sources</p>
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
        <TabsList className="grid w-full grid-cols-1 sm:grid-cols-2">
          <TabsTrigger value="nordpool" className="text-sm">Live Price Data</TabsTrigger>
          <TabsTrigger value="heatpump" className="text-sm">Heat Pump Control</TabsTrigger>
        </TabsList>

        {/* Price Data Configuration */}
        <TabsContent value="nordpool" className="space-y-6">
          <Card className="status-card">
            <div className="p-6 space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Zap className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">Elpriset Just Nu</h3>
                    <p className="text-sm text-muted-foreground">Free Swedish electricity prices</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <StatusBadge status={nordPoolStatus} />
                </div>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>API URL</Label>
                    <Input
                      value={nordPoolConfig.apiUrl}
                      onChange={(e) => setNordPoolConfig(prev => ({ 
                        ...prev, 
                        apiUrl: e.target.value 
                      }))}
                      placeholder="https://api.nordpoolgroup.com/api"
                      disabled
                      className="bg-muted text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Bidding Zone</Label>
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
                        <SelectItem value="SE1">SE1 - Northern Sweden</SelectItem>
                        <SelectItem value="SE2">SE2 - Central Sweden</SelectItem>
                        <SelectItem value="SE3">SE3 - Southern Sweden</SelectItem>
                        <SelectItem value="SE4">SE4 - Malmö Area</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                        <SelectItem value="SEK">Swedish Krona (SEK)</SelectItem>
                        <SelectItem value="EUR">Euro (EUR)</SelectItem>
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
                        <SelectItem value="Europe/Helsinki">Europe/Helsinki</SelectItem>
                        <SelectItem value="Europe/Oslo">Europe/Oslo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {nordPoolStatus.lastSync && (
                  <div className="pt-2">
                    <Label className="text-xs text-muted-foreground">Last Update</Label>
                    <p className="text-sm">{nordPoolStatus.lastSync.toLocaleString()}</p>
                  </div>
                )}

                <div className="flex justify-end space-x-3">
                  <Button variant="outline" onClick={handleTestNordPool}>
                    <TestTube className="h-4 w-4 mr-2" />
                    Test Connection
                  </Button>
                </div>
              </div>

              <LivePriceTest />
            </div>
          </Card>
        </TabsContent>

        {/* Heat Pump Configuration */}
        <TabsContent value="heatpump" className="space-y-6">
          {/* Tuya Cloud Integration Test */}
          <Card className="status-card">
            <div className="p-6">
              <div className="flex items-center space-x-3 mb-6">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <Cloud className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Tuya Cloud Integration</h3>
                  <p className="text-sm text-muted-foreground">Test and manage Tuya heat pump device</p>
                </div>
              </div>
              <TuyaTest />
            </div>
          </Card>

          {/* Additional Heat Pump Info */}
          <Card className="status-card">
            <div className="p-6">
              <h4 className="font-semibold mb-3">Supported Operations</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-success flex-shrink-0" />
                    <span>Read current water temperature</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-success flex-shrink-0" />
                    <span>Read/write target setpoint</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-success flex-shrink-0" />
                    <span>Read system status</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-success flex-shrink-0" />
                    <span>Monitor error states</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-success flex-shrink-0" />
                    <span>Log all setpoint changes</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-success flex-shrink-0" />
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