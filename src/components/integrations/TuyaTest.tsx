import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { tuyaService } from '@/services/tuyaService';
import { TuyaAdapter } from '@/services/TuyaAdapter';
import { HeatPumpService } from '@/services/heatPumpService';

export const TuyaTest = () => {
  const { toast } = useToast();
  const [testing, setTesting] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [deviceStatus, setDeviceStatus] = useState<any>(null);
  const [adapterStatus, setAdapterStatus] = useState<any>(null);
  const [config, setConfig] = useState({
    clientId: '',
    clientSecret: '',
    uid: '',
    deviceId: ''
  });

  useEffect(() => {
    // Load existing config
    const loadConfig = async () => {
      const existingConfig = await tuyaService.getConfig();
      setConfig(existingConfig);
    };
    loadConfig();
  }, []);

  const updateConfig = async () => {
    if (!config.clientId || !config.clientSecret || !config.uid || !config.deviceId) {
      toast({
        title: "Configuration Error",
        description: "Please fill in all configuration fields",
        variant: "destructive",
      });
      return;
    }

    try {
      await tuyaService.updateConfig(config);
      toast({
        title: "Configuration Updated",
        description: "Tuya configuration has been saved successfully",
      });
    } catch (error: any) {
      toast({
        title: "Configuration Error",
        description: error.message || "Failed to save configuration",
        variant: "destructive",
      });
    }
  };

  const testTuyaConnection = async () => {
    setTesting(true);
    setResults(null);
    
    try {
      toast({
        title: "Testing Tuya Connection",
        description: "Testing connection to Tuya Cloud...",
      });

      // Test basic connection
      const isConnected = await tuyaService.testConnection();
      
      if (!isConnected) {
        toast({
          title: "Connection Failed",
          description: "Failed to connect to Tuya Cloud. Check your credentials.",
          variant: "destructive",
        });
        setResults({ error: "Connection failed" });
        return;
      }

      // Get device info
      const deviceInfo = await tuyaService.getDeviceInfo();
      const status = await tuyaService.getDeviceStatus();

      setResults({
        connected: true,
        deviceInfo,
        status
      });

      toast({
        title: "Connection Successful",
        description: `Connected to device: ${deviceInfo.name}`,
      });

    } catch (error: any) {
      console.error('Tuya test failed:', error);
      
      let errorMessage = error.message || "Unknown error occurred";
      let errorTitle = "Test Failed";
      
      if (error.message?.includes('CORS_ERROR')) {
        errorTitle = "CORS Restriction";
        errorMessage = "Tuya Cloud API cannot be accessed directly from the browser due to CORS restrictions. This integration requires a backend service to work properly.";
      }
      
      toast({
        title: errorTitle,
        description: errorMessage,
        variant: "destructive",
      });
      setResults({ error: errorMessage, isCorsError: error.message?.includes('CORS_ERROR') });
    } finally {
      setTesting(false);
    }
  };

  const testAdapterConnection = async () => {
    setTesting(true);
    setAdapterStatus(null);
    
    try {
      toast({
        title: "Testing Tuya Adapter",
        description: "Testing heat pump adapter connection...",
      });

      // Create and test adapter
      const adapter = new TuyaAdapter({});
      await adapter.connect();
      
      const heatPumpService = new HeatPumpService(adapter);
      await heatPumpService.connect();
      
      // Get current data
      const currentData = await heatPumpService.getCurrentData();
      const connectionStatus = heatPumpService.getConnectionStatus();
      
      setAdapterStatus({
        currentData,
        connectionStatus,
        adapterConnected: true
      });

      toast({
        title: "Adapter Test Successful",
        description: "Heat pump adapter connected successfully",
      });

    } catch (error: any) {
      console.error('Adapter test failed:', error);
      toast({
        title: "Adapter Test Failed",
        description: error.message || "Unknown error occurred",
        variant: "destructive",
      });
      setAdapterStatus({ error: error.message });
    } finally {
      setTesting(false);
    }
  };

  const testTemperatureSet = async () => {
    setTesting(true);
    
    try {
      const targetTemp = 25; // Test temperature
      const success = await tuyaService.setTemperature(targetTemp);
      
      if (success) {
        toast({
          title: "Temperature Set",
          description: `Successfully set temperature to ${targetTemp}°C`,
        });
      } else {
        toast({
          title: "Temperature Set Failed",
          description: "Failed to set temperature on device",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Temperature Set Error",
        description: error.message || "Unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Configuration Card */}
      <Card>
        <CardHeader>
          <CardTitle>Tuya Cloud Configuration</CardTitle>
          <CardDescription>
            Configure your Tuya Cloud credentials to connect to your heat pump device
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="clientId">Client ID</Label>
              <Input
                id="clientId"
                type="text"
                value={config.clientId}
                onChange={(e) => setConfig({...config, clientId: e.target.value})}
                placeholder="Enter Client ID"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="clientSecret">Client Secret</Label>
              <Input
                id="clientSecret"
                type="password"
                value={config.clientSecret}
                onChange={(e) => setConfig({...config, clientSecret: e.target.value})}
                placeholder="Enter Client Secret"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="uid">UID</Label>
              <Input
                id="uid"
                type="text"
                value={config.uid}
                onChange={(e) => setConfig({...config, uid: e.target.value})}
                placeholder="euXXXXXXXXXXXX"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="deviceId">Device ID</Label>
              <Input
                id="deviceId"
                type="text"
                value={config.deviceId}
                onChange={(e) => setConfig({...config, deviceId: e.target.value})}
                placeholder="bfXXXXXXXXXXXX"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={updateConfig} size="sm">
              Save Configuration
            </Button>
            <ConfigStatus />
          </div>
        </CardContent>
      </Card>

      {/* Test Card */}
      <Card>
        <CardHeader>
          <CardTitle>Tuya Cloud Integration Test</CardTitle>
          <CardDescription>
            Test connection and functionality with your Tuya heat pump device
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <TestButtons testing={testing} onTestConnection={testTuyaConnection} onTestAdapter={testAdapterConnection} onTestTemperature={testTemperatureSet} />
          </div>

          {results && (
            <>
              <Separator />
              <div className="space-y-3">
                <h4 className="font-semibold">Connection Results:</h4>
                
                {results.error ? (
                  <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                    <p className="text-destructive font-medium mb-2">{results.isCorsError ? 'CORS Restriction Detected' : 'Error'}</p>
                    <p className="text-destructive text-sm">{results.error}</p>
                    {results.isCorsError && (
                      <div className="mt-3 p-2 bg-muted/50 border rounded text-sm">
                        <p className="font-medium mb-1">Possible Solutions:</p>
                        <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                          <li>Use Supabase Edge Functions for backend API calls</li>
                          <li>Set up a proxy server to handle Tuya API requests</li>
                          <li>Use Tuya's IoT Platform for device management</li>
                        </ul>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">Connected</Badge>
                      <span className="text-sm text-muted-foreground">
                        Status: {results.connected ? 'Connected' : 'Disconnected'}
                      </span>
                    </div>
                    
                    {results.deviceInfo && (
                      <div className="p-3 bg-muted/50 rounded-lg">
                        <h5 className="font-medium mb-2">Device Information:</h5>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>Name: {results.deviceInfo.name}</div>
                          <div>ID: {results.deviceInfo.id}</div>
                          <div>
                            Online: 
                            <Badge variant={results.deviceInfo.online ? "default" : "destructive"} className="ml-2">
                              {results.deviceInfo.online ? 'Online' : 'Offline'}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {results.status && (
                      <div className="p-3 bg-muted/50 rounded-lg">
                        <h5 className="font-medium mb-2">Device Status:</h5>
                        <div className="space-y-1 text-sm">
                          {results.status.map((item: any, index: number) => (
                            <div key={index} className="flex justify-between">
                              <span>{item.code}:</span>
                              <span className="font-mono">{JSON.stringify(item.value)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}

          {adapterStatus && (
            <>
              <Separator />
              <div className="space-y-3">
                <h4 className="font-semibold">Adapter Results:</h4>
                
                {adapterStatus.error ? (
                  <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                    <p className="text-destructive">{adapterStatus.error}</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">Adapter Connected</Badge>
                    </div>
                    
                    {adapterStatus.currentData && (
                      <div className="p-3 bg-muted/50 rounded-lg">
                        <h5 className="font-medium mb-2">Current Heat Pump Data:</h5>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>Current Temp: {adapterStatus.currentData.currentTemp}°C</div>
                          <div>Target Temp: {adapterStatus.currentData.targetTemp}°C</div>
                          <div>Status: {adapterStatus.currentData.status}</div>
                          <div>Last Update: {new Date(adapterStatus.currentData.lastUpdate).toLocaleTimeString()}</div>
                        </div>
                      </div>
                    )}
                    
                    {adapterStatus.connectionStatus && (
                      <div className="p-3 bg-muted/50 rounded-lg">
                        <h5 className="font-medium mb-2">Connection Status:</h5>
                        <div className="text-sm space-y-1">
                          <div>Connected: {adapterStatus.connectionStatus.connected ? 'Yes' : 'No'}</div>
                          {adapterStatus.connectionStatus.lastRead && (
                            <div>Last Read: {new Date(adapterStatus.connectionStatus.lastRead).toLocaleString()}</div>
                          )}
                          {adapterStatus.connectionStatus.lastWrite && (
                            <div>Last Write: {new Date(adapterStatus.connectionStatus.lastWrite).toLocaleString()}</div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// Helper component for configuration status
const ConfigStatus = () => {
  const [isConfigured, setIsConfigured] = useState(false);

  useEffect(() => {
    const checkConfig = async () => {
      const configured = await tuyaService.isConfigured();
      setIsConfigured(configured);
    };
    checkConfig();
  }, []);

  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      Status: 
      <Badge variant={isConfigured ? "default" : "destructive"}>
        {isConfigured ? 'Configured' : 'Not Configured'}
      </Badge>
    </div>
  );
};

// Helper component for test buttons
const TestButtons = ({ testing, onTestConnection, onTestAdapter, onTestTemperature }: {
  testing: boolean;
  onTestConnection: () => void;
  onTestAdapter: () => void;
  onTestTemperature: () => void;
}) => {
  const [isConfigured, setIsConfigured] = useState(false);

  useEffect(() => {
    const checkConfig = async () => {
      const configured = await tuyaService.isConfigured();
      setIsConfigured(configured);
    };
    checkConfig();
  }, []);

  return (
    <>
      <Button 
        onClick={onTestConnection} 
        disabled={testing || !isConfigured}
        variant="outline"
      >
        {testing ? 'Testing...' : 'Test Connection'}
      </Button>
      <Button 
        onClick={onTestAdapter} 
        disabled={testing || !isConfigured}
        variant="outline"
      >
        {testing ? 'Testing...' : 'Test Adapter'}
      </Button>
      <Button 
        onClick={onTestTemperature} 
        disabled={testing || !isConfigured}
        variant="outline"
      >
        {testing ? 'Setting...' : 'Test Set Temperature'}
      </Button>
    </>
  );
};