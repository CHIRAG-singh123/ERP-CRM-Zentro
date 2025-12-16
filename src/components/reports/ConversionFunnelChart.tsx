import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { getFunnelStageColor } from '../../utils/reportUtils';
import type { ConversionFunnelData } from '../../services/api/reports';

interface ConversionFunnelChartProps {
  data: ConversionFunnelData;
}

export function ConversionFunnelChart({ data }: ConversionFunnelChartProps) {
  const chartData = [
    { name: 'New', value: data.new, percentage: data.new > 0 ? ((data.new / (data.new + data.contacted + data.qualified + data.converted + data.lost)) * 100).toFixed(1) : '0' },
    { name: 'Contacted', value: data.contacted, percentage: data.contacted > 0 ? ((data.contacted / (data.new + data.contacted + data.qualified + data.converted + data.lost)) * 100).toFixed(1) : '0' },
    { name: 'Qualified', value: data.qualified, percentage: data.qualified > 0 ? ((data.qualified / (data.new + data.contacted + data.qualified + data.converted + data.lost)) * 100).toFixed(1) : '0' },
    { name: 'Converted', value: data.converted, percentage: data.converted > 0 ? ((data.converted / (data.new + data.contacted + data.qualified + data.converted + data.lost)) * 100).toFixed(1) : '0' },
    { name: 'Lost', value: data.lost, percentage: data.lost > 0 ? ((data.lost / (data.new + data.contacted + data.qualified + data.converted + data.lost)) * 100).toFixed(1) : '0' },
  ];

  const total = data.new + data.contacted + data.qualified + data.converted + data.lost;

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="rounded-lg border border-white/20 bg-[#1A1A1C] p-3 shadow-lg">
          <p className="text-sm font-medium text-white">{data.name}</p>
          <p className="text-xs text-white/70 mt-1">
            Count: <span className="text-[#A8DADC] font-semibold">{data.value}</span>
          </p>
          <p className="text-xs text-white/70">
            Percentage: <span className="text-[#B39CD0] font-semibold">{data.percentage}%</span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="h-full w-full flex flex-col">
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 10, right: 30, left: 20, bottom: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
            <XAxis 
              type="number" 
              stroke="#ffffff40" 
              style={{ fontSize: '11px' }}
              tick={{ fill: '#ffffff60' }}
            />
            <YAxis 
              dataKey="name" 
              type="category" 
              stroke="#ffffff40" 
              style={{ fontSize: '12px', fontWeight: 500 }} 
              width={90}
              tick={{ fill: '#ffffff80' }}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(168, 218, 220, 0.1)' }} />
            <Bar dataKey="value" radius={[0, 6, 6, 0]} animationDuration={800}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getFunnelStageColor(entry.name)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      
      {/* Legend and Summary */}
      <div className="mt-6 pt-6 border-t border-white/10">
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-xs">
          {chartData.map((entry, index) => (
            <div key={index} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
              <div 
                className="h-3 w-3 rounded-full shadow-sm" 
                style={{ backgroundColor: getFunnelStageColor(entry.name) }}
              ></div>
              <span className="text-white/70 font-medium">{entry.name}:</span>
              <span className="text-white font-semibold">{entry.value}</span>
              <span className="text-white/50">({entry.percentage}%)</span>
            </div>
          ))}
        </div>
        {total > 0 && (
          <div className="mt-4 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#A8DADC]/10 border border-[#A8DADC]/20">
              <span className="text-sm text-white/70">Total Leads:</span>
              <span className="text-base font-bold text-[#A8DADC]">{total}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

