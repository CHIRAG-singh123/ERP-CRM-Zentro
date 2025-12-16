import { USE_API_MOCKS } from './config';
import { fetchJson, ApiError } from './http';
import { logger } from '../../utils/logger';
import {
  mockAccounts,
  mockContacts,
  mockDocuments,
  mockLeads,
  mockReports,
  mockRoles,
  mockTeams,
  mockUsers,
} from './mocks';
import type {
  AccountListItem,
  ContactListItem,
  DocumentListItem,
  LeadListItem,
  ReportListItem,
  RoleListItem,
  TeamListItem,
  UserListItem,
} from '../../types/crm';

async function withFallback<T>(path: string, fallback: T): Promise<T> {
  if (USE_API_MOCKS) {
    return Promise.resolve(fallback);
  }

  try {
    return await fetchJson<T>(path);
  } catch (error) {
    logger.warn(`Falling back to mock data for ${path}`, error);
    if (error instanceof ApiError && error.status >= 500) {
      return fallback;
    }
    throw error;
  }
}

export function getContacts(): Promise<ContactListItem[]> {
  return withFallback('/api/contacts', mockContacts);
}

export function getAccounts(): Promise<AccountListItem[]> {
  return withFallback('/api/accounts', mockAccounts);
}

export function getLeads(): Promise<LeadListItem[]> {
  return withFallback('/api/leads', mockLeads);
}

export function getDocuments(): Promise<DocumentListItem[]> {
  return withFallback('/api/documents', mockDocuments);
}

export function getReports(): Promise<ReportListItem[]> {
  return withFallback('/api/reports', mockReports);
}

export function getUsers(): Promise<UserListItem[]> {
  return withFallback('/api/settings/users', mockUsers);
}

export function getTeams(): Promise<TeamListItem[]> {
  return withFallback('/api/settings/teams', mockTeams);
}

export function getRoles(): Promise<RoleListItem[]> {
  return withFallback('/api/settings/roles', mockRoles);
}

