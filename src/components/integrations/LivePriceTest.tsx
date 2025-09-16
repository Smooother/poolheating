import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, CheckCircle, XCircle, Clock } from 'lucide-react';
import { fetchPrices, PriceProviderConfig, PricePoint } from '@/services/priceService';
import { CONFIG } from '@/lib/config';

interface LivePriceData {
  currentPrice: number;
  nextHourPrice: number;
  pricesCount: number;
  lastUpdate: Date;
  status: 'loading' | 'success' | 'error';
  error?: string;
}

export const LivePriceTest = () => {
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

      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 2);

      const config: PriceProviderConfig = {
        biddingZone: CONFIG.biddingZone,
        currency: CONFIG.currency,
        timezone: CONFIG.timezone,
      };

      const prices = await fetchPrices('elpriset', config, today, tomorrow);
      
      // Find current hour and next hour prices
      const currentHour = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours());
      const nextHour = new Date(currentHour.getTime() + 60 * 60 * 1000);
      
      const currentPrice = prices.find(p => 
        p.start.getTime() === currentHour.getTime()
      );
      
      const nextHourPrice = prices.find(p => 
        p.start.getTime() === nextHour.getTime()
      );

      setData({
        currentPrice: currentPrice?.value || 0,
        nextHourPrice: nextHourPrice?.value || 0,
        pricesCount: prices.length,
        lastUpdate: new Date(),
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

  // Auto-refresh every 5 minutes
  useEffect(() => {
    fetchLiveData();
    const interval = setInterval(fetchLiveData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

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
            Elpriset Just Nu • SE3 • Stockholm
          </p>
        </div>
        <div className="flex items-center space-x-2">
          {getStatusBadge()}
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
            <p className="text-xs text-muted-foreground mb-1">Current Hour</p>
            <p className="text-2xl font-bold text-primary">
              {data.status === 'success' ? `${data.currentPrice.toFixed(3)}` : '---'}
            </p>
            <p className="text-xs text-muted-foreground">SEK/kWh</p>
          </div>
        </Card>

        <Card className="p-4">
          <div className="text-center">
            <p className="text-xs text-muted-foreground mb-1">Next Hour</p>
            <p className="text-2xl font-bold">
              {data.status === 'success' ? `${data.nextHourPrice.toFixed(3)}` : '---'}
            </p>
            <p className="text-xs text-muted-foreground">SEK/kWh</p>
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
            <span className="text-muted-foreground">Bidding Zone:</span>
            <span>SE3 - Southern Sweden</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Last Update:</span>
            <span>{data.lastUpdate.toLocaleTimeString('sv-SE')}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">API Endpoint:</span>
            <span className="text-xs font-mono">elprisetjustnu.se/api/v1</span>
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