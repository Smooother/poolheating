import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, ReferenceLine, Cell } from 'recharts';
import { MOCK_PRICE_DATA, calculateRollingAverage } from '@/services/priceService';

export const PriceChart = () => {
  const chartData = MOCK_PRICE_DATA.map(point => ({
    time: point.start.getHours(),
    price: point.value / 100, // Convert öre to SEK for display
    timestamp: point.start,
  }));

  const averagePrice = calculateRollingAverage(MOCK_PRICE_DATA, 7) / 100; // Convert to SEK

  const getBarColor = (price: number) => {
    if (price < averagePrice * 0.85) return 'hsl(var(--success))';
    if (price > averagePrice * 1.15) return 'hsl(var(--destructive))';
    return 'hsl(var(--muted-foreground))';
  };

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis 
            dataKey="time" 
            stroke="hsl(var(--muted-foreground))"
            fontSize={12}
            interval={3}
            tickFormatter={(hour) => `${hour.toString().padStart(2, '0')}:00`}
          />
          <YAxis 
            stroke="hsl(var(--muted-foreground))"
            fontSize={12}
            label={{ value: 'SEK/kWh', angle: -90, position: 'insideLeft' }}
          />
          <ReferenceLine 
            y={averagePrice} 
            stroke="hsl(var(--primary))" 
            strokeDasharray="5 5"
            label={{ value: "7-day avg", position: "top" }}
          />
          <Bar dataKey="price" radius={[2, 2, 0, 0]}>
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={getBarColor(entry.price)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};