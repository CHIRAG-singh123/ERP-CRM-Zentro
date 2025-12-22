import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { motion } from 'framer-motion';
import { formatCurrency, formatAbbreviatedNumber } from '../../utils/formatting';
import { AnimatedNumber } from '../common/AnimatedNumber';
import { ChartFilterDropdown, type ChartFilterValues } from '../common/ChartFilterDropdown';
import type { DealsByStage } from '../../services/api/reports';

export type { ChartFilterValues };

interface DealsByStagePieChartProps {
  data: DealsByStage[];
  onFilterChange?: (filters: ChartFilterValues) => void;
  isAdmin?: boolean;
}

const STAGE_COLORS: Record<string, string> = {
  'Prospecting': '#A8DADC',
  'Qualification': '#B39CD0',
  'Proposal': '#4ECDC4',
  'Negotiation': '#FFA07A',
  'Closed Won': '#77b900',
  'Closed Lost': '#e8464c',
};

const RADIAN = Math.PI / 180;

const renderCustomLabel = ({
  cx,
  cy,
  midAngle,
  innerRadius,
  outerRadius,
  percent,
}: any) => {
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  // Only show label if percentage is >= 5%
  if (percent < 0.05) return null;

  // Use a contrasting color based on theme - dark text for light mode, light text for dark mode
  const textColor = 'var(--color-foreground)';
  
  return (
    <text
      x={x}
      y={y}
      fill={textColor}
      textAnchor={x > cx ? 'start' : 'end'}
      dominantBaseline="central"
      className="text-xs font-semibold"
      style={{ 
        textShadow: '0px 0px 3px rgba(255, 255, 255, 0.9), 0px 0px 6px rgba(0, 0, 0, 0.4)',
        fontWeight: 600
      }}
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
}

const CustomTooltip = ({ active, payload }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <motion.div
        className="tooltip-enhanced rounded-lg border border-border bg-card p-3 shadow-xl backdrop-blur-sm"
        initial={{ opacity: 0, scale: 0.9, y: -10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
      >
        <p className="text-sm font-semibold text-foreground mb-1">{data.stage}</p>
        <p className="text-xs text-muted-foreground">
          Deals: <span className="font-medium text-foreground">{data.count}</span>
        </p>
        <p className="text-xs text-muted-foreground">
          Value: <span className="font-medium text-[#A8DADC]">{formatCurrency(data.totalValue)}</span>
        </p>
        <p className="text-xs text-muted-foreground">
          Percentage: <span className="font-medium text-[#B39CD0]">{data.percentage.toFixed(1)}%</span>
        </p>
      </motion.div>
    );
  }
  return null;
};

interface CenterLabelProps {
  viewBox?: { cx?: number; cy?: number };
  totalDeals: number;
  totalValue: number;
}

const CenterLabel = ({ viewBox, totalDeals, totalValue }: CenterLabelProps) => {
  const { cx = 0, cy = 0 } = viewBox || {};
  
  return (
    <text x={cx} y={cy} textAnchor="middle">
      <tspan x={cx} y={cy - 10} className="fill-foreground text-2xl font-bold">
        {totalDeals}
      </tspan>
      <tspan x={cx} y={cy + 15} className="fill-muted-foreground text-sm">
        Total Deals
      </tspan>
      <tspan x={cx} y={cy + 35} className="fill-[#A8DADC] text-base font-semibold">
        {formatAbbreviatedNumber(totalValue, true)}
      </tspan>
    </text>
  );
};

export function DealsByStagePieChart({ data, onFilterChange }: DealsByStagePieChartProps) {

  if (!data || data.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        No deals data available
      </div>
    );
  }

  // Filter out stages with 0 count for the pie chart
  const chartData = data.filter(item => item.count > 0);

  if (chartData.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        No deals found for the selected filters
      </div>
    );
  }

  // Calculate totals and percentages
  const totalDeals = chartData.reduce((sum, item) => sum + item.count, 0);
  const totalValue = chartData.reduce((sum, item) => sum + item.totalValue, 0);

  const chartDataWithPercentage = chartData.map(item => ({
    ...item,
    percentage: (item.count / totalDeals) * 100,
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

      <div className={`flex-1 min-h-0 ${onFilterChange ? 'pt-8' : ''}`} style={{ minHeight: '300px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <defs>
              {chartDataWithPercentage.map((entry, index) => {
                const color = STAGE_COLORS[entry.stage] || '#A8DADC';
                const gradientId = `gradient-${index}`;
                return (
                  <linearGradient key={gradientId} id={gradientId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity={1} />
                    <stop offset="100%" stopColor={color} stopOpacity={0.7} />
                  </linearGradient>
                );
              })}
            </defs>
            <Pie
              data={chartDataWithPercentage}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={renderCustomLabel}
              outerRadius={100}
              innerRadius={50}
              fill="#8884d8"
              dataKey="count"
              animationDuration={1200}
              animationBegin={0}
            >
              {chartDataWithPercentage.map((_entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={`url(#gradient-${index})`}
                  className="pie-slice-hover"
                  style={{
                    filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2))',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  }}
                />
              ))}
              <text>
                <CenterLabel totalDeals={totalDeals} totalValue={totalValue} />
              </text>
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend
              verticalAlign="bottom"
              height={36}
              iconType="circle"
              formatter={(value) => (
                <span className="text-sm text-foreground">{value}</span>
              )}
              wrapperStyle={{
                paddingTop: '20px',
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Summary Stats */}
      <motion.div
        className="mt-4 pt-4 border-t border-border"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <div className="grid grid-cols-2 gap-4">
          <motion.div
            className="text-center"
            whileHover={{ scale: 1.05 }}
            transition={{ duration: 0.2 }}
          >
            <div className="text-2xl font-bold text-foreground">
              <AnimatedNumber value={totalDeals} format="number" />
            </div>
            <div className="text-xs text-muted-foreground">Total Deals</div>
          </motion.div>
          <motion.div
            className="text-center"
            whileHover={{ scale: 1.05 }}
            transition={{ duration: 0.2 }}
          >
            <div className="text-2xl font-bold text-[#A8DADC]">
              {formatAbbreviatedNumber(totalValue, true)}
            </div>
            <div className="text-xs text-muted-foreground">Total Value</div>
            <div className="text-xs text-muted-foreground/70 mt-1">
              {formatCurrency(totalValue)}
            </div>
          </motion.div>
        </div>
      </motion.div>

      {/* Stage Breakdown */}
      <motion.div
        className="mt-4 pt-4 border-t border-border"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
      >
        <div className="grid grid-cols-2 gap-2 text-xs">
          {chartDataWithPercentage.map((item, index) => (
            <motion.div
              key={item.stage}
              className="flex items-center justify-between"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: 0.5 + index * 0.05 }}
              whileHover={{ scale: 1.02, x: 4 }}
            >
              <div className="flex items-center gap-2">
                <motion.div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: STAGE_COLORS[item.stage] }}
                  whileHover={{ scale: 1.3 }}
                  transition={{ duration: 0.2 }}
                />
                <span className="text-muted-foreground">{item.stage}</span>
              </div>
              <span className="font-medium text-foreground">{item.count}</span>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}

