import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { getFunnelStageColor } from '../../utils/reportUtils';
import type { ConversionFunnelData } from '../../services/api/reports';
import { ChartFilterDropdown, type ChartFilterValues } from '../common/ChartFilterDropdown';

interface ConversionFunnelChartProps {
  data: ConversionFunnelData;
  onFilterChange?: (filters: ChartFilterValues) => void;
}

export function ConversionFunnelChart({ data, onFilterChange }: ConversionFunnelChartProps) {
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
        <div className="rounded-lg border border-white/20 bg-[#1A1A1C]/95 backdrop-blur-sm p-4 shadow-2xl">
          <p className="text-sm font-bold text-white mb-2 pb-2 border-b border-white/10">{data.name}</p>
          <div className="space-y-1.5">
            <p className="text-xs text-white/70">
              Count: <span className="text-[#A8DADC] font-bold text-sm ml-1">{data.value}</span>
            </p>
            <p className="text-xs text-white/70">
              Percentage: <span className="text-[#B39CD0] font-bold text-sm ml-1">{data.percentage}%</span>
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="h-full w-full flex flex-col relative">
      {/* Integrated Filters */}
      {onFilterChange && (
        <ChartFilterDropdown onFilterChange={onFilterChange} />
      )}

      <div className={`flex-1 min-h-0 ${onFilterChange ? 'pt-8' : ''}`} style={{ minHeight: '300px' }}>
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
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(168, 218, 220, 0.15)', stroke: '#A8DADC', strokeWidth: 1 }} />
            <Bar dataKey="value" radius={[0, 8, 8, 0]} animationDuration={1000} animationBegin={0}>
              {chartData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={getFunnelStageColor(entry.name)}
                  className="hover:opacity-90 transition-opacity cursor-pointer"
                  style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))' }}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      
      {/* Enhanced Legend and Summary */}
      <div className="mt-6 pt-6 border-t border-white/10">
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-3 text-xs">
          {chartData.map((entry, index) => (
            <div 
              key={index} 
              className="group flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-white/5 to-white/5 hover:from-white/10 hover:to-white/10 border border-white/10 hover:border-[#A8DADC]/30 transition-all duration-200 cursor-pointer"
            >
              <div 
                className="h-3.5 w-3.5 rounded-full shadow-md group-hover:scale-110 transition-transform" 
                style={{ backgroundColor: getFunnelStageColor(entry.name) }}
              ></div>
              <span className="text-white/70 font-medium group-hover:text-white transition-colors">{entry.name}:</span>
              <span className="text-white font-bold group-hover:text-[#A8DADC] transition-colors">{entry.value}</span>
              <span className="text-white/50 group-hover:text-white/70 transition-colors">({entry.percentage}%)</span>
            </div>
          ))}
        </div>
        {total > 0 && (
          <div className="mt-5 text-center">
            <div className="inline-flex items-center gap-3 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#A8DADC]/15 to-[#B39CD0]/15 border border-[#A8DADC]/30 shadow-lg hover:shadow-xl hover:shadow-[#A8DADC]/20 transition-all duration-300">
              <span className="text-sm text-white/80 font-medium">Total Leads:</span>
              <span className="text-lg font-bold text-[#A8DADC]">{total}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

