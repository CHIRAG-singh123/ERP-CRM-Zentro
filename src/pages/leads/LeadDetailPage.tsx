import { User, Building2, DollarSign, Calendar, Edit, Trash2, ArrowLeft, Loader2, CheckCircle2 } from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import { useState } from 'react';

import { PageHeader } from '../../components/common/PageHeader';
import { useLead, useDeleteLead, useConvertLeadToDeal } from '../../hooks/queries/useLeads';
import { LeadForm } from '../../components/leads/LeadForm';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { getStatusBgColor, getSourceDisplayName, formatExpectedCloseDate } from '../../utils/leadUtils';
import { formatDate } from '../../utils/formatting';
import { AnimatedNumber } from '../../components/common/AnimatedNumber';

export function LeadDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [showEditForm, setShowEditForm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showConvertConfirm, setShowConvertConfirm] = useState(false);

  const { data, isLoading, isError, error } = useLead(id);
  const lead = data?.lead;
  const deleteMutation = useDeleteLead();
  const convertMutation = useConvertLeadToDeal();

  const handleEdit = () => {
    setShowEditForm(true);
  };

  const handleDelete = () => {
    setShowDeleteConfirm(true);
  };

  const handleConvert = () => {
    setShowConvertConfirm(true);
  };

  const confirmDelete = async () => {
    if (lead) {
      try {
        await deleteMutation.mutateAsync(lead._id);
        navigate('/leads');
      } catch (error) {
        // Error handling is done in the mutation hook
      }
    }
  };

  const confirmConvert = async () => {
    if (lead) {
      try {
        await convertMutation.mutateAsync({
          id: lead._id,
          data: {
            value: lead.value,
            closeDate: lead.expectedCloseDate,
          },
        });
        setShowConvertConfirm(false);
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
          <div className="text-white/60 animate-pulse">Loading lead...</div>
        </div>
      </div>
    );
  }

  if (isError || !lead) {
    return (
      <div className="space-y-8 animate-fade-in">
        <PageHeader
          title="Lead Not Found"
          description="The lead you're looking for doesn't exist or has been deleted."
        />
        <div className="rounded-xl border border-white/10 bg-[#1A1A1C]/70 px-6 py-10 text-center text-sm text-white/50">
          {error ? (error as Error).message : 'Lead not found'}
        </div>
      </div>
    );
  }

  const isConverted = lead.status === 'Converted';

  return (
    <div className="space-y-8 animate-fade-in">
      <PageHeader
        title="Lead Details"
        description="Complete information and engagement history for this lead."
        actions={
          <>
            <button
              onClick={() => navigate('/leads')}
              className="flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm text-white/70 transition-all duration-200 hover:border-white/20 hover:text-white hover:scale-105"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
            {!isConverted && (
              <button
                onClick={handleConvert}
                className="flex items-center gap-2 rounded-full bg-[#B39CD0] px-4 py-2 text-sm font-medium text-[#1A1A1C] transition-all duration-200 hover:bg-[#C3ADD9] hover:scale-105 active:scale-95"
              >
                <CheckCircle2 className="h-4 w-4" />
                Convert to Deal
              </button>
            )}
            <button
              onClick={handleEdit}
              className="flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm text-white/70 transition-all duration-200 hover:border-white/20 hover:text-white hover:scale-105"
            >
              <Edit className="h-4 w-4" />
              Edit
            </button>
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
              <h2 className="text-xl font-semibold text-white">{lead.title}</h2>
              <div className="mt-2 flex items-center gap-2">
                <span className={`rounded-full border px-3 py-1 text-xs font-medium ${getStatusBgColor(lead.status)}`}>
                  {lead.status}
                </span>
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/60">
                  {getSourceDisplayName(lead.source)}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-white/50">
              <span className="rounded-full border border-white/10 px-3 py-1 uppercase tracking-[0.3em]">
                ID #{lead._id.slice(-8)}
              </span>
              {lead.createdBy && (
                <span className="rounded-full border border-white/10 px-3 py-1 uppercase tracking-[0.32em] text-white/60">
                  Created by: {lead.createdBy.name}
                </span>
              )}
            </div>
          </div>

          {lead.description && (
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.32em] text-white/50 mb-2">Description</p>
              <p className="text-sm text-white/80 whitespace-pre-wrap">{lead.description}</p>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            {lead.contactId && (
              <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 transition-all duration-200 hover:border-[#A8DADC]/50 hover:bg-white/10">
                <User className="h-4 w-4 text-[#A8DADC]" />
                <div>
                  <p className="text-xs uppercase tracking-[0.32em] text-white/50">Contact</p>
                  <p className="text-sm text-white/80">
                    {lead.contactId.firstName} {lead.contactId.lastName}
                  </p>
                </div>
              </div>
            )}
            {lead.companyId && (
              <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 transition-all duration-200 hover:border-[#A8DADC]/50 hover:bg-white/10">
                <Building2 className="h-4 w-4 text-[#A8DADC]" />
                <div>
                  <p className="text-xs uppercase tracking-[0.32em] text-white/50">Company</p>
                  <p className="text-sm text-white/80">{lead.companyId.name}</p>
                </div>
              </div>
            )}
            {lead.value && lead.value > 0 && (
              <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 transition-all duration-200 hover:border-[#A8DADC]/50 hover:bg-white/10">
                <DollarSign className="h-4 w-4 text-[#A8DADC]" />
                <div>
                  <p className="text-xs uppercase tracking-[0.32em] text-white/50">Value</p>
                  <p className="text-sm text-white/80">
                    <AnimatedNumber value={lead.value} format="currency" />
                  </p>
                </div>
              </div>
            )}
            {lead.expectedCloseDate && (
              <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 transition-all duration-200 hover:border-[#A8DADC]/50 hover:bg-white/10">
                <Calendar className="h-4 w-4 text-[#A8DADC]" />
                <div>
                  <p className="text-xs uppercase tracking-[0.32em] text-white/50">Expected Close</p>
                  <p className="text-sm text-white/80">{formatExpectedCloseDate(lead.expectedCloseDate)}</p>
                </div>
              </div>
            )}
            {lead.ownerId && (
              <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 transition-all duration-200 hover:border-[#A8DADC]/50 hover:bg-white/10">
                <User className="h-4 w-4 text-[#A8DADC]" />
                <div>
                  <p className="text-xs uppercase tracking-[0.32em] text-white/50">Owner</p>
                  <p className="text-sm text-white/80">{lead.ownerId.name}</p>
                </div>
              </div>
            )}
          </div>

          {lead.notes && (
            <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.32em] text-white/50 mb-2">Notes</p>
              <p className="text-sm text-white/80 whitespace-pre-wrap">{lead.notes}</p>
            </div>
          )}

          {isConverted && lead.convertedToDealId && (
            <div className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
              <p className="text-xs uppercase tracking-[0.32em] text-emerald-300 mb-2">Converted to Deal</p>
              <p className="text-sm text-emerald-200">This lead has been converted to a deal.</p>
            </div>
          )}

          <div className="mt-6 grid grid-cols-2 gap-4 border-t border-white/10 pt-6 text-xs text-white/50">
            <div>
              <p className="uppercase tracking-[0.32em] mb-1">Created</p>
              <p>{formatDate(lead.createdAt, 'long')}</p>
            </div>
            <div>
              <p className="uppercase tracking-[0.32em] mb-1">Last Updated</p>
              <p>{formatDate(lead.updatedAt, 'long')}</p>
            </div>
          </div>
        </article>

        <aside className="space-y-4 rounded-2xl border border-white/10 bg-[#1A1A1C]/50 p-6 animate-slide-in-up animation-delay-100">
          <h3 className="text-sm uppercase tracking-[0.32em] text-white/40">Quick Actions</h3>
          <div className="space-y-2">
            {lead.contactId && typeof lead.contactId === 'object' && '_id' in lead.contactId && (() => {
              const contactId = lead.contactId._id;
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
            {lead.companyId && typeof lead.companyId === 'object' && '_id' in lead.companyId && (() => {
              const companyId = lead.companyId._id;
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
            {!isConverted && (
              <button
                onClick={handleConvert}
                className="w-full flex items-center justify-center gap-2 rounded-full bg-[#B39CD0] px-4 py-2 text-sm font-medium text-[#1A1A1C] transition-all duration-200 hover:bg-[#C3ADD9] hover:scale-105"
              >
                <CheckCircle2 className="h-4 w-4" />
                Convert to Deal
              </button>
            )}
          </div>
        </aside>
      </section>

      {showEditForm && lead && (
        <LeadForm
          lead={lead}
          isOpen={showEditForm}
          onSuccess={handleFormSuccess}
          onCancel={() => setShowEditForm(false)}
        />
      )}

      {showDeleteConfirm && lead && (
        <ConfirmDialog
          title="Delete Lead"
          message={`Are you sure you want to delete "${lead.title}"? This action cannot be undone.`}
          confirmText="Delete"
          cancelText="Cancel"
          onConfirm={confirmDelete}
          onCancel={() => setShowDeleteConfirm(false)}
          confirmVariant="danger"
        />
      )}

      {showConvertConfirm && lead && (
        <ConfirmDialog
          title="Convert Lead to Deal"
          message={`Are you sure you want to convert "${lead.title}" to a deal? This will create a new deal and mark this lead as converted.`}
          confirmText="Convert"
          cancelText="Cancel"
          onConfirm={confirmConvert}
          onCancel={() => setShowConvertConfirm(false)}
        />
      )}
    </div>
  );
}

