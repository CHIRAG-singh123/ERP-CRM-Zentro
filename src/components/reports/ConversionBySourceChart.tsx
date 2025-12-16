import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import type { ConversionBySource } from '../../services/api/reports';

interface ConversionBySourceChartProps {
  data: ConversionBySource[];
}

const sourceColors: Record<string, string> = {
  website: '#3B82F6',
  referral: '#10B981',
  social: '#8B5CF6',
  email: '#F59E0B',
  phone: '#EF4444',
  other: '#6B7280',
};

const getSourceColor = (source: string): string => {
  return sourceColors[source.toLowerCase()] || sourceColors.other;
};

export function ConversionBySourceChart({ data }: ConversionBySourceChartProps) {
  const chartData = data.map((item) => ({
    ...item,
    rate: Math.round(item.rate * 10) / 10,
  }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="rounded-lg border border-white/20 bg-[#1A1A1C] p-3 shadow-lg">
          <p className="text-sm font-medium text-white capitalize">{data.source}</p>
          <p className="text-xs text-white/70 mt-1">
            Total: <span className="text-[#A8DADC] font-semibold">{data.total}</span>
          </p>
          <p className="text-xs text-white/70">
            Converted: <span className="text-[#B39CD0] font-semibold">{data.converted}</span>
          </p>
          <p className="text-xs text-white/70 mt-1">
            Rate: <span className="text-[#A8DADC] font-semibold">{data.rate.toFixed(1)}%</span>
          </p>
        </div>
      );
    }
    return null;
  };

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-white/50">
        <p>No conversion data by source available</p>
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col">
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
            <XAxis
              dataKey="source"
              stroke="#ffffff40"
              style={{ fontSize: '12px', fontWeight: 500 }}
              tick={{ fill: '#ffffff70' }}
              tickLine={{ stroke: '#ffffff20' }}
              tickFormatter={(value) => value.charAt(0).toUpperCase() + value.slice(1)}
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
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(168, 218, 220, 0.1)' }} />
            <Bar dataKey="rate" radius={[8, 8, 0, 0]} animationDuration={800}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getSourceColor(entry.source)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      
      {/* Legend */}
      <div className="mt-6 pt-6 border-t border-white/10">
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
          {chartData.map((entry, index) => (
            <div key={index} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
              <div 
                className="h-3 w-3 rounded-full shadow-sm" 
                style={{ backgroundColor: getSourceColor(entry.source) }}
              ></div>
              <span className="text-white/70 font-medium capitalize text-xs">{entry.source}:</span>
              <span className="text-white font-semibold text-xs">{entry.rate.toFixed(1)}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

