import { fetchJson } from './http';

export interface Team {
  _id: string;
  name: string;
  description?: string;
  members: Array<{
    _id: string;
    name: string;
    email: string;
    profile?: {
      avatar?: string;
    };
    role?: string;
  }>;
  memberIds?: string[];
  queueType?: string;
  coverage?: string;
  escalationPolicy?: string;
  tenantId?: string;
  createdBy?: {
    _id: string;
    name: string;
    email: string;
  };
  isActive?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TeamListItem {
  id: string;
  team: string;
  members: number;
  queueType: string;
  coverage: string;
  escalationPolicy: string;
  _id?: string;
  name?: string;
  description?: string;
  memberIds?: string[];
}

export interface CreateTeamData {
  name: string;
  description?: string;
  members?: string[];
  queueType?: string;
  coverage?: string;
  escalationPolicy?: string;
}

export interface UpdateTeamData {
  name?: string;
  description?: string;
  members?: string[];
  queueType?: string;
  coverage?: string;
  escalationPolicy?: string;
}

export const getTeams = async (): Promise<TeamListItem[]> => {
  return fetchJson<TeamListItem[]>('/settings/teams');
};

export const getTeam = async (id: string): Promise<{ team: Team }> => {
  return fetchJson<{ team: Team }>(`/settings/teams/${id}`);
};

export const createTeam = async (data: CreateTeamData): Promise<{ team: Team }> => {
  return fetchJson<{ team: Team }>('/settings/teams', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

export const updateTeam = async (id: string, data: UpdateTeamData): Promise<{ team: Team }> => {
  return fetchJson<{ team: Team }>(`/settings/teams/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
};

export const deleteTeam = async (id: string): Promise<{ message: string }> => {
  return fetchJson<{ message: string }>(`/settings/teams/${id}`, {
    method: 'DELETE',
  });
};
