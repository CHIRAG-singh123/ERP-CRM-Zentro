import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend } from 'recharts';
import type { LeadToDealFlow } from '../../services/api/reports';
import { AnimatedNumber } from '../common/AnimatedNumber';

interface LeadToDealFlowChartProps {
  data: LeadToDealFlow[];
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

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="rounded-lg border border-white/20 bg-[#1A1A1C]/95 backdrop-blur-sm p-4 shadow-2xl">
        <p className="text-sm font-bold text-white mb-2 pb-2 border-b border-white/10 capitalize">{data.source}</p>
        <div className="space-y-1.5">
          <p className="text-xs text-white/70">
            Leads: <span className="text-[#A8DADC] font-bold text-sm ml-1"><AnimatedNumber value={data.leads} format="number" decimals={0} /></span>
          </p>
          <p className="text-xs text-white/70">
            Converted: <span className="text-[#B39CD0] font-bold text-sm ml-1"><AnimatedNumber value={data.converted} format="number" decimals={0} /></span>
          </p>
          <p className="text-xs text-white/70">
            Deals: <span className="text-[#A8DADC] font-bold text-sm ml-1"><AnimatedNumber value={data.deals} format="number" decimals={0} /></span>
          </p>
          <p className="text-xs text-white/70">
            Total Value: <span className="text-[#B39CD0] font-bold text-sm ml-1"><AnimatedNumber value={data.totalValue} format="currency" /></span>
          </p>
          {data.leads > 0 && (
            <p className="text-xs text-white/60 mt-1.5 pt-1.5 border-t border-white/10">
              Conversion: <span className="text-[#A8DADC] font-bold"><AnimatedNumber value={(data.converted / data.leads) * 100} format="percentage" decimals={1} /></span>
            </p>
          )}
        </div>
      </div>
    );
  }
  return null;
};

export function LeadToDealFlowChart({ data }: LeadToDealFlowChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-white/50">
        <p>No lead-to-deal flow data available</p>
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col">
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
          >
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
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(168, 218, 220, 0.15)', stroke: '#A8DADC', strokeWidth: 1 }} />
            <Legend 
              wrapperStyle={{ paddingTop: '10px' }}
              iconType="circle"
              formatter={(value) => (
                <span className="text-xs text-white/80 font-medium">{value}</span>
              )}
            />
            <Bar dataKey="leads" name="Leads" radius={[8, 8, 0, 0]} animationDuration={1000} animationBegin={0}>
              {data.map((entry, index) => (
                <Cell 
                  key={`leads-${index}`} 
                  fill={getSourceColor(entry.source)} 
                  opacity={0.75}
                  className="hover:opacity-90 transition-opacity cursor-pointer"
                  style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))' }}
                />
              ))}
            </Bar>
            <Bar dataKey="converted" name="Converted" radius={[8, 8, 0, 0]} animationDuration={1000} animationBegin={100}>
              {data.map((entry, index) => (
                <Cell 
                  key={`converted-${index}`} 
                  fill={getSourceColor(entry.source)} 
                  opacity={0.9}
                  className="hover:opacity-95 transition-opacity cursor-pointer"
                  style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))' }}
                />
              ))}
            </Bar>
            <Bar dataKey="deals" name="Deals" radius={[8, 8, 0, 0]} animationDuration={1000} animationBegin={200}>
              {data.map((entry, index) => (
                <Cell 
                  key={`deals-${index}`} 
                  fill={getSourceColor(entry.source)}
                  className="hover:opacity-90 transition-opacity cursor-pointer"
                  style={{ filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.3))' }}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

