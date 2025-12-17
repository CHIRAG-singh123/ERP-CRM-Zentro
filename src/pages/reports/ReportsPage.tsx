import { useState } from 'react';
import { Download, Loader2, TrendingUp, Users, Target, Clock, Briefcase, Building2, UserCheck } from 'lucide-react';
import { useKPIs, useLeadConversionAnalytics, useCrossEntityAnalytics } from '../../hooks/queries/useReports';
import { PageHeader } from '../../components/common/PageHeader';
import { ConversionFunnelChart } from '../../components/reports/ConversionFunnelChart';
import { ConversionBySourceChart } from '../../components/reports/ConversionBySourceChart';
import { DealPipelineChart } from '../../components/reports/DealPipelineChart';
import { CompanyDealPerformanceChart } from '../../components/reports/CompanyDealPerformanceChart';
import { ContactDealPerformanceChart } from '../../components/reports/ContactDealPerformanceChart';
import { LeadToDealFlowChart } from '../../components/reports/LeadToDealFlowChart';
import { DealValueDistributionChart } from '../../components/reports/DealValueDistributionChart';
import { CompanyMetricsOverview } from '../../components/reports/CompanyMetricsOverview';
import { AnimatedNumber } from '../../components/common/AnimatedNumber';
import { DealsByStagePieChart } from '../../components/dashboard/DealsByStagePieChart';
import type { ChartFilterValues } from '../../components/common/ChartFilterDropdown';

