import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, ReferenceLine, Cell } from 'recharts';

// Mock data for 24-hour price overview
const mockPriceData = [
  { time: '00:00', price: 0.25, state: 'low' },
  { time: '01:00', price: 0.22, state: 'low' },
  { time: '02:00', price: 0.20, state: 'low' },
  { time: '03:00', price: 0.18, state: 'low' },
  { time: '04:00', price: 0.17, state: 'low' },
  { time: '05:00', price: 0.19, state: 'low' },
  { time: '06:00', price: 0.28, state: 'normal' },
  { time: '07:00', price: 0.45, state: 'normal' },
  { time: '08:00', price: 0.52, state: 'high' },
  { time: '09:00', price: 0.48, state: 'normal' },
  { time: '10:00', price: 0.42, state: 'normal' },
  { time: '11:00', price: 0.38, state: 'normal' },
  { time: '12:00', price: 0.35, state: 'normal' },
  { time: '13:00', price: 0.40, state: 'normal' },
  { time: '14:00', price: 0.45, state: 'normal' },
  { time: '15:00', price: 0.50, state: 'high' },
  { time: '16:00', price: 0.65, state: 'high' },
  { time: '17:00', price: 0.72, state: 'high' },
  { time: '18:00', price: 0.85, state: 'high' },
  { time: '19:00', price: 0.78, state: 'high' },
  { time: '20:00', price: 0.55, state: 'high' },
  { time: '21:00', price: 0.42, state: 'normal' },
  { time: '22:00', price: 0.35, state: 'normal' },
  { time: '23:00', price: 0.30, state: 'normal' },
];

const averagePrice = mockPriceData.reduce((sum, item) => sum + item.price, 0) / mockPriceData.length;

export const PriceChart = () => {
  const getBarColor = (state: string) => {
    switch (state) {
      case 'low': return 'hsl(var(--success))';
      case 'high': return 'hsl(var(--destructive))';
      default: return 'hsl(var(--muted-foreground))';
    }
  };

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={mockPriceData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis 
            dataKey="time" 
            stroke="hsl(var(--muted-foreground))"
            fontSize={12}
            interval={3}
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
            label={{ value: "Average", position: "top" }}
          />
          <Bar dataKey="price" radius={[2, 2, 0, 0]}>
            {mockPriceData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={getBarColor(entry.state)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};