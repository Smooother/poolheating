import { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer, ReferenceLine, ReferenceDot, Tooltip } from 'recharts';
import { fetchStoredPrices, getLatestPriceDate } from '@/services/priceDataService';
import { calculateRollingAverage } from '@/services/priceService';
import { CONFIG } from '@/lib/config';
import { useToast } from '@/hooks/use-toast';
import { useSettings } from '@/contexts/SettingsContext';

interface ChartDataPoint {
  time: string;
  price: number;
  timestamp: Date;
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
      
      // Calculate date range for yesterday, today and tomorrow (48 hours total)
      const now = new Date();
      const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
      const dayAfterTomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 2);

      // Fetch price data from Supabase
      const prices = await fetchStoredPrices(currentBiddingZone, yesterday, dayAfterTomorrow);
      
      // Calculate rolling average for reference line
      const { average: avgPrice, actualDays: usedDays } = calculateRollingAverage(prices, settings.rollingDays);
      setAveragePrice(avgPrice);
      setActualDays(usedDays);

      // Transform data for step chart - each price is valid for full hour
      const transformedData: ChartDataPoint[] = [];
      const currentHour = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours());
      
      prices
        .filter(point => {
          // Include data from yesterday evening to tomorrow
          const yesterdayDate = yesterday.toDateString();
          const todayDate = now.toDateString();
          const tomorrowDate = new Date(now.getTime() + 24 * 60 * 60 * 1000).toDateString();
          const pointDate = point.start.toDateString();
          
          return pointDate === yesterdayDate || pointDate === todayDate || pointDate === tomorrowDate;
        })
        .forEach(point => {
          const yesterdayDate = yesterday.toDateString();
          const todayDate = now.toDateString();
          const tomorrowDate = new Date(now.getTime() + 24 * 60 * 60 * 1000).toDateString();
          const pointDate = point.start.toDateString();
          
          let dayLabel: 'yesterday' | 'today' | 'tomorrow';
          if (pointDate === yesterdayDate) dayLabel = 'yesterday';
          else if (pointDate === todayDate) dayLabel = 'today';
          else dayLabel = 'tomorrow';
          
          const isCurrentHour = point.start.getHours() === currentHour.getHours() && 
                               point.start.toDateString() === currentHour.toDateString();
          
          // Add start point
          transformedData.push({
            time: point.start.getHours().toString().padStart(2, '0'),
            price: point.value,
            timestamp: point.start,
            day: dayLabel,
            isCurrentHour
          });
        });
      
      // Sort by timestamp
      transformedData.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

      // Find current price point for marker
      const currentData = transformedData.find(point => point.isCurrentHour);
      setCurrentPriceData(currentData || null);

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
    // Show every 4th hour: 04, 08, 12, 16, 20, 00, 04, etc.
    const hour = parseInt(tickItem);
    return hour % 4 === 0 ? tickItem : '';
  };

  // Get day break positions (midnight hours)
  const getDayBreaks = () => {
    return chartData
      .filter(point => point.time === '00' && point.day !== 'yesterday')
      .map(point => point.time);
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

      <div className="h-48 sm:h-64">
        <ResponsiveContainer width="100%" height="100%">
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
              dataKey="time" 
              stroke="hsl(var(--muted-foreground))"
              fontSize={10}
              tickFormatter={formatXAxisTick}
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
            {/* Day break lines */}
            {getDayBreaks().map((breakTime, index) => (
              <ReferenceLine 
                key={`day-break-${index}`}
                x={breakTime} 
                stroke="hsl(var(--muted-foreground))" 
                strokeWidth={2}
                strokeOpacity={0.6}
              />
            ))}
            {/* Current time indicator */}
            {currentPriceData && (
              <ReferenceLine 
                x={currentPriceData.time} 
                stroke="hsl(var(--destructive))" 
                strokeWidth={2}
                strokeDasharray="2 2"
              />
            )}
            {averagePrice > 0 && (
              <ReferenceLine 
                y={averagePrice} 
                stroke="hsl(var(--muted-foreground))" 
                strokeDasharray="5 5"
                strokeOpacity={0.7}
                label={{ value: `${actualDays}d avg`, position: "top", fontSize: 9 }}
              />
            )}
            <Area 
              type="stepAfter" 
              dataKey="price" 
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              fill="url(#priceGradient)"
              dot={false}
              activeDot={{ r: 4, fill: 'hsl(var(--primary))', strokeWidth: 2, stroke: 'hsl(var(--background))' }}
            />
          </AreaChart>
        </ResponsiveContainer>
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