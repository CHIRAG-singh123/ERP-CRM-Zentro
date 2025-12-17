import { Formik, Form, Field, ErrorMessage } from 'formik';
import { createPortal } from 'react-dom';
import { X, Loader2 } from 'lucide-react';
import * as Yup from 'yup';
import { useEffect, useMemo } from 'react';
import { useCreateLead, useUpdateLead } from '../../hooks/queries/useLeads';
import type { CreateLeadData, UpdateLeadData } from '../../services/api/leads';
import { getCompanies } from '../../services/api/companies';
import { getContacts } from '../../services/api/contacts';
import { useQuery } from '@tanstack/react-query';
import { useAllUsers } from '../../hooks/queries/useUsers';
import type { Lead } from '../../services/api/leads';

interface LeadFormProps {
  lead?: Lead;
  isOpen: boolean;
  onSuccess: () => void;
  onCancel: () => void;
}

interface LeadFormValues {
  title: string;
  description: string;
  contactId: string;
  companyId: string;
  source: Lead['source'];
  status: Lead['status'];
  value: string;
  ownerId: string;
  notes: string;
  expectedCloseDate: string;
}

const validationSchema = Yup.object({
  title: Yup.string().required('Title is required').min(3, 'Title must be at least 3 characters'),
  description: Yup.string(),
  contactId: Yup.string(),
  companyId: Yup.string(),
  source: Yup.string().oneOf(['website', 'referral', 'social', 'email', 'phone', 'other']).required('Source is required'),
  status: Yup.string().oneOf(['New', 'Contacted', 'Qualified', 'Lost', 'Converted']).required('Status is required'),
  value: Yup.number().min(0, 'Value must be positive'),
  ownerId: Yup.string(),
  notes: Yup.string(),
  expectedCloseDate: Yup.string(),
});

