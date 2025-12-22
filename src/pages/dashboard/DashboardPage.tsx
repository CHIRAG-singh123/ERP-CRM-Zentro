import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { Handshake, Target, FileText, Calendar, Download } from 'lucide-react';
import { motion } from 'framer-motion';
import { useQueryClient } from '@tanstack/react-query';

import { DataGrid } from '../../components/common/DataGrid';
import { DataGridPlaceholder } from '../../components/common/DataGridPlaceholder';
import { MetricCard } from '../../components/common/MetricCard';
import { PageHeader } from '../../components/common/PageHeader';
import { useDashboardSummary } from '../../hooks/queries/useDashboardSummary';
import { AnimatedNumber } from '../../components/common/AnimatedNumber';
import { OverdueTasksModal } from '../../components/tasks/OverdueTasksModal';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { formatCurrency } from '../../utils/formatting';
import { DealsByStagePieChart, type ChartFilterValues } from '../../components/dashboard/DealsByStagePieChart';
import { LeadsBySourceBarChart } from '../../components/dashboard/LeadsBySourceBarChart';

export function DashboardPage() {
  const [filters, setFilters] = useState<ChartFilterValues>({});
  const { data, isLoading, refetch } = useDashboardSummary(filters);
  const { user } = useAuth();
  const { subscribeToTasks, onDashboardMetricsUpdated } = useSocket();
  const queryClient = useQueryClient();
  const [showOverdueModal, setShowOverdueModal] = useState(false);
  const isAdmin = user?.role === 'admin';

  const handleFilterChange = (newFilters: ChartFilterValues) => {
    setFilters(newFilters);
  };

  // Only admin and employees can access this dashboard
  // Customers should be redirected to /customers/dashboard
  if (user?.role === 'customer') {
    return <Navigate to="/customers/dashboard" replace />;
  }

  // Only admin and employees can view tasks
  const canViewTasks = user?.role === 'admin' || user?.role === 'employee';

  // Subscribe to task updates and dashboard metrics
  useEffect(() => {
    if (canViewTasks) {
      subscribeToTasks();
    }

    // Listen for dashboard metrics updates
    const unsubscribe = onDashboardMetricsUpdated(() => {
      // Invalidate and refetch dashboard data
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'kpis'] });
      refetch();
    });

    return () => {
      unsubscribe();
    };
  }, [canViewTasks, subscribeToTasks, onDashboardMetricsUpdated, queryClient, refetch]);

  const metrics = [
    {
      id: 'openDeals',
      value: data?.openDeals?.totalValue || 0,
      valueFormat: 'currency' as const,
      label: 'Open Deals Value',
      trend: data?.openDeals?.count || 0,
      trendFormat: 'number' as const,
      trendSuffix: ' deals',
      icon: Handshake,
    },
    {
      id: 'conversionRate',
      value: data?.conversionRate || 0,
      valueFormat: 'percentage' as const,
      label: 'Lead Conversion Rate',
      trend: null,
      trendText: 'Last 30 days',
      icon: Target,
    },
    {
      id: 'pendingInvoices',
      value: data?.pendingInvoices?.totalAmount || 0,
      valueFormat: 'currency' as const,
      label: 'Pending Invoices',
      trend: data?.pendingInvoices?.count || 0,
      trendFormat: 'number' as const,
      trendSuffix: ' invoices',
      icon: FileText,
    },
    {
      id: 'weeklyTasks',
      value: data?.weeklyTasks || 0,
      valueFormat: 'number' as const,
      label: 'Weekly Tasks',
      trend: null,
      trendText: 'Due this week',
      icon: Calendar,
    },
  ];

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
          title="Revenue Operations Overview"
          description="Monitor pipeline velocity, conversion health, and high-priority work across teams."
          actions={
            <>
              <motion.button
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
                Export Snapshot
              </motion.button>
              <motion.button
                className="button-enhanced rounded-full bg-[#B39CD0] px-4 py-2 text-sm font-medium text-[#1A1A1C] transition-all duration-300 hover:bg-[#C3ADD9] glow-purple"
                whileHover={{ scale: 1.05, boxShadow: '0 10px 30px rgba(179, 156, 208, 0.3)' }}
                whileTap={{ scale: 0.95 }}
              >
                New Insight
              </motion.button>
            </>
          }
        />
      </motion.div>

      <motion.div
        className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"
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
        {isLoading
          ? Array.from({ length: 4 }).map((_, index) => (
              <motion.div
                key={index}
                variants={{
                  hidden: { opacity: 0, y: 20 },
                  visible: { opacity: 1, y: 0 },
                }}
              >
                <div className="skeleton-enhanced h-32 rounded-2xl" />
              </motion.div>
            ))
          : metrics.map((metric, index) => {
              const Icon = metric.icon;
              
              // For currency values, use abbreviated format with full value on hover
              let valueDisplay: React.ReactNode;
              let fullValueTooltip: string | undefined;
              
              if (metric.valueFormat === 'currency') {
                valueDisplay = (
                  <AnimatedNumber 
                    value={metric.value} 
                    format="abbreviatedCurrency" 
                    decimals={0}
                  />
                );
                fullValueTooltip = formatCurrency(metric.value);
              } else {
                valueDisplay = (
                  <AnimatedNumber 
                    value={metric.value} 
                    format={metric.valueFormat} 
                    decimals={metric.valueFormat === 'percentage' ? 1 : 0}
                  />
                );
              }
              
              const trendDisplay = metric.trend !== null ? (
                <>
                  <AnimatedNumber 
                    value={metric.trend} 
                    format={metric.trendFormat || 'number'} 
                    decimals={0}
                  />
                  {metric.trendSuffix || ''}
                </>
              ) : (
                metric.trendText || ''
              );
              
              return (
                <MetricCard
                  key={metric.id}
                  index={index}
                  value={valueDisplay}
                  label={metric.label}
                  trend={trendDisplay}
                  icon={<Icon className="h-5 w-5" />}
                  fullValue={fullValueTooltip}
                  onClick={
                    metric.id === 'weeklyTasks' && canViewTasks
                      ? () => setShowOverdueModal(true)
                      : undefined
                  }
                />
              );
            })}
      </motion.div>

      <motion.div
        className="grid gap-6 md:grid-cols-2"
        initial="hidden"
        animate="visible"
        variants={{
          visible: {
            transition: {
              staggerChildren: 0.15,
            },
          },
        }}
      >
        {/* Deals by Stage Pie Chart */}
        <motion.section
          className="group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#1A1A1C]/90 to-[#1A1A1C]/70 p-6 chart-container-enhanced"
          variants={{
            hidden: { opacity: 0, scale: 0.95 },
            visible: { opacity: 1, scale: 1 },
          }}
          transition={{ duration: 0.5, delay: 0.3 }}
          whileHover={{ y: -4, boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3), 0 0 30px rgba(168, 218, 220, 0.2)' }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-[#A8DADC]/5 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"></div>
          <div className="relative">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h3 className="text-xl font-bold text-white mb-1">Deals by Stage</h3>
                <p className="text-sm text-white/50">Deal distribution across pipeline stages</p>
              </div>
            </div>
            {isLoading ? (
              <div className="flex h-64 items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                  <motion.div
                    className="h-8 w-8 rounded-full border-4 border-white/10 border-t-[#A8DADC]"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  />
                  <motion.div
                    className="text-white/60"
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  >
                    Loading chart...
                  </motion.div>
                </div>
              </div>
            ) : data?.dealsByStage && data.dealsByStage.length > 0 ? (
              <motion.div
                style={{ height: '500px' }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
              >
                <DealsByStagePieChart 
                  data={data.dealsByStage} 
                  onFilterChange={handleFilterChange}
                  isAdmin={isAdmin}
                />
              </motion.div>
            ) : (
              <div className="flex h-64 items-center justify-center text-sm text-white/50">No deals data</div>
            )}
          </div>
        </motion.section>

        {/* Leads by Source Chart */}
        <motion.section
          className="group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#1A1A1C]/90 to-[#1A1A1C]/70 p-6 chart-container-enhanced"
          variants={{
            hidden: { opacity: 0, scale: 0.95 },
            visible: { opacity: 1, scale: 1 },
          }}
          transition={{ duration: 0.5, delay: 0.4 }}
          whileHover={{ y: -4, boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3), 0 0 30px rgba(179, 156, 208, 0.2)' }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-[#B39CD0]/5 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"></div>
          <div className="relative">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h3 className="text-xl font-bold text-white mb-1">Leads by Source</h3>
                <p className="text-sm text-white/50">Lead distribution across sources</p>
              </div>
            </div>
            {isLoading ? (
              <div className="flex h-64 items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                  <motion.div
                    className="h-8 w-8 rounded-full border-4 border-white/10 border-t-[#A8DADC]"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  />
                  <motion.div
                    className="text-white/60"
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  >
                    Loading chart...
                  </motion.div>
                </div>
              </div>
            ) : data?.leadsBySource && data.leadsBySource.length > 0 ? (
              <motion.div
                style={{ height: '500px' }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
              >
                <LeadsBySourceBarChart 
                  data={data.leadsBySource}
                  onFilterChange={handleFilterChange}
                />
              </motion.div>
            ) : (
              <div className="flex h-64 items-center justify-center text-sm text-white/50">No leads data</div>
            )}
          </div>
        </motion.section>
      </motion.div>

      {/* Recent Deals */}
      <motion.section
        className="group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#1A1A1C]/90 to-[#1A1A1C]/70 p-6 chart-container-enhanced"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.5 }}
        whileHover={{ y: -4, boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3), 0 0 30px rgba(168, 218, 220, 0.2)' }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-[#A8DADC]/5 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"></div>
        <div className="relative">
          <div className="mb-4 flex items-start justify-between">
            <div>
              <h3 className="text-xl font-bold text-white mb-1">Recent Deals</h3>
              <p className="text-sm text-white/50">Latest deals in the pipeline</p>
            </div>
          </div>
          {isLoading ? (
            <DataGridPlaceholder columns={['Deal', 'Contact', 'Company', 'Value', 'Stage']} rows={5} />
          ) : data?.recentDeals && data.recentDeals.length > 0 ? (
            <DataGrid
              columns={[
                { key: 'title', header: 'Deal' },
                {
                  key: 'contact',
                  header: 'Contact',
                  render: (row) => {
                    const deal = row as typeof data.recentDeals[0];
                    return deal.contactId
                      ? `${deal.contactId.firstName} ${deal.contactId.lastName}`
                      : 'N/A';
                  },
                },
                {
                  key: 'company',
                  header: 'Company',
                  render: (row) => {
                    const deal = row as typeof data.recentDeals[0];
                    return deal.companyId?.name || 'N/A';
                  },
                },
                {
                  key: 'value',
                  header: 'Value',
                  render: (row) => {
                    const deal = row as typeof data.recentDeals[0];
                    return <AnimatedNumber value={deal.value} format="currency" />;
                  },
                },
                { key: 'stage', header: 'Stage' },
              ]}
              data={data.recentDeals}
            />
          ) : (
            <div className="rounded-xl border border-white/10 bg-[#1A1A1C]/70 px-6 py-10 text-center text-sm text-white/50">
              No recent deals
            </div>
          )}
        </div>
      </motion.section>

      {/* Overdue Tasks Modal */}
      {canViewTasks && (
        <OverdueTasksModal isOpen={showOverdueModal} onClose={() => setShowOverdueModal(false)} />
      )}
    </motion.div>
  );
}

