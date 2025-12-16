import { useLeads, useUpdateLead } from '../../hooks/queries/useLeads';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import type { Lead } from '../../services/api/leads';
import { getStatusBgColor, formatLeadValue, getSourceDisplayName } from '../../utils/leadUtils';

const leadStatuses: Lead['status'][] = ['New', 'Contacted', 'Qualified', 'Lost', 'Converted'];

interface LeadsPipelineProps {
  search?: string;
  statusFilter?: Lead['status'] | 'All';
}

export function LeadsPipeline({ search, statusFilter }: LeadsPipelineProps) {
  const { data, isLoading } = useLeads({
    limit: 1000,
    search,
    status: statusFilter !== 'All' ? statusFilter : undefined,
  });
  const leads = data?.leads || [];
  const updateLead = useUpdateLead();
  const navigate = useNavigate();

  const handleStatusChange = async (leadId: string, newStatus: Lead['status']) => {
    try {
      await updateLead.mutateAsync({ id: leadId, data: { status: newStatus } });
    } catch (err) {
      // Error handled by mutation
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-[#A8DADC]" />
          <div className="text-white/60 animate-pulse">Loading leads...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-4 animate-fade-in">
      {leadStatuses.map((status, statusIndex) => {
        const statusLeads = leads.filter((lead) => lead.status === status);
        return (
          <div
            key={status}
            className="flex min-w-[300px] flex-col rounded-lg border border-white/10 bg-[#1A1A1C]/70 animate-slide-in-up shadow-lg transition-all duration-300 hover:shadow-xl hover:border-white/20"
            style={{ animationDelay: `${statusIndex * 100}ms` }}
          >
            <div className={`border-b p-4 ${getStatusBgColor(status)}`}>
              <h3 className="font-semibold text-white">{status}</h3>
              <p className="text-sm text-white/60 mt-1">{statusLeads.length} lead{statusLeads.length !== 1 ? 's' : ''}</p>
            </div>
            <div className="flex-1 space-y-2 overflow-y-auto p-4 max-h-[600px]">
              {statusLeads.map((lead, leadIndex) => (
                <div
                  key={lead._id}
                  onClick={() => navigate(`/leads/${lead._id}`)}
                  className="group cursor-pointer rounded-md border border-white/10 bg-[#242426] p-3 transition-all duration-300 hover:border-[#A8DADC]/50 hover:bg-white/10 hover:shadow-md hover:-translate-y-0.5 animate-fade-in stagger-item"
                  style={{ animationDelay: `${(statusIndex * 100) + (leadIndex * 50)}ms` }}
                >
                  <div className="font-medium text-white group-hover:text-[#A8DADC] transition-colors duration-200">
                    {lead.title}
                  </div>
                  {lead.contactId && (
                    <div className="mt-1 text-sm text-white/60 group-hover:text-white/80 transition-colors duration-200">
                      {lead.contactId.firstName} {lead.contactId.lastName}
                    </div>
                  )}
                  {lead.companyId && (
                    <div className="mt-1 text-sm text-white/60 group-hover:text-white/80 transition-colors duration-200">
                      {lead.companyId.name}
                    </div>
                  )}
                  {lead.source && (
                    <div className="mt-1 text-xs text-white/40">
                      Source: {getSourceDisplayName(lead.source)}
                    </div>
                  )}
                  {lead.value && lead.value > 0 && (
                    <div className="mt-2 text-sm font-semibold text-[#A8DADC] group-hover:text-[#BCE7E5] transition-colors duration-200">
                      {formatLeadValue(lead.value)}
                    </div>
                  )}
                  <select
                    value={lead.status}
                    onChange={(e) => {
                      e.stopPropagation();
                      handleStatusChange(lead._id, e.target.value as Lead['status']);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="mt-2 w-full rounded-md border border-white/10 bg-[#1A1A1C] px-2 py-1 text-xs text-white transition-all duration-200 focus:border-[#A8DADC] focus:ring-2 focus:ring-[#A8DADC]/20 focus:outline-none hover:border-white/20"
                  >
                    {leadStatuses.map((s) => (
                      <option key={s} value={s} className="bg-[#1A1A1C] text-white">
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
              {statusLeads.length === 0 && (
                <div className="py-8 text-center text-sm text-white/40 animate-fade-in">No leads</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

