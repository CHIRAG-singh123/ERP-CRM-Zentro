import { Formik, Form, Field, ErrorMessage } from 'formik';
import { createPortal } from 'react-dom';
import { X, Loader2 } from 'lucide-react';
import * as Yup from 'yup';
import { useEffect, useMemo } from 'react';
import { useCreateTeam, useUpdateTeam } from '../../hooks/queries/useTeams';
import type { CreateTeamData, UpdateTeamData } from '../../services/api/teams';
import { useAllUsers } from '../../hooks/queries/useUsers';
import { MultiSelectDropdown } from '../common/MultiSelectDropdown';
import type { Team } from '../../services/api/teams';

interface TeamFormProps {
  team?: Team;
  isOpen: boolean;
  onSuccess: () => void;
  onCancel: () => void;
}

interface TeamFormValues {
  name: string;
  description: string;
  members: string[];
  queueType: string;
  coverage: string;
  escalationPolicy: string;
}

const validationSchema = Yup.object({
  name: Yup.string().required('Team name is required').min(2, 'Team name must be at least 2 characters'),
  description: Yup.string(),
  members: Yup.array()
    .of(Yup.string())
    .max(10, 'A team can have a maximum of 10 members')
    .test('max-members', 'A team can have a maximum of 10 members', (value) => {
      return !value || value.length <= 10;
    }),
  queueType: Yup.string(),
  coverage: Yup.string(),
  escalationPolicy: Yup.string(),
});

