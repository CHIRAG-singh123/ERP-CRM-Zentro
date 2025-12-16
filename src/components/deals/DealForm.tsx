import { Formik, Form, Field, ErrorMessage } from 'formik';
import { createPortal } from 'react-dom';
import { X, Loader2 } from 'lucide-react';
import * as Yup from 'yup';
import { useEffect, useMemo } from 'react';
import { useCreateDeal, useUpdateDeal } from '../../hooks/queries/useDeals';
import type { CreateDealData, UpdateDealData } from '../../services/api/deals';
import { getCompanies } from '../../services/api/companies';
import { getContacts } from '../../services/api/contacts';
import { getLeads } from '../../services/api/leads';
import { useQuery } from '@tanstack/react-query';
import { useAllUsers } from '../../hooks/queries/useUsers';
import type { Deal } from '../../services/api/deals';

interface DealFormProps {
  deal?: Deal;
  isOpen: boolean;
  onSuccess: () => void;
  onCancel: () => void;
}

interface DealFormValues {
  title: string;
  leadId: string;
  contactId: string;
  companyId: string;
  value: string;
  currency: string;
  stage: Deal['stage'];
  probability: string;
  closeDate: string;
  description: string;
  notes: string;
  ownerId: string;
}

const validationSchema = Yup.object({
  title: Yup.string().required('Title is required').min(3, 'Title must be at least 3 characters'),
  leadId: Yup.string(),
  contactId: Yup.string(),
  companyId: Yup.string(),
  value: Yup.number().required('Value is required').min(0, 'Value must be positive'),
  currency: Yup.string().required('Currency is required'),
  stage: Yup.string().oneOf(['Prospecting', 'Qualification', 'Proposal', 'Negotiation', 'Closed Won', 'Closed Lost']).required('Stage is required'),
  probability: Yup.number().min(0, 'Probability must be between 0 and 100').max(100, 'Probability must be between 0 and 100'),
  closeDate: Yup.string().required('Close date is required'),
  description: Yup.string(),
  notes: Yup.string(),
  ownerId: Yup.string(),
});

