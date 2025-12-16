import Deal from '../models/Deal.js';
import Lead from '../models/Lead.js';
import Contact from '../models/Contact.js';
import Company from '../models/Company.js';
import Invoice from '../models/Invoice.js';
import Quote from '../models/Quote.js';
import Task from '../models/Task.js';
import { asyncHandler } from '../utils/asyncHandler.js';

// @desc    Get dashboard KPIs
// @route   GET /api/reports/kpis
// @access  Private
export const getKPIs = asyncHandler(async (req, res) => {
  const tenantFilter = req.user.tenantId ? { tenantId: req.user.tenantId } : {};
  const ownerFilter = req.user.role !== 'admin' ? { ownerId: req.user._id } : {};

  // Monthly sales (last 6 months)
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const monthlySales = await Deal.aggregate([
    {
      $match: {
        ...tenantFilter,
        ...ownerFilter,
        stage: 'Closed Won',
        createdAt: { $gte: sixMonthsAgo },
      },
    },
    {
      $group: {
        _id: {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
        },
        total: { $sum: '$value' },
        count: { $sum: 1 },
      },
    },
    { $sort: { '_id.year': 1, '_id.month': 1 } },
  ]);

  // Open deals count and value
  const openDeals = await Deal.aggregate([
    {
      $match: {
        ...tenantFilter,
        ...ownerFilter,
        stage: { $nin: ['Closed Won', 'Closed Lost'] },
      },
    },
    {
      $group: {
        _id: null,
        count: { $sum: 1 },
        totalValue: { $sum: '$value' },
      },
    },
  ]);

  // Leads by source
  const leadsBySource = await Lead.aggregate([
    {
      $match: {
        ...tenantFilter,
        ...ownerFilter,
      },
    },
    {
      $group: {
        _id: '$source',
        count: { $sum: 1 },
      },
    },
  ]);

  // Conversion rates
  const totalLeads = await Lead.countDocuments({ ...tenantFilter, ...ownerFilter });
  const convertedLeads = await Lead.countDocuments({
    ...tenantFilter,
    ...ownerFilter,
    status: 'Converted',
  });
  const conversionRate = totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0;

  // Recent deals
  const recentDeals = await Deal.find({
    ...tenantFilter,
    ...ownerFilter,
  })
    .sort({ createdAt: -1 })
    .limit(5)
    .populate('contactId', 'firstName lastName')
    .populate('companyId', 'name');

  // Pending invoices
  const pendingInvoices = await Invoice.aggregate([
    {
      $match: {
        ...tenantFilter,
        status: { $in: ['Draft', 'Sent', 'Overdue'] },
      },
    },
    {
      $group: {
        _id: null,
        count: { $sum: 1 },
        totalAmount: { $sum: '$total' },
      },
    },
  ]);

  // Task filter: Employees can only see tasks assigned to them
  const taskFilter = { ...tenantFilter };
  if (req.user.role !== 'admin') {
    // Employees can only see tasks where they are in the assignedTo array
    taskFilter.assignedTo = { $in: [req.user._id] };
  }

  // Overdue tasks
  const overdueTasks = await Task.countDocuments({
    ...taskFilter,
    status: { $ne: 'Done' },
    dueDate: { $lt: new Date() },
  });

  // Weekly tasks: tasks due this week + overdue tasks (deduplicated)
  const now = new Date();
  const dayOfWeek = now.getDay();
  const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Adjust to Monday
  const weekStart = new Date(now.getFullYear(), now.getMonth(), diff);
  weekStart.setHours(0, 0, 0, 0);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);

  // Get tasks due this week
  const weekTasks = await Task.countDocuments({
    ...taskFilter,
    dueDate: {
      $gte: weekStart,
      $lte: weekEnd,
    },
  });

  // Get overdue tasks (not done, dueDate < now)
  const overdueCount = await Task.countDocuments({
    ...taskFilter,
    status: { $ne: 'Done' },
    dueDate: { $lt: new Date() },
  });

  // Get tasks that are both in week range AND overdue (to avoid double counting)
  const weekAndOverdue = await Task.countDocuments({
    ...taskFilter,
    status: { $ne: 'Done' },
    dueDate: {
      $gte: weekStart,
      $lte: weekEnd,
      $lt: new Date(),
    },
  });

  // Weekly tasks = week tasks + overdue tasks - duplicates
  // This ensures we count all tasks that should appear in "This Week" view
  const weeklyTasks = weekTasks + overdueCount - weekAndOverdue;

  res.json({
    monthlySales: monthlySales.map((item) => ({
      month: `${item._id.year}-${String(item._id.month).padStart(2, '0')}`,
      total: item.total,
      count: item.count,
    })),
    openDeals: {
      count: openDeals[0]?.count || 0,
      totalValue: openDeals[0]?.totalValue || 0,
    },
    leadsBySource: leadsBySource.map((item) => ({
      source: item._id,
      count: item.count,
    })),
    conversionRate: Math.round(conversionRate * 10) / 10,
    recentDeals,
    pendingInvoices: {
      count: pendingInvoices[0]?.count || 0,
      totalAmount: pendingInvoices[0]?.totalAmount || 0,
    },
    overdueTasks,
    weeklyTasks,
  });
});

