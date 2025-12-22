import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { motion } from 'framer-motion';
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
      <motion.div
        className="tooltip-enhanced rounded-lg border border-border bg-card p-3 shadow-xl backdrop-blur-sm"
        initial={{ opacity: 0, scale: 0.9, y: -10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
      >
        <p className="text-sm font-semibold text-foreground mb-1 capitalize">{data.source}</p>
        <p className="text-xs text-muted-foreground">
          Leads: <span className="font-medium text-[#A8DADC]">{total}</span>
        </p>
      </motion.div>
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
    <motion.div
      className="h-full w-full flex flex-col relative chart-container-enhanced"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
    >
      {/* Integrated Filters */}
      {onFilterChange && (
        <ChartFilterDropdown onFilterChange={onFilterChange} />
      )}

      <div className={`flex-1 min-h-0 ${onFilterChange ? 'pt-8' : ''}`}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
            <defs>
              {chartData.map((entry, index) => {
                const color = getSourceColor(entry.source);
                const gradientId = `bar-gradient-${index}`;
                return (
                  <linearGradient key={gradientId} id={gradientId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity={1} />
                    <stop offset="100%" stopColor={color} stopOpacity={0.6} />
                  </linearGradient>
                );
              })}
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <XAxis
              dataKey="source"
              stroke="var(--color-border)"
              style={{ fontSize: '12px', fontWeight: 500 }}
              tick={{ fill: 'var(--color-foreground)', opacity: 0.7 }}
              tickLine={{ stroke: 'var(--color-border)' }}
              tickFormatter={(value) => value.charAt(0).toUpperCase() + value.slice(1)}
            />
            <YAxis
              stroke="var(--color-border)"
              style={{ fontSize: '11px' }}
              tick={{ fill: 'var(--color-foreground)', opacity: 0.7 }}
              tickLine={{ stroke: 'var(--color-border)' }}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(168, 218, 220, 0.1)' }} />
            <Legend
              iconType="circle"
              formatter={(value) => (
                <span className="text-sm text-foreground capitalize">{value}</span>
              )}
              wrapperStyle={{
                paddingTop: '10px',
              }}
            />
            <Bar
              dataKey="count"
              name="Leads"
              radius={[8, 8, 0, 0]}
              animationDuration={1200}
              className="chart-bar-animated"
            >
              {chartData.map((_entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={`url(#bar-gradient-${index})`}
                  className="chart-element-hover"
                  style={{
                    filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2))',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  }}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Summary Stats */}
      <motion.div
        className="mt-4 pt-4 border-t border-border"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <div className="grid grid-cols-3 gap-4 text-center">
          <motion.div
            whileHover={{ scale: 1.05 }}
            transition={{ duration: 0.2 }}
          >
            <div className="text-xl font-bold text-foreground">{total}</div>
            <div className="text-xs text-muted-foreground">Total Leads</div>
          </motion.div>
          <motion.div
            whileHover={{ scale: 1.05 }}
            transition={{ duration: 0.2 }}
          >
            <div className="text-xl font-bold text-[#A8DADC]">{data.length}</div>
            <div className="text-xs text-muted-foreground">Sources</div>
          </motion.div>
          <motion.div
            whileHover={{ scale: 1.05 }}
            transition={{ duration: 0.2 }}
          >
            <div className="text-xl font-bold text-[#B39CD0] capitalize">
              {data.length > 0 ? data.reduce((max, item) => item.count > max.count ? item : max).source : 'N/A'}
            </div>
            <div className="text-xs text-muted-foreground">Top Source</div>
          </motion.div>
        </div>
      </motion.div>

      {/* Source Breakdown */}
      <motion.div
        className="mt-4 pt-4 border-t border-border"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
      >
        <div className="grid grid-cols-2 gap-2 text-xs">
          {chartData.map((item, index) => (
            <motion.div
              key={item.source}
              className="flex items-center justify-between"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: 0.5 + index * 0.05 }}
              whileHover={{ scale: 1.02, x: 4 }}
            >
              <div className="flex items-center gap-2">
                <motion.div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: getSourceColor(item.source) }}
                  whileHover={{ scale: 1.3 }}
                  transition={{ duration: 0.2 }}
                />
                <span className="text-muted-foreground capitalize">{item.source}</span>
              </div>
              <span className="font-medium text-foreground">{item.count}</span>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}

