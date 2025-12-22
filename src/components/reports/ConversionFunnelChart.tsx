import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { motion } from 'framer-motion';
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
        <motion.div
          className="tooltip-enhanced rounded-lg border border-white/20 bg-[#1A1A1C]/95 backdrop-blur-sm p-4 shadow-2xl"
          initial={{ opacity: 0, scale: 0.9, y: -10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
        >
          <p className="text-sm font-bold text-white mb-2 pb-2 border-b border-white/10">{data.name}</p>
          <div className="space-y-1.5">
            <p className="text-xs text-white/70">
              Count: <span className="text-[#A8DADC] font-bold text-sm ml-1">{data.value}</span>
            </p>
            <p className="text-xs text-white/70">
              Percentage: <span className="text-[#B39CD0] font-bold text-sm ml-1">{data.percentage}%</span>
            </p>
          </div>
        </motion.div>
      );
    }
    return null;
  };

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
            layout="vertical"
            margin={{ top: 10, right: 30, left: 20, bottom: 20 }}
          >
            <defs>
              {chartData.map((entry, index) => {
                const color = getFunnelStageColor(entry.name);
                const gradientId = `funnel-gradient-${index}`;
                return (
                  <linearGradient key={gradientId} id={gradientId} x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor={color} stopOpacity={1} />
                    <stop offset="100%" stopColor={color} stopOpacity={0.7} />
                  </linearGradient>
                );
              })}
            </defs>
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
            <Bar dataKey="value" radius={[0, 8, 8, 0]} animationDuration={1200} animationBegin={0} className="chart-bar-animated">
              {chartData.map((_entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={`url(#funnel-gradient-${index})`}
                  className="chart-element-hover"
                  style={{
                    filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  }}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      
      {/* Enhanced Legend and Summary */}
      <motion.div
        className="mt-6 pt-6 border-t border-white/10"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-3 text-xs">
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
                style={{ backgroundColor: getFunnelStageColor(item.name) }}
                whileHover={{ scale: 1.3 }}
                transition={{ duration: 0.2 }}
              />
              <span className="text-white/70 font-medium group-hover:text-white transition-colors">{item.name}:</span>
              <span className="text-white font-bold group-hover:text-[#A8DADC] transition-colors">{item.value}</span>
              <span className="text-white/50 group-hover:text-white/70 transition-colors">({item.percentage}%)</span>
            </motion.div>
          ))}
        </div>
        {total > 0 && (
          <motion.div
            className="mt-5 text-center"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.6 }}
          >
            <motion.div
              className="inline-flex items-center gap-3 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#A8DADC]/15 to-[#B39CD0]/15 border border-[#A8DADC]/30 shadow-lg glow-accent"
              whileHover={{ scale: 1.05, boxShadow: '0 10px 30px rgba(168, 218, 220, 0.3)' }}
            >
              <span className="text-sm text-white/80 font-medium">Total Leads:</span>
              <span className="text-lg font-bold text-[#A8DADC]">{total}</span>
            </motion.div>
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  );
}

