import { useState } from 'react';
import { Download, Loader2, TrendingUp, Users, Target, Clock, Briefcase, Building2, UserCheck } from 'lucide-react';
import { motion } from 'framer-motion';
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
    <motion.div
      className="space-y-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <PageHeader
          title="Reports & Dashboards"
          description="Composable analytics powered by Mongo aggregations. Track lead conversion rates and sales performance."
          actions={
            <>
              <motion.button
                onClick={handleExport}
                className="button-enhanced flex items-center gap-2 rounded-full bg-[#B39CD0] px-4 py-2 text-sm font-medium text-[#1A1A1C] glow-purple"
                whileHover={{ scale: 1.05, boxShadow: '0 10px 30px rgba(179, 156, 208, 0.3)' }}
                whileTap={{ scale: 0.95 }}
              >
                <motion.div
                  animate={{ rotate: [0, 360] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'linear', repeatDelay: 3 }}
                >
                  <Download className="h-4 w-4" />
                </motion.div>
                Export
              </motion.button>
            </>
          }
        />
      </motion.div>

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
          <motion.section
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
            initial="hidden"
            animate="visible"
            variants={{
              visible: {
                transition: {
                  staggerChildren: 0.1,
                },
              },
            }}
          >
            <motion.div
              className="card-gradient-hover rounded-xl border border-white/10 bg-[#1A1A1C]/70 p-6 transition-all duration-200 hover:border-[#A8DADC]/50 hover:shadow-lg glow-accent"
              variants={{
                hidden: { opacity: 0, y: 20, scale: 0.95 },
                visible: { opacity: 1, y: 0, scale: 1 },
              }}
              whileHover={{ scale: 1.05, y: -4 }}
              transition={{ duration: 0.3 }}
            >
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
                <motion.div
                  className="rounded-full bg-[#A8DADC]/20 p-3 icon-pulse-hover"
                  whileHover={{ scale: 1.15, rotate: 12 }}
                >
                  <Users className="h-6 w-6 text-[#A8DADC]" />
                </motion.div>
              </div>
            </motion.div>

            <motion.div
              className="card-gradient-hover rounded-xl border border-white/10 bg-[#1A1A1C]/70 p-6 transition-all duration-200 hover:border-[#A8DADC]/50 hover:shadow-lg glow-purple"
              variants={{
                hidden: { opacity: 0, y: 20, scale: 0.95 },
                visible: { opacity: 1, y: 0, scale: 1 },
              }}
              whileHover={{ scale: 1.05, y: -4 }}
              transition={{ duration: 0.3 }}
            >
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
                <motion.div
                  className="rounded-full bg-[#B39CD0]/20 p-3 icon-pulse-hover"
                  whileHover={{ scale: 1.15, rotate: 12 }}
                >
                  <Target className="h-6 w-6 text-[#B39CD0]" />
                </motion.div>
              </div>
            </motion.div>

            <motion.div
              className="card-gradient-hover rounded-xl border border-white/10 bg-[#1A1A1C]/70 p-6 transition-all duration-200 hover:border-[#A8DADC]/50 hover:shadow-lg glow-accent"
              variants={{
                hidden: { opacity: 0, y: 20, scale: 0.95 },
                visible: { opacity: 1, y: 0, scale: 1 },
              }}
              whileHover={{ scale: 1.05, y: -4 }}
              transition={{ duration: 0.3 }}
            >
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
                <motion.div
                  className="rounded-full bg-[#A8DADC]/20 p-3 icon-pulse-hover"
                  whileHover={{ scale: 1.15, rotate: 12 }}
                >
                  <Briefcase className="h-6 w-6 text-[#A8DADC]" />
                </motion.div>
              </div>
            </motion.div>

            <motion.div
              className="card-gradient-hover rounded-xl border border-white/10 bg-[#1A1A1C]/70 p-6 transition-all duration-200 hover:border-[#A8DADC]/50 hover:shadow-lg glow-purple"
              variants={{
                hidden: { opacity: 0, y: 20, scale: 0.95 },
                visible: { opacity: 1, y: 0, scale: 1 },
              }}
              whileHover={{ scale: 1.05, y: -4 }}
              transition={{ duration: 0.3 }}
            >
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
                <motion.div
                  className="rounded-full bg-[#B39CD0]/20 p-3 icon-pulse-hover"
                  whileHover={{ scale: 1.15, rotate: 12 }}
                >
                  <Clock className="h-6 w-6 text-[#B39CD0]" />
                </motion.div>
              </div>
            </motion.div>
          </motion.section>

          {/* Main Charts Section */}
          <motion.section
            className="space-y-6"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            {/* Top Row: Two Equal Charts */}
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Lead Conversion Funnel */}
              <motion.div
                className="group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#1A1A1C]/90 to-[#1A1A1C]/70 p-6 chart-container-enhanced"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                whileHover={{ y: -4, boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3), 0 0 30px rgba(168, 218, 220, 0.2)' }}
              >
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
                      <ConversionFunnelChart data={conversionData.funnel} onFilterChange={handleFilterChange} />
                    ) : (
                      <div className="flex items-center justify-center h-full text-white/50">
                        <p>No funnel data available</p>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>

              {/* Deals by Stage Pie Chart */}
              <motion.div
                className="group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#1A1A1C]/90 to-[#1A1A1C]/70 p-6 chart-container-enhanced"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.4 }}
                whileHover={{ y: -4, boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3), 0 0 30px rgba(179, 156, 208, 0.2)' }}
              >
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
              </motion.div>
            </div>

            {/* Bottom Row: Full Width Chart */}
            {conversionData && conversionData.conversionBySource.length > 0 && (
              <motion.div
                className="group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#1A1A1C]/90 to-[#1A1A1C]/70 p-6 chart-container-enhanced"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.5 }}
                whileHover={{ y: -4, boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3), 0 0 30px rgba(168, 218, 220, 0.2)' }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-[#A8DADC]/5 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"></div>
                <div className="relative">
                  <div className="mb-6 flex items-start justify-between">
                    <div>
                      <h3 className="text-xl font-bold text-white mb-1">Conversion Rate by Source</h3>
                      <p className="text-sm text-white/50">Compare conversion performance across lead sources</p>
                    </div>
                  </div>
                  <div className="h-[400px] w-full">
                    <ConversionBySourceChart data={conversionData.conversionBySource} onFilterChange={handleFilterChange} />
                  </div>
                </div>
              </motion.div>
            )}
          </motion.section>

          {/* Deal Analytics Section */}
          {crossEntityData && crossEntityData.dealByStage.length > 0 && (
            <motion.section
              className="space-y-6"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <motion.div
                className="flex items-center gap-3"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4 }}
              >
                <motion.div
                  whileHover={{ scale: 1.2, rotate: 12 }}
                  transition={{ duration: 0.2 }}
                >
                  <Briefcase className="h-6 w-6 text-[#A8DADC]" />
                </motion.div>
                <h2 className="text-2xl font-bold text-white">Deal Analytics</h2>
              </motion.div>
              
              <div className="grid gap-6 lg:grid-cols-2">
                <motion.div
                  className="group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#1A1A1C]/90 to-[#1A1A1C]/70 p-6 chart-container-enhanced"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5, delay: 0.4 }}
                  whileHover={{ y: -4, boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3), 0 0 30px rgba(168, 218, 220, 0.2)' }}
                >
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
              </motion.div>

              <motion.div
                className="group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#1A1A1C]/90 to-[#1A1A1C]/70 p-6 chart-container-enhanced"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.5 }}
                whileHover={{ y: -4, boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3), 0 0 30px rgba(179, 156, 208, 0.2)' }}
              >
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
              </motion.div>
            </div>
          </motion.section>
          )}

          {/* Company Analytics Section */}
          {crossEntityData && crossEntityData.companyDealMetrics.length > 0 && (
            <motion.section
              className="space-y-6"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              <motion.div
                className="flex items-center gap-3"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4 }}
              >
                <motion.div
                  whileHover={{ scale: 1.2, rotate: 12 }}
                  transition={{ duration: 0.2 }}
                >
                  <Building2 className="h-6 w-6 text-[#B39CD0]" />
                </motion.div>
                <h2 className="text-2xl font-bold text-white">Company Analytics</h2>
              </motion.div>

              <motion.div
                className="group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#1A1A1C]/90 to-[#1A1A1C]/70 p-6 chart-container-enhanced"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.5 }}
                whileHover={{ y: -4, boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3), 0 0 30px rgba(179, 156, 208, 0.2)' }}
              >
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
              </motion.div>

              {crossEntityData.companyContactDealFlow.length > 0 && (
                <div className="mt-6">
                  <CompanyMetricsOverview data={crossEntityData.companyContactDealFlow} />
                </div>
              )}
            </motion.section>
          )}

          {/* Contact Analytics Section */}
          {crossEntityData && crossEntityData.contactDealMetrics.length > 0 && (
            <motion.section
              className="space-y-6"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.5 }}
            >
              <motion.div
                className="flex items-center gap-3"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4 }}
              >
                <motion.div
                  whileHover={{ scale: 1.2, rotate: 12 }}
                  transition={{ duration: 0.2 }}
                >
                  <UserCheck className="h-6 w-6 text-[#A8DADC]" />
                </motion.div>
                <h2 className="text-2xl font-bold text-white">Contact Analytics</h2>
              </motion.div>

              <motion.div
                className="group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#1A1A1C]/90 to-[#1A1A1C]/70 p-6 chart-container-enhanced"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.6 }}
                whileHover={{ y: -4, boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3), 0 0 30px rgba(168, 218, 220, 0.2)' }}
              >
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
              </motion.div>
            </motion.section>
          )}

          {/* Cross-Entity Analytics Section */}
          {crossEntityData && crossEntityData.leadToDealFlow.length > 0 && (
            <motion.section
              className="space-y-6"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.6 }}
            >
              <motion.div
                className="flex items-center gap-3"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4 }}
              >
                <motion.div
                  whileHover={{ scale: 1.2, rotate: 12 }}
                  transition={{ duration: 0.2 }}
                >
                  <TrendingUp className="h-6 w-6 text-[#B39CD0]" />
                </motion.div>
                <h2 className="text-2xl font-bold text-white">Cross-Entity Flow Analysis</h2>
              </motion.div>

              <motion.div
                className="group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#1A1A1C]/90 to-[#1A1A1C]/70 p-6 chart-container-enhanced"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.7 }}
                whileHover={{ y: -4, boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3), 0 0 30px rgba(179, 156, 208, 0.2)' }}
              >
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
              </motion.div>
            </motion.section>
          )}

          {/* Additional Stats */}
          {conversionData && (
            <motion.section
              className="grid gap-4 sm:grid-cols-3"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.7 }}
            >
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
            </motion.section>
          )}
        </>
      )}
    </motion.div>
  );
}
