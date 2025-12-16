import { Building2, Users, TrendingUp, Target } from 'lucide-react';
import type { CompanyContactDealFlow } from '../../services/api/reports';
import { AnimatedNumber } from '../common/AnimatedNumber';

interface CompanyMetricsOverviewProps {
  data: CompanyContactDealFlow[];
}

export function CompanyMetricsOverview({ data }: CompanyMetricsOverviewProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-white/50">
        <p>No company metrics data available</p>
      </div>
    );
  }

  // Top companies by different metrics
  const topByDeals = [...data].sort((a, b) => b.dealCount - a.dealCount).slice(0, 5);
  const topByValue = [...data].sort((a, b) => b.totalDealValue - a.totalDealValue).slice(0, 5);
  const topByContacts = [...data].sort((a, b) => b.contactCount - a.contactCount).slice(0, 5);
  const topByLeads = [...data].sort((a, b) => b.leadCount - a.leadCount).slice(0, 5);

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
      {/* Top by Deals */}
      <div className="rounded-xl border border-white/10 bg-[#1A1A1C]/70 p-4 transition-all duration-200 hover:border-[#A8DADC]/50 hover:shadow-lg">
        <div className="flex items-center gap-3 mb-4">
          <div className="rounded-full bg-[#A8DADC]/20 p-2">
            <Target className="h-5 w-5 text-[#A8DADC]" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.32em] text-white/50">Top by Deals</p>
          </div>
        </div>
        <div className="space-y-2">
          {topByDeals.map((company, index) => (
            <div key={company.companyId} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className="text-white/50 font-medium">{index + 1}.</span>
                <span className="text-white/80 truncate">{company.companyName}</span>
              </div>
              <span className="text-[#A8DADC] font-semibold">
                <AnimatedNumber value={company.dealCount} format="number" decimals={0} />
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Top by Value */}
      <div className="rounded-xl border border-white/10 bg-[#1A1A1C]/70 p-4 transition-all duration-200 hover:border-[#B39CD0]/50 hover:shadow-lg">
        <div className="flex items-center gap-3 mb-4">
          <div className="rounded-full bg-[#B39CD0]/20 p-2">
            <TrendingUp className="h-5 w-5 text-[#B39CD0]" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.32em] text-white/50">Top by Value</p>
          </div>
        </div>
        <div className="space-y-2">
          {topByValue.map((company, index) => (
            <div key={company.companyId} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className="text-white/50 font-medium">{index + 1}.</span>
                <span className="text-white/80 truncate">{company.companyName}</span>
              </div>
              <span className="text-[#B39CD0] font-semibold text-xs">
                <AnimatedNumber value={company.totalDealValue} format="currency" />
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Top by Contacts */}
      <div className="rounded-xl border border-white/10 bg-[#1A1A1C]/70 p-4 transition-all duration-200 hover:border-[#A8DADC]/50 hover:shadow-lg">
        <div className="flex items-center gap-3 mb-4">
          <div className="rounded-full bg-[#A8DADC]/20 p-2">
            <Users className="h-5 w-5 text-[#A8DADC]" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.32em] text-white/50">Top by Contacts</p>
          </div>
        </div>
        <div className="space-y-2">
          {topByContacts.map((company, index) => (
            <div key={company.companyId} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className="text-white/50 font-medium">{index + 1}.</span>
                <span className="text-white/80 truncate">{company.companyName}</span>
              </div>
              <span className="text-[#A8DADC] font-semibold">
                <AnimatedNumber value={company.contactCount} format="number" decimals={0} />
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Top by Leads */}
      <div className="rounded-xl border border-white/10 bg-[#1A1A1C]/70 p-4 transition-all duration-200 hover:border-[#B39CD0]/50 hover:shadow-lg">
        <div className="flex items-center gap-3 mb-4">
          <div className="rounded-full bg-[#B39CD0]/20 p-2">
            <Building2 className="h-5 w-5 text-[#B39CD0]" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.32em] text-white/50">Top by Leads</p>
          </div>
        </div>
        <div className="space-y-2">
          {topByLeads.map((company, index) => (
            <div key={company.companyId} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className="text-white/50 font-medium">{index + 1}.</span>
                <span className="text-white/80 truncate">{company.companyName}</span>
              </div>
              <span className="text-[#B39CD0] font-semibold">
                <AnimatedNumber value={company.leadCount} format="number" decimals={0} />
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