// @desc    Get lead conversion analytics
// @route   GET /api/reports/conversion-analytics
// @access  Private
export const getLeadConversionAnalytics = asyncHandler(async (req, res) => {
  const tenantFilter = req.user.tenantId ? { tenantId: req.user.tenantId } : {};
  const ownerFilter = req.user.role !== 'admin' ? { ownerId: req.user._id } : {};
  const filter = { ...tenantFilter, ...ownerFilter };

  // Conversion Funnel: Count leads at each stage
  const funnelData = await Lead.aggregate([
    { $match: filter },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
      },
    },
  ]);

  const funnel = {
    new: funnelData.find((item) => item._id === 'New')?.count || 0,
    contacted: funnelData.find((item) => item._id === 'Contacted')?.count || 0,
    qualified: funnelData.find((item) => item._id === 'Qualified')?.count || 0,
    converted: funnelData.find((item) => item._id === 'Converted')?.count || 0,
    lost: funnelData.find((item) => item._id === 'Lost')?.count || 0,
  };

  // Conversion Rate by Source
  const sourceData = await Lead.aggregate([
    { $match: filter },
    {
      $group: {
        _id: '$source',
        total: { $sum: 1 },
        converted: {
          $sum: {
            $cond: [{ $eq: ['$status', 'Converted'] }, 1, 0],
          },
        },
      },
    },
  ]);

  const conversionBySource = sourceData.map((item) => ({
    source: item._id,
    total: item.total,
    converted: item.converted,
    rate: item.total > 0 ? (item.converted / item.total) * 100 : 0,
  }));

  // Conversion Rate Over Time (last 6 months)
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const timeSeriesData = await Lead.aggregate([
    {
      $match: {
        ...filter,
        createdAt: { $gte: sixMonthsAgo },
      },
    },
    {
      $group: {
        _id: {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
        },
        total: { $sum: 1 },
        converted: {
          $sum: {
            $cond: [{ $eq: ['$status', 'Converted'] }, 1, 0],
          },
        },
      },
    },
    { $sort: { '_id.year': 1, '_id.month': 1 } },
  ]);

  const conversionOverTime = timeSeriesData.map((item) => ({
    period: `${item._id.year}-${String(item._id.month).padStart(2, '0')}`,
    total: item.total,
    converted: item.converted,
    rate: item.total > 0 ? (item.converted / item.total) * 100 : 0,
  }));

  // Overall conversion rate
  const totalLeads = await Lead.countDocuments(filter);
  const convertedLeads = await Lead.countDocuments({
    ...filter,
    status: 'Converted',
  });
  const overallConversionRate = totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0;

  // Average time to conversion (in days)
  const convertedLeadsWithDates = await Lead.find({
    ...filter,
    status: 'Converted',
    createdAt: { $exists: true },
    updatedAt: { $exists: true },
  }).select('createdAt updatedAt');

  let avgTimeToConversion = 0;
  if (convertedLeadsWithDates.length > 0) {
    const totalDays = convertedLeadsWithDates.reduce((sum, lead) => {
      const days = Math.floor((new Date(lead.updatedAt) - new Date(lead.createdAt)) / (1000 * 60 * 60 * 24));
      return sum + days;
    }, 0);
    avgTimeToConversion = Math.round(totalDays / convertedLeadsWithDates.length);
  }

  res.json({
    funnel,
    conversionBySource,
    conversionOverTime,
    overallConversionRate: Math.round(overallConversionRate * 10) / 10,
    avgTimeToConversion,
    totalLeads,
    convertedLeads,
  });
});

