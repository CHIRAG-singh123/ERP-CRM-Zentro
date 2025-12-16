import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ZAxis } from 'recharts';
import type { DealValueDistribution } from '../../services/api/reports';
import { formatCurrency } from '../../utils/formatting';
import { AnimatedNumber } from '../common/AnimatedNumber';

interface DealValueDistributionChartProps {
  data: DealValueDistribution[];
}

const industryColors: Record<string, string> = {
  'Technology': '#3B82F6',
  'Healthcare': '#10B981',
  'Finance': '#F59E0B',
  'Retail': '#EC4899',
  'Manufacturing': '#8B5CF6',
  'Education': '#06B6D4',
  'Other': '#6B7280',
};

const getIndustryColor = (industry: string): string => {
  return industryColors[industry] || industryColors['Other'];
};

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="rounded-lg border border-white/20 bg-[#1A1A1C] p-3 shadow-lg">
        <p className="text-sm font-medium text-white mb-2">{data.companyName}</p>
        <p className="text-xs text-white/50 mb-2">Industry: {data.industry}</p>
        <p className="text-xs text-white/70">
          Contacts: <span className="text-[#A8DADC] font-semibold"><AnimatedNumber value={data.contactCount} format="number" decimals={0} /></span>
        </p>
        <p className="text-xs text-white/70">
          Deals: <span className="text-[#B39CD0] font-semibold"><AnimatedNumber value={data.dealCount} format="number" decimals={0} /></span>
        </p>
        <p className="text-xs text-white/70 mt-1">
          Total Value: <span className="text-[#A8DADC] font-semibold"><AnimatedNumber value={data.totalValue} format="currency" /></span>
        </p>
      </div>
    );
  }
  return null;
};

export function DealValueDistributionChart({ data }: DealValueDistributionChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-white/50">
        <p>No deal value distribution data available</p>
      </div>
    );
  }

  const chartData = data.map((item) => ({
    x: item.contactCount,
    y: item.totalValue,
    z: item.dealCount,
    ...item,
  }));

  return (
    <div className="h-full w-full flex flex-col">
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart
            data={chartData}
            margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
            <XAxis
              type="number"
              dataKey="x"
              name="Contact Count"
              stroke="#ffffff40"
              style={{ fontSize: '11px' }}
              tick={{ fill: '#ffffff60' }}
              label={{ value: 'Contact Count', position: 'insideBottom', offset: -5, style: { textAnchor: 'middle', fill: '#ffffff70' } }}
            />
            <YAxis
              type="number"
              dataKey="y"
              name="Total Value"
              stroke="#ffffff40"
              style={{ fontSize: '11px' }}
              tick={{ fill: '#ffffff60' }}
              tickFormatter={(value) => formatCurrency(value)}
              label={{ value: 'Total Deal Value', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fill: '#ffffff70' } }}
            />
            <ZAxis
              type="number"
              dataKey="z"
              range={[50, 400]}
              name="Deal Count"
            />
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#A8DADC', strokeWidth: 1 }} />
            <Scatter dataKey="y" fill="#A8DADC" animationDuration={800}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getIndustryColor(entry.industry)} />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-4 pt-4 border-t border-white/10">
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs">
          {Object.entries(industryColors).map(([industry, color]) => (
            <div key={industry} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5">
              <div className="h-3 w-3 rounded-full" style={{ backgroundColor: color }}></div>
              <span className="text-white/70">{industry}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

