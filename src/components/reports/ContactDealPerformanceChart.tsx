import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import type { ContactDealMetrics } from '../../services/api/reports';
import { formatCurrency } from '../../utils/formatting';
import { AnimatedNumber } from '../common/AnimatedNumber';

interface ContactDealPerformanceChartProps {
  data: ContactDealMetrics[];
}

const getContactColor = (index: number): string => {
  const colors = ['#A8DADC', '#B39CD0', '#10B981', '#F59E0B', '#EF4444', '#06B6D4', '#EC4899'];
  return colors[index % colors.length];
};

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="rounded-lg border border-white/20 bg-[#1A1A1C] p-3 shadow-lg">
        <p className="text-sm font-medium text-white mb-2">{data.contactName}</p>
        {data.companyName && (
          <p className="text-xs text-white/50 mb-2">Company: {data.companyName}</p>
        )}
        <p className="text-xs text-white/70">
          Deals: <span className="text-[#A8DADC] font-semibold"><AnimatedNumber value={data.dealCount} format="number" decimals={0} /></span>
        </p>
        <p className="text-xs text-white/70">
          Total Value: <span className="text-[#B39CD0] font-semibold"><AnimatedNumber value={data.totalValue} format="currency" /></span>
        </p>
        <p className="text-xs text-white/70">
          Avg Value: <span className="text-[#A8DADC] font-semibold"><AnimatedNumber value={data.avgValue} format="currency" /></span>
        </p>
      </div>
    );
  }
  return null;
};

export function ContactDealPerformanceChart({ data }: ContactDealPerformanceChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-white/50">
        <p>No contact deal performance data available</p>
      </div>
    );
  }

  // Limit to top 10 for better visualization
  const chartData = data.slice(0, 10);

  return (
    <div className="h-full w-full flex flex-col">
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
            <XAxis
              dataKey="contactName"
              stroke="#ffffff40"
              style={{ fontSize: '11px' }}
              tick={{ fill: '#ffffff60' }}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis
              stroke="#ffffff40"
              style={{ fontSize: '11px' }}
              tick={{ fill: '#ffffff60' }}
              tickFormatter={(value) => formatCurrency(value)}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(168, 218, 220, 0.1)' }} />
            <Bar dataKey="totalValue" radius={[8, 8, 0, 0]} animationDuration={800}>
              {chartData.map((_, index) => (
                <Cell key={`cell-${index}`} fill={getContactColor(index)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