export function DealForm({ deal, isOpen, onSuccess, onCancel }: DealFormProps) {
  const createMutation = useCreateDeal();
  const updateMutation = useUpdateDeal();

  // Fetch leads for dropdown
  const { data: leadsData, isLoading: isLoadingLeads } = useQuery({
    queryKey: ['leads', { page: 1, limit: 1000 }],
    queryFn: () => getLeads({ page: 1, limit: 1000 }),
    enabled: isOpen,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch contacts for dropdown
  const { data: contactsData, isLoading: isLoadingContacts } = useQuery({
    queryKey: ['contacts', { page: 1, limit: 1000 }],
    queryFn: () => getContacts({ page: 1, limit: 1000 }),
    enabled: isOpen,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch companies for dropdown
  const { data: companiesData, isLoading: isLoadingCompanies } = useQuery({
    queryKey: ['companies', { page: 1, limit: 1000 }],
    queryFn: () => getCompanies({ page: 1, limit: 1000 }),
    enabled: isOpen,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch users for owner dropdown
  const { data: usersData, isLoading: isLoadingUsers } = useAllUsers({ page: 1, limit: 1000, isActive: true });

  const leads = leadsData?.leads || [];
  const contacts = contactsData?.contacts || [];
  const companies = companiesData?.companies || [];
  const users = usersData?.users || [];

  // Compute initial values
  const initialValues: DealFormValues = useMemo(() => {
    const contactId = deal?.contactId
      ? typeof deal.contactId === 'string'
        ? deal.contactId
        : deal.contactId._id
      : '';

    const companyId = deal?.companyId
      ? typeof deal.companyId === 'string'
        ? deal.companyId
        : deal.companyId._id
      : '';

    const ownerId = deal?.ownerId
      ? typeof deal.ownerId === 'string'
        ? deal.ownerId
        : deal.ownerId._id
      : '';

    return {
      title: deal?.title || '',
      leadId: deal?.leadId || '',
      contactId,
      companyId,
      value: deal?.value?.toString() || '',
      currency: deal?.currency || 'USD',
      stage: deal?.stage || 'Prospecting',
      probability: deal?.probability?.toString() || '0',
      closeDate: deal?.closeDate
        ? new Date(deal.closeDate).toISOString().split('T')[0]
        : '',
      description: deal?.description || '',
      notes: deal?.notes || '',
      ownerId,
    };
  }, [deal]);

  // Body scroll lock
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (values: DealFormValues) => {
    try {
      const baseData: CreateDealData = {
        title: values.title,
        leadId: values.leadId || undefined,
        contactId: values.contactId || undefined,
        companyId: values.companyId || undefined,
        value: parseFloat(values.value),
        currency: values.currency,
        stage: values.stage,
        probability: values.probability ? parseFloat(values.probability) : undefined,
        closeDate: new Date(values.closeDate).toISOString(),
        description: values.description || undefined,
        notes: values.notes || undefined,
        ownerId: values.ownerId || undefined,
      };

      if (deal) {
        const updateData: UpdateDealData = baseData;
        await updateMutation.mutateAsync({ id: deal._id, data: updateData });
      } else {
        await createMutation.mutateAsync(baseData);
      }
      onSuccess();
    } catch (error) {
      // Error handling is done in the mutation hooks
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;
  const isLoadingData = isLoadingLeads || isLoadingContacts || isLoadingCompanies || isLoadingUsers;

  const modalContent = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in"
      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onCancel();
        }
      }}
    >
      <div
        className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-xl border border-white/10 bg-[#1A1A1C] shadow-2xl animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sticky Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-[#1A1A1C] p-6 rounded-t-xl">
          <h2 className="text-xl font-semibold text-white">{deal ? 'Edit Deal' : 'Create New Deal'}</h2>
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="text-white/50 transition-all duration-200 hover:text-white hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto flex-1 p-6">
          {isLoadingData ? (
            <div className="flex items-center justify-center py-20">
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="h-8 w-8 animate-spin text-[#A8DADC]" />
                <div className="text-white/60 animate-pulse">Loading data...</div>
              </div>
            </div>
          ) : (
            <Formik
              key={deal?._id || 'new-deal'}
              initialValues={initialValues}
              enableReinitialize={true}
              validationSchema={validationSchema}
              onSubmit={handleSubmit}
            >
              {({ isSubmitting }) => (
                <Form className="space-y-4">
                  {/* Title */}
                  <div>
                    <label className="block text-sm font-medium text-white/70 mb-1">
                      Title <span className="text-red-400">*</span>
                    </label>
                    <Field
                      name="title"
                      className="w-full rounded-lg border border-white/10 bg-[#1A1A1C]/70 px-3 py-2 text-white outline-none transition-all duration-200 focus:border-[#A8DADC] focus:ring-2 focus:ring-[#A8DADC]/20"
                      placeholder="Enter deal title"
                    />
                    <ErrorMessage name="title" component="p" className="mt-1 text-xs text-red-400" />
                  </div>

                  {/* Lead */}
                  <div>
                    <label className="block text-sm font-medium text-white/70 mb-1">Related Lead</label>
                    <Field
                      as="select"
                      name="leadId"
                      className="w-full rounded-lg border border-white/10 bg-[#1A1A1C]/70 px-3 py-2 text-white outline-none transition-all duration-200 focus:border-[#A8DADC] focus:ring-2 focus:ring-[#A8DADC]/20"
                    >
                      <option value="" className="bg-[#1A1A1C] text-white">
                        No Lead
                      </option>
                      {leads.map((lead) => (
                        <option key={lead._id} value={lead._id} className="bg-[#1A1A1C] text-white">
                          {lead.title}
                        </option>
                      ))}
                    </Field>
                    <ErrorMessage name="leadId" component="p" className="mt-1 text-xs text-red-400" />
                  </div>

                  {/* Contact and Company */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-white/70 mb-1">Contact</label>
                      <Field
                        as="select"
                        name="contactId"
                        className="w-full rounded-lg border border-white/10 bg-[#1A1A1C]/70 px-3 py-2 text-white outline-none transition-all duration-200 focus:border-[#A8DADC] focus:ring-2 focus:ring-[#A8DADC]/20"
                      >
                        <option value="" className="bg-[#1A1A1C] text-white">
                          No Contact
                        </option>
                        {contacts.map((contact) => (
                          <option key={contact._id} value={contact._id} className="bg-[#1A1A1C] text-white">
                            {contact.firstName} {contact.lastName}
                          </option>
                        ))}
                      </Field>
                      <ErrorMessage name="contactId" component="p" className="mt-1 text-xs text-red-400" />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-white/70 mb-1">Company</label>
                      <Field
                        as="select"
                        name="companyId"
                        className="w-full rounded-lg border border-white/10 bg-[#1A1A1C]/70 px-3 py-2 text-white outline-none transition-all duration-200 focus:border-[#A8DADC] focus:ring-2 focus:ring-[#A8DADC]/20"
                      >
                        <option value="" className="bg-[#1A1A1C] text-white">
                          No Company
                        </option>
                        {companies.map((company) => (
                          <option key={company._id} value={company._id} className="bg-[#1A1A1C] text-white">
                            {company.name}
                          </option>
                        ))}
                      </Field>
                      <ErrorMessage name="companyId" component="p" className="mt-1 text-xs text-red-400" />
                    </div>
                  </div>

                  {/* Value, Currency, and Stage */}
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-white/70 mb-1">
                        Value <span className="text-red-400">*</span>
                      </label>
                      <Field
                        type="number"
                        name="value"
                        min="0"
                        step="0.01"
                        className="w-full rounded-lg border border-white/10 bg-[#1A1A1C]/70 px-3 py-2 text-white outline-none transition-all duration-200 focus:border-[#A8DADC] focus:ring-2 focus:ring-[#A8DADC]/20"
                        placeholder="0.00"
                      />
                      <ErrorMessage name="value" component="p" className="mt-1 text-xs text-red-400" />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-white/70 mb-1">
                        Currency <span className="text-red-400">*</span>
                      </label>
                      <Field
                        as="select"
                        name="currency"
                        className="w-full rounded-lg border border-white/10 bg-[#1A1A1C]/70 px-3 py-2 text-white outline-none transition-all duration-200 focus:border-[#A8DADC] focus:ring-2 focus:ring-[#A8DADC]/20"
                      >
                        <option value="USD" className="bg-[#1A1A1C] text-white">USD</option>
                        <option value="EUR" className="bg-[#1A1A1C] text-white">EUR</option>
                        <option value="GBP" className="bg-[#1A1A1C] text-white">GBP</option>
                        <option value="INR" className="bg-[#1A1A1C] text-white">INR</option>
                      </Field>
                      <ErrorMessage name="currency" component="p" className="mt-1 text-xs text-red-400" />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-white/70 mb-1">
                        Stage <span className="text-red-400">*</span>
                      </label>
                      <Field
                        as="select"
                        name="stage"
                        className="w-full rounded-lg border border-white/10 bg-[#1A1A1C]/70 px-3 py-2 text-white outline-none transition-all duration-200 focus:border-[#A8DADC] focus:ring-2 focus:ring-[#A8DADC]/20"
                      >
                        <option value="Prospecting" className="bg-[#1A1A1C] text-white">Prospecting</option>
                        <option value="Qualification" className="bg-[#1A1A1C] text-white">Qualification</option>
                        <option value="Proposal" className="bg-[#1A1A1C] text-white">Proposal</option>
                        <option value="Negotiation" className="bg-[#1A1A1C] text-white">Negotiation</option>
                        <option value="Closed Won" className="bg-[#1A1A1C] text-white">Closed Won</option>
                        <option value="Closed Lost" className="bg-[#1A1A1C] text-white">Closed Lost</option>
                      </Field>
                      <ErrorMessage name="stage" component="p" className="mt-1 text-xs text-red-400" />
                    </div>
                  </div>

                  {/* Probability and Close Date */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-white/70 mb-1">Probability (%)</label>
                      <Field
                        type="number"
                        name="probability"
                        min="0"
                        max="100"
                        step="1"
                        className="w-full rounded-lg border border-white/10 bg-[#1A1A1C]/70 px-3 py-2 text-white outline-none transition-all duration-200 focus:border-[#A8DADC] focus:ring-2 focus:ring-[#A8DADC]/20"
                        placeholder="0"
                      />
                      <ErrorMessage name="probability" component="p" className="mt-1 text-xs text-red-400" />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-white/70 mb-1">
                        Close Date <span className="text-red-400">*</span>
                      </label>
                      <Field
                        type="date"
                        name="closeDate"
                        className="w-full rounded-lg border border-white/10 bg-[#1A1A1C]/70 px-3 py-2 text-white outline-none transition-all duration-200 focus:border-[#A8DADC] focus:ring-2 focus:ring-[#A8DADC]/20"
                      />
                      <ErrorMessage name="closeDate" component="p" className="mt-1 text-xs text-red-400" />
                    </div>
                  </div>

                  {/* Owner */}
                  <div>
                    <label className="block text-sm font-medium text-white/70 mb-1">Owner</label>
                    <Field
                      as="select"
                      name="ownerId"
                      className="w-full rounded-lg border border-white/10 bg-[#1A1A1C]/70 px-3 py-2 text-white outline-none transition-all duration-200 focus:border-[#A8DADC] focus:ring-2 focus:ring-[#A8DADC]/20"
                    >
                      <option value="" className="bg-[#1A1A1C] text-white">
                        No Owner
                      </option>
                      {users.map((user) => (
                        <option key={user._id} value={user._id} className="bg-[#1A1A1C] text-white">
                          {user.name} ({user.email})
                        </option>
                      ))}
                    </Field>
                    <ErrorMessage name="ownerId" component="p" className="mt-1 text-xs text-red-400" />
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-sm font-medium text-white/70 mb-1">Description</label>
                    <Field
                      as="textarea"
                      name="description"
                      rows={3}
                      className="w-full rounded-lg border border-white/10 bg-[#1A1A1C]/70 px-3 py-2 text-white outline-none transition-all duration-200 focus:border-[#A8DADC] focus:ring-2 focus:ring-[#A8DADC]/20 resize-none"
                      placeholder="Enter deal description"
                    />
                    <ErrorMessage name="description" component="p" className="mt-1 text-xs text-red-400" />
                  </div>

                  {/* Notes */}
                  <div>
                    <label className="block text-sm font-medium text-white/70 mb-1">Notes</label>
                    <Field
                      as="textarea"
                      name="notes"
                      rows={3}
                      className="w-full rounded-lg border border-white/10 bg-[#1A1A1C]/70 px-3 py-2 text-white outline-none transition-all duration-200 focus:border-[#A8DADC] focus:ring-2 focus:ring-[#A8DADC]/20 resize-none"
                      placeholder="Enter additional notes"
                    />
                    <ErrorMessage name="notes" component="p" className="mt-1 text-xs text-red-400" />
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-4">
                    <button
                      type="submit"
                      disabled={isSubmitting || isLoading}
                      className="flex-1 rounded-lg bg-[#A8DADC] px-4 py-2 text-sm font-medium text-[#1A1A1C] transition-all duration-200 hover:scale-105 hover:bg-[#BCE7E5] active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {(isSubmitting || isLoading) && <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />}
                      {deal ? 'Update Deal' : 'Create Deal'}
                    </button>
                    <button
                      type="button"
                      onClick={onCancel}
                      disabled={isSubmitting || isLoading}
                      className="flex-1 rounded-lg border border-white/10 px-4 py-2 text-sm text-white/70 transition-all duration-200 hover:scale-105 hover:border-white/20 hover:text-white active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  </div>
                </Form>
              )}
            </Formik>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}