export function ReportsPage() {
  const [, setFilters] = useState<ChartFilterValues>({});
  const { data: kpisData, isLoading: isLoadingKPIs } = useKPIs();
  const { data: conversionData, isLoading: isLoadingConversion } = useLeadConversionAnalytics();
  const { data: crossEntityData, isLoading: isLoadingCrossEntity } = useCrossEntityAnalytics();

  const isLoading = isLoadingKPIs || isLoadingConversion || isLoadingCrossEntity;

  const handleFilterChange = (newFilters: ChartFilterValues) => {
    setFilters(newFilters);
  };

  const handleExport = () => {
    // TODO: Implement export functionality
    console.log('Export reports');
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <PageHeader
        title="Reports & Dashboards"
        description="Composable analytics powered by Mongo aggregations. Track lead conversion rates and sales performance."
        actions={
          <>
            <button
              onClick={handleExport}
              className="flex items-center gap-2 rounded-full bg-[#B39CD0] px-4 py-2 text-sm font-medium text-[#1A1A1C] transition-all duration-200 hover:bg-[#C3ADD9] hover:scale-105 active:scale-95"
            >
              <Download className="h-4 w-4" />
              Export
            </button>
          </>
        }
      />

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-[#A8DADC]" />
            <div className="text-white/60 animate-pulse">Loading reports...</div>
          </div>
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 animate-fade-in">
            <div className="rounded-xl border border-white/10 bg-[#1A1A1C]/70 p-6 transition-all duration-200 hover:border-[#A8DADC]/50 hover:shadow-lg hover:scale-105">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.32em] text-white/50 mb-1">Total Leads</p>
                  <p className="text-2xl font-bold text-white">
                    <AnimatedNumber 
                      value={conversionData?.totalLeads || (kpisData && typeof kpisData === 'object' && kpisData !== null && 'leadsBySource' in kpisData && Array.isArray(kpisData.leadsBySource) ? kpisData.leadsBySource.reduce((sum: number, item: any) => sum + item.count, 0) : 0) || 0} 
                      format="number" 
                      decimals={0} 
                    />
                  </p>
                </div>
                <div className="rounded-full bg-[#A8DADC]/20 p-3">
                  <Users className="h-6 w-6 text-[#A8DADC]" />
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-[#1A1A1C]/70 p-6 transition-all duration-200 hover:border-[#A8DADC]/50 hover:shadow-lg hover:scale-105">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.32em] text-white/50 mb-1">Conversion Rate</p>
                  <p className="text-2xl font-bold text-[#A8DADC]">
                    <AnimatedNumber 
                      value={conversionData?.overallConversionRate || (kpisData && typeof kpisData === 'object' && kpisData !== null && 'conversionRate' in kpisData && typeof kpisData.conversionRate === 'number' ? kpisData.conversionRate : 0)} 
                      format="percentage" 
                      decimals={1} 
                      suffix="%"
                    />
                  </p>
                </div>
                <div className="rounded-full bg-[#B39CD0]/20 p-3">
                  <Target className="h-6 w-6 text-[#B39CD0]" />
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-[#1A1A1C]/70 p-6 transition-all duration-200 hover:border-[#A8DADC]/50 hover:shadow-lg hover:scale-105">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.32em] text-white/50 mb-1">Total Deals</p>
                  <p className="text-2xl font-bold text-white">
                    <AnimatedNumber 
                      value={crossEntityData?.dealByStage.reduce((sum, item) => sum + item.count, 0) || (kpisData && typeof kpisData === 'object' && kpisData !== null && 'openDeals' in kpisData && typeof kpisData.openDeals === 'object' && kpisData.openDeals && 'count' in kpisData.openDeals ? kpisData.openDeals.count as number : 0) || 0} 
                      format="number" 
                      decimals={0} 
                    />
                  </p>
                </div>
                <div className="rounded-full bg-[#A8DADC]/20 p-3">
                  <Briefcase className="h-6 w-6 text-[#A8DADC]" />
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-[#1A1A1C]/70 p-6 transition-all duration-200 hover:border-[#A8DADC]/50 hover:shadow-lg hover:scale-105">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.32em] text-white/50 mb-1">Avg. Time to Convert</p>
                  <p className="text-2xl font-bold text-white">
                    <AnimatedNumber 
                      value={conversionData?.avgTimeToConversion || 0} 
                      format="number" 
                      decimals={0} 
                    />
                    <span className="text-sm text-white/60"> days</span>
                  </p>
                </div>
                <div className="rounded-full bg-[#B39CD0]/20 p-3">
                  <Clock className="h-6 w-6 text-[#B39CD0]" />
                </div>
              </div>
            </div>
          </section>

          {/* Main Charts Section */}
          <section className="space-y-6 animate-fade-in animation-delay-100">
            {/* Top Row: Two Equal Charts */}
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Lead Conversion Funnel */}
              <div className="group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#1A1A1C]/90 to-[#1A1A1C]/70 p-6 transition-all duration-300 hover:border-[#A8DADC]/30 hover:shadow-2xl hover:shadow-[#A8DADC]/10">
                <div className="absolute inset-0 bg-gradient-to-br from-[#A8DADC]/5 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"></div>
                <div className="relative">
                  <div className="mb-6 flex items-start justify-between">
                    <div>
                      <h3 className="text-xl font-bold text-white mb-1">Lead Conversion Funnel</h3>
                      <p className="text-sm text-white/50">Visual progression through lead stages</p>
                    </div>
                  </div>
                  <div className="h-[400px] w-full">
                    {conversionData ? (
                      <ConversionFunnelChart data={conversionData.funnel} />
                    ) : (
                      <div className="flex items-center justify-center h-full text-white/50">
                        <p>No funnel data available</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Deals by Stage Pie Chart */}
              <div className="group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#1A1A1C]/90 to-[#1A1A1C]/70 p-6 transition-all duration-300 hover:border-[#B39CD0]/30 hover:shadow-2xl hover:shadow-[#B39CD0]/10">
                <div className="absolute inset-0 bg-gradient-to-br from-[#B39CD0]/5 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"></div>
                <div className="relative flex flex-col" style={{ minHeight: '600px' }}>
                  <div className="mb-4 flex items-start justify-between">
                    <div>
                      <h3 className="text-xl font-bold text-white mb-1">Deals by Stage</h3>
                      <p className="text-sm text-white/50">Deal distribution across pipeline stages</p>
                    </div>
                  </div>
                  <div style={{ height: '420px', width: '100%' }}>
                    {isLoading ? (
                      <div className="flex items-center justify-center h-full">
                        <div className="flex flex-col items-center gap-3">
                          <Loader2 className="h-8 w-8 animate-spin text-[#A8DADC]" />
                          <div className="text-white/60 animate-pulse">Loading chart...</div>
                        </div>
                      </div>
                    ) : (crossEntityData?.dealByStage && crossEntityData.dealByStage.length > 0) ? (
                      <DealsByStagePieChart 
                        data={crossEntityData.dealByStage.map(item => ({
                          stage: item.stage,
                          count: item.count,
                          totalValue: item.totalValue
                        }))} 
                        onFilterChange={handleFilterChange}
                      />
                    ) : (kpisData && typeof kpisData === 'object' && kpisData !== null && 'dealsByStage' in kpisData && Array.isArray(kpisData.dealsByStage) && kpisData.dealsByStage.length > 0) ? (
                      <DealsByStagePieChart 
                        data={(kpisData as any).dealsByStage} 
                        onFilterChange={handleFilterChange}
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full text-white/50">
                        <p>No deals data available</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Row: Full Width Chart */}
            {conversionData && conversionData.conversionBySource.length > 0 && (
              <div className="group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#1A1A1C]/90 to-[#1A1A1C]/70 p-6 transition-all duration-300 hover:border-[#A8DADC]/30 hover:shadow-2xl hover:shadow-[#A8DADC]/10 animate-fade-in animation-delay-200">
                <div className="absolute inset-0 bg-gradient-to-br from-[#A8DADC]/5 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"></div>
                <div className="relative">
                  <div className="mb-6 flex items-start justify-between">
                    <div>
                      <h3 className="text-xl font-bold text-white mb-1">Conversion Rate by Source</h3>
                      <p className="text-sm text-white/50">Compare conversion performance across lead sources</p>
                    </div>
                  </div>
                  <div className="h-[400px] w-full">
                    <ConversionBySourceChart data={conversionData.conversionBySource} />
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* Deal Analytics Section */}
          {crossEntityData && crossEntityData.dealByStage.length > 0 && (
            <section className="space-y-6 animate-fade-in animation-delay-200">
              <div className="flex items-center gap-3">
                <Briefcase className="h-6 w-6 text-[#A8DADC]" />
                <h2 className="text-2xl font-bold text-white">Deal Analytics</h2>
              </div>
              
              <div className="grid gap-6 lg:grid-cols-2">
                <div className="group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#1A1A1C]/90 to-[#1A1A1C]/70 p-6 transition-all duration-300 hover:border-[#A8DADC]/30 hover:shadow-2xl hover:shadow-[#A8DADC]/10">
                  <div className="absolute inset-0 bg-gradient-to-br from-[#A8DADC]/5 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"></div>
                  <div className="relative">
                    <div className="mb-6 flex items-start justify-between">
                      <div>
                        <h3 className="text-xl font-bold text-white mb-1">Deal Pipeline</h3>
                        <p className="text-sm text-white/50">Deals by stage with value metrics</p>
                      </div>
                    </div>
                    <div className="h-[400px] w-full">
                      <DealPipelineChart data={crossEntityData.dealByStage} />
                    </div>
                  </div>
                </div>

                <div className="group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#1A1A1C]/90 to-[#1A1A1C]/70 p-6 transition-all duration-300 hover:border-[#B39CD0]/30 hover:shadow-2xl hover:shadow-[#B39CD0]/10">
                  <div className="absolute inset-0 bg-gradient-to-br from-[#B39CD0]/5 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"></div>
                  <div className="relative">
                    <div className="mb-6 flex items-start justify-between">
                      <div>
                        <h3 className="text-xl font-bold text-white mb-1">Deal Value Distribution</h3>
                        <p className="text-sm text-white/50">Company size vs deal value relationship</p>
                      </div>
                    </div>
                    <div className="h-[400px] w-full">
                      <DealValueDistributionChart data={crossEntityData.dealValueDistribution} />
                    </div>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Company Analytics Section */}
          {crossEntityData && crossEntityData.companyDealMetrics.length > 0 && (
            <section className="space-y-6 animate-fade-in animation-delay-300">
              <div className="flex items-center gap-3">
                <Building2 className="h-6 w-6 text-[#B39CD0]" />
                <h2 className="text-2xl font-bold text-white">Company Analytics</h2>
              </div>

              <div className="group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#1A1A1C]/90 to-[#1A1A1C]/70 p-6 transition-all duration-300 hover:border-[#B39CD0]/30 hover:shadow-2xl hover:shadow-[#B39CD0]/10">
                <div className="absolute inset-0 bg-gradient-to-br from-[#B39CD0]/5 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"></div>
                <div className="relative">
                  <div className="mb-6 flex items-start justify-between">
                    <div>
                      <h3 className="text-xl font-bold text-white mb-1">Top Companies by Deal Performance</h3>
                      <p className="text-sm text-white/50">Companies ranked by total deal value</p>
                    </div>
                  </div>
                  <div className="h-[400px] w-full">
                    <CompanyDealPerformanceChart data={crossEntityData.companyDealMetrics} />
                  </div>
                </div>
              </div>

              {crossEntityData.companyContactDealFlow.length > 0 && (
                <div className="mt-6">
                  <CompanyMetricsOverview data={crossEntityData.companyContactDealFlow} />
                </div>
              )}
            </section>
          )}

          {/* Contact Analytics Section */}
          {crossEntityData && crossEntityData.contactDealMetrics.length > 0 && (
            <section className="space-y-6 animate-fade-in animation-delay-400">
              <div className="flex items-center gap-3">
                <UserCheck className="h-6 w-6 text-[#A8DADC]" />
                <h2 className="text-2xl font-bold text-white">Contact Analytics</h2>
              </div>

              <div className="group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#1A1A1C]/90 to-[#1A1A1C]/70 p-6 transition-all duration-300 hover:border-[#A8DADC]/30 hover:shadow-2xl hover:shadow-[#A8DADC]/10">
                <div className="absolute inset-0 bg-gradient-to-br from-[#A8DADC]/5 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"></div>
                <div className="relative">
                  <div className="mb-6 flex items-start justify-between">
                    <div>
                      <h3 className="text-xl font-bold text-white mb-1">Top Contacts by Deal Performance</h3>
                      <p className="text-sm text-white/50">Contacts ranked by total deal value</p>
                    </div>
                  </div>
                  <div className="h-[400px] w-full">
                    <ContactDealPerformanceChart data={crossEntityData.contactDealMetrics} />
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Cross-Entity Analytics Section */}
          {crossEntityData && crossEntityData.leadToDealFlow.length > 0 && (
            <section className="space-y-6 animate-fade-in animation-delay-500">
              <div className="flex items-center gap-3">
                <TrendingUp className="h-6 w-6 text-[#B39CD0]" />
                <h2 className="text-2xl font-bold text-white">Cross-Entity Flow Analysis</h2>
              </div>

              <div className="group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#1A1A1C]/90 to-[#1A1A1C]/70 p-6 transition-all duration-300 hover:border-[#B39CD0]/30 hover:shadow-2xl hover:shadow-[#B39CD0]/10">
                <div className="absolute inset-0 bg-gradient-to-br from-[#B39CD0]/5 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"></div>
                <div className="relative">
                  <div className="mb-6 flex items-start justify-between">
                    <div>
                      <h3 className="text-xl font-bold text-white mb-1">Lead to Deal Conversion Flow</h3>
                      <p className="text-sm text-white/50">Track leads from source through conversion to deals</p>
                    </div>
                  </div>
                  <div className="h-[400px] w-full">
                    <LeadToDealFlowChart data={crossEntityData.leadToDealFlow} />
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Additional Stats */}
          {conversionData && (
            <section className="grid gap-4 sm:grid-cols-3 animate-fade-in animation-delay-600">
              <div className="rounded-xl border border-white/10 bg-[#1A1A1C]/70 p-4">
                <p className="text-xs uppercase tracking-[0.32em] text-white/50 mb-2">Converted Leads</p>
                <p className="text-xl font-bold text-[#A8DADC]">
                  <AnimatedNumber value={conversionData.convertedLeads} format="number" decimals={0} />
                </p>
                <p className="text-xs text-white/60 mt-1">
                  {conversionData.totalLeads > 0 ? (
                    <>
                      <AnimatedNumber 
                        value={(conversionData.convertedLeads / conversionData.totalLeads) * 100} 
                        format="percentage" 
                        decimals={1} 
                      /> of total
                    </>
                  ) : (
                    'No leads'
                  )}
                </p>
              </div>
              <div className="rounded-xl border border-white/10 bg-[#1A1A1C]/70 p-4">
                <p className="text-xs uppercase tracking-[0.32em] text-white/50 mb-2">Open Deals Value</p>
                <p className="text-xl font-bold text-white">
                  <AnimatedNumber 
                    value={(kpisData && typeof kpisData === 'object' && kpisData !== null && 'openDeals' in kpisData && typeof kpisData.openDeals === 'object' && kpisData.openDeals && 'totalValue' in kpisData.openDeals ? kpisData.openDeals.totalValue as number : undefined) || crossEntityData?.dealByStage.reduce((sum, item) => sum + item.totalValue, 0) || 0} 
                    format="currency" 
                  />
                </p>
                <p className="text-xs text-white/60 mt-1">
                  <AnimatedNumber 
                    value={(kpisData && typeof kpisData === 'object' && kpisData !== null && 'openDeals' in kpisData && typeof kpisData.openDeals === 'object' && kpisData.openDeals && 'count' in kpisData.openDeals ? kpisData.openDeals.count as number : undefined) || crossEntityData?.dealByStage.reduce((sum, item) => sum + item.count, 0) || 0} 
                    format="number" 
                    decimals={0} 
                  /> active deals
                </p>
              </div>
              <div className="rounded-xl border border-white/10 bg-[#1A1A1C]/70 p-4">
                <p className="text-xs uppercase tracking-[0.32em] text-white/50 mb-2">Best Source</p>
                {conversionData.conversionBySource.length > 0 ? (
                  <>
                    <p className="text-xl font-bold text-[#B39CD0] capitalize">
                      {conversionData.conversionBySource.reduce((best, current) =>
                        current.rate > best.rate ? current : best
                      ).source}
                    </p>
                    <p className="text-xs text-white/60 mt-1">
                      <AnimatedNumber
                        value={conversionData.conversionBySource.reduce((best, current) =>
                          current.rate > best.rate ? current : best
                        ).rate}
                        format="percentage"
                        decimals={1}
                      /> conversion rate
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-white/60">No data available</p>
                )}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
