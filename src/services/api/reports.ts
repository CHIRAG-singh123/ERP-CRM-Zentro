import { fetchJson } from './http';

export interface MonthlySales {
  month: string;
  total: number;
  count: number;
}

export interface LeadsBySource {
  source: string;
  count: number;
}

export interface Deal {
  _id: string;
  title: string;
  value: number;
  stage: string;
  contactId?: {
    firstName: string;
    lastName: string;
  };
  companyId?: {
    name: string;
  };
  createdAt: string;
}

export interface DealsByStage {
  stage: string;
  count: number;
  totalValue: number;
}

export interface KPIsResponse {
  monthlySales: MonthlySales[];
  openDeals: {
    count: number;
    totalValue: number;
  };
  dealsByStage: DealsByStage[];
  leadsBySource: LeadsBySource[];
  conversionRate: number;
  recentDeals: Deal[];
  pendingInvoices: {
    count: number;
    totalAmount: number;
  };
  totalInvoices: {
    count: number;
    totalAmount: number;
  };
  overdueTasks: number;
  weeklyTasks: number;
}

export const getKPIs = async (params?: {
  startDate?: string;
  endDate?: string;
  ownerId?: string;
  stage?: string;
}): Promise<KPIsResponse> => {
  const queryParams = new URLSearchParams();
  if (params?.startDate) queryParams.append('startDate', params.startDate);
  if (params?.endDate) queryParams.append('endDate', params.endDate);
  if (params?.ownerId) queryParams.append('ownerId', params.ownerId);
  if (params?.stage) queryParams.append('stage', params.stage);

  const queryString = queryParams.toString();
  return fetchJson<KPIsResponse>(`/reports/kpis${queryString ? `?${queryString}` : ''}`);
};

export interface ConversionFunnelData {
  new: number;
  contacted: number;
  qualified: number;
  converted: number;
  lost: number;
}

export interface ConversionBySource {
  source: string;
  total: number;
  converted: number;
  rate: number;
}

export interface ConversionOverTime {
  period: string;
  total: number;
  converted: number;
  rate: number;
}

export interface ConversionAnalyticsResponse {
  funnel: ConversionFunnelData;
  conversionBySource: ConversionBySource[];
  conversionOverTime: ConversionOverTime[];
  overallConversionRate: number;
  avgTimeToConversion: number;
  totalLeads: number;
  convertedLeads: number;
}

export const getLeadConversionAnalytics = async (): Promise<ConversionAnalyticsResponse> => {
  return fetchJson<ConversionAnalyticsResponse>('/reports/conversion-analytics');
};

export interface DealByStage {
  stage: string;
  count: number;
  totalValue: number;
  avgValue: number;
  weightedValue: number;
}

export interface CompanyDealMetrics {
  companyId: string;
  companyName: string;
  dealCount: number;
  totalValue: number;
  avgValue: number;
  contactCount: number;
  leadCount: number;
  conversionRate: number;
}

export interface ContactDealMetrics {
  contactId: string;
  contactName: string;
  companyName?: string;
  dealCount: number;
  totalValue: number;
  avgValue: number;
}

export interface AvgDealValueByIndustry {
  industry: string;
  dealCount: number;
  totalValue: number;
  avgValue: number;
}

export interface LeadToDealFlow {
  source: string;
  leads: number;
  converted: number;
  deals: number;
  totalValue: number;
}

export interface CompanyContactDealFlow {
  companyId: string;
  companyName: string;
  contactCount: number;
  dealCount: number;
  leadCount: number;
  totalDealValue: number;
  avgDealValue: number;
}

export interface DealValueDistribution {
  companyId: string;
  companyName: string;
  contactCount: number;
  dealCount: number;
  totalValue: number;
  industry: string;
}

export interface TimeToDeal {
  companyId: string;
  companyName: string;
  avgDaysToClose: number;
  dealCount: number;
}

export interface CrossEntityAnalyticsResponse {
  dealByStage: DealByStage[];
  companyDealMetrics: CompanyDealMetrics[];
  contactDealMetrics: ContactDealMetrics[];
  avgDealValueByIndustry: AvgDealValueByIndustry[];
  leadToDealFlow: LeadToDealFlow[];
  companyContactDealFlow: CompanyContactDealFlow[];
  dealValueDistribution: DealValueDistribution[];
  timeToDeal: TimeToDeal[];
}

export const getCrossEntityAnalytics = async (): Promise<CrossEntityAnalyticsResponse> => {
  return fetchJson<CrossEntityAnalyticsResponse>('/reports/cross-entity-analytics');
};

