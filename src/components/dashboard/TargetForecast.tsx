import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, ReferenceLine } from 'recharts';

// Mock data for temperature forecast
const mockForecastData = [
  { time: '00:00', target: 30.0, reason: 'Low price (+2°C)' },
  { time: '01:00', target: 30.0, reason: 'Low price (+2°C)' },
  { time: '02:00', target: 30.0, reason: 'Low price (+2°C)' },
  { time: '03:00', target: 30.0, reason: 'Low price (+2°C)' },
  { time: '04:00', target: 30.0, reason: 'Low price (+2°C)' },
  { time: '05:00', target: 30.0, reason: 'Low price (+2°C)' },
  { time: '06:00', target: 28.0, reason: 'Normal price' },
  { time: '07:00', target: 28.0, reason: 'Normal price' },
  { time: '08:00', target: 26.0, reason: 'High price (-2°C)' },
  { time: '09:00', target: 28.0, reason: 'Normal price' },
  { time: '10:00', target: 28.0, reason: 'Normal price' },
  { time: '11:00', target: 28.0, reason: 'Normal price' },
  { time: '12:00', target: 28.0, reason: 'Normal price' },
  { time: '13:00', target: 28.0, reason: 'Normal price' },
  { time: '14:00', target: 28.0, reason: 'Normal price' },
  { time: '15:00', target: 26.0, reason: 'High price (-2°C)' },
  { time: '16:00', target: 26.0, reason: 'High price (-2°C)' },
  { time: '17:00', target: 26.0, reason: 'High price (-2°C)' },
  { time: '18:00', target: 26.0, reason: 'High price (-2°C)' },
  { time: '19:00', target: 26.0, reason: 'High price (-2°C)' },
  { time: '20:00', target: 26.0, reason: 'High price (-2°C)' },
  { time: '21:00', target: 28.0, reason: 'Normal price' },
  { time: '22:00', target: 28.0, reason: 'Normal price' },
  { time: '23:00', target: 28.0, reason: 'Normal price' },
];

const baseSetpoint = 28.0;

export const TargetForecast = () => {
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={mockForecastData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
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
            domain={[24, 32]}
            label={{ value: '°C', angle: -90, position: 'insideLeft' }}
          />
          <ReferenceLine 
            y={baseSetpoint} 
            stroke="hsl(var(--muted-foreground))" 
            strokeDasharray="3 3"
            label={{ value: "Base (28°C)", position: "top" }}
          />
          <Line 
            type="stepAfter"
            dataKey="target" 
            stroke="hsl(var(--primary))" 
            strokeWidth={3}
            dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6, stroke: 'hsl(var(--primary))', strokeWidth: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
      
      <div className="mt-4 flex items-center justify-center space-x-6 text-xs">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-success rounded"></div>
          <span>Low price (+2°C)</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-muted-foreground rounded"></div>
          <span>Normal price</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-destructive rounded"></div>
          <span>High price (-2°C)</span>
        </div>
      </div>
    </div>
  );
};