// @desc    Get cross-entity analytics
// @route   GET /api/reports/cross-entity-analytics
// @access  Private
export const getCrossEntityAnalytics = asyncHandler(async (req, res) => {
  const tenantFilter = req.user.tenantId ? { tenantId: req.user.tenantId } : {};
  const ownerFilter = req.user.role !== 'admin' ? { ownerId: req.user._id } : {};
  const filter = { ...tenantFilter, ...ownerFilter };

  // Deal Analysis: Deals by stage
  const dealsByStage = await Deal.aggregate([
    { $match: filter },
    {
      $group: {
        _id: '$stage',
        count: { $sum: 1 },
        totalValue: { $sum: '$value' },
        avgValue: { $avg: '$value' },
        weightedValue: { $sum: { $multiply: ['$value', { $divide: ['$probability', 100] }] } },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  const dealByStage = dealsByStage.map((item) => ({
    stage: item._id,
    count: item.count,
    totalValue: item.totalValue || 0,
    avgValue: Math.round((item.avgValue || 0) * 100) / 100,
    weightedValue: Math.round((item.weightedValue || 0) * 100) / 100,
  }));

  // Deal Analysis: Top companies by deal value
  const companyDealMetrics = await Deal.aggregate([
    { $match: { ...filter, companyId: { $exists: true, $ne: null } } },
    {
      $lookup: {
        from: 'companies',
        localField: 'companyId',
        foreignField: '_id',
        as: 'company',
      },
    },
    { $unwind: { path: '$company', preserveNullAndEmptyArrays: true } },
    {
      $group: {
        _id: '$companyId',
        companyName: { $first: '$company.name' },
        dealCount: { $sum: 1 },
        totalValue: { $sum: '$value' },
        avgValue: { $avg: '$value' },
        wonDeals: {
          $sum: { $cond: [{ $eq: ['$stage', 'Closed Won'] }, 1, 0] },
        },
        lostDeals: {
          $sum: { $cond: [{ $eq: ['$stage', 'Closed Lost'] }, 1, 0] },
        },
      },
    },
    {
      $addFields: {
        conversionRate: {
          $cond: [
            { $gt: [{ $add: ['$wonDeals', '$lostDeals'] }, 0] },
            {
              $multiply: [
                {
                  $divide: ['$wonDeals', { $add: ['$wonDeals', '$lostDeals'] }],
                },
                100,
              ],
            },
            0,
          ],
        },
      },
    },
    { $sort: { totalValue: -1 } },
    { $limit: 20 },
  ]);

  // Get contact and lead counts for top companies
  const companyIds = companyDealMetrics.map((c) => c._id);
  const companyContactCounts = await Contact.aggregate([
    { $match: { ...tenantFilter, companyId: { $in: companyIds } } },
    {
      $group: {
        _id: '$companyId',
        contactCount: { $sum: 1 },
      },
    },
  ]);

  const companyLeadCounts = await Lead.aggregate([
    { $match: { ...filter, companyId: { $in: companyIds } } },
    {
      $group: {
        _id: '$companyId',
        leadCount: { $sum: 1 },
      },
    },
  ]);

  const contactCountMap = new Map(companyContactCounts.map((c) => [c._id.toString(), c.contactCount]));
  const leadCountMap = new Map(companyLeadCounts.map((l) => [l._id.toString(), l.leadCount]));

  const companyDealMetricsFinal = companyDealMetrics.map((item) => ({
    companyId: item._id.toString(),
    companyName: item.companyName || 'Unknown',
    dealCount: item.dealCount,
    totalValue: item.totalValue || 0,
    avgValue: Math.round((item.avgValue || 0) * 100) / 100,
    contactCount: contactCountMap.get(item._id.toString()) || 0,
    leadCount: leadCountMap.get(item._id.toString()) || 0,
    conversionRate: Math.round((item.conversionRate || 0) * 10) / 10,
  }));

  // Deal Analysis: Top contacts by deal value
  const contactDealMetrics = await Deal.aggregate([
    { $match: { ...filter, contactId: { $exists: true, $ne: null } } },
    {
      $lookup: {
        from: 'contacts',
        localField: 'contactId',
        foreignField: '_id',
        as: 'contact',
      },
    },
    {
      $lookup: {
        from: 'companies',
        localField: 'contact.companyId',
        foreignField: '_id',
        as: 'company',
      },
    },
    { $unwind: { path: '$contact', preserveNullAndEmptyArrays: true } },
    { $unwind: { path: '$company', preserveNullAndEmptyArrays: true } },
    {
      $group: {
        _id: '$contactId',
        contactName: {
          $first: {
            $concat: [
              { $ifNull: ['$contact.firstName', ''] },
              ' ',
              { $ifNull: ['$contact.lastName', ''] },
            ],
          },
        },
        companyName: { $first: '$company.name' },
        dealCount: { $sum: 1 },
        totalValue: { $sum: '$value' },
        avgValue: { $avg: '$value' },
      },
    },
    { $sort: { totalValue: -1 } },
    { $limit: 20 },
  ]);

  const contactDealMetricsFinal = contactDealMetrics.map((item) => ({
    contactId: item._id.toString(),
    contactName: (item.contactName || 'Unknown').trim(),
    companyName: item.companyName || undefined,
    dealCount: item.dealCount,
    totalValue: item.totalValue || 0,
    avgValue: Math.round((item.avgValue || 0) * 100) / 100,
  }));

  // Deal Analysis: Average deal value by industry
  const dealValueByIndustry = await Deal.aggregate([
    { $match: { ...filter, companyId: { $exists: true, $ne: null } } },
    {
      $lookup: {
        from: 'companies',
        localField: 'companyId',
        foreignField: '_id',
        as: 'company',
      },
    },
    { $unwind: { path: '$company', preserveNullAndEmptyArrays: true } },
    {
      $match: {
        'company.industry': { $exists: true, $ne: null, $ne: '' },
      },
    },
    {
      $group: {
        _id: '$company.industry',
        dealCount: { $sum: 1 },
        totalValue: { $sum: '$value' },
        avgValue: { $avg: '$value' },
      },
    },
    { $sort: { avgValue: -1 } },
  ]);

  const avgDealValueByIndustry = dealValueByIndustry.map((item) => ({
    industry: item._id || 'Unknown',
    dealCount: item.dealCount,
    totalValue: item.totalValue || 0,
    avgValue: Math.round((item.avgValue || 0) * 100) / 100,
  }));

  // Cross-Entity: Lead → Deal conversion flow
  const leadToDealFlow = await Lead.aggregate([
    { $match: filter },
    {
      $lookup: {
        from: 'deals',
        localField: 'convertedToDealId',
        foreignField: '_id',
        as: 'deal',
      },
    },
    {
      $group: {
        _id: '$source',
        leads: { $sum: 1 },
        converted: {
          $sum: { $cond: [{ $eq: ['$status', 'Converted'] }, 1, 0] },
        },
        deals: {
          $sum: { $cond: [{ $gt: [{ $size: '$deal' }, 0] }, 1, 0] },
        },
        totalValue: {
          $sum: {
            $cond: [
              { $gt: [{ $size: '$deal' }, 0] },
              { $arrayElemAt: ['$deal.value', 0] },
              0,
            ],
          },
        },
      },
    },
    { $sort: { leads: -1 } },
  ]);

  const leadToDealFlowFinal = leadToDealFlow.map((item) => ({
    source: item._id || 'other',
    leads: item.leads,
    converted: item.converted,
    deals: item.deals,
    totalValue: item.totalValue || 0,
  }));

  // Cross-Entity: Company → Contact → Deal relationship
  const companyContactDealFlow = await Company.aggregate([
    { $match: tenantFilter },
    {
      $lookup: {
        from: 'contacts',
        localField: '_id',
        foreignField: 'companyId',
        as: 'contacts',
      },
    },
    {
      $lookup: {
        from: 'deals',
        localField: '_id',
        foreignField: 'companyId',
        as: 'deals',
      },
    },
    {
      $lookup: {
        from: 'leads',
        localField: '_id',
        foreignField: 'companyId',
        as: 'leads',
      },
    },
    {
      $project: {
        companyId: '$_id',
        companyName: '$name',
        contactCount: { $size: '$contacts' },
        dealCount: { $size: '$deals' },
        leadCount: { $size: '$leads' },
        totalDealValue: { $sum: '$deals.value' },
        avgDealValue: { $avg: '$deals.value' },
      },
    },
    {
      $match: {
        $or: [{ contactCount: { $gt: 0 } }, { dealCount: { $gt: 0 } }, { leadCount: { $gt: 0 } }],
      },
    },
    { $sort: { totalDealValue: -1 } },
    { $limit: 15 },
  ]);

  const companyContactDealFlowFinal = companyContactDealFlow.map((item) => ({
    companyId: item.companyId.toString(),
    companyName: item.companyName,
    contactCount: item.contactCount,
    dealCount: item.dealCount,
    leadCount: item.leadCount,
    totalDealValue: item.totalDealValue || 0,
    avgDealValue: Math.round((item.avgDealValue || 0) * 100) / 100,
  }));

  // Cross-Entity: Deal value distribution by company contact count
  const dealValueDistribution = await Deal.aggregate([
    { $match: { ...filter, companyId: { $exists: true, $ne: null } } },
    {
      $lookup: {
        from: 'companies',
        localField: 'companyId',
        foreignField: '_id',
        as: 'company',
      },
    },
    { $unwind: { path: '$company', preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: 'contacts',
        localField: 'companyId',
        foreignField: 'companyId',
        as: 'contacts',
      },
    },
    {
      $group: {
        _id: '$companyId',
        companyName: { $first: '$company.name' },
        contactCount: { $size: '$contacts' },
        dealCount: { $sum: 1 },
        totalValue: { $sum: '$value' },
        industry: { $first: '$company.industry' },
      },
    },
    { $sort: { totalValue: -1 } },
    { $limit: 50 },
  ]);

  const dealValueDistributionFinal = dealValueDistribution.map((item) => ({
    companyId: item._id.toString(),
    companyName: item.companyName || 'Unknown',
    contactCount: item.contactCount,
    dealCount: item.dealCount,
    totalValue: item.totalValue || 0,
    industry: item.industry || 'Unknown',
  }));

  // Cross-Entity: Time-to-deal by company/contact
  const timeToDeal = await Deal.aggregate([
    {
      $match: {
        ...filter,
        companyId: { $exists: true, $ne: null },
        createdAt: { $exists: true },
        closeDate: { $exists: true },
      },
    },
    {
      $lookup: {
        from: 'companies',
        localField: 'companyId',
        foreignField: '_id',
        as: 'company',
      },
    },
    { $unwind: { path: '$company', preserveNullAndEmptyArrays: true } },
    {
      $addFields: {
        daysToClose: {
          $divide: [
            { $subtract: ['$closeDate', '$createdAt'] },
            1000 * 60 * 60 * 24,
          ],
        },
      },
    },
    {
      $group: {
        _id: '$companyId',
        companyName: { $first: '$company.name' },
        avgDaysToClose: { $avg: '$daysToClose' },
        dealCount: { $sum: 1 },
      },
    },
    { $sort: { avgDaysToClose: 1 } },
    { $limit: 20 },
  ]);

  const timeToDealFinal = timeToDeal.map((item) => ({
    companyId: item._id.toString(),
    companyName: item.companyName || 'Unknown',
    avgDaysToClose: Math.round((item.avgDaysToClose || 0) * 10) / 10,
    dealCount: item.dealCount,
  }));

  res.json({
    dealByStage,
    companyDealMetrics: companyDealMetricsFinal,
    contactDealMetrics: contactDealMetricsFinal,
    avgDealValueByIndustry,
    leadToDealFlow: leadToDealFlowFinal,
    companyContactDealFlow: companyContactDealFlowFinal,
    dealValueDistribution: dealValueDistributionFinal,
    timeToDeal: timeToDealFinal,
  });
});

