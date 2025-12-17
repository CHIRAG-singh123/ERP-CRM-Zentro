import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { ChartFilterDropdown, type ChartFilterValues } from '../common/ChartFilterDropdown';
import type { LeadsBySource } from '../../services/api/reports';

interface LeadsBySourceBarChartProps {
  data: LeadsBySource[];
  onFilterChange?: (filters: ChartFilterValues) => void;
}

const SOURCE_COLORS: Record<string, string> = {
  'website': '#3B82F6',
  'email': '#A8DADC',
  'phone': '#B39CD0',
  'social': '#4ECDC4',
  'referral': '#FFA07A',
  'other': '#E0E0E0',
};

const getSourceColor = (source: string): string => {
  return SOURCE_COLORS[source.toLowerCase()] || SOURCE_COLORS.other;
};

interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
}

const CustomTooltip = ({ active, payload }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const total = payload[0].payload.count;
    return (
      <div className="rounded-lg border border-white/20 bg-[#1F1F21] p-3 shadow-xl">
        <p className="text-sm font-semibold text-white mb-1 capitalize">{data.source}</p>
        <p className="text-xs text-white/70">
          Leads: <span className="font-medium text-[#A8DADC]">{total}</span>
        </p>
      </div>
    );
  }
  return null;
};

export function LeadsBySourceBarChart({ data, onFilterChange }: LeadsBySourceBarChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        No leads data available
      </div>
    );
  }

  // Calculate totals for percentages
  const total = data.reduce((sum, item) => sum + item.count, 0);

  const chartData = data.map(item => ({
    ...item,
    percentage: total > 0 ? (item.count / total) * 100 : 0,
  }));

  return (
    <div className="h-full w-full flex flex-col relative">
      {/* Integrated Filters */}
      {onFilterChange && (
        <ChartFilterDropdown onFilterChange={onFilterChange} />
      )}

      <div className={`flex-1 min-h-0 ${onFilterChange ? 'pt-8' : ''}`}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
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
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(168, 218, 220, 0.1)' }} />
            <Legend
              iconType="circle"
              formatter={(value) => (
                <span className="text-sm text-white/80 capitalize">{value}</span>
              )}
              wrapperStyle={{
                paddingTop: '10px',
              }}
            />
            <Bar dataKey="count" name="Leads" radius={[8, 8, 0, 0]} animationDuration={800}>
              {chartData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={getSourceColor(entry.source)}
                  className="hover:opacity-80 transition-opacity cursor-pointer"
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Summary Stats */}
      <div className="mt-4 pt-4 border-t border-white/10">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-xl font-bold text-white">{total}</div>
            <div className="text-xs text-white/60">Total Leads</div>
          </div>
          <div>
            <div className="text-xl font-bold text-[#A8DADC]">{data.length}</div>
            <div className="text-xs text-white/60">Sources</div>
          </div>
          <div>
            <div className="text-xl font-bold text-[#B39CD0] capitalize">
              {data.length > 0 ? data.reduce((max, item) => item.count > max.count ? item : max).source : 'N/A'}
            </div>
            <div className="text-xs text-white/60">Top Source</div>
          </div>
        </div>
      </div>

      {/* Source Breakdown */}
      <div className="mt-4 pt-4 border-t border-white/10">
        <div className="grid grid-cols-2 gap-2 text-xs">
          {chartData.map((item) => (
            <div key={item.source} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: getSourceColor(item.source) }}
                />
                <span className="text-white/70 capitalize">{item.source}</span>
              </div>
              <span className="font-medium text-white">{item.count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

