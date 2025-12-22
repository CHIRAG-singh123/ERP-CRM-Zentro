import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { motion } from 'framer-motion';
import type { ConversionBySource } from '../../services/api/reports';
import { ChartFilterDropdown, type ChartFilterValues } from '../common/ChartFilterDropdown';

interface ConversionBySourceChartProps {
  data: ConversionBySource[];
  onFilterChange?: (filters: ChartFilterValues) => void;
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

export function ConversionBySourceChart({ data, onFilterChange }: ConversionBySourceChartProps) {
  const chartData = data.map((item) => ({
    ...item,
    rate: Math.round(item.rate * 10) / 10,
  }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <motion.div
          className="tooltip-enhanced rounded-lg border border-white/20 bg-[#1A1A1C]/95 backdrop-blur-sm p-4 shadow-2xl"
          initial={{ opacity: 0, scale: 0.9, y: -10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
        >
          <p className="text-sm font-bold text-white mb-2 pb-2 border-b border-white/10 capitalize">{data.source}</p>
          <div className="space-y-1.5">
            <p className="text-xs text-white/70">
              Total: <span className="text-[#A8DADC] font-bold text-sm ml-1">{data.total}</span>
            </p>
            <p className="text-xs text-white/70">
              Converted: <span className="text-[#B39CD0] font-bold text-sm ml-1">{data.converted}</span>
            </p>
            <p className="text-xs text-white/70">
              Rate: <span className="text-[#A8DADC] font-bold text-sm ml-1">{data.rate.toFixed(1)}%</span>
            </p>
          </div>
        </motion.div>
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
    <motion.div
      className="h-full w-full flex flex-col relative"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
    >
      {/* Integrated Filters */}
      {onFilterChange && (
        <ChartFilterDropdown onFilterChange={onFilterChange} />
      )}

      <div className={`flex-1 min-h-0 ${onFilterChange ? 'pt-8' : ''}`} style={{ minHeight: '300px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
          >
            <defs>
              {chartData.map((entry, index) => {
                const color = getSourceColor(entry.source);
                const gradientId = `source-gradient-${index}`;
                return (
                  <linearGradient key={gradientId} id={gradientId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity={1} />
                    <stop offset="100%" stopColor={color} stopOpacity={0.6} />
                  </linearGradient>
                );
              })}
            </defs>
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
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(168, 218, 220, 0.15)', stroke: '#A8DADC', strokeWidth: 1 }} />
            <Bar dataKey="rate" radius={[8, 8, 0, 0]} animationDuration={1200} animationBegin={0} className="chart-bar-animated">
              {chartData.map((_entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={`url(#source-gradient-${index})`}
                  className="chart-element-hover"
                  style={{
                    filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.3))',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  }}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      
      {/* Enhanced Legend */}
      <motion.div
        className="mt-6 pt-6 border-t border-white/10"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-3">
          {chartData.map((item, index) => (
            <motion.div
              key={index}
              className="group flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-white/5 to-white/5 hover:from-white/10 hover:to-white/10 border border-white/10 hover:border-[#A8DADC]/30 transition-all duration-200 cursor-pointer"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: 0.4 + index * 0.05 }}
              whileHover={{ scale: 1.05, y: -2 }}
            >
              <motion.div
                className="h-3.5 w-3.5 rounded-full shadow-md"
                style={{ backgroundColor: getSourceColor(item.source) }}
                whileHover={{ scale: 1.3 }}
                transition={{ duration: 0.2 }}
              />
              <span className="text-white/70 font-medium capitalize text-xs group-hover:text-white transition-colors">{item.source}:</span>
              <span className="text-white font-bold text-xs group-hover:text-[#A8DADC] transition-colors">{item.rate.toFixed(1)}%</span>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}