export function LeadForm({ lead, isOpen, onSuccess, onCancel }: LeadFormProps) {
  const createMutation = useCreateLead();
  const updateMutation = useUpdateLead();

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

  const contacts = contactsData?.contacts || [];
  const companies = companiesData?.companies || [];
  const users = usersData?.users || [];

  // Compute initial values
  const initialValues: LeadFormValues = useMemo(() => {
    const contactId = lead?.contactId
      ? typeof lead.contactId === 'string'
        ? lead.contactId
        : lead.contactId._id
      : '';

    const companyId = lead?.companyId
      ? typeof lead.companyId === 'string'
        ? lead.companyId
        : lead.companyId._id
      : '';

    const ownerId = lead?.ownerId
      ? typeof lead.ownerId === 'string'
        ? lead.ownerId
        : lead.ownerId._id
      : '';

    return {
      title: lead?.title || '',
      description: lead?.description || '',
      contactId,
      companyId,
      source: lead?.source || 'other',
      status: lead?.status || 'New',
      value: lead?.value?.toString() || '',
      ownerId,
      notes: lead?.notes || '',
      expectedCloseDate: lead?.expectedCloseDate
        ? new Date(lead.expectedCloseDate).toISOString().split('T')[0]
        : '',
    };
  }, [lead]);

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

  const handleSubmit = async (values: LeadFormValues) => {
    try {
      const baseData: CreateLeadData = {
        title: values.title,
        description: values.description || undefined,
        contactId: values.contactId || undefined,
        companyId: values.companyId || undefined,
        source: values.source,
        status: values.status,
        value: values.value ? parseFloat(values.value) : undefined,
        ownerId: values.ownerId || undefined,
        notes: values.notes || undefined,
        expectedCloseDate: values.expectedCloseDate ? new Date(values.expectedCloseDate).toISOString() : undefined,
      };

      if (lead) {
        const updateData: UpdateLeadData = baseData;
        await updateMutation.mutateAsync({ id: lead._id, data: updateData });
      } else {
        await createMutation.mutateAsync(baseData);
      }
      onSuccess();
    } catch (error) {
      // Error handling is done in the mutation hooks
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;
  const isLoadingData = isLoadingContacts || isLoadingCompanies || isLoadingUsers;

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
          <h2 className="text-xl font-semibold text-white">{lead ? 'Edit Lead' : 'Create New Lead'}</h2>
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
              key={lead?._id || 'new-lead'}
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
                      placeholder="Enter lead title"
                    />
                    <ErrorMessage name="title" component="p" className="mt-1 text-xs text-red-400" />
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-sm font-medium text-white/70 mb-1">Description</label>
                    <Field
                      as="textarea"
                      name="description"
                      rows={3}
                      className="w-full rounded-lg border border-white/10 bg-[#1A1A1C]/70 px-3 py-2 text-white outline-none transition-all duration-200 focus:border-[#A8DADC] focus:ring-2 focus:ring-[#A8DADC]/20 resize-none"
                      placeholder="Enter lead description"
                    />
                    <ErrorMessage name="description" component="p" className="mt-1 text-xs text-red-400" />
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

                  {/* Source and Status */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-white/70 mb-1">
                        Source <span className="text-red-400">*</span>
                      </label>
                      <Field
                        as="select"
                        name="source"
                        className="w-full rounded-lg border border-white/10 bg-[#1A1A1C]/70 px-3 py-2 text-white outline-none transition-all duration-200 focus:border-[#A8DADC] focus:ring-2 focus:ring-[#A8DADC]/20"
                      >
                        <option value="website" className="bg-[#1A1A1C] text-white">
                          Website
                        </option>
                        <option value="referral" className="bg-[#1A1A1C] text-white">
                          Referral
                        </option>
                        <option value="social" className="bg-[#1A1A1C] text-white">
                          Social Media
                        </option>
                        <option value="email" className="bg-[#1A1A1C] text-white">
                          Email
                        </option>
                        <option value="phone" className="bg-[#1A1A1C] text-white">
                          Phone
                        </option>
                        <option value="other" className="bg-[#1A1A1C] text-white">
                          Other
                        </option>
                      </Field>
                      <ErrorMessage name="source" component="p" className="mt-1 text-xs text-red-400" />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-white/70 mb-1">
                        Status <span className="text-red-400">*</span>
                      </label>
                      <Field
                        as="select"
                        name="status"
                        className="w-full rounded-lg border border-white/10 bg-[#1A1A1C]/70 px-3 py-2 text-white outline-none transition-all duration-200 focus:border-[#A8DADC] focus:ring-2 focus:ring-[#A8DADC]/20"
                      >
                        <option value="New" className="bg-[#1A1A1C] text-white">
                          New
                        </option>
                        <option value="Contacted" className="bg-[#1A1A1C] text-white">
                          Contacted
                        </option>
                        <option value="Qualified" className="bg-[#1A1A1C] text-white">
                          Qualified
                        </option>
                        <option value="Lost" className="bg-[#1A1A1C] text-white">
                          Lost
                        </option>
                        {lead?.status === 'Converted' && (
                          <option value="Converted" className="bg-[#1A1A1C] text-white">
                            Converted
                          </option>
                        )}
                      </Field>
                      <ErrorMessage name="status" component="p" className="mt-1 text-xs text-red-400" />
                    </div>
                  </div>

                  {/* Value and Owner */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-white/70 mb-1">Value ($)</label>
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
                  </div>

                  {/* Expected Close Date */}
                  <div>
                    <label className="block text-sm font-medium text-white/70 mb-1">Expected Close Date</label>
                    <Field
                      type="date"
                      name="expectedCloseDate"
                      className="w-full rounded-lg border border-white/10 bg-[#1A1A1C]/70 px-3 py-2 text-white outline-none transition-all duration-200 focus:border-[#A8DADC] focus:ring-2 focus:ring-[#A8DADC]/20"
                    />
                    <ErrorMessage name="expectedCloseDate" component="p" className="mt-1 text-xs text-red-400" />
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
                      className="crud-button crud-button-primary flex-1"
                    >
                      {(isSubmitting || isLoading) && <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />}
                      {lead ? 'Update Lead' : 'Create Lead'}
                    </button>
                    <button
                      type="button"
                      onClick={onCancel}
                      disabled={isSubmitting || isLoading}
                      className="crud-button crud-button-secondary flex-1"
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

