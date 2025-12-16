import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import type { DealByStage } from '../../services/api/reports';
import { formatCurrency } from '../../utils/formatting';
import { AnimatedNumber } from '../common/AnimatedNumber';

interface DealPipelineChartProps {
  data: DealByStage[];
}

const getStageColor = (stage: string): string => {
  const colors: Record<string, string> = {
    'Prospecting': '#3B82F6',
    'Qualification': '#8B5CF6',
    'Proposal': '#F59E0B',
    'Negotiation': '#10B981',
    'Closed Won': '#10B981',
    'Closed Lost': '#EF4444',
  };
  return colors[stage] || '#6B7280';
};

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="rounded-lg border border-white/20 bg-[#1A1A1C] p-3 shadow-lg">
        <p className="text-sm font-medium text-white mb-2">{data.stage}</p>
        <p className="text-xs text-white/70">
          Count: <span className="text-[#A8DADC] font-semibold"><AnimatedNumber value={data.count} format="number" decimals={0} /></span>
        </p>
        <p className="text-xs text-white/70">
          Total Value: <span className="text-[#B39CD0] font-semibold"><AnimatedNumber value={data.totalValue} format="currency" /></span>
        </p>
        <p className="text-xs text-white/70">
          Avg Value: <span className="text-[#A8DADC] font-semibold"><AnimatedNumber value={data.avgValue} format="currency" /></span>
        </p>
        <p className="text-xs text-white/70 mt-1">
          Weighted Value: <span className="text-[#B39CD0] font-semibold"><AnimatedNumber value={data.weightedValue} format="currency" /></span>
        </p>
      </div>
    );
  }
  return null;
};

export function DealPipelineChart({ data }: DealPipelineChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-white/50">
        <p>No deal pipeline data available</p>
      </div>
    );
  }

  const totalDeals = data.reduce((sum, item) => sum + item.count, 0);
  const totalValue = data.reduce((sum, item) => sum + item.totalValue, 0);
  const totalWeightedValue = data.reduce((sum, item) => sum + item.weightedValue, 0);

  return (
    <div className="h-full w-full flex flex-col">
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 10, right: 30, left: 20, bottom: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
            <XAxis 
              type="number" 
              stroke="#ffffff40" 
              style={{ fontSize: '11px' }}
              tick={{ fill: '#ffffff60' }}
              tickFormatter={(value) => formatCurrency(value)}
            />
            <YAxis 
              dataKey="stage" 
              type="category" 
              stroke="#ffffff40" 
              style={{ fontSize: '12px', fontWeight: 500 }} 
              width={100}
              tick={{ fill: '#ffffff80' }}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(168, 218, 220, 0.1)' }} />
            <Bar dataKey="totalValue" radius={[0, 6, 6, 0]} animationDuration={800}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getStageColor(entry.stage)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      
      <div className="mt-6 pt-6 border-t border-white/10">
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="text-center">
            <p className="text-xs text-white/50 mb-1">Total Deals</p>
            <p className="text-lg font-bold text-white">
              <AnimatedNumber value={totalDeals} format="number" decimals={0} />
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-white/50 mb-1">Total Value</p>
            <p className="text-lg font-bold text-[#A8DADC]">
              <AnimatedNumber value={totalValue} format="currency" />
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-white/50 mb-1">Weighted Pipeline</p>
            <p className="text-lg font-bold text-[#B39CD0]">
              <AnimatedNumber value={totalWeightedValue} format="currency" />
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
          {data.map((entry, index) => (
            <div key={index} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
              <div 
                className="h-3 w-3 rounded-full shadow-sm" 
                style={{ backgroundColor: getStageColor(entry.stage) }}
              ></div>
              <span className="text-white/70 font-medium text-xs">{entry.stage}:</span>
              <span className="text-white font-semibold text-xs"><AnimatedNumber value={entry.count} format="number" decimals={0} /></span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

