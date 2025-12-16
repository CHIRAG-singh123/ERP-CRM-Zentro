import { User, Building2, DollarSign, Calendar, Edit, Trash2, ArrowLeft, Loader2, TrendingUp } from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import { useState } from 'react';

import { PageHeader } from '../../components/common/PageHeader';
import { useDeal, useDeleteDeal } from '../../hooks/queries/useDeals';
import { DealForm } from '../../components/deals/DealForm';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { getStageBgColor, calculateWeightedValue, getProbabilityColor } from '../../utils/dealUtils';
import { AnimatedNumber } from '../../components/common/AnimatedNumber';
import type { Deal } from '../../services/api/deals';
import { formatDate } from '../../utils/formatting';

export function DealDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [showEditForm, setShowEditForm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const { data, isLoading, isError, error } = useDeal(id);
  const deal = data?.deal;
  const deleteMutation = useDeleteDeal();

  const handleEdit = () => {
    setShowEditForm(true);
  };

  const handleDelete = () => {
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (deal) {
      try {
        await deleteMutation.mutateAsync(deal._id);
        navigate('/deals');
      } catch (error) {
        // Error handling is done in the mutation hook
      }
    }
  };

  const handleFormSuccess = () => {
    setShowEditForm(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-[#A8DADC]" />
          <div className="text-white/60 animate-pulse">Loading deal...</div>
        </div>
      </div>
    );
  }

  if (isError || !deal) {
    return (
      <div className="space-y-8 animate-fade-in">
        <PageHeader
          title="Deal Not Found"
          description="The deal you're looking for doesn't exist or has been deleted."
        />
        <div className="rounded-xl border border-white/10 bg-[#1A1A1C]/70 px-6 py-10 text-center text-sm text-white/50">
          {error ? (error as Error).message : 'Deal not found'}
        </div>
      </div>
    );
  }

  const isClosed = deal.stage === 'Closed Won' || deal.stage === 'Closed Lost';
  const weightedValue = calculateWeightedValue(deal);
  const probability = deal.probability || 0;

  // Stage progression
  const stages: Deal['stage'][] = ['Prospecting', 'Qualification', 'Proposal', 'Negotiation', 'Closed Won', 'Closed Lost'];
  const currentStageIndex = stages.indexOf(deal.stage);

  return (
    <div className="space-y-8 animate-fade-in">
      <PageHeader
        title="Deal Details"
        description="Complete information and pipeline status for this deal."
        actions={
          <>
            <button
              onClick={() => navigate('/deals')}
              className="flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm text-white/70 transition-all duration-200 hover:border-white/20 hover:text-white hover:scale-105"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
            {!isClosed && (
              <button
                onClick={handleEdit}
                className="flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm text-white/70 transition-all duration-200 hover:border-white/20 hover:text-white hover:scale-105"
              >
                <Edit className="h-4 w-4" />
                Edit
              </button>
            )}
            <button
              onClick={handleDelete}
              className="flex items-center gap-2 rounded-full border border-red-500/50 px-4 py-2 text-sm text-red-400 transition-all duration-200 hover:border-red-500 hover:bg-red-500/10 hover:scale-105"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </button>
          </>
        }
      />

      <section className="grid gap-6 lg:grid-cols-[2fr,1fr]">
        <article className="space-y-4 rounded-2xl border border-white/10 bg-[#1A1A1C]/70 p-6 animate-slide-in-up">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-white">{deal.title}</h2>
              <div className="mt-2 flex items-center gap-2">
                <span className={`rounded-full border px-3 py-1 text-xs font-medium ${getStageBgColor(deal.stage)}`}>
                  {deal.stage}
                </span>
                {probability > 0 && (
                  <span className={`rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium ${getProbabilityColor(probability)}`}>
                    <AnimatedNumber value={probability} format="percentage" decimals={0} /> Probability
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-white/50">
              <span className="rounded-full border border-white/10 px-3 py-1 uppercase tracking-[0.3em]">
                ID #{deal._id.slice(-8)}
              </span>
              {deal.createdBy && (
                <span className="rounded-full border border-white/10 px-3 py-1 uppercase tracking-[0.32em] text-white/60">
                  Created by: {deal.createdBy.name}
                </span>
              )}
            </div>
          </div>

          {/* Stage Progression */}
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-[0.32em] text-white/50 mb-4">Pipeline Stage</p>
            <div className="flex items-center gap-2">
              {stages.map((stage, index) => {
                const isActive = index <= currentStageIndex;
                const isCurrent = index === currentStageIndex;
                return (
                  <div key={stage} className="flex-1 flex items-center">
                    <div className="flex-1 flex flex-col items-center">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-all duration-200 ${
                          isCurrent
                            ? 'bg-[#A8DADC] text-[#1A1A1C] scale-110'
                            : isActive
                            ? 'bg-[#B39CD0] text-white'
                            : 'bg-white/10 text-white/40'
                        }`}
                      >
                        {index + 1}
                      </div>
                      <div className={`mt-2 text-xs text-center ${isActive ? 'text-white/80' : 'text-white/40'}`}>
                        {stage}
                      </div>
                    </div>
                    {index < stages.length - 1 && (
                      <div className={`flex-1 h-0.5 mx-2 ${isActive ? 'bg-[#A8DADC]' : 'bg-white/10'}`} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {deal.description && (
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.32em] text-white/50 mb-2">Description</p>
              <p className="text-sm text-white/80 whitespace-pre-wrap">{deal.description}</p>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            {deal.contactId && (
              <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 transition-all duration-200 hover:border-[#A8DADC]/50 hover:bg-white/10">
                <User className="h-4 w-4 text-[#A8DADC]" />
                <div>
                  <p className="text-xs uppercase tracking-[0.32em] text-white/50">Contact</p>
                  <p className="text-sm text-white/80">
                    {deal.contactId.firstName} {deal.contactId.lastName}
                  </p>
                </div>
              </div>
            )}
            {deal.companyId && (
              <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 transition-all duration-200 hover:border-[#A8DADC]/50 hover:bg-white/10">
                <Building2 className="h-4 w-4 text-[#A8DADC]" />
                <div>
                  <p className="text-xs uppercase tracking-[0.32em] text-white/50">Company</p>
                  <p className="text-sm text-white/80">{deal.companyId.name}</p>
                </div>
              </div>
            )}
            <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 transition-all duration-200 hover:border-[#A8DADC]/50 hover:bg-white/10">
              <DollarSign className="h-4 w-4 text-[#A8DADC]" />
              <div>
                <p className="text-xs uppercase tracking-[0.32em] text-white/50">Deal Value</p>
                <p className="text-sm text-white/80 font-semibold">
                  <AnimatedNumber value={deal.value} format="currency" />
                </p>
              </div>
            </div>
            {probability > 0 && (
              <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 transition-all duration-200 hover:border-[#A8DADC]/50 hover:bg-white/10">
                <TrendingUp className="h-4 w-4 text-[#A8DADC]" />
                <div>
                  <p className="text-xs uppercase tracking-[0.32em] text-white/50">Weighted Value</p>
                  <p className={`text-sm font-semibold ${getProbabilityColor(probability)}`}>
                    <AnimatedNumber value={weightedValue} format="currency" />
                  </p>
                </div>
              </div>
            )}
            <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 transition-all duration-200 hover:border-[#A8DADC]/50 hover:bg-white/10">
              <Calendar className="h-4 w-4 text-[#A8DADC]" />
              <div>
                <p className="text-xs uppercase tracking-[0.32em] text-white/50">Close Date</p>
                <p className="text-sm text-white/80">{formatDate(deal.closeDate, 'short')}</p>
              </div>
            </div>
            {deal.ownerId && (
              <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 transition-all duration-200 hover:border-[#A8DADC]/50 hover:bg-white/10">
                <User className="h-4 w-4 text-[#A8DADC]" />
                <div>
                  <p className="text-xs uppercase tracking-[0.32em] text-white/50">Owner</p>
                  <p className="text-sm text-white/80">{deal.ownerId.name}</p>
                </div>
              </div>
            )}
          </div>

          {deal.products && deal.products.length > 0 && (
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.32em] text-white/50 mb-3">Products</p>
              <div className="space-y-2">
                {deal.products.map((product, index) => (
                  <div key={index} className="flex items-center justify-between p-2 rounded-lg bg-white/5">
                    <div>
                      <p className="text-sm text-white/80 font-medium">{product.productId?.name || 'Unknown Product'}</p>
                      <p className="text-xs text-white/50">
                        Qty: <AnimatedNumber value={product.quantity || 0} format="number" decimals={0} /> × <AnimatedNumber value={product.unitPrice || 0} format="currency" />
                        {product.discount && product.discount > 0 && ` (`}<AnimatedNumber value={product.discount || 0} format="percentage" decimals={0} />{product.discount && product.discount > 0 && ` off)`}
                      </p>
                    </div>
                    <p className="text-sm text-white/80 font-semibold">
                      <AnimatedNumber 
                        value={((product.unitPrice || 0) * (product.quantity || 0)) * (1 - (product.discount || 0) / 100)} 
                        format="currency" 
                      />
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {deal.notes && (
            <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.32em] text-white/50 mb-2">Notes</p>
              <p className="text-sm text-white/80 whitespace-pre-wrap">{deal.notes}</p>
            </div>
          )}

          <div className="mt-6 grid grid-cols-2 gap-4 border-t border-white/10 pt-6 text-xs text-white/50">
            <div>
              <p className="uppercase tracking-[0.32em] mb-1">Created</p>
              <p>{formatDate(deal.createdAt, 'long')}</p>
            </div>
            <div>
              <p className="uppercase tracking-[0.32em] mb-1">Last Updated</p>
              <p>{formatDate(deal.updatedAt, 'long')}</p>
            </div>
          </div>
        </article>

        <aside className="space-y-4 rounded-2xl border border-white/10 bg-[#1A1A1C]/50 p-6 animate-slide-in-up animation-delay-100">
          <h3 className="text-sm uppercase tracking-[0.32em] text-white/40">Quick Actions</h3>
          <div className="space-y-2">
            {deal.contactId && typeof deal.contactId === 'object' && '_id' in deal.contactId && (() => {
              const contactId = deal.contactId._id;
              return (
                <button
                  onClick={() => navigate(`/contacts/${contactId}`)}
                  className="w-full flex items-center justify-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm text-white/60 transition-all duration-200 hover:border-[#A8DADC] hover:text-[#A8DADC] hover:scale-105"
                >
                  <User className="h-4 w-4" />
                  View Contact
                </button>
              );
            })()}
            {deal.companyId && typeof deal.companyId === 'object' && '_id' in deal.companyId && (() => {
              const companyId = deal.companyId._id;
              return (
                <button
                  onClick={() => navigate(`/accounts/${companyId}`)}
                  className="w-full flex items-center justify-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm text-white/60 transition-all duration-200 hover:border-[#A8DADC] hover:text-[#A8DADC] hover:scale-105"
                >
                  <Building2 className="h-4 w-4" />
                  View Company
                </button>
              );
            })()}
            {deal.leadId && (
              <button
                onClick={() => navigate(`/leads/${deal.leadId}`)}
                className="w-full flex items-center justify-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm text-white/60 transition-all duration-200 hover:border-[#A8DADC] hover:text-[#A8DADC] hover:scale-105"
              >
                <TrendingUp className="h-4 w-4" />
                View Related Lead
              </button>
            )}
          </div>
        </aside>
      </section>

      {showEditForm && deal && (
        <DealForm
          deal={deal}
          isOpen={showEditForm}
          onSuccess={handleFormSuccess}
          onCancel={() => setShowEditForm(false)}
        />
      )}

      {showDeleteConfirm && deal && (
        <ConfirmDialog
          title="Delete Deal"
          message={`Are you sure you want to delete "${deal.title}"? This action cannot be undone.`}
          confirmText="Delete"
          cancelText="Cancel"
          onConfirm={confirmDelete}
          onCancel={() => setShowDeleteConfirm(false)}
          confirmVariant="danger"
        />
      )}
    </div>
  );
}

