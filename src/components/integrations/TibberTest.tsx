import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useSettings } from "@/contexts/SettingsContext";
import { Zap, Clock, CheckCircle, XCircle, AlertTriangle, MapPin } from "lucide-react";

interface TibberStatus {
  has_token: boolean;
  price_data_available: boolean;
  next_release_time: string;
  message: string;
}

interface TibberPriceResult {
  success: boolean;
  pricesCount: number;
  message: string;
  prices?: Array<{
    time: string;
    price: number;
    currency: string;
  }>;
}

export const TibberTest = () => {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<TibberStatus | null>(null);
  const [priceResult, setPriceResult] = useState<TibberPriceResult | null>(null);
  const { toast } = useToast();
  const { settings, updateSetting } = useSettings();

  const checkStatus = async () => {
    try {
      setLoading(true);
      
      // Mock response for local development
      const mockStatus: TibberStatus = {
        has_token: true,
        price_data_available: true,
        next_release_time: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        message: 'Tibber integration ready (mock data)'
      };
      
      setStatus(mockStatus);
      
      toast({
        title: "Tibber Status",
        description: "Mock status loaded for local development",
      });
    } catch (error) {
      console.error('Failed to check Tibber status:', error);
      toast({
        title: "Status Check Failed",
        description: "Failed to check Tibber integration status",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchPrices = async () => {
    try {
      setLoading(true);
      
      // Mock response for local development
      const mockResult: TibberPriceResult = {
        success: true,
        pricesCount: 24,
        message: 'Successfully fetched 24 prices from Tibber (mock data)',
        prices: [
          { time: '2025-09-23T20:00:00Z', price: 0.2987, currency: 'SEK' },
          { time: '2025-09-23T21:00:00Z', price: 0.3124, currency: 'SEK' },
          { time: '2025-09-23T22:00:00Z', price: 0.2891, currency: 'SEK' },
        ]
      };
      
      setPriceResult(mockResult);
      
      toast({
        title: "Prices Fetched Successfully",
        description: `Retrieved ${mockResult.pricesCount} prices from Tibber (mock data)`,
      });
    } catch (error) {
      console.error('Failed to fetch Tibber prices:', error);
      toast({
        title: "Price Fetch Failed",
        description: "Failed to fetch prices from Tibber",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = () => {
    if (!status) return <AlertTriangle className="h-4 w-4" />;
    if (!status.has_token) return <XCircle className="h-4 w-4 text-red-500" />;
    if (status.price_data_available) return <CheckCircle className="h-4 w-4 text-green-500" />;
    return <Clock className="h-4 w-4 text-yellow-500" />;
  };

  const getStatusColor = () => {
    if (!status) return "secondary";
    if (!status.has_token) return "destructive";
    if (status.price_data_available) return "default";
    return "secondary";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Zap className="h-5 w-5" />
          <span>Tibber Integration</span>
        </CardTitle>
        <CardDescription>
          Reliable electricity price data from Tibber API
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {getStatusIcon()}
            <span className="text-sm font-medium">Status</span>
          </div>
          <Badge variant={getStatusColor()}>
            {status?.has_token ? 'Configured' : 'Not Configured'}
          </Badge>
        </div>

        {status && (
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">API Token:</span>
              <span>{status.has_token ? '✅ Configured' : '❌ Missing'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Price Data:</span>
              <span>{status.price_data_available ? '✅ Available' : '⏰ Not Yet Available'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Next Release:</span>
              <span>{new Date(status.next_release_time).toLocaleString()}</span>
            </div>
          </div>
        )}

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
            <SelectTrigger className="w-full">
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

        <div className="flex space-x-2">
          <Button
            onClick={checkStatus}
            disabled={loading}
            variant="outline"
            size="sm"
          >
            Check Status
          </Button>
          <Button
            onClick={fetchPrices}
            disabled={loading || !status?.has_token}
            size="sm"
          >
            Fetch Prices
          </Button>
        </div>

        {priceResult && (
          <div className="mt-4 p-3 bg-muted rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              {priceResult.success ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <XCircle className="h-4 w-4 text-red-500" />
              )}
              <span className="font-medium">
                {priceResult.success ? 'Success' : 'Failed'}
              </span>
            </div>
            <p className="text-sm text-muted-foreground mb-2">
              {priceResult.message}
            </p>
            {priceResult.prices && priceResult.prices.length > 0 && (
              <div className="space-y-1">
                <p className="text-sm font-medium">Sample Prices:</p>
                {priceResult.prices.slice(0, 3).map((price, index) => (
                  <div key={index} className="text-xs text-muted-foreground">
                    {new Date(price.time).toLocaleString()}: {price.price.toFixed(4)} {price.currency}/kWh
                  </div>
                ))}
                {priceResult.prices.length > 3 && (
                  <div className="text-xs text-muted-foreground">
                    ... and {priceResult.prices.length - 3} more
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <div className="text-xs text-muted-foreground">
          <p><strong>Note:</strong> Tibber prices are released daily at 13:20. The system will automatically fetch prices and create the daily schedule at that time.</p>
        </div>
      </CardContent>
    </Card>
  );
};
