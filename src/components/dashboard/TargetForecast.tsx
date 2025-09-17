import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, ReferenceLine } from 'recharts';
import { fetchStoredPrices } from '@/services/priceDataService';
import { classifyPrice, calculateRollingAverage } from '@/services/priceService';
import { useSettings } from '@/contexts/SettingsContext';

interface ForecastPoint {
  time: string;
  targetTemp: number;
  priceState: 'low' | 'normal' | 'high';
  actualPrice: number;
  timestamp: Date;
  day: 'yesterday' | 'today' | 'tomorrow';
  isCurrentHour?: boolean;
}

interface WeatherData {
  temperature: number;
  location: string;
  description: string;
}

interface TargetForecastProps {
  biddingZone: string;
}

export const TargetForecast = ({ biddingZone }: TargetForecastProps) => {
  const { settings } = useSettings();
  const [forecastData, setForecastData] = useState<ForecastPoint[]>([]);
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchWeatherData = async () => {
    // Mock weather data for Stockholm (SE3 area)
    // In production, this would use a real weather API
    const mockWeather: WeatherData = {
      temperature: 2.5, // Current outdoor temp in Celsius
      location: 'Stockholm, SE3',
      description: 'Partly cloudy'
    };
    
    setWeatherData(mockWeather);
    return mockWeather;
  };

  const calculateTargetTemperature = (
    baseTemp: number, 
    priceState: 'low' | 'normal' | 'high',
    outdoorTemp: number
  ): number => {
    let adjustment = 0;
    
    // Price-based adjustment
    switch (priceState) {
      case 'low':
        adjustment += settings.lowPriceOffset; // Boost when prices are low
        break;
      case 'high':
        adjustment -= settings.highPriceOffset; // Reduce when prices are high
        break;
      default:
        adjustment = 0; // No adjustment for normal prices
    }

    // Weather-based adjustment (colder outside = slightly higher pool temp)
    if (outdoorTemp < 0) {
      adjustment += 1; // +1°C when very cold outside
    } else if (outdoorTemp > 15) {
      adjustment -= 0.5; // -0.5°C when warm outside
    }

    const targetTemp = baseTemp + adjustment;
    
    // Apply safety limits
    return Math.max(settings.minTemp, Math.min(settings.maxTemp, targetTemp));
  };

  const fetchForecastData = async () => {
    try {
      setLoading(true);
      
      const weather = await fetchWeatherData();
      
      // Match the same date range as price chart for consistency
      const now = new Date();
      const startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 24 hours ago
      const endDate = new Date(now.getTime() + 48 * 60 * 60 * 1000); // 48 hours forward
      
      const prices = await fetchStoredPrices(biddingZone, startDate, endDate);
      
      if (prices.length === 0) {
        console.warn('No price data available for forecast');
        return;
      }

      console.log(`Forecast: Fetched ${prices.length} price points`);

      // Calculate rolling average for price classification
      const { average: rollingAvg } = calculateRollingAverage(prices, settings.rollingDays);
      const currentHour = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours());
      
      // Create forecast data points including historical data
      const sortedPrices = [...prices].sort((a, b) => a.start.getTime() - b.start.getTime());
      
      const forecast: ForecastPoint[] = sortedPrices.map(price => {
        const isCurrentHour = price.start.getHours() === currentHour.getHours() && 
                             price.start.toDateString() === currentHour.toDateString();

        const todayDate = now.toDateString();
        const pointDate = price.start.toDateString();
        
        let dayLabel: 'yesterday' | 'today' | 'tomorrow';
        if (price.start < new Date(now.getFullYear(), now.getMonth(), now.getDate())) {
          dayLabel = 'yesterday';
        } else if (pointDate === todayDate) {
          dayLabel = 'today';
        } else {
          dayLabel = 'tomorrow';
        }

        const priceState = classifyPrice(
          price.value, 
          rollingAvg, 
          settings.thresholdMethod === 'delta' ? 'percent' : 'percentile', 
          settings
        );
        const targetTemp = calculateTargetTemperature(
          settings.baseSetpoint, 
          priceState,
          weather.temperature
        );

        return {
          time: price.start.getHours().toString().padStart(2, '0'),
          targetTemp,
          priceState,
          actualPrice: price.value,
          timestamp: price.start,
          day: dayLabel,
          isCurrentHour
        };
      });

      console.log(`Forecast: Transformed ${forecast.length} points, current hour found: ${forecast.some(f => f.isCurrentHour)}`);
      setForecastData(forecast);
    } catch (error) {
      console.error('Failed to fetch forecast data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchForecastData();
    
    // Refresh every 30 minutes
    const interval = setInterval(fetchForecastData, 30 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [biddingZone, settings.rollingDays, settings.thresholdMethod, settings.deltaPercent, settings.percentileLow, settings.percentileHigh, settings.baseSetpoint, settings.lowPriceOffset, settings.highPriceOffset, settings.minTemp, settings.maxTemp]);

  const getLineColor = (dataKey: string) => {
    return 'hsl(var(--accent))';
  };

  const formatXAxisTick = (tickItem: string, index: number) => {
    // Show every 4th hour: 04, 08, 12, 16, 20, 00, 04, etc.
    const hour = parseInt(tickItem);
    return hour % 4 === 0 ? tickItem : '';
  };

  // Get day break positions (midnight hours where day changes)
  const getDayBreaks = () => {
    const breaks: string[] = [];
    const seen = new Set<string>();
    
    forecastData.forEach((point, index) => {
      if (point.time === '00' && index > 0) {
        const dayKey = point.timestamp.toDateString();
        if (!seen.has(dayKey)) {
          breaks.push(point.time);
          seen.add(dayKey);
        }
      }
    });
    
    return breaks;
  };

  // Get current time point
  const getCurrentTimePoint = () => {
    return forecastData.find(point => point.isCurrentHour);
  };

  const formatTooltipValue = (value: number, name: string) => {
    return [`${value.toFixed(1)}°C`, 'Target Temperature'];
  };

  const formatTooltipLabel = (label: string, payload: any[]) => {
    if (payload && payload[0]) {
      const data = payload[0].payload as ForecastPoint;
      const date = data.timestamp.toLocaleDateString('sv-SE', { 
        month: 'short', 
        day: 'numeric' 
      });
      const priceInfo = `${(data.actualPrice * 100).toFixed(1)} öre/kWh (${data.priceState})`;
      return [`${date} ${label}`, priceInfo];
    }
    return label;
  };

  if (loading) {
    return (
      <div className="h-64 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent mx-auto mb-2"></div>
          <p className="text-sm text-muted-foreground">Loading temperature forecast...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with weather info */}
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-medium">Target Temperature Forecast</h4>
          <p className="text-xs text-muted-foreground">
            {forecastData.length} hours • Based on electricity prices and weather
          </p>
        </div>
        {weatherData && (
          <div className="text-right">
            <p className="text-sm font-medium">{weatherData.location}</p>
            <p className="text-xs text-muted-foreground">
              {weatherData.temperature}°C • {weatherData.description}
            </p>
          </div>
        )}
      </div>

      {/* Chart */}
      <div className="h-48 sm:h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={forecastData} margin={{ top: 10, right: 10, left: 10, bottom: 30 }}>
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
              domain={[settings.minTemp, settings.maxTemp]}
              tickFormatter={(value) => `${value}°C`}
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
            {getCurrentTimePoint() && (
              <ReferenceLine 
                x={getCurrentTimePoint()!.time} 
                stroke="hsl(var(--destructive))" 
                strokeWidth={2}
                strokeDasharray="2 2"
              />
            )}
            <ReferenceLine 
              y={settings.baseSetpoint} 
              stroke="hsl(var(--muted-foreground))" 
              strokeDasharray="5 5"
              strokeOpacity={0.7}
              label={{ value: "Base temp", position: "top", fontSize: 9 }}
            />
            <Line 
              type="stepAfter" 
              dataKey="targetTemp" 
              stroke={getLineColor('targetTemp')}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: 'hsl(var(--accent))', strokeWidth: 2, stroke: 'hsl(var(--background))' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Legend and info */}
      <div className="flex flex-col sm:flex-row items-center justify-center space-y-2 sm:space-y-0 sm:space-x-6 text-xs">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-0.5 bg-accent"></div>
          <span className="text-muted-foreground">Target Temperature</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-0.5 border-t border-dashed border-muted-foreground"></div>
          <span className="text-muted-foreground">Base Setpoint ({settings.baseSetpoint}°C)</span>
        </div>
        {getCurrentTimePoint() && (
          <div className="flex items-center space-x-2">
            <div className="w-3 h-0.5 bg-destructive border-t-2 border-dashed border-destructive"></div>
            <span className="text-muted-foreground">Current Time</span>
          </div>
        )}
      </div>

      {/* Price adjustment info */}
      <div className="grid grid-cols-3 gap-4 text-xs">
        <div className="text-center p-2 bg-success/5 rounded border border-success/20">
          <div className="font-medium text-success">Low Price</div>
          <div className="text-muted-foreground">+{settings.lowPriceOffset}°C boost</div>
        </div>
        <div className="text-center p-2 bg-muted/5 rounded border border-border">
          <div className="font-medium">Normal Price</div>
          <div className="text-muted-foreground">Base temp</div>
        </div>
        <div className="text-center p-2 bg-destructive/5 rounded border border-destructive/20">
          <div className="font-medium text-destructive">High Price</div>
          <div className="text-muted-foreground">-{settings.highPriceOffset}°C save</div>
        </div>
      </div>
    </div>
  );
};