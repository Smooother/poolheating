import { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer, ReferenceLine, Tooltip } from 'recharts';
import { fetchPrices, calculateRollingAverage, PricePoint, PriceProviderConfig } from '@/services/priceService';
import { CONFIG } from '@/lib/config';
import { useToast } from '@/hooks/use-toast';
import { useSettings } from '@/contexts/SettingsContext';

interface ChartDataPoint {
  time: string;
  price: number;
  timestamp: Date;
  day: 'today' | 'tomorrow';
}

interface PriceChartProps {
  currentBiddingZone?: string;
}

export const PriceChart = ({ currentBiddingZone = CONFIG.biddingZone }: PriceChartProps) => {
  const { toast } = useToast();
  const { settings } = useSettings();
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [averagePrice, setAveragePrice] = useState(0);
  const [actualDays, setActualDays] = useState(0);

  const fetchLivePriceData = async () => {
    try {
      setLoading(true);
      
      // Calculate date range for today and tomorrow
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 2); // Include full tomorrow

      const config: PriceProviderConfig = {
        biddingZone: currentBiddingZone,
        currency: CONFIG.currency,
        timezone: CONFIG.timezone,
      };

      // Fetch price data
      const prices = await fetchPrices(CONFIG.priceProvider, config, today, tomorrow);
      
      // Calculate rolling average for reference line
      const { average: avgPrice, actualDays: usedDays } = calculateRollingAverage(prices, settings.rollingDays);
      setAveragePrice(avgPrice);
      setActualDays(usedDays);

      // Transform data for step chart - each price is valid for full hour
      const transformedData: ChartDataPoint[] = [];
      
      prices
        .filter(point => {
          const isToday = point.start.toDateString() === now.toDateString();
          const isTomorrow = point.start.toDateString() === new Date(now.getTime() + 24 * 60 * 60 * 1000).toDateString();
          return isToday || isTomorrow;
        })
        .forEach(point => {
          const isToday = point.start.toDateString() === now.toDateString();
          
          // Add start point
          transformedData.push({
            time: point.start.toLocaleTimeString('sv-SE', { 
              hour: '2-digit', 
              minute: '2-digit',
              hour12: false 
            }),
            price: point.value,
            timestamp: point.start,
            day: isToday ? 'today' as const : 'tomorrow' as const
          });
          
          // Add end point for step effect (same price at end of hour)
          const endTime = new Date(point.start.getTime() + 59 * 60 * 1000); // 59 minutes later
          transformedData.push({
            time: endTime.toLocaleTimeString('sv-SE', { 
              hour: '2-digit', 
              minute: '2-digit',
              hour12: false 
            }),
            price: point.value,
            timestamp: endTime,
            day: isToday ? 'today' as const : 'tomorrow' as const
          });
        });
      
      // Sort by timestamp
      transformedData.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

      setChartData(transformedData);
      setLastUpdate(new Date());
      
    } catch (error) {
      console.error('Failed to fetch price data:', error);
      toast({
        title: "Price Data Error",
        description: "Failed to fetch latest electricity prices. Using cached data.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Initial load and periodic refresh
  useEffect(() => {
    fetchLivePriceData();
    
    // Refresh every 30 minutes
    const interval = setInterval(fetchLivePriceData, 30 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  // Refresh when provider or config changes
  useEffect(() => {
    fetchLivePriceData();
  }, [CONFIG.priceProvider, currentBiddingZone, settings.rollingDays]);

  const formatTooltipValue = (value: number, name: string) => {
    return [`${value.toFixed(3)} SEK/kWh`, 'Price'];
  };

  const formatTooltipLabel = (label: string, payload: any[]) => {
    if (payload && payload[0]) {
      const data = payload[0].payload as ChartDataPoint;
      const date = data.timestamp.toLocaleDateString('sv-SE', { 
        month: 'short', 
        day: 'numeric' 
      });
      return `${date} ${label}`;
    }
    return label;
  };

  const getLineColor = (dataKey: string) => {
    return 'hsl(var(--primary))';
  };

  const formatXAxisTick = (tickItem: string, index: number) => {
    // Show fewer ticks to avoid crowding
    if (index % 4 === 0) {
      return tickItem;
    }
    return '';
  };

  if (loading && chartData.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-sm text-muted-foreground">Loading live price data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with status */}
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-medium">Today & Tomorrow Prices</h4>
          <p className="text-xs text-muted-foreground">
            {chartData.length} hours • {CONFIG.priceProvider} • {currentBiddingZone}
          </p>
        </div>
        <div className="text-right">
          {lastUpdate && (
            <p className="text-xs text-muted-foreground">
              Updated: {lastUpdate.toLocaleTimeString('sv-SE')}
            </p>
          )}
          <button 
            onClick={fetchLivePriceData}
            className="text-xs text-primary hover:underline"
            disabled={loading}
          >
            {loading ? 'Updating...' : 'Refresh'}
          </button>
        </div>
      </div>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 20, bottom: 20 }}>
            <defs>
              <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.8}/>
                <stop offset="50%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.1}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis 
              dataKey="time" 
              stroke="hsl(var(--muted-foreground))"
              fontSize={11}
              tickFormatter={formatXAxisTick}
              angle={-45}
              textAnchor="end"
              height={60}
            />
            <YAxis 
              stroke="hsl(var(--muted-foreground))"
              fontSize={11}
              tickFormatter={(value) => `${value.toFixed(2)}`}
              label={{ value: 'SEK/kWh', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle' } }}
            />
            <Tooltip 
              formatter={formatTooltipValue}
              labelFormatter={formatTooltipLabel}
              contentStyle={{
                backgroundColor: 'hsl(var(--background))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '6px',
              }}
            />
            {averagePrice > 0 && (
              <ReferenceLine 
                y={averagePrice} 
                stroke="hsl(var(--muted-foreground))" 
                strokeDasharray="5 5"
                label={{ value: `${actualDays}d avg`, position: "top", fontSize: 10 }}
              />
            )}
            <Area 
              type="stepAfter" 
              dataKey="price" 
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              fill="url(#priceGradient)"
              dot={false}
              activeDot={{ r: 5, fill: 'hsl(var(--primary))', strokeWidth: 2, stroke: 'hsl(var(--background))' }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center space-x-6 text-xs">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-0.5 bg-primary"></div>
          <span className="text-muted-foreground">Electricity Price</span>
        </div>
        {averagePrice > 0 && (
          <div className="flex items-center space-x-2">
            <div className="w-3 h-0.5 border-t border-dashed border-muted-foreground"></div>
            <span className="text-muted-foreground">{actualDays}-day Average</span>
          </div>
        )}
      </div>
    </div>
  );
};