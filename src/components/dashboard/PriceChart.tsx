import { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer, ReferenceLine, ReferenceDot, Tooltip } from 'recharts';
import { fetchStoredPrices, getLatestPriceDate } from '@/services/priceDataService';
import { calculateRollingAverage } from '@/services/priceService';
import { CONFIG } from '@/lib/config';
import { useToast } from '@/hooks/use-toast';
import { useSettings } from '@/contexts/SettingsContext';
import { Clock } from 'lucide-react';

interface ChartDataPoint {
  time: string;
  price: number;
  timestamp: Date;
  ts: number;
  day: 'yesterday' | 'today' | 'tomorrow';
  isCurrentHour?: boolean;
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
  const [currentPriceData, setCurrentPriceData] = useState<ChartDataPoint | null>(null);

  const fetchLivePriceData = async () => {
    try {
      setLoading(true);
      
      // Calculate extended date range to ensure we get historical data
      const now = new Date();
      const startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 24 hours ago
      const endDate = new Date(now.getTime() + 48 * 60 * 60 * 1000); // 48 hours forward

      // Fetch price data from Supabase
      const prices = await fetchStoredPrices(currentBiddingZone, startDate, endDate);
      
      if (prices.length === 0) {
        console.warn('No price data available');
        return;
      }

      console.log(`Fetched ${prices.length} price points from ${startDate.toISOString()} to ${endDate.toISOString()}`);
      
      // Calculate rolling average for reference line
      const { average: avgPrice, actualDays: usedDays } = calculateRollingAverage(prices, settings.rollingDays);
      setAveragePrice(avgPrice);
      setActualDays(usedDays);

      // Transform data for step chart
      const transformedData: ChartDataPoint[] = [];
      const currentHour = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours());
      
      // Sort all prices by timestamp first
      const sortedPrices = [...prices].sort((a, b) => a.start.getTime() - b.start.getTime());
      
      sortedPrices.forEach(point => {
        const isCurrentHour = point.start.getHours() === currentHour.getHours() && 
                             point.start.toDateString() === currentHour.toDateString();
        
        const todayDate = now.toDateString();
        const pointDate = point.start.toDateString();
        
        let dayLabel: 'yesterday' | 'today' | 'tomorrow';
        if (point.start < new Date(now.getFullYear(), now.getMonth(), now.getDate())) {
          dayLabel = 'yesterday';
        } else if (pointDate === todayDate) {
          dayLabel = 'today';
        } else {
          dayLabel = 'tomorrow';
        }
        
        transformedData.push({
          time: point.start.getHours().toString().padStart(2, '0'),
          price: point.value,
          timestamp: point.start,
          ts: point.start.getTime(),
          day: dayLabel,
          isCurrentHour
        });
      });

      // Find current price point for marker
      const currentData = transformedData.find(point => point.isCurrentHour);
      setCurrentPriceData(currentData || null);

      console.log(`Transformed data: ${transformedData.length} points, current hour found: ${!!currentData}`);
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
  }, [currentBiddingZone, settings.rollingDays]);

  const formatTooltipValue = (value: number, name: string) => {
    return [`${(value * 100).toFixed(1)} öre/kWh`, 'Price'];
  };

  const formatTooltipLabel = (label: any, payload: any[]) => {
    const ts = typeof label === 'number' ? label : (payload && payload[0] ? (payload[0].payload as ChartDataPoint).ts : undefined);
    if (typeof ts === 'number') {
      const d = new Date(ts);
      const date = d.toLocaleDateString('sv-SE', { month: 'short', day: 'numeric' });
      const hour = String(d.getHours()).padStart(2, '0');
      return `${date} ${hour}:00`;
    }
    return label;
  };

  const getLineColor = (dataKey: string) => {
    return 'hsl(var(--primary))';
  };

  const formatXAxisTick = (tickItem: string, index: number) => {
    // Show every 4th hour: 04, 08, 12, 16, 20, 00, 04, etc.
    const hour = parseInt(tickItem);
    return hour % 4 === 0 ? tickItem : '';
  };

  // Get day break positions (midnight boundaries) as timestamps
  const getDayBreaks = () => {
    if (!chartData.length) return [] as number[];
    const minTs = Math.min(...chartData.map(p => p.ts));
    const maxTs = Math.max(...chartData.map(p => p.ts));

    const first = new Date(minTs);
    const firstNextMidnight = new Date(first.getFullYear(), first.getMonth(), first.getDate() + 1, 0, 0, 0, 0);

    const breaks: number[] = [];
    for (let t = firstNextMidnight.getTime(); t <= maxTs; ) {
      breaks.push(t);
      const next = new Date(t);
      next.setDate(next.getDate() + 1);
      t = next.getTime();
    }
    return breaks;
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h4 className="text-sm font-medium">Electricity Prices</h4>
          <p className="text-xs text-muted-foreground">
            <span className="block sm:inline">{chartData.length} hours • Prices in öre/kWh</span>
            <span className="block sm:inline sm:ml-1">• {currentBiddingZone}</span>
          </p>
        </div>
        <div className="text-left sm:text-right">
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

      <div className="h-48 sm:h-64 w-full" style={{ minHeight: '200px', minWidth: '300px' }}>
        {loading || chartData.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Clock className="h-8 w-8 animate-spin mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Loading price data...</p>
            </div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%" minWidth={300} minHeight={200}>
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 30 }}>
            <defs>
              <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.8}/>
                <stop offset="50%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.1}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis 
              dataKey="ts" 
              type="number"
              scale="time"
              domain={["dataMin", "dataMax"]}
              stroke="hsl(var(--muted-foreground))"
              fontSize={10}
              tickFormatter={(value: number) => {
                const d = new Date(value);
                const hour = String(d.getHours()).padStart(2, '0');
                return parseInt(hour) % 4 === 0 ? hour : '';
              }}
              height={40}
              interval={0}
            />
            <YAxis 
              stroke="hsl(var(--muted-foreground))"
              fontSize={10}
              tickFormatter={(value) => `${(value * 100).toFixed(0)}`}
              width={50}
            />
            <Tooltip 
              formatter={formatTooltipValue}
              labelFormatter={formatTooltipLabel}
              contentStyle={{
                backgroundColor: 'hsl(var(--background))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '6px',
                fontSize: '12px',
              }}
            />
            <Area 
              type="stepAfter" 
              dataKey="price" 
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              fill="url(#priceGradient)"
              dot={false}
              activeDot={{ r: 4, fill: 'hsl(var(--primary))', strokeWidth: 2, stroke: 'hsl(var(--background))' }}
            />
            {/* Day break lines (on top) */}
            {getDayBreaks().map((breakTime, index) => (
              <ReferenceLine 
                key={`day-break-${index}`}
                x={breakTime} 
                stroke="hsl(var(--muted-foreground))" 
                strokeWidth={2}
                strokeOpacity={0.6}
              />
            ))}
            {/* Current time indicator with enhanced visibility */}
            <ReferenceLine 
              x={Date.now()} 
              stroke="hsl(var(--destructive))" 
              strokeWidth={3}
              strokeDasharray="4 4"
              label={{ 
                value: "NOW", 
                position: "top", 
                fontSize: 10, 
                fill: "hsl(var(--destructive))",
                fontWeight: "bold"
              }}
            />
            {averagePrice > 0 && (
              <ReferenceLine 
                y={averagePrice} 
                stroke="hsl(var(--muted-foreground))" 
                strokeDasharray="5 5"
                strokeOpacity={0.7}
                label={{ value: `${actualDays}d avg`, position: "top", fontSize: 9 }}
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-col sm:flex-row items-center justify-center space-y-2 sm:space-y-0 sm:space-x-6 text-xs">
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
        {currentPriceData && (
          <div className="flex items-center space-x-2">
            <div className="w-3 h-0.5 bg-destructive border-t-2 border-dashed border-destructive"></div>
            <span className="text-muted-foreground">Current Time</span>
          </div>
        )}
      </div>
    </div>
  );
};