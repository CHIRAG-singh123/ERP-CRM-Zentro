import { useState, useEffect } from 'react';
import { Search, Eye, Edit, Trash2, ChevronLeft, ChevronRight, Filter, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { DataGrid } from '../../components/common/DataGrid';
import { DataGridPlaceholder } from '../../components/common/DataGridPlaceholder';
import { PageHeader } from '../../components/common/PageHeader';
import { useDeals, useDeleteDeal } from '../../hooks/queries/useDeals';
import { DealForm } from '../../components/deals/DealForm';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { ImportWizard } from '../../components/common/ImportWizard';
import { ExportButton } from '../../components/common/ExportButton';
import { importDeals, exportDeals } from '../../services/api/deals';
import { useQueryClient } from '@tanstack/react-query';
import { getStageColor, getProbabilityColor } from '../../utils/dealUtils';
import type { Deal } from '../../services/api/deals';
import { formatDate } from '../../utils/formatting';
import { AnimatedNumber } from '../../components/common/AnimatedNumber';

export function DealsListPage() {
  const navigate = useNavigate();
  const [showDealForm, setShowDealForm] = useState(false);
  const [editingDeal, setEditingDeal] = useState<Deal | undefined>(undefined);
  const [deletingDeal, setDeletingDeal] = useState<Deal | undefined>(undefined);
  const [showImport, setShowImport] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [stageFilter, setStageFilter] = useState<Deal['stage'] | 'All'>('All');
  const [page, setPage] = useState(1);
  const limit = 10;

  const queryClient = useQueryClient();
  const deleteMutation = useDeleteDeal();

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1); // Reset to first page when search changes
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Reset to page 1 when stage filter changes
  useEffect(() => {
    setPage(1);
  }, [stageFilter]);

  const { data, isLoading, isError, error } = useDeals({
    page,
    limit,
    search: debouncedSearch || undefined,
    stage: stageFilter !== 'All' ? stageFilter : undefined,
  });

  const deals = data?.deals ?? [];
  const pagination = data?.pagination;

  const handleCreateDeal = () => {
    setEditingDeal(undefined);
    setShowDealForm(true);
  };

  const handleEditDeal = (deal: Deal) => {
    setEditingDeal(deal);
    setShowDealForm(true);
  };

  const handleDeleteDeal = (deal: Deal) => {
    setDeletingDeal(deal);
  };

  const confirmDelete = async () => {
    if (deletingDeal) {
      try {
        await deleteMutation.mutateAsync(deletingDeal._id);
        setDeletingDeal(undefined);
      } catch (error) {
        // Error handling is done in the mutation hook
      }
    }
  };

  const handleViewDeal = (deal: Deal) => {
    navigate(`/deals/${deal._id}`);
  };

  const handleFormSuccess = () => {
    setShowDealForm(false);
    setEditingDeal(undefined);
    queryClient.invalidateQueries({ queryKey: ['deals'] });
  };

  const handleFormCancel = () => {
    setShowDealForm(false);
    setEditingDeal(undefined);
  };

  const handleImport = async (file: File) => {
    const result = await importDeals(file);
    queryClient.invalidateQueries({ queryKey: ['deals'] });
    return result;
  };

  const handleExport = async () => {
    return await exportDeals();
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <PageHeader
        title="Deals"
        description="Manage your sales pipeline and track deals through every stage of the sales process."
        actions={
          <>
            <button
              onClick={() => setShowImport(true)}
              className="rounded-full border border-white/10 px-4 py-2 text-sm text-white/70 transition-all duration-200 hover:border-white/20 hover:text-white hover:scale-105"
            >
              Import
            </button>
            <ExportButton onExport={handleExport} filename="deals-export.csv" />
            <button
              onClick={handleCreateDeal}
              className="flex items-center gap-2 rounded-full bg-[#A8DADC] px-4 py-2 text-sm font-medium text-[#1A1A1C] transition-all duration-200 hover:bg-[#BCE7E5] hover:scale-105 active:scale-95"
            >
              <Plus className="h-4 w-4" />
              Add Deal
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
              placeholder="Search by title, description…"
            />
          </div>
          <div className="flex items-center gap-2 rounded-full border border-white/10 bg-[#1A1A1C] px-3 py-2">
            <Filter className="h-4 w-4 text-white/40" />
            <select
              value={stageFilter}
              onChange={(e) => setStageFilter(e.target.value as Deal['stage'] | 'All')}
              className="bg-transparent text-sm text-white outline-none cursor-pointer"
            >
              <option value="All" className="bg-[#1A1A1C] text-white">All Stages</option>
              <option value="Prospecting" className="bg-[#1A1A1C] text-white">Prospecting</option>
              <option value="Qualification" className="bg-[#1A1A1C] text-white">Qualification</option>
              <option value="Proposal" className="bg-[#1A1A1C] text-white">Proposal</option>
              <option value="Negotiation" className="bg-[#1A1A1C] text-white">Negotiation</option>
              <option value="Closed Won" className="bg-[#1A1A1C] text-white">Closed Won</option>
              <option value="Closed Lost" className="bg-[#1A1A1C] text-white">Closed Lost</option>
            </select>
          </div>
        </div>
      </PageHeader>

      {isLoading && deals.length === 0 ? (
        <DataGridPlaceholder columns={['Title', 'Contact', 'Company', 'Stage', 'Value', 'Probability', 'Close Date', 'Owner', 'Actions']} />
      ) : deals.length > 0 ? (
        <>
          <DataGrid
            columns={[
              { key: 'title', header: 'Title' },
              {
                key: 'contact',
                header: 'Contact',
                render: (row) => {
                  const deal = row as Deal;
                  return deal.contactId
                    ? `${deal.contactId.firstName} ${deal.contactId.lastName}`
                    : 'N/A';
                },
              },
              {
                key: 'company',
                header: 'Company',
                render: (row) => {
                  const deal = row as Deal;
                  return deal.companyId?.name || 'N/A';
                },
              },
              {
                key: 'stage',
                header: 'Stage',
                render: (row) => {
                  const deal = row as Deal;
                  return <span className={getStageColor(deal.stage)}>{deal.stage}</span>;
                },
              },
              {
                key: 'value',
                header: 'Value',
                render: (row) => {
                  const deal = row as Deal;
                  return <AnimatedNumber value={deal.value} format="currency" />;
                },
              },
              {
                key: 'probability',
                header: 'Probability',
                render: (row) => {
                  const deal = row as Deal;
                  const prob = deal.probability || 0;
                  return <span className={getProbabilityColor(prob)}><AnimatedNumber value={prob} format="percentage" decimals={0} /></span>;
                },
              },
              {
                key: 'closeDate',
                header: 'Close Date',
                render: (row) => {
                  const deal = row as Deal;
                  return formatDate(deal.closeDate, 'short');
                },
              },
              {
                key: 'owner',
                header: 'Owner',
                render: (row) => {
                  const deal = row as Deal;
                  return deal.ownerId?.name || 'N/A';
                },
              },
            ]}
            data={deals}
            getRowId={(row) => (row as Deal)._id}
            onRowClick={(row) => {
              handleViewDeal(row as Deal);
            }}
            actions={(row) => {
              const deal = row as Deal;

              return (
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleViewDeal(deal);
                    }}
                    className="action-button action-button-view"
                    title="View Deal"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditDeal(deal);
                    }}
                    className="action-button action-button-edit"
                    title="Edit Deal"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteDeal(deal);
                    }}
                    className="action-button action-button-delete"
                    title="Delete Deal"
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
                <AnimatedNumber value={Math.min(pagination.page * pagination.limit, pagination.total)} format="number" decimals={0} /> of <AnimatedNumber value={pagination.total} format="number" decimals={0} /> deals
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
          {isError ? (error as Error).message : debouncedSearch || stageFilter !== 'All' ? 'No deals found matching your criteria.' : 'No deals have been created yet.'}
        </div>
      )}

      {showImport && (
        <ImportWizard
          onImport={handleImport}
          onClose={() => setShowImport(false)}
          entityName="Deals"
        />
      )}

      {showDealForm && (
        <DealForm
          deal={editingDeal}
          isOpen={showDealForm}
          onSuccess={handleFormSuccess}
          onCancel={handleFormCancel}
        />
      )}

      {deletingDeal && (
        <ConfirmDialog
          title="Delete Deal"
          message={`Are you sure you want to delete "${deletingDeal.title}"? This action cannot be undone.`}
          confirmText="Delete"
          cancelText="Cancel"
          onConfirm={confirmDelete}
          onCancel={() => setDeletingDeal(undefined)}
          confirmVariant="danger"
        />
      )}
    </div>
  );
}