export function TeamForm({ team, isOpen, onSuccess, onCancel }: TeamFormProps) {
  const createMutation = useCreateTeam();
  const updateMutation = useUpdateTeam();

  // Fetch all active employees and admins for team assignment
  const { data: usersData, isLoading: isLoadingUsers } = useAllUsers({ page: 1, limit: 1000, isActive: true });
  const users = usersData?.users || [];

  // Filter to only show employees and admins, and ensure they have required fields
  const availableUsers = useMemo(() => {
    return users
      .filter((u) => (u.role === 'employee' || u.role === 'admin') && u._id && u.name && u.email)
      .map((u) => ({
        _id: String(u._id),
        name: u.name,
        email: u.email,
      }));
  }, [users]);

  // Normalize members field to handle different data structures
  const normalizeMembers = (members: any): string[] => {
    if (!members) return [];

    if (Array.isArray(members)) {
      return members
        .map((m) => {
          if (typeof m === 'string') {
            return m;
          }
          if (m && typeof m === 'object' && m._id) {
            return String(m._id);
          }
          if (m && typeof m.toString === 'function') {
            return String(m);
          }
          return null;
        })
        .filter((id): id is string => Boolean(id) && typeof id === 'string');
    }

    if (typeof members === 'object' && members !== null) {
      if (members._id) {
        return [String(members._id)];
      }
      return [];
    }

    if (typeof members === 'string') {
      return [members];
    }

    return [];
  };

  // Ensure member IDs exist in availableUsers
  const validMemberIds = useMemo(() => {
    if (!team?.members && !team?.memberIds) return [];

    const memberIds = team.memberIds || team.members.map((m) => (typeof m === 'object' ? m._id : m).toString());
    const normalizedIds = normalizeMembers(memberIds).map((id) => String(id));

    if (availableUsers.length === 0) {
      return normalizedIds;
    }

    const availableUserIds = new Set(availableUsers.map((u) => String(u._id)));
    return normalizedIds.filter((id) => availableUserIds.has(id));
  }, [team?.members, team?.memberIds, availableUsers]);

  // Compute initial values
  const initialValues: TeamFormValues = useMemo(() => {
    return {
      name: team?.name || '',
      description: team?.description || '',
      members: validMemberIds,
      queueType: team?.queueType || '',
      coverage: team?.coverage || '',
      escalationPolicy: team?.escalationPolicy || '',
    };
  }, [team, validMemberIds]);

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

  const handleSubmit = async (values: TeamFormValues) => {
    try {
      // Validate max 10 members
      if (values.members.length > 10) {
        return;
      }

      const baseData: CreateTeamData = {
        name: values.name,
        description: values.description || undefined,
        members: values.members.length > 0 ? values.members : undefined,
        queueType: values.queueType || undefined,
        coverage: values.coverage || undefined,
        escalationPolicy: values.escalationPolicy || undefined,
      };

      if (team) {
        const updateData: UpdateTeamData = baseData;
        await updateMutation.mutateAsync({ id: team._id, data: updateData });
      } else {
        await createMutation.mutateAsync(baseData);
      }
      onSuccess();
    } catch (error) {
      // Error handling is done in the mutation hooks
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

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
          <h2 className="text-xl font-semibold text-white">{team ? 'Edit Team' : 'Create New Team'}</h2>
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
          {isLoadingUsers ? (
            <div className="flex items-center justify-center py-20">
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="h-8 w-8 animate-spin text-[#A8DADC]" />
                <div className="text-white/60 animate-pulse">Loading user data...</div>
              </div>
            </div>
          ) : (
            <Formik
              key={team?._id || 'new-team'}
              initialValues={initialValues}
              enableReinitialize={true}
              validationSchema={validationSchema}
              onSubmit={handleSubmit}
            >
              {({ isSubmitting, values, setFieldValue, errors }) => (
                <Form className="space-y-4">
                  {/* Team Name */}
                  <div>
                    <label className="block text-sm font-medium text-white/70 mb-1">
                      Team Name <span className="text-red-400">*</span>
                    </label>
                    <Field
                      name="name"
                      className="w-full rounded-lg border border-white/10 bg-[#1A1A1C]/70 px-3 py-2 text-white outline-none transition-all duration-200 focus:border-[#A8DADC] focus:ring-2 focus:ring-[#A8DADC]/20"
                      placeholder="Enter team name"
                    />
                    <ErrorMessage name="name" component="p" className="mt-1 text-xs text-red-400" />
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-sm font-medium text-white/70 mb-1">Description</label>
                    <Field
                      as="textarea"
                      name="description"
                      rows={3}
                      className="w-full rounded-lg border border-white/10 bg-[#1A1A1C]/70 px-3 py-2 text-white outline-none transition-all duration-200 focus:border-[#A8DADC] focus:ring-2 focus:ring-[#A8DADC]/20 resize-none"
                      placeholder="Enter team description"
                    />
                    <ErrorMessage name="description" component="p" className="mt-1 text-xs text-red-400" />
                  </div>

                  {/* Members Selection */}
                  <div>
                    <label className="block text-sm font-medium text-white/70 mb-1">
                      Members (Max 10) <span className="text-white/50 text-xs">({values.members.length}/10)</span>
                    </label>
                    <MultiSelectDropdown
                      options={availableUsers}
                      value={values.members}
                      onChange={(selectedIds) => {
                        if (selectedIds.length <= 10) {
                          setFieldValue('members', selectedIds);
                        }
                      }}
                      placeholder="Select employees to assign to this team"
                      label=""
                      error={errors.members as string}
                    />
                    {values.members.length >= 10 && (
                      <p className="mt-1 text-xs text-yellow-400">Maximum of 10 members reached</p>
                    )}
                    <ErrorMessage name="members" component="p" className="mt-1 text-xs text-red-400" />
                  </div>

                  {/* Queue Type */}
                  <div>
                    <label className="block text-sm font-medium text-white/70 mb-1">Queue Type</label>
                    <Field
                      as="select"
                      name="queueType"
                      className="w-full rounded-lg border border-white/10 bg-[#1A1A1C]/70 px-3 py-2 text-white outline-none transition-all duration-200 focus:border-[#A8DADC] focus:ring-2 focus:ring-[#A8DADC]/20"
                    >
                      <option value="" className="bg-[#1A1A1C] text-white">
                        Select queue type
                      </option>
                      <option value="Round Robin" className="bg-[#1A1A1C] text-white">
                        Round Robin
                      </option>
                      <option value="Capacity-based" className="bg-[#1A1A1C] text-white">
                        Capacity-based
                      </option>
                      <option value="Territory-based" className="bg-[#1A1A1C] text-white">
                        Territory-based
                      </option>
                      <option value="Skill-based" className="bg-[#1A1A1C] text-white">
                        Skill-based
                      </option>
                    </Field>
                    <ErrorMessage name="queueType" component="p" className="mt-1 text-xs text-red-400" />
                  </div>

                  {/* Coverage */}
                  <div>
                    <label className="block text-sm font-medium text-white/70 mb-1">Coverage</label>
                    <Field
                      name="coverage"
                      className="w-full rounded-lg border border-white/10 bg-[#1A1A1C]/70 px-3 py-2 text-white outline-none transition-all duration-200 focus:border-[#A8DADC] focus:ring-2 focus:ring-[#A8DADC]/20"
                      placeholder="e.g., Global, NA & EMEA, etc."
                    />
                    <ErrorMessage name="coverage" component="p" className="mt-1 text-xs text-red-400" />
                  </div>

                  {/* Escalation Policy */}
                  <div>
                    <label className="block text-sm font-medium text-white/70 mb-1">Escalation Policy</label>
                    <Field
                      name="escalationPolicy"
                      className="w-full rounded-lg border border-white/10 bg-[#1A1A1C]/70 px-3 py-2 text-white outline-none transition-all duration-200 focus:border-[#A8DADC] focus:ring-2 focus:ring-[#A8DADC]/20"
                      placeholder="e.g., RVP escalation 48h, Manager escalation 24h"
                    />
                    <ErrorMessage name="escalationPolicy" component="p" className="mt-1 text-xs text-red-400" />
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-4">
                    <button
                      type="submit"
                      disabled={isSubmitting || isLoading || values.members.length > 10}
                      className="crud-button crud-button-primary flex-1"
                    >
                      {(isSubmitting || isLoading) && <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />}
                      {team ? 'Update Team' : 'Create Team'}
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
