import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { Handshake, Target, FileText, Calendar } from 'lucide-react';
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
    <div className="space-y-8">
      <PageHeader
        title="Revenue Operations Overview"
        description="Monitor pipeline velocity, conversion health, and high-priority work across teams."
        actions={
          <>
            <button className="button-press rounded-full border border-white/10 px-4 py-2 text-sm text-white/70 transition-all duration-300 hover:border-white/20 hover:text-white hover:scale-105 hover:shadow-lg">
              Export Snapshot
            </button>
            <button className="button-press rounded-full bg-[#B39CD0] px-4 py-2 text-sm font-medium text-[#1A1A1C] transition-all duration-300 hover:bg-[#C3ADD9] hover:scale-105 hover:shadow-lg hover:shadow-[#B39CD0]/30">
              New Insight
            </button>
          </>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {isLoading
          ? Array.from({ length: 4 }).map((_, index) => (
              <MetricCard key={index} value="—" label="Loading…" trend=" " />
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
                    format="currency" 
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
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Deals by Stage Pie Chart */}
        <section className="card-hover animate-slide-fade rounded-xl border border-border bg-card p-6 shadow-sm transition-all duration-300 hover:border-accent/30 hover:shadow-xl">
          <h3 className="mb-4 text-lg font-bold text-foreground transition-colors duration-300">Deals by Stage</h3>
          {isLoading ? (
            <div className="flex h-64 items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-white/10 border-t-[#A8DADC]"></div>
                <div className="text-white/60 animate-pulse">Loading chart...</div>
              </div>
            </div>
          ) : data?.dealsByStage && data.dealsByStage.length > 0 ? (
            <div className="animate-fade-in" style={{ height: '500px' }}>
              <DealsByStagePieChart 
                data={data.dealsByStage} 
                onFilterChange={handleFilterChange}
                isAdmin={isAdmin}
              />
            </div>
          ) : (
            <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">No deals data</div>
          )}
        </section>

        {/* Leads by Source Chart */}
        <section className="card-hover animate-slide-fade rounded-xl border border-border bg-card p-6 shadow-sm transition-all duration-300 hover:border-accent/30 hover:shadow-xl" style={{ animationDelay: '0.1s' }}>
          <h3 className="mb-4 text-lg font-bold text-foreground transition-colors duration-300">Leads by Source</h3>
          {isLoading ? (
            <div className="flex h-64 items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-white/10 border-t-[#A8DADC]"></div>
                <div className="text-white/60 animate-pulse">Loading chart...</div>
              </div>
            </div>
          ) : data?.leadsBySource && data.leadsBySource.length > 0 ? (
            <div className="animate-fade-in" style={{ height: '500px' }}>
              <LeadsBySourceBarChart 
                data={data.leadsBySource}
                onFilterChange={handleFilterChange}
              />
            </div>
          ) : (
            <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">No leads data</div>
          )}
        </section>
      </div>

      {/* Recent Deals */}
      <section className="card-hover animate-slide-fade rounded-xl border border-border bg-card p-6 shadow-sm transition-all duration-300 hover:border-accent/30 hover:shadow-xl" style={{ animationDelay: '0.2s' }}>
        <h3 className="mb-4 text-lg font-bold text-foreground">Recent Deals</h3>
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
          <div className="rounded-xl border border-border bg-card px-6 py-10 text-center text-sm text-muted-foreground">
            No recent deals
          </div>
        )}
      </section>

      {/* Overdue Tasks Modal */}
      {canViewTasks && (
        <OverdueTasksModal isOpen={showOverdueModal} onClose={() => setShowOverdueModal(false)} />
      )}
    </div>
  );
}

