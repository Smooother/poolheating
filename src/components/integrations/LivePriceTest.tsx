import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, CheckCircle, XCircle, Clock } from 'lucide-react';
import { useSettings } from '@/contexts/SettingsContext';

interface LivePriceData {
  currentPrice: number;
  nextHourPrice: number;
  pricesCount: number;
  lastUpdate: Date;
  status: 'loading' | 'success' | 'error';
  error?: string;
}

export const LivePriceTest = () => {
  const { settings } = useSettings();
  const [data, setData] = useState<LivePriceData>({
    currentPrice: 0,
    nextHourPrice: 0,
    pricesCount: 0,
    lastUpdate: new Date(),
    status: 'loading'
  });

  const fetchLiveData = async () => {
    try {
      setData(prev => ({ ...prev, status: 'loading' }));

      // Fetch price data from our backend API with bidding zone
      const response = await fetch(`https://poolheating.vercel.app/api/prices?zone=${settings.biddingZone}`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const priceData = await response.json();
      
      // Find current hour and next hour prices from the database
      const now = new Date();
      const currentHour = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours());
      const nextHour = new Date(currentHour.getTime() + 60 * 60 * 1000);
      
      const currentPrice = priceData.prices?.find((p: any) => {
        const priceTime = new Date(p.start_time);
        return priceTime.getTime() === currentHour.getTime();
      });
      
      const nextHourPrice = priceData.prices?.find((p: any) => {
        const priceTime = new Date(p.start_time);
        return priceTime.getTime() === nextHour.getTime();
      });

      setData({
        currentPrice: currentPrice?.price_value || 0,
        nextHourPrice: nextHourPrice?.price_value || 0,
        pricesCount: priceData.prices?.length || 0,
        lastUpdate: new Date(priceData.lastUpdated || new Date()),
        status: 'success'
      });

    } catch (error) {
      console.error('Failed to fetch live prices:', error);
      setData(prev => ({
        ...prev,
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      }));
    }
  };

  const triggerPriceCollection = async () => {
    try {
      setData(prev => ({ ...prev, status: 'loading' }));
      
      // Trigger price collection with bidding zone
      const response = await fetch('/api/prices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ zone: settings.biddingZone }),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      console.log('Price collection result:', result);
      
      // Refresh the data after collection
      await fetchLiveData();
      
    } catch (error) {
      console.error('Failed to trigger price collection:', error);
      setData(prev => ({
        ...prev,
        status: 'error',
        error: error instanceof Error ? error.message : 'Failed to collect prices'
      }));
    }
  };

  // Auto-refresh every 5 minutes and when bidding zone changes
  useEffect(() => {
    // Set loading state when bidding zone changes
    setData(prev => ({ ...prev, status: 'loading' }));
    fetchLiveData();
    const interval = setInterval(fetchLiveData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [settings.biddingZone]); // Re-fetch when bidding zone changes

  const getStatusBadge = () => {
    switch (data.status) {
      case 'loading':
        return (
          <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">
            <Clock className="h-3 w-3 mr-1" />
            Loading
          </Badge>
        );
      case 'success':
        return (
          <Badge className="bg-success/10 text-success border-success/20">
            <CheckCircle className="h-3 w-3 mr-1" />
            Live Data
          </Badge>
        );
      case 'error':
        return (
          <Badge className="bg-destructive/10 text-destructive border-destructive/20">
            <XCircle className="h-3 w-3 mr-1" />
            Error
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-4">
      {/* Status Header */}
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-medium">Live Price Integration Test</h4>
          <p className="text-xs text-muted-foreground">
            Elpriset Just Nu • {settings.biddingZone} • Stockholm
          </p>
        </div>
        <div className="flex items-center space-x-2">
          {getStatusBadge()}
          <Button 
            size="sm" 
            variant="outline" 
            onClick={triggerPriceCollection}
            disabled={data.status === 'loading'}
          >
            <RefreshCw className={`h-3 w-3 mr-1 ${data.status === 'loading' ? 'animate-spin' : ''}`} />
            Collect Prices
          </Button>
          <Button 
            size="sm" 
            variant="outline" 
            onClick={fetchLiveData}
            disabled={data.status === 'loading'}
          >
            <RefreshCw className={`h-3 w-3 mr-1 ${data.status === 'loading' ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Live Price Data */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="text-center">
            <p className="text-xs text-muted-foreground mb-1">Current Hour ({settings.biddingZone})</p>
            <p className="text-2xl font-bold text-primary">
              {data.status === 'success' ? `${(data.currentPrice * 100).toFixed(1)}` : '---'}
            </p>
            <p className="text-xs text-muted-foreground">öre/kWh</p>
          </div>
        </Card>

        <Card className="p-4">
          <div className="text-center">
            <p className="text-xs text-muted-foreground mb-1">Next Hour ({settings.biddingZone})</p>
            <p className="text-2xl font-bold">
              {data.status === 'success' ? `${(data.nextHourPrice * 100).toFixed(1)}` : '---'}
            </p>
            <p className="text-xs text-muted-foreground">öre/kWh</p>
          </div>
        </Card>

        <Card className="p-4">
          <div className="text-center">
            <p className="text-xs text-muted-foreground mb-1">Available Hours</p>
            <p className="text-2xl font-bold">
              {data.status === 'success' ? data.pricesCount : '---'}
            </p>
            <p className="text-xs text-muted-foreground">Price points</p>
          </div>
        </Card>
      </div>

      {/* Status Details */}
      <Card className="p-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Provider:</span>
            <span>Elpriset Just Nu (Free)</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Last Update:</span>
            <span>{data.lastUpdate.toLocaleTimeString('sv-SE')}</span>
          </div>
          {data.status === 'error' && data.error && (
            <div className="mt-3 p-2 bg-destructive/5 rounded border border-destructive/20">
              <p className="text-xs text-destructive">{data.error}</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};