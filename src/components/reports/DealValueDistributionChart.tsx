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
      <div className="rounded-lg border border-white/20 bg-[#1A1A1C]/95 backdrop-blur-sm p-4 shadow-2xl">
        <p className="text-sm font-bold text-white mb-2 pb-2 border-b border-white/10">{data.companyName}</p>
        <p className="text-xs text-white/60 mb-2 font-medium">Industry: <span className="text-white/80">{data.industry}</span></p>
        <div className="space-y-1.5">
          <p className="text-xs text-white/70">
            Contacts: <span className="text-[#A8DADC] font-bold text-sm ml-1"><AnimatedNumber value={data.contactCount} format="number" decimals={0} /></span>
          </p>
          <p className="text-xs text-white/70">
            Deals: <span className="text-[#B39CD0] font-bold text-sm ml-1"><AnimatedNumber value={data.dealCount} format="number" decimals={0} /></span>
          </p>
          <p className="text-xs text-white/70">
            Total Value: <span className="text-[#A8DADC] font-bold text-sm ml-1"><AnimatedNumber value={data.totalValue} format="currency" /></span>
          </p>
        </div>
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
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#A8DADC', strokeWidth: 2, strokeDasharray: '3 3' }} />
            <Scatter dataKey="y" fill="#A8DADC" animationDuration={1000} animationBegin={0}>
              {chartData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={getIndustryColor(entry.industry)}
                  style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }}
                />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-4 pt-4 border-t border-white/10">
        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-xs">
          {Object.entries(industryColors).map(([industry, color]) => (
            <div 
              key={industry} 
              className="group flex items-center gap-2 px-3 py-2 rounded-lg bg-gradient-to-r from-white/5 to-white/5 hover:from-white/10 hover:to-white/10 border border-white/10 hover:border-[#A8DADC]/30 transition-all duration-200 cursor-pointer"
            >
              <div 
                className="h-3.5 w-3.5 rounded-full shadow-md group-hover:scale-110 transition-transform" 
                style={{ backgroundColor: color }}
              ></div>
              <span className="text-white/70 group-hover:text-white transition-colors font-medium">{industry}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

