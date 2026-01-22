import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '../../context/ToastContext';
import { getTeams, createTeam, updateTeam, deleteTeam } from '../../services/api/teams';
import type { CreateTeamData, UpdateTeamData } from '../../services/api/teams';

export function useTeams() {
  return useQuery({
    queryKey: ['settings', 'teams'],
    queryFn: getTeams,
    staleTime: 10 * 60 * 1000,
  });
}

export function useCreateTeam() {
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: (data: CreateTeamData) => createTeam(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'teams'] });
      success('Team created successfully');
    },
    onError: (err: Error) => {
      error(err.message || 'Failed to create team');
    },
  });
}

export function useUpdateTeam() {
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateTeamData }) => updateTeam(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'teams'] });
      success('Team updated successfully');
    },
    onError: (err: Error) => {
      error(err.message || 'Failed to update team');
    },
  });
}

export function useDeleteTeam() {
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: (id: string) => deleteTeam(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'teams'] });
      success('Team deleted successfully');
    },
    onError: (err: Error) => {
      error(err.message || 'Failed to delete team');
    },
  });
}
