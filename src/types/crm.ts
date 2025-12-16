import type { LucideIcon } from 'lucide-react';

export interface DashboardMetric {
  id: string;
  label: string;
  value: string;
  trend?: string;
  icon?: string;
}

export interface DashboardEngagementRow {
  team: string;
  focusMetric: string;
  current: string;
  target: string;
  variance: string;
}

export interface DashboardSummary {
  metrics: DashboardMetric[];
  engagement: DashboardEngagementRow[];
}

export interface ContactListItem {
  id: string;
  name: string;
  company: string;
  status: string;
  lastActivity: string;
  owner: string;
}

export interface AccountListItem {
  id: string;
  account: string;
  type: string;
  owner: string;
  arr: string;
  health: 'Excellent' | 'Good' | 'Monitor' | 'At Risk';
}

export interface LeadListItem {
  id: string;
  lead: string;
  source: string;
  score: number;
  stage: string;
  owner: string;
}

export interface DocumentListItem {
  id: string;
  file: string;
  linkedTo: string;
  owner: string;
  updatedAt: string;
  sensitivity: string;
}

export interface ReportListItem {
  id: string;
  report: string;
  owner: string;
  frequency: string;
  outputs: string;
}

export interface UserListItem {
  id: string;
  user: string;
  role: string;
  teams: string[];
  lastActive: string;
  status: string;
}

export interface TeamListItem {
  id: string;
  team: string;
  members: number;
  queueType: string;
  coverage: string;
  escalationPolicy: string;
}

export interface RoleListItem {
  id: string;
  role: string;
  scope: string;
  description: string;
  assignments: number;
}

export type IconName =
  | 'line-chart'
  | 'user'
  | 'building'
  | 'users'
  | 'files'
  | 'activity'
  | 'calendar'
  | 'file-stack'
  | 'bar-chart'
  | 'target'
  | 'arrow-up-right'
  | 'handshake'
  | 'custom';

export type IconResolver = Record<string, LucideIcon>;

