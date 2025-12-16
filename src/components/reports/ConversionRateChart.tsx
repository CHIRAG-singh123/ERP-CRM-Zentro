import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart, Line } from 'recharts';
import type { ConversionOverTime } from '../../services/api/reports';

interface ConversionRateChartProps {
  data: ConversionOverTime[];
}

export function ConversionRateChart({ data }: ConversionRateChartProps) {
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="rounded-lg border border-white/20 bg-[#1A1A1C] p-3 shadow-lg">
          <p className="text-sm font-medium text-white mb-2">{label}</p>
          <p className="text-xs text-white/70">
            Total Leads: <span className="text-[#A8DADC] font-semibold">{data.total}</span>
          </p>
          <p className="text-xs text-white/70">
            Converted: <span className="text-[#B39CD0] font-semibold">{data.converted}</span>
          </p>
          <p className="text-xs text-white/70 mt-1">
            Conversion Rate: <span className="text-[#A8DADC] font-semibold">{data.rate.toFixed(1)}%</span>
          </p>
        </div>
      );
    }
    return null;
  };

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-white/50">
        <p>No data available for the selected time period</p>
      </div>
    );
  }

  return (
    <div className="h-full w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
        >
          <defs>
            <linearGradient id="colorConversion" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#A8DADC" stopOpacity={0.4} />
              <stop offset="50%" stopColor="#A8DADC" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#A8DADC" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorConversionLine" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#A8DADC" />
              <stop offset="100%" stopColor="#B39CD0" />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
          <XAxis
            dataKey="period"
            stroke="#ffffff40"
            style={{ fontSize: '11px' }}
            tick={{ fill: '#ffffff60' }}
            tickLine={{ stroke: '#ffffff20' }}
          />
          <YAxis
            stroke="#ffffff40"
            style={{ fontSize: '11px' }}
            tick={{ fill: '#ffffff60' }}
            tickLine={{ stroke: '#ffffff20' }}
            label={{ 
              value: 'Conversion Rate (%)', 
              angle: -90, 
              position: 'insideLeft', 
              style: { textAnchor: 'middle', fill: '#ffffff70', fontSize: '12px', fontWeight: 500 } 
            }}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#A8DADC', strokeWidth: 1, strokeDasharray: '5 5' }} />
          <Area
            type="monotone"
            dataKey="rate"
            stroke="url(#colorConversionLine)"
            strokeWidth={3}
            fillOpacity={1}
            fill="url(#colorConversion)"
            animationDuration={800}
          />
          <Line
            type="monotone"
            dataKey="rate"
            stroke="#B39CD0"
            strokeWidth={2}
            dot={{ fill: '#B39CD0', r: 5, strokeWidth: 2, stroke: '#1A1A1C' }}
            activeDot={{ r: 7, stroke: '#B39CD0', strokeWidth: 2 }}
            animationDuration={800}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

