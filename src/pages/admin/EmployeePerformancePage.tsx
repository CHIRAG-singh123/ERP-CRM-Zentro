import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, TrendingUp } from 'lucide-react';
import { MetricCard } from '../../components/common/MetricCard';
import { PageHeader } from '../../components/common/PageHeader';
import { useEmployeePerformance } from '../../hooks/queries/useEmployees';
import { useEmployees } from '../../hooks/queries/useEmployees';

export function EmployeePerformancePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: employeesData } = useEmployees({ page: 1, limit: 100 });
  const employees = employeesData?.employees ?? [];
  
  // Use id from params, or first employee if no id provided
  const selectedEmployeeId = id || (employees.length > 0 ? employees[0]._id : '');

  const { data: performanceData, isLoading } = useEmployeePerformance(selectedEmployeeId);
  const performance = performanceData?.performance;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Employee Performance"
        description="Track and analyze employee performance metrics."
        actions={
          <button
            onClick={() => navigate('/admin/employees')}
            className="flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm text-white/70 transition hover:border-white/20 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Employees
          </button>
        }
      />

      {/* Employee Selector */}
      <div>
        <label className="block text-sm font-medium text-white/70 mb-2">Select Employee</label>
        <select
          value={selectedEmployeeId}
          onChange={(e) => {
            navigate(`/admin/employees/${e.target.value}/performance`);
          }}
          className="w-full max-w-xs rounded-lg border border-white/10 bg-[#1A1A1C]/70 px-4 py-2 text-white focus:border-[#B39CD0] focus:outline-none"
        >
          {employees.map((emp) => (
            <option key={emp._id} value={emp._id}>
              {emp.name} ({emp.email})
            </option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <MetricCard key={i} value="—" label="Loading…" />
          ))}
        </div>
      ) : performance ? (
        <>
          {/* KPI Cards */}
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              value={performance.productsCreated.toString()}
              label="Products Created"
              icon={<TrendingUp className="h-5 w-5" />}
            />
            <MetricCard
              value={performance.averageProductRating.toFixed(1)}
              label="Average Product Rating"
              icon={<TrendingUp className="h-5 w-5" />}
            />
            <MetricCard
              value={performance.tasksCompleted.toString()}
              label="Tasks Completed"
              icon={<TrendingUp className="h-5 w-5" />}
            />
            <MetricCard
              value={performance.reviewsReceived.toString()}
              label="Reviews Received"
              icon={<TrendingUp className="h-5 w-5" />}
            />
          </div>

          {/* Performance Details */}
          <div className="rounded-xl border border-white/10 bg-[#1A1A1C]/70 p-6">
            <h3 className="mb-4 text-lg font-semibold text-white">Performance Details</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <span className="text-white/70">Employee Name</span>
                <span className="text-white">{performance.employeeName}</span>
              </div>
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <span className="text-white/70">Email</span>
                <span className="text-white">{performance.employeeEmail}</span>
              </div>
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <span className="text-white/70">Total Sales</span>
                <span className="text-white">${performance.totalSales.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Products by Month Chart (Simple visualization) */}
          {performance.productsByMonth && performance.productsByMonth.length > 0 && (
            <div className="rounded-xl border border-white/10 bg-[#1A1A1C]/70 p-6">
              <h3 className="mb-4 text-lg font-semibold text-white">Products Created Over Time</h3>
              <div className="space-y-2">
                {performance.productsByMonth.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-4">
                    <span className="w-24 text-sm text-white/70">
                      {item._id.year}-{String(item._id.month).padStart(2, '0')}
                    </span>
                    <div className="flex-1">
                      <div className="h-6 rounded bg-white/5">
                        <div
                          className="h-full rounded bg-[#B39CD0]"
                          style={{ width: `${(item.count / Math.max(...performance.productsByMonth!.map(p => p.count))) * 100}%` }}
                        />
                      </div>
                    </div>
                    <span className="w-12 text-right text-sm text-white">{item.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="rounded-xl border border-white/10 bg-[#1A1A1C]/70 px-6 py-10 text-center text-sm text-white/50">
          No performance data available.
        </div>
      )}
    </div>
  );
}

