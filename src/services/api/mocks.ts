import type {
  AccountListItem,
  ContactListItem,
  DashboardSummary,
  DocumentListItem,
  LeadListItem,
  ReportListItem,
  RoleListItem,
  TeamListItem,
  UserListItem,
} from '../../types/crm';

export const mockDashboardSummary: DashboardSummary = {
  metrics: [
    { id: 'pipeline', label: 'Open pipeline', value: '$4.2M', trend: '+12% vs last quarter', icon: 'activity' },
    { id: 'velocity', label: 'Sales velocity', value: '28 days', trend: 'Median time to close deals', icon: 'arrow-up-right' },
    { id: 'conversion', label: 'Lead to SQL', value: '63%', trend: '+5 pts week-over-week', icon: 'target' },
    { id: 'active-deals', label: 'Active deals', value: '42', trend: '8 flagged for risk review', icon: 'handshake' },
  ],
  engagement: [
    { team: 'Enterprise', focusMetric: 'Pipeline Coverage', current: '3.4x', target: '4.0x', variance: '-0.6x' },
    { team: 'Commercial', focusMetric: 'Win Rate', current: '27%', target: '25%', variance: '+2 pts' },
    { team: 'Support', focusMetric: 'CSAT', current: '4.6 / 5', target: '4.4 / 5', variance: '+0.2' },
    { team: 'Marketing', focusMetric: 'MQL -> SQL', current: '38%', target: '35%', variance: '+3 pts' },
  ],
};

export const mockContacts: ContactListItem[] = [
  {
    id: 'c-1',
    name: 'Avery Rowan',
    company: 'Helios Data',
    status: 'Active',
    lastActivity: 'Executive briefing · 3d ago',
    owner: 'Jordan Blake',
  },
  {
    id: 'c-2',
    name: 'Maya Chen',
    company: 'Orbital Systems',
    status: 'Nurture',
    lastActivity: 'Playbook follow-up · 1d ago',
    owner: 'Priya Patel',
  },
  {
    id: 'c-3',
    name: 'Eli Gardner',
    company: 'Northwind Logistics',
    status: 'Expansion',
    lastActivity: 'Renewal desk · 6h ago',
    owner: 'Morgan Lee',
  },
];

export const mockAccounts: AccountListItem[] = [
  { id: 'a-1', account: 'Helios Data', type: 'Customer', owner: 'Jordan Blake', arr: '$1.3M', health: 'Excellent' },
  { id: 'a-2', account: 'Orbital Systems', type: 'Prospect', owner: 'Priya Patel', arr: '$420K', health: 'Monitor' },
  { id: 'a-3', account: 'Northwind Logistics', type: 'Customer', owner: 'Morgan Lee', arr: '$780K', health: 'Good' },
];

export const mockLeads: LeadListItem[] = [
  { id: 'l-1', lead: 'Noah Rivers', source: 'G2 Crowd', score: 86, stage: 'Qualified', owner: 'Alex Hewitt' },
  { id: 'l-2', lead: 'Layla Singh', source: 'Inbound', score: 73, stage: 'Working', owner: 'Kiara Sun' },
  { id: 'l-3', lead: 'Gabriel Ortiz', source: 'Partner', score: 64, stage: 'New', owner: 'Sydney Mills' },
];

export const mockDocuments: DocumentListItem[] = [
  {
    id: 'doc-1',
    file: 'Helios MSA v3.pdf',
    linkedTo: 'Helios Data',
    owner: 'Jordan Blake',
    updatedAt: '2 hours ago',
    sensitivity: 'Confidential',
  },
  {
    id: 'doc-2',
    file: 'Orbital Implementation Plan.pptx',
    linkedTo: 'Orbital Systems',
    owner: 'Priya Patel',
    updatedAt: '1 day ago',
    sensitivity: 'Internal',
  },
];

export const mockReports: ReportListItem[] = [
  { id: 'r-1', report: 'Pipeline Coverage', owner: 'RevOps', frequency: 'Weekly', outputs: 'Slack, Email' },
  { id: 'r-2', report: 'Renewal Risk Radar', owner: 'Customer Success', frequency: 'Daily', outputs: 'Dashboard' },
];

export const mockUsers: UserListItem[] = [
  { id: 'u-1', user: 'Jordan Blake', role: 'Admin', teams: ['Enterprise'], lastActive: '6 minutes ago', status: 'Active' },
  { id: 'u-2', user: 'Priya Patel', role: 'Manager', teams: ['Commercial'], lastActive: '18 minutes ago', status: 'Active' },
  { id: 'u-3', user: 'Morgan Lee', role: 'User', teams: ['Customer Success'], lastActive: '2 hours ago', status: 'Away' },
];

export const mockTeams: TeamListItem[] = [
  { id: 't-1', team: 'Enterprise', members: 12, queueType: 'Round Robin', coverage: 'Global', escalationPolicy: 'RVP escalation 48h' },
  { id: 't-2', team: 'Commercial', members: 18, queueType: 'Capacity-based', coverage: 'NA & EMEA', escalationPolicy: 'Manager escalation 24h' },
];

export const mockRoles: RoleListItem[] = [
  { id: 'role-1', role: 'Workspace Admin', scope: 'Global', description: 'Full platform access', assignments: 3 },
  { id: 'role-2', role: 'Sales Manager', scope: 'Sales', description: 'Pipeline management and reporting', assignments: 6 },
  { id: 'role-3', role: 'CS Specialist', scope: 'Success', description: 'Account and renewal management', assignments: 9 },
];

