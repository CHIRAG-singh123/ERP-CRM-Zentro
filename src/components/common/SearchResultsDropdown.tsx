import { Building2, User, Handshake, Bolt, Loader2 } from 'lucide-react';
import type { SearchResult } from '../../services/api/search';

interface SearchResultsDropdownProps {
  results?: SearchResult;
  isLoading: boolean;
  onResultClick: (type: string, id: string) => void;
}

export function SearchResultsDropdown({ results, isLoading, onResultClick }: SearchResultsDropdownProps) {
  if (isLoading) {
    return (
      <div className="absolute top-full z-50 mt-2 w-full rounded-md border border-white/10 bg-[#1F1F21] shadow-lg">
        <div className="flex items-center justify-center p-4">
          <Loader2 className="h-5 w-5 animate-spin text-white/60" />
        </div>
      </div>
    );
  }

  if (!results) {
    return null;
  }

  const totalResults =
    results.companies.length +
    results.contacts.length +
    results.deals.length +
    results.leads.length;

  if (totalResults === 0) {
    return (
      <div className="absolute top-full z-50 mt-2 w-full rounded-md border border-white/10 bg-[#1F1F21] shadow-lg">
        <div className="p-4 text-center text-sm text-white/60">No results found</div>
      </div>
    );
  }

  return (
    <div className="absolute top-full z-50 mt-2 max-h-96 w-full overflow-y-auto rounded-md border border-white/10 bg-[#1F1F21] shadow-lg">
      {results.companies.length > 0 && (
        <div className="border-b border-white/10">
          <div className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-white/40">
            Companies
          </div>
          {results.companies.map((company) => (
            <button
              key={company._id}
              onClick={() => onResultClick('company', company._id)}
              className="flex w-full items-center gap-3 px-4 py-2 text-left hover:bg-white/5"
            >
              <Building2 className="h-4 w-4 text-white/60" />
              <div className="flex-1">
                <div className="text-sm font-medium text-white">{company.name}</div>
                {company.email && <div className="text-xs text-white/60">{company.email}</div>}
              </div>
            </button>
          ))}
        </div>
      )}

      {results.contacts.length > 0 && (
        <div className="border-b border-white/10">
          <div className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-white/40">
            Contacts
          </div>
          {results.contacts.map((contact) => (
            <button
              key={contact._id}
              onClick={() => onResultClick('contact', contact._id)}
              className="flex w-full items-center gap-3 px-4 py-2 text-left hover:bg-white/5"
            >
              <User className="h-4 w-4 text-white/60" />
              <div className="flex-1">
                <div className="text-sm font-medium text-white">
                  {contact.firstName} {contact.lastName}
                </div>
                {contact.companyId && (
                  <div className="text-xs text-white/60">{contact.companyId.name}</div>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {results.deals.length > 0 && (
        <div className="border-b border-white/10">
          <div className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-white/40">
            Deals
          </div>
          {results.deals.map((deal) => (
            <button
              key={deal._id}
              onClick={() => onResultClick('deal', deal._id)}
              className="flex w-full items-center gap-3 px-4 py-2 text-left hover:bg-white/5"
            >
              <Handshake className="h-4 w-4 text-white/60" />
              <div className="flex-1">
                <div className="text-sm font-medium text-white">{deal.title}</div>
                <div className="text-xs text-white/60">
                  ${deal.value.toLocaleString()} • {deal.stage}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {results.leads.length > 0 && (
        <div>
          <div className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-white/40">
            Leads
          </div>
          {results.leads.map((lead) => (
            <button
              key={lead._id}
              onClick={() => onResultClick('lead', lead._id)}
              className="flex w-full items-center gap-3 px-4 py-2 text-left hover:bg-white/5"
            >
              <Bolt className="h-4 w-4 text-white/60" />
              <div className="flex-1">
                <div className="text-sm font-medium text-white">{lead.title}</div>
                <div className="text-xs text-white/60">
                  {lead.status} • {lead.source}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

