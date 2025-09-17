import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
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
      toast({
        title: "Test Failed",
        description: error.message || "Unknown error occurred",
        variant: "destructive",
      });
      setResults({ error: error.message });
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
      <Card>
        <CardHeader>
          <CardTitle>Tuya Cloud Integration Test</CardTitle>
          <CardDescription>
            Test connection and functionality with your Tuya heat pump device
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button 
              onClick={testTuyaConnection} 
              disabled={testing}
              variant="outline"
            >
              {testing ? 'Testing...' : 'Test Connection'}
            </Button>
            <Button 
              onClick={testAdapterConnection} 
              disabled={testing}
              variant="outline"
            >
              {testing ? 'Testing...' : 'Test Adapter'}
            </Button>
            <Button 
              onClick={testTemperatureSet} 
              disabled={testing}
              variant="outline"
            >
              {testing ? 'Setting...' : 'Test Set Temperature'}
            </Button>
          </div>

          {results && (
            <>
              <Separator />
              <div className="space-y-3">
                <h4 className="font-semibold">Connection Results:</h4>
                
                {results.error ? (
                  <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                    <p className="text-destructive">{results.error}</p>
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