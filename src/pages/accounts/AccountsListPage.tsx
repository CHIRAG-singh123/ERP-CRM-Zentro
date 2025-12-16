import { useState, useEffect } from 'react';
import { Building2, Filter, Layers, Search, Eye, Edit, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { DataGrid } from '../../components/common/DataGrid';
import { DataGridPlaceholder } from '../../components/common/DataGridPlaceholder';
import { PageHeader } from '../../components/common/PageHeader';
import { useAccounts, useDeleteCompany } from '../../hooks/queries/useAccounts';
import { ImportWizard } from '../../components/common/ImportWizard';
import { ExportButton } from '../../components/common/ExportButton';
import { importCompanies, exportCompanies } from '../../services/api/companies';
import { useQueryClient } from '@tanstack/react-query';
import { CompanyForm } from '../../components/companies/CompanyForm';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { transformCompanyToGridItem, getHealthColor } from '../../utils/companyUtils';
import type { Company } from '../../services/api/companies';
import { AnimatedNumber } from '../../components/common/AnimatedNumber';

export function AccountsListPage() {
  const navigate = useNavigate();
  const [showImport, setShowImport] = useState(false);
  const [showCompanyForm, setShowCompanyForm] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | undefined>(undefined);
  const [deletingCompany, setDeletingCompany] = useState<Company | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const limit = 10;

  const queryClient = useQueryClient();
  const deleteMutation = useDeleteCompany();

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1); // Reset to first page when search changes
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { data, isLoading, isError, error } = useAccounts({
    page,
    limit,
    search: debouncedSearch || undefined,
  });

  const companies = data?.companies || [];
  const pagination = data?.pagination;
  const gridData = companies.map(transformCompanyToGridItem);

  const handleImport = async (file: File) => {
    const result = await importCompanies(file);
    queryClient.invalidateQueries({ queryKey: ['accounts'] });
    return result;
  };

  const handleExport = async () => {
    return await exportCompanies();
  };

  const handleCreateAccount = () => {
    setEditingCompany(undefined);
    setShowCompanyForm(true);
  };

  const handleEditAccount = (company: Company) => {
    setEditingCompany(company);
    setShowCompanyForm(true);
  };

  const handleDeleteAccount = (company: Company) => {
    setDeletingCompany(company);
  };

  const confirmDelete = async () => {
    if (deletingCompany) {
      try {
        await deleteMutation.mutateAsync(deletingCompany._id);
        setDeletingCompany(undefined);
      } catch (error) {
        // Error handling is done in the mutation hook
      }
    }
  };

  const handleViewAccount = (company: Company) => {
    navigate(`/accounts/${company._id}`);
  };

  const handleFormSuccess = () => {
    setShowCompanyForm(false);
    setEditingCompany(undefined);
    queryClient.invalidateQueries({ queryKey: ['accounts'] });
  };

  const handleFormCancel = () => {
    setShowCompanyForm(false);
    setEditingCompany(undefined);
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <PageHeader
        title="Accounts"
        description="Hierarchy-aware view of customers, subsidiaries, and partner entities."
        actions={
          <>
            <button
              onClick={() => setShowImport(true)}
              className="rounded-full border border-white/10 px-4 py-2 text-sm text-white/70 transition-all duration-200 hover:border-white/20 hover:text-white hover:scale-105"
            >
              Import
            </button>
            <ExportButton onExport={handleExport} filename="companies-export.csv" />
            <button
              onClick={handleCreateAccount}
              className="flex items-center gap-2 rounded-full bg-[#A8DADC] px-4 py-2 text-sm font-medium text-[#1A1A1C] transition-all duration-200 hover:bg-[#BCE7E5] hover:scale-105 active:scale-95"
            >
              <Building2 className="h-4 w-4" />
              New Account
            </button>
          </>
        }
      >
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-1 min-w-[220px] items-center gap-2 rounded-full border border-white/10 bg-[#1A1A1C] px-4 py-2 text-sm text-white/60 transition-all duration-200 focus-within:border-[#A8DADC] focus-within:ring-2 focus-within:ring-[#A8DADC]/20">
            <Search className="h-4 w-4 text-white/40" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent text-white placeholder:text-white/40 focus:outline-none"
              placeholder="Search by name, email, industry…"
            />
          </div>
          <button className="rounded-full border border-white/10 px-4 py-2 text-sm text-white/60 transition-all duration-200 hover:border-white/20 hover:text-white hover:scale-105">
            Parent Tree
          </button>
          <button className="flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm text-white/60 transition-all duration-200 hover:border-white/20 hover:text-white hover:scale-105">
            <Layers className="h-4 w-4" />
            Segments
          </button>
          <button className="flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm text-white/60 transition-all duration-200 hover:border-white/20 hover:text-white hover:scale-105">
            <Filter className="h-4 w-4" />
            Filters
          </button>
        </div>
      </PageHeader>

      {isLoading && gridData.length === 0 ? (
        <DataGridPlaceholder columns={['Account', 'Type', 'Owner', 'ARR', 'Health', 'Actions']} />
      ) : gridData.length > 0 ? (
        <>
          <DataGrid
            columns={[
              { key: 'account', header: 'Account' },
              { key: 'type', header: 'Type' },
              { key: 'owner', header: 'Owner' },
              { key: 'arr', header: 'ARR' },
              {
                key: 'health',
                header: 'Health',
                render: (row) => (
                  <span className={getHealthColor(row.health)}>{row.health}</span>
                ),
              },
            ]}
            data={gridData}
            getRowId={(row) => row._id}
            onRowClick={(row) => {
              const company = companies.find((c) => c._id === row._id);
              if (company) {
                handleViewAccount(company);
              }
            }}
            actions={(row) => {
              const company = companies.find((c) => c._id === row._id);
              if (!company) return null;

              return (
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleViewAccount(company);
                    }}
                    className="p-1.5 rounded-lg text-white/60 transition-all duration-200 hover:text-[#A8DADC] hover:bg-white/5 hover:scale-110"
                    title="View Account"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditAccount(company);
                    }}
                    className="p-1.5 rounded-lg text-white/60 transition-all duration-200 hover:text-[#B39CD0] hover:bg-white/5 hover:scale-110"
                    title="Edit Account"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteAccount(company);
                    }}
                    className="p-1.5 rounded-lg text-white/60 transition-all duration-200 hover:text-red-400 hover:bg-white/5 hover:scale-110"
                    title="Delete Account"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              );
            }}
          />

          {/* Pagination */}
          {pagination && pagination.pages > 1 && (
            <div className="flex items-center justify-between rounded-xl border border-white/10 bg-[#1A1A1C]/70 px-6 py-4 animate-fade-in">
              <div className="text-sm text-white/60">
                Showing <AnimatedNumber value={((pagination.page - 1) * pagination.limit) + 1} format="number" decimals={0} /> to{' '}
                <AnimatedNumber value={Math.min(pagination.page * pagination.limit, pagination.total)} format="number" decimals={0} /> of <AnimatedNumber value={pagination.total} format="number" decimals={0} /> accounts
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={pagination.page === 1}
                  className="flex items-center gap-1 rounded-lg border border-white/10 px-3 py-1.5 text-sm text-white/70 transition-all duration-200 hover:border-white/20 hover:text-white hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
                    let pageNum: number;
                    if (pagination.pages <= 5) {
                      pageNum = i + 1;
                    } else if (pagination.page <= 3) {
                      pageNum = i + 1;
                    } else if (pagination.page >= pagination.pages - 2) {
                      pageNum = pagination.pages - 4 + i;
                    } else {
                      pageNum = pagination.page - 2 + i;
                    }

                    return (
                      <button
                        key={pageNum}
                        onClick={() => setPage(pageNum)}
                        className={`min-w-[2rem] rounded-lg px-3 py-1.5 text-sm transition-all duration-200 hover:scale-110 ${
                          pagination.page === pageNum
                            ? 'bg-[#A8DADC] text-[#1A1A1C] font-medium'
                            : 'border border-white/10 text-white/70 hover:border-white/20 hover:text-white'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>
                <button
                  onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
                  disabled={pagination.page === pagination.pages}
                  className="flex items-center gap-1 rounded-lg border border-white/10 px-3 py-1.5 text-sm text-white/70 transition-all duration-200 hover:border-white/20 hover:text-white hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="rounded-xl border border-white/10 bg-[#1A1A1C]/70 px-6 py-10 text-center text-sm text-white/50 animate-fade-in">
          {isError ? (error as Error).message : debouncedSearch ? 'No accounts found matching your search.' : 'No accounts available yet.'}
        </div>
      )}

      {showImport && (
        <ImportWizard
          onImport={handleImport}
          onClose={() => setShowImport(false)}
          entityName="Companies"
        />
      )}

      {showCompanyForm && (
        <CompanyForm
          company={editingCompany}
          isOpen={showCompanyForm}
          onSuccess={handleFormSuccess}
          onCancel={handleFormCancel}
        />
      )}

      {deletingCompany && (
        <ConfirmDialog
          title="Delete Account"
          message={`Are you sure you want to delete ${deletingCompany.name}? This action cannot be undone.`}
          confirmText="Delete"
          cancelText="Cancel"
          onConfirm={confirmDelete}
          onCancel={() => setDeletingCompany(undefined)}
          confirmVariant="danger"
        />
      )}
    </div>
  );
}

