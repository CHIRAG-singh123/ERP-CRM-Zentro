# 4.3 - 4.7 Technical Implementation Details

## 4.3 Proper Implementation of Business Logic

### Overview
The ERP-CRM-Zentro platform implements business logic through a well-structured **service-oriented architecture** that separates concerns across API services, controllers, and hooks.

---

### 4.3.1 Backend Service Layer Architecture

#### A. Service Files Organization
Located in `server/src/services/` - Contains business logic services:

```
server/src/services/
├── authService.js              # Authentication & authorization logic
├── (implicit CRUD services)    # Business logic in controllers
```

#### B. Controller Layer Pattern
Controllers encapsulate business logic for each domain:

```javascript
// Example: server/src/controllers/leadController.js

// Business Logic: Get leads with filtering and pagination
export const getLeads = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, search, status, ownerId } = req.query;
  const skip = (page - 1) * limit;

  // Build dynamic query with business rules
  const query = {};
  
  // Tenant isolation - critical for multi-tenant systems
  if (req.user.tenantId) {
    query.tenantId = req.user.tenantId;
  }

  // Role-based filtering
  if (req.user.role !== 'admin' && req.user.role !== 'employee') {
    query.ownerId = req.user._id;  // Customers see only their own
  }

  if (status) query.status = status;
  if (ownerId) query.ownerId = ownerId;

  // Full-text search implementation
  if (search) {
    query.$or = [
      { title: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
    ];
  }

  // Paginated retrieval with population
  const leads = await Lead.find(query)
    .skip(skip)
    .limit(parseInt(limit))
    .sort({ createdAt: -1 })
    .populate('contactId', 'firstName lastName')
    .populate('companyId', 'name')
    .populate('ownerId', 'name email');

  const total = await Lead.countDocuments(query);

  res.json({
    leads,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit),
    },
  });
});
```

#### C. Key Business Logic Patterns

**1. Lead-to-Deal Conversion**
```javascript
// Business Rule: Convert a qualified lead to a deal
export const convertLeadToDeal = asyncHandler(async (req, res) => {
  const { title, value, stage } = req.body;

  // Validation: Ensure lead exists
  const lead = await Lead.findById(req.params.id);
  if (!lead) {
    return res.status(404).json({ error: 'Lead not found' });
  }

  // Business Rule: Lead can only be converted once
  if (lead.convertedToDealId) {
    return res.status(400).json({ error: 'Lead already converted to deal' });
  }

  // Create deal from lead
  const deal = await Deal.create({
    title: title || lead.title,
    contactId: lead.contactId,
    companyId: lead.companyId,
    value: value || lead.value,
    stage: stage || 'Prospecting',
    ownerId: lead.ownerId,
    createdBy: req.user._id,
    tenantId: req.user.tenantId,
  });

  // Mark lead as converted
  lead.status = 'Converted';
  lead.convertedToDealId = deal._id;
  await lead.save();

  res.status(201).json({ deal });
});
```

**2. Invoice Creation from Deal**
```javascript
// Business Rule: Generate invoice with line items from deal
export const createInvoice = asyncHandler(async (req, res) => {
  const { dealId, contactId, lineItems, dueDate } = req.body;

  // Validation: Deal must exist
  const deal = dealId ? await Deal.findById(dealId) : null;
  if (dealId && !deal) {
    return res.status(404).json({ error: 'Deal not found' });
  }

  // Generate invoice number (auto-increment)
  const lastInvoice = await Invoice.findOne({ tenantId: req.user.tenantId })
    .sort({ createdAt: -1 });
  const invoiceNumber = `INV-${Date.now()}`;

  // Calculate totals with validation
  let total = 0;
  const validatedItems = lineItems.map(item => {
    const subtotal = item.quantity * item.unitPrice;
    const discount = item.discount || 0;
    const tax = (subtotal - discount) * (item.taxRate || 0) / 100;
    const itemTotal = subtotal - discount + tax;
    total += itemTotal;

    return {
      ...item,
      subtotal,
      discount,
      tax,
      total: itemTotal,
    };
  });

  // Create invoice
  const invoice = await Invoice.create({
    invoiceNumber,
    dealId: dealId || null,
    contactId,
    lineItems: validatedItems,
    total,
    status: 'Draft',
    dueDate,
    createdBy: req.user._id,
    tenantId: req.user.tenantId,
  });

  res.status(201).json({ invoice });
});
```

**3. Task Assignment & Status Management**
```javascript
// Business Rule: Assign task with notification
export const assignTask = asyncHandler(async (req, res) => {
  const { taskId } = req.params;
  const { assignedTo } = req.body;

  // Validation
  const task = await Task.findById(taskId);
  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }

  // Permission check: Only creator or admin can reassign
  if (task.createdBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'You cannot assign this task' });
  }

  // Update assignment
  task.assignedTo = assignedTo;
  task.updatedAt = new Date();
  await task.save();

  // Create notification for assignee
  await Notification.create({
    title: 'Task Assigned',
    message: `${req.user.name} assigned you a task: ${task.title}`,
    type: 'task',
    userId: assignedTo,
    relatedTo: { entityType: 'Task', entityId: task._id },
  });

  res.json({ task });
});
```

**4. Performance Tracking**
```javascript
// Business Logic: Calculate and store monthly employee performance
export const calculateEmployeePerformance = asyncHandler(async (req, res) => {
  const { employeeId, period } = req.params; // period: YYYY-MM

  // Get products created
  const productsCreated = await Product.countDocuments({
    createdBy: employeeId,
    createdAt: { $gte: new Date(`${period}-01`), $lt: new Date(`${period}-32`) },
  });

  // Get average rating
  const products = await Product.find({ createdBy: employeeId });
  const reviews = await Review.find({ productId: { $in: products.map(p => p._id) } });
  const avgRating = reviews.length > 0
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : 0;

  // Get completed tasks
  const tasksCompleted = await Task.countDocuments({
    assignedTo: employeeId,
    status: 'Done',
    updatedAt: { $gte: new Date(`${period}-01`) },
  });

  // Get total sales
  const deals = await Deal.find({
    ownerId: employeeId,
    stage: 'Closed Won',
    closeDate: { $gte: new Date(`${period}-01`) },
  });
  const totalSales = deals.reduce((sum, d) => sum + (d.value || 0), 0);

  // Store performance metrics
  const performance = await EmployeePerformance.findOneAndUpdate(
    { employeeId, period },
    {
      productsCreated,
      averageProductRating: avgRating.toFixed(2),
      tasksCompleted,
      reviewsReceived: reviews.length,
      totalSales,
    },
    { upsert: true, new: true }
  );

  res.json({ performance });
});
```

#### D. Error Handling & Async Operations
```javascript
// Utility: asyncHandler wrapper for proper error handling
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Usage in controller
export const getLeads = asyncHandler(async (req, res) => {
  // Errors are automatically caught and passed to error handler middleware
});
```

---

### 4.3.2 Frontend Business Logic Layer

#### A. API Service Layer Pattern
Located in `src/services/api/` - Encapsulates all HTTP calls:

```typescript
// src/services/api/leads.ts

export interface Lead {
  _id: string;
  title: string;
  contactId?: { _id: string; firstName: string; lastName: string };
  companyId?: { _id: string; name: string };
  source: 'website' | 'referral' | 'social' | 'email' | 'phone' | 'other';
  status: 'New' | 'Contacted' | 'Qualified' | 'Lost' | 'Converted';
  value?: number;
  ownerId?: { _id: string; name: string; email: string };
  expectedCloseDate?: string;
  convertedToDealId?: string;
}

// Encapsulated business logic
export const getLeads = async (params?: {
  page?: number;
  limit?: number;
  search?: string;
  status?: Lead['status'];
  ownerId?: string;
}): Promise<LeadsResponse> => {
  const queryParams = new URLSearchParams();
  if (params?.page) queryParams.append('page', params.page.toString());
  if (params?.limit) queryParams.append('limit', params.limit.toString());
  if (params?.search) queryParams.append('search', params.search);
  if (params?.status) queryParams.append('status', params.status);
  if (params?.ownerId) queryParams.append('ownerId', params.ownerId);

  return fetchJson<LeadsResponse>(
    `/leads${queryParams.toString() ? `?${queryParams.toString()}` : ''}`
  );
};

export const convertLeadToDeal = async (
  leadId: string,
  dealData: CreateDealData
): Promise<{ deal: Deal }> => {
  return fetchJson<{ deal: Deal }>(`/leads/${leadId}/convert`, {
    method: 'POST',
    body: JSON.stringify(dealData),
  });
};
```

#### B. React Query Hooks Pattern
Located in `src/hooks/queries/` - Manages server state:

```typescript
// src/hooks/queries/useLeads.tsx

export function useLeads(params?: {
  page?: number;
  limit?: number;
  search?: string;
  status?: Lead['status'];
  ownerId?: string;
}) {
  return useQuery({
    queryKey: ['leads', params],
    queryFn: () => getLeads(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000,   // 10 minutes
  });
}

export function useCreateLead() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: CreateLeadData) => createLead(data),
    onSuccess: () => {
      // Invalidate cache to refetch
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
    onError: (error) => {
      console.error('Failed to create lead:', error);
    },
  });
}

export function useUpdateLead() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateLeadData }) =>
      updateLead(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
  });
}
```

#### C. Form Business Logic
```typescript
// src/components/leads/LeadForm.tsx

export function LeadForm({ lead, isOpen, onSuccess, onCancel }: LeadFormProps) {
  const createMutation = useCreateLead();
  const updateMutation = useUpdateLead();

  // Fetch dependent data
  const { data: contactsData } = useQuery({
    queryKey: ['contacts', { page: 1, limit: 1000 }],
    queryFn: () => getContacts({ page: 1, limit: 1000 }),
    enabled: isOpen,
  });

  const initialValues: LeadFormValues = useMemo(() => ({
    title: lead?.title || '',
    description: lead?.description || '',
    contactId: lead?.contactId
      ? typeof lead.contactId === 'string'
        ? lead.contactId
        : lead.contactId._id
      : '',
    source: lead?.source || 'website',
    status: lead?.status || 'New',
    value: lead?.value?.toString() || '0',
    notes: lead?.notes || '',
    expectedCloseDate: lead?.expectedCloseDate?.split('T')[0] || '',
  }), [lead]);

  const handleSubmit = async (values: LeadFormValues, { setSubmitting }: FormikHelpers<LeadFormValues>) => {
    try {
      const submitData: CreateLeadData = {
        title: values.title,
        description: values.description,
        contactId: values.contactId || undefined,
        source: values.source,
        status: values.status,
        value: values.value ? parseFloat(values.value) : undefined,
        notes: values.notes,
        expectedCloseDate: values.expectedCloseDate || undefined,
      };

      if (lead) {
        await updateMutation.mutateAsync({ id: lead._id, data: submitData });
      } else {
        await createMutation.mutateAsync(submitData);
      }

      onSuccess();
    } catch (error) {
      console.error('Form submission error:', error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Formik
      initialValues={initialValues}
      validationSchema={validationSchema}
      onSubmit={handleSubmit}
      enableReinitialize
    >
      {/* Form JSX */}
    </Formik>
  );
}
```

---

### 4.3.3 Real-Time Business Logic

#### A. Socket.IO Event Handling
```javascript
// server/src/socket/socketServer.js

export const setupSocket = (io) => {
  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Chat events with business logic
    socket.on('sendMessage', async (data) => {
      const { chatGroupId, content, attachments } = data;
      
      // Validate message
      if (!content.trim() && !attachments?.length) {
        socket.emit('error', { message: 'Message cannot be empty' });
        return;
      }

      try {
        // Save message to database
        const message = await Message.create({
          chatGroupId,
          senderId: socket.handshake.auth.userId,
          content: content.trim(),
          attachments: attachments || [],
        });

        // Populate sender info
        await message.populate('senderId', 'name avatar');

        // Broadcast to all participants
        io.to(chatGroupId).emit('messageReceived', message);

        // Update chat group's last message
        await ChatGroup.findByIdAndUpdate(chatGroupId, {
          lastMessage: content.substring(0, 50),
          lastMessageAt: new Date(),
        });
      } catch (error) {
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Task updates with real-time propagation
    socket.on('subscribeTasks', async () => {
      const userId = socket.handshake.auth.userId;
      socket.join(`tasks-${userId}`);
      
      // Send current tasks
      const tasks = await Task.find({
        assignedTo: userId,
        status: { $ne: 'Done' },
      }).sort({ dueDate: 1 });
      
      socket.emit('currentTasks', tasks);
    });
  });
};
```

#### B. Real-Time Notification System
```javascript
// Business logic: Broadcast notifications
export const createAndNotify = asyncHandler(async (req, res) => {
  const { title, message, type, userIds, relatedEntity } = req.body;

  // Create notification for each user
  const notifications = await Notification.insertMany(
    userIds.map(userId => ({
      title,
      message,
      type,
      userId,
      relatedTo: relatedEntity,
    }))
  );

  // Emit via Socket.io to connected users
  notifications.forEach(notification => {
    req.io.to(`user-${notification.userId}`).emit('notificationReceived', notification);
  });

  res.status(201).json({ notifications });
});
```

---

### 4.3.4 Data Transformation & Enrichment

#### A. Product Review System with Thread Support
```javascript
// Complex business logic: Nested reviews with replies

export const replyToReview = asyncHandler(async (req, res) => {
  const { reviewId } = req.params;
  const { comment } = req.body;

  const review = await Review.findById(reviewId);
  if (!review) {
    return res.status(404).json({ error: 'Review not found' });
  }

  // Business rule: Only product creator or admin can reply
  const product = await Product.findById(review.productId);
  const canReply = 
    product.createdBy.toString() === req.user._id.toString() ||
    req.user.role === 'admin';

  if (!canReply) {
    return res.status(403).json({ error: 'You cannot reply to this review' });
  }

  // Add reply to thread
  const reply = {
    userId: req.user._id,
    comment,
    createdAt: new Date(),
    readBy: [req.user._id],
  };

  review.replies.push(reply);
  await review.save();

  // Notify review author
  await Notification.create({
    title: 'Reply to Your Review',
    message: `${req.user.name} replied to your review`,
    userId: review.customerId,
    relatedTo: { entityType: 'Review', entityId: review._id },
  });

  res.json({ review });
});
```

#### B. Performance Aggregation
```javascript
// Aggregate multiple metrics for dashboard
export const getDashboardMetrics = asyncHandler(async (req, res) => {
  const { startDate, endDate, ownerId } = req.query;
  const userId = ownerId || req.user._id;

  // Deal metrics
  const deals = await Deal.find({
    ownerId: userId,
    createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) },
  });

  const dealsByStage = {
    prospecting: deals.filter(d => d.stage === 'Prospecting').length,
    qualification: deals.filter(d => d.stage === 'Qualification').length,
    proposal: deals.filter(d => d.stage === 'Proposal').length,
    negotiation: deals.filter(d => d.stage === 'Negotiation').length,
    closedWon: deals.filter(d => d.stage === 'Closed Won').length,
    closedLost: deals.filter(d => d.stage === 'Closed Lost').length,
  };

  const totalValue = deals.reduce((sum, d) => sum + (d.value || 0), 0);
  const closedWonValue = deals
    .filter(d => d.stage === 'Closed Won')
    .reduce((sum, d) => sum + d.value, 0);

  // Lead metrics
  const leads = await Lead.find({
    createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) },
  });

  const leadsBySource = {
    website: leads.filter(l => l.source === 'website').length,
    referral: leads.filter(l => l.source === 'referral').length,
    social: leads.filter(l => l.source === 'social').length,
    email: leads.filter(l => l.source === 'email').length,
    phone: leads.filter(l => l.source === 'phone').length,
    other: leads.filter(l => l.source === 'other').length,
  };

  const conversionRate = leads.length > 0
    ? ((leads.filter(l => l.status === 'Converted').length / leads.length) * 100).toFixed(2)
    : 0;

  res.json({
    deals: dealsByStage,
    totalValue,
    closedWonValue,
    leads: leadsBySource,
    conversionRate,
    leadCount: leads.length,
    dealCount: deals.length,
  });
});
```

---

## 4.4 Separation of Business Logic and Page View

### Overview
Clear separation ensures code maintainability, testability, and reusability. The architecture uses **Container/Presentational Pattern** combined with **Custom Hooks**.

---

### 4.4.1 Separation Architecture

#### Tier 1: Data Fetching & Business Logic Layer
```
API Services → React Query Hooks → Business Logic Services
```

#### Tier 2: Container Components (Smart Components)
```
Connected to hooks, manages state, handles side effects
```

#### Tier 3: Presentational Components (Dumb Components)
```
Receives props, renders UI, no data fetching
```

---

### 4.4.2 Example: Lead Management Feature

#### A. Service Layer (Business Logic Only)
```typescript
// src/services/api/leads.ts

export interface Lead {
  _id: string;
  title: string;
  status: 'New' | 'Contacted' | 'Qualified' | 'Lost' | 'Converted';
  value?: number;
  ownerId?: { _id: string; name: string };
  expectedCloseDate?: string;
}

// Pure business logic - no UI concerns
export const getLeads = async (params?: {
  page?: number;
  limit?: number;
  search?: string;
  status?: Lead['status'];
}): Promise<LeadsResponse> => {
  const queryParams = new URLSearchParams();
  if (params?.page) queryParams.append('page', params.page.toString());
  if (params?.limit) queryParams.append('limit', params.limit.toString());
  if (params?.search) queryParams.append('search', params.search);
  if (params?.status) queryParams.append('status', params.status);

  return fetchJson<LeadsResponse>(
    `/leads${queryParams.toString() ? `?${queryParams.toString()}` : ''}`
  );
};

export const createLead = async (data: CreateLeadData): Promise<{ lead: Lead }> => {
  return fetchJson<{ lead: Lead }>('/leads', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};
```

#### B. Query Hook Layer (State Management)
```typescript
// src/hooks/queries/useLeads.tsx

export function useLeads(params?: LeadFilterParams) {
  return useQuery({
    queryKey: ['leads', params],
    queryFn: () => getLeads(params),
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateLead() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: CreateLeadData) => createLead(data),
    onSuccess: () => {
      // Cache invalidation logic
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
  });
}

export function useUpdateLead() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateLeadData }) =>
      updateLead(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
  });
}

export function useDeleteLead() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => deleteLead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
  });
}
```

#### C. Container Component (Smart Component)
```typescript
// src/pages/leads/LeadsListPage.tsx

export function LeadsListPage() {
  const [filters, setFilters] = useState<LeadFilterParams>({
    page: 1,
    limit: 10,
    status: undefined,
  });

  // Business logic + data fetching
  const { data: response, isLoading, error } = useLeads(filters);
  const deleteMutation = useDeleteLead();
  const { success, error: showError } = useToast();

  const handleDelete = async (id: string) => {
    try {
      await deleteMutation.mutateAsync(id);
      success('Lead deleted successfully');
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to delete lead');
    }
  };

  const handleFilterChange = useCallback((newFilters: LeadFilterParams) => {
    setFilters(prev => ({ ...prev, ...newFilters, page: 1 }));
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader title="Leads" description="Manage sales pipeline leads" />

      {/* Pass data and callbacks to presentational component */}
      <LeadsFilter onFilterChange={handleFilterChange} currentFilters={filters} />

      {isLoading ? (
        <DataGridPlaceholder />
      ) : error ? (
        <ErrorMessage message={error.message} />
      ) : (
        <>
          <LeadsTable
            leads={response?.leads || []}
            onDelete={handleDelete}
            onEdit={(id) => {/* navigate to detail */}}
            isDeleting={deleteMutation.isPending}
          />
          
          <Pagination
            page={response?.pagination.page || 1}
            total={response?.pagination.total || 0}
            pageSize={filters.limit || 10}
            onPageChange={(page) => setFilters(prev => ({ ...prev, page }))}
          />
        </>
      )}
    </div>
  );
}
```

#### D. Presentational Component (Dumb Component)
```typescript
// src/components/leads/LeadsTable.tsx

interface LeadsTableProps {
  leads: Lead[];
  onDelete: (id: string) => void;
  onEdit: (id: string) => void;
  isDeleting: boolean;
}

export function LeadsTable({ leads, onDelete, onEdit, isDeleting }: LeadsTableProps) {
  return (
    <div className="rounded-lg bg-[#2D2D30] overflow-hidden">
      <table className="w-full">
        <thead className="bg-[#3C3C42]">
          <tr>
            <th className="px-6 py-3 text-left text-sm font-medium text-gray-300">Title</th>
            <th className="px-6 py-3 text-left text-sm font-medium text-gray-300">Status</th>
            <th className="px-6 py-3 text-left text-sm font-medium text-gray-300">Value</th>
            <th className="px-6 py-3 text-left text-sm font-medium text-gray-300">Owner</th>
            <th className="px-6 py-3 text-left text-sm font-medium text-gray-300">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#3C3C42]">
          {leads.map(lead => (
            <tr key={lead._id} className="hover:bg-[#3C3C42] transition">
              <td className="px-6 py-4 text-sm text-white">{lead.title}</td>
              <td className="px-6 py-4 text-sm">
                <LeadStatusBadge status={lead.status} />
              </td>
              <td className="px-6 py-4 text-sm text-gray-400">
                ${lead.value?.toLocaleString()}
              </td>
              <td className="px-6 py-4 text-sm text-gray-400">
                {lead.ownerId?.name || 'Unassigned'}
              </td>
              <td className="px-6 py-4 text-sm space-x-2">
                <button
                  onClick={() => onEdit(lead._id)}
                  className="text-[#B39CD0] hover:text-[#C9A3E8] transition"
                >
                  Edit
                </button>
                <button
                  onClick={() => onDelete(lead._id)}
                  disabled={isDeleting}
                  className="text-red-400 hover:text-red-300 disabled:opacity-50 transition"
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

#### E. Filter Component (Presentational)
```typescript
// src/components/leads/LeadsFilter.tsx

interface LeadsFilterProps {
  onFilterChange: (filters: LeadFilterParams) => void;
  currentFilters: LeadFilterParams;
}

export function LeadsFilter({ onFilterChange, currentFilters }: LeadsFilterProps) {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<Lead['status'] | undefined>();

  const handleApplyFilters = () => {
    onFilterChange({
      search: search || undefined,
      status: status || undefined,
    });
  };

  return (
    <div className="flex gap-4 items-end">
      <div className="flex-1">
        <label className="block text-sm font-medium text-gray-300 mb-2">Search</label>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search leads..."
          className="w-full px-4 py-2 bg-[#3C3C42] border border-[#4D4D52] rounded"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">Status</label>
        <select
          value={status || ''}
          onChange={(e) => setStatus(e.target.value as Lead['status'] || undefined)}
          className="px-4 py-2 bg-[#3C3C42] border border-[#4D4D52] rounded"
        >
          <option value="">All Statuses</option>
          <option value="New">New</option>
          <option value="Contacted">Contacted</option>
          <option value="Qualified">Qualified</option>
          <option value="Lost">Lost</option>
          <option value="Converted">Converted</option>
        </select>
      </div>

      <button
        onClick={handleApplyFilters}
        className="px-6 py-2 bg-[#B39CD0] text-[#1A1A1C] rounded font-medium hover:bg-[#C9A3E8]"
      >
        Apply Filters
      </button>
    </div>
  );
}
```

---

### 4.4.3 Separation by Feature Examples

#### A. Product Management
```
API Service Layer
  ├── getProducts()
  ├── createProduct()
  ├── uploadProductModel()
  └── getProductReviews()
       ↓
Query Hooks Layer
  ├── useProducts()
  ├── useCreateProduct()
  ├── useProductDetails()
  └── useProductReviews()
       ↓
Container Components (Pages)
  ├── ProductsListPage
  └── ProductDetailPage
       ↓
Presentational Components
  ├── ProductCard
  ├── ProductTable
  ├── ProductForm
  └── ReviewsList
```

#### B. CRM Pipeline
```
API Service Layer
  ├── getLeads()
  ├── createLead()
  ├── convertLeadToDeal()
  ├── getDeals()
  └── updateDealStage()
       ↓
Query Hooks Layer
  ├── useLeads()
  ├── useCreateLead()
  ├── useDeals()
  └── useUpdateDeal()
       ↓
Container Components (Pages)
  ├── LeadsListPage
  ├── DealsListPage
  └── LeadDetailPage
       ↓
Presentational Components
  ├── LeadForm
  ├── DealForm
  ├── SalesPipelineChart
  └── LeadStatusBadge
```

#### C. Chat & Messaging
```
Socket.IO Service Layer
  ├── joinChat()
  ├── sendMessage()
  ├── markAsRead()
  └── typing()
       ↓
Custom Hooks Layer
  ├── useChat()
  ├── useChatMessages()
  └── useTypingStatus()
       ↓
Container Components
  ├── ChatPage
  ├── ChatListPage
  └── MessageThread
       ↓
Presentational Components
  ├── MessageBubble
  ├── ChatInput
  └── ChatSidebar
```

---

## 4.5 Navigation (Flow of Control Across Pages)

### Overview
The navigation is implemented using **React Router v6** with role-based routing, lazy loading, and protected routes.

---

### 4.5.1 Router Configuration

#### A. Main Router Setup
```typescript
// src/routes/router.tsx

import { createBrowserRouter, Navigate } from 'react-router-dom';
import { ProtectedRoute } from '../components/common/ProtectedRoute';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    errorElement: <NotFoundPage />,
    children: [
      // Public Routes
      {
        index: true,
        element: <Navigate to="/auth/login" replace />,
      },

      // Auth Routes (Public)
      {
        path: 'auth',
        children: [
          { path: 'login', element: <LoginPage /> },
          { path: 'register', element: <RegisterPage /> },
          { path: 'forgot-password', element: <ForgotPasswordPage /> },
          { path: 'reset-password/:token', element: <ResetPasswordPage /> },
          { path: 'verify-email/:token', element: <VerifyEmailPage /> },
          { path: 'verify-pending', element: <VerifyPendingPage /> },
          { path: 'success', element: <AuthSuccessPage /> },
          { path: 'signup-success', element: <SignupSuccessPage /> },
          { path: 'google/callback', element: <GoogleLoginCallback /> },
          { path: 'google/signup/callback', element: <GoogleSignupCallback /> },
        ],
      },

      // Customer Routes (Role: customer)
      {
        path: 'customers',
        element: <ProtectedRoute allowedRoles={['customer']} />,
        children: [
          { path: 'products', element: <CustomerProductsPage /> },
          { path: 'products/:id', element: <ProductDetailPage /> },
          { path: 'dashboard', element: <CustomerDashboardPage /> },
        ],
      },

      // Employee/Admin Routes (Role: employee, admin)
      {
        path: 'dashboard',
        element: <ProtectedRoute allowedRoles={['admin', 'employee']} />,
        element: <DashboardPage />,
      },

      // CRM Routes (Employee/Admin)
      {
        path: 'leads',
        element: <ProtectedRoute allowedRoles={['admin', 'employee']} />,
        children: [
          { path: '', element: <LeadsListPage /> },
          { path: ':id', element: <LeadDetailPage /> },
        ],
      },

      {
        path: 'deals',
        element: <ProtectedRoute allowedRoles={['admin', 'employee']} />,
        children: [
          { path: '', element: <DealsListPage /> },
          { path: ':id', element: <DealDetailPage /> },
        ],
      },

      // Admin Routes (Role: admin only)
      {
        path: 'admin',
        element: <ProtectedRoute allowedRoles={['admin']} />,
        children: [
          { path: 'employees', element: <EmployeesListPage /> },
          { path: 'products', element: <AdminProductsListPage /> },
          { path: 'audit', element: <AuditLogView /> },
        ],
      },

      // Settings Routes
      {
        path: 'settings',
        element: <ProtectedRoute allowedRoles={['admin', 'employee', 'customer']} />,
        children: [
          { path: 'profile', element: <ProfileSettingsPage /> },
          { path: 'teams', element: <SettingsTeamsPage /> },
          { path: 'roles', element: <SettingsRolesPage /> },
        ],
      },

      // 404 Route
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);
```

---

### 4.5.2 Protected Route Implementation

```typescript
// src/components/common/ProtectedRoute.tsx

interface ProtectedRouteProps {
  allowedRoles?: string[];
  children?: ReactNode;
}

export function ProtectedRoute({ allowedRoles = [], children }: ProtectedRouteProps) {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <PageLoader />;
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/auth/login" replace />;
  }

  // Check role-based access
  if (allowedRoles.length > 0 && !allowedRoles.includes(user?.role || '')) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children || <Outlet />;
}
```

---

### 4.5.3 Navigation Flow by User Role

#### A. Customer User Flow
```
Login/Register
    ↓
Customer Dashboard
    ├─→ Browse Products
    │    └─→ View Product Details (3D Model)
    │         ├─→ Leave Review
    │         └─→ Back to Products
    ├─→ Profile Settings
    │    ├─→ Update Profile
    │    ├─→ Change Password
    │    └─→ Back to Dashboard
    └─→ Logout
```

#### B. Employee User Flow
```
Login
    ↓
Employee Dashboard (KPIs, Tasks)
    ├─→ Products
    │    ├─→ Create Product
    │    ├─→ Upload 3D Model
    │    ├─→ View Reviews
    │    └─→ Manage Own Products
    ├─→ CRM Pipeline
    │    ├─→ Leads
    │    │    ├─→ Create Lead
    │    │    ├─→ Convert to Deal
    │    │    └─→ View Lead Details
    │    ├─→ Deals
    │    │    ├─→ Update Stage
    │    │    ├─→ Create Invoice
    │    │    └─→ View Deal Details
    │    ├─→ Contacts
    │    ├─→ Companies
    │    └─→ Invoices
    ├─→ Tasks
    │    ├─→ View Assigned Tasks
    │    ├─→ Update Status
    │    └─→ Assign to Others
    ├─→ Chat
    │    ├─→ Send Messages
    │    ├─→ Create Groups
    │    └─→ Join Groups
    ├─→ My Performance
    │    └─→ View KPIs & Analytics
    ├─→ Settings
    │    ├─→ Profile
    │    ├─→ Password
    │    └─→ Theme
    └─→ Logout
```

#### C. Admin User Flow
```
Login
    ↓
Admin Dashboard (Complete System View)
    ├─→ User Management
    │    ├─→ View All Employees
    │    ├─→ Create Employee
    │    ├─→ Promote to Admin
    │    ├─→ View Performance Metrics
    │    └─→ Bulk Upload via CSV
    ├─→ Product Management
    │    ├─→ View All Products
    │    ├─→ Create/Edit Products
    │    ├─→ Upload 3D Models
    │    └─→ Delete Products
    ├─→ CRM Management
    │    ├─→ Leads (Full Access)
    │    ├─→ Deals (Full Access)
    │    ├─→ Contacts (Full Access)
    │    ├─→ Companies (Full Access)
    │    └─→ Invoices (Full Access)
    ├─→ Settings
    │    ├─→ Users
    │    ├─→ Roles & Permissions
    │    ├─→ Teams
    │    ├─→ System Configuration
    │    └─→ Audit Logs
    ├─→ Analytics & Reports
    │    ├─→ Sales Pipeline
    │    ├─→ Revenue Metrics
    │    ├─→ Performance Charts
    │    └─→ Export Reports (PDF)
    └─→ Logout
```

---

### 4.5.4 Navigation Patterns

#### A. Link Navigation
```typescript
// Using React Router Link
import { Link } from 'react-router-dom';

<Link to="/leads" className="text-blue-500">
  View All Leads
</Link>

// Link with state
<Link
  to={`/deals/${dealId}`}
  state={{ from: '/dashboard' }}
>
  View Deal
</Link>
```

#### B. Programmatic Navigation
```typescript
// Using useNavigate hook
import { useNavigate } from 'react-router-dom';

export function LeadForm() {
  const navigate = useNavigate();

  const handleSuccess = () => {
    navigate('/leads', { state: { message: 'Lead created successfully' } });
  };

  return <form onSubmit={handleSuccess}>{/* form */}</form>;
}
```

#### C. Conditional Navigation
```typescript
// Role-based navigation
function DefaultRedirect() {
  const { user, isAuthenticated } = useAuth();
  
  if (isAuthenticated && user) {
    if (user.role === 'admin' || user.role === 'employee') {
      return <Navigate to="/dashboard" replace />;
    }
    return <Navigate to="/customers/dashboard" replace />;
  }
  
  return <Navigate to="/auth/login" replace />;
}
```

#### D. Breadcrumb Navigation
```typescript
// src/components/common/Breadcrumb.tsx

export function Breadcrumb({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav className="flex items-center space-x-2 text-sm text-gray-400">
      {items.map((item, index) => (
        <React.Fragment key={index}>
          {index > 0 && <span>/</span>}
          {item.href ? (
            <Link to={item.href} className="hover:text-white">
              {item.label}
            </Link>
          ) : (
            <span className="text-white">{item.label}</span>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
}

// Usage
<Breadcrumb
  items={[
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Leads', href: '/leads' },
    { label: 'New Lead' },
  ]}
/>
```

---

## 4.6 Server-Side Validations

### Overview
Server-side validations ensure data integrity, security, and business rule compliance. All validations run on the backend before database operations.

---

### 4.6.1 Validation Middleware Architecture

#### A. Validation Utility Setup
```javascript
// server/src/utils/validation.js

import { body, validationResult } from 'express-validator';

export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array().map(err => ({
        field: err.param,
        message: err.msg,
        value: err.value,
      })),
    });
  }
  next();
};
```

---

### 4.6.2 Authentication Validations

#### A. Registration Validation
```javascript
export const registerValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters'),

  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail()
    .custom(async (email) => {
      // Check if email already exists
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        throw new Error('Email already registered');
      }
    }),

  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters')
    .matches(/[A-Z]/)
    .withMessage('Password must contain at least one uppercase letter')
    .matches(/[a-z]/)
    .withMessage('Password must contain at least one lowercase letter')
    .matches(/[0-9]/)
    .withMessage('Password must contain at least one number'),

  body('phone.countryCode')
    .notEmpty()
    .withMessage('Country code is required')
    .matches(/^\+\d{1,4}$/)
    .withMessage('Invalid country code format'),

  body('phone.number')
    .notEmpty()
    .withMessage('Phone number is required')
    .matches(/^[\d\s-()]+$/)
    .withMessage('Invalid phone number format')
    .isLength({ min: 7, max: 20 })
    .withMessage('Phone number must be between 7 and 20 characters'),

  handleValidationErrors,
];

// Usage in route
router.post('/register', registerValidation, authController.register);
```

#### B. Login Validation
```javascript
export const loginValidation = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),

  body('password')
    .notEmpty()
    .withMessage('Password is required'),

  handleValidationErrors,
];
```

---

### 4.6.3 CRM Entity Validations

#### A. Lead Validation
```javascript
export const createLeadValidation = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Title is required')
    .isLength({ min: 3, max: 100 })
    .withMessage('Title must be between 3 and 100 characters'),

  body('source')
    .notEmpty()
    .withMessage('Source is required')
    .isIn(['website', 'referral', 'social', 'email', 'phone', 'other'])
    .withMessage('Invalid source'),

  body('status')
    .optional()
    .isIn(['New', 'Contacted', 'Qualified', 'Lost', 'Converted'])
    .withMessage('Invalid status'),

  body('value')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Value must be a positive number'),

  body('contactId')
    .optional()
    .isMongoId()
    .withMessage('Invalid contact ID'),

  body('companyId')
    .optional()
    .isMongoId()
    .withMessage('Invalid company ID'),

  body('ownerId')
    .optional()
    .isMongoId()
    .withMessage('Invalid owner ID'),

  body('expectedCloseDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid date format')
    .custom((date) => {
      if (new Date(date) < new Date()) {
        throw new Error('Expected close date must be in the future');
      }
      return true;
    }),

  handleValidationErrors,
];
```

#### B. Deal Validation
```javascript
export const createDealValidation = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Title is required')
    .isLength({ min: 3, max: 100 })
    .withMessage('Title must be between 3 and 100 characters'),

  body('stage')
    .notEmpty()
    .withMessage('Stage is required')
    .isIn(['Prospecting', 'Qualification', 'Proposal', 'Negotiation', 'Closed Won', 'Closed Lost'])
    .withMessage('Invalid stage'),

  body('value')
    .notEmpty()
    .withMessage('Value is required')
    .isFloat({ min: 0 })
    .withMessage('Value must be a positive number'),

  body('probability')
    .optional()
    .isInt({ min: 0, max: 100 })
    .withMessage('Probability must be between 0 and 100'),

  body('closeDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid date format'),

  body('ownerId')
    .optional()
    .isMongoId()
    .withMessage('Invalid owner ID'),

  handleValidationErrors,
];
```

#### C. Invoice Validation
```javascript
export const createInvoiceValidation = [
  body('invoiceNumber')
    .trim()
    .notEmpty()
    .withMessage('Invoice number is required')
    .custom(async (invoiceNumber, { req }) => {
      const existing = await Invoice.findOne({
        invoiceNumber,
        tenantId: req.user.tenantId,
      });
      if (existing) {
        throw new Error('Invoice number already exists');
      }
    }),

  body('contactId')
    .notEmpty()
    .withMessage('Contact is required')
    .isMongoId()
    .withMessage('Invalid contact ID')
    .custom(async (contactId, { req }) => {
      const contact = await Contact.findOne({
        _id: contactId,
        tenantId: req.user.tenantId,
      });
      if (!contact) {
        throw new Error('Contact not found');
      }
    }),

  body('lineItems')
    .isArray({ min: 1 })
    .withMessage('At least one line item is required'),

  body('lineItems.*.description')
    .notEmpty()
    .withMessage('Item description is required'),

  body('lineItems.*.quantity')
    .isInt({ min: 1 })
    .withMessage('Quantity must be at least 1'),

  body('lineItems.*.unitPrice')
    .isFloat({ min: 0 })
    .withMessage('Unit price must be a positive number'),

  body('lineItems.*.taxRate')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('Tax rate must be between 0 and 100'),

  body('dueDate')
    .isISO8601()
    .withMessage('Invalid date format')
    .custom((date) => {
      if (new Date(date) < new Date()) {
        throw new Error('Due date must be in the future');
      }
      return true;
    }),

  body('status')
    .optional()
    .isIn(['Draft', 'Sent', 'Paid', 'Overdue', 'Cancelled'])
    .withMessage('Invalid status'),

  handleValidationErrors,
];
```

---

### 4.6.4 Product & Review Validations

#### A. Product Validation
```javascript
export const createProductValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Product name is required')
    .isLength({ min: 3, max: 100 })
    .withMessage('Name must be between 3 and 100 characters'),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 5000 })
    .withMessage('Description too long'),

  body('price')
    .notEmpty()
    .withMessage('Price is required')
    .isFloat({ min: 0 })
    .withMessage('Price must be a positive number'),

  body('sku')
    .trim()
    .notEmpty()
    .withMessage('SKU is required')
    .matches(/^[A-Z0-9-]+$/)
    .withMessage('SKU must contain only uppercase letters, numbers, and hyphens')
    .custom(async (sku, { req }) => {
      const existing = await Product.findOne({
        sku,
        tenantId: req.user.tenantId,
      });
      if (existing) {
        throw new Error('SKU already exists');
      }
    }),

  body('category')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Category must be between 2 and 50 characters'),

  handleValidationErrors,
];
```

#### B. Review Validation
```javascript
export const createReviewValidation = [
  body('productId')
    .notEmpty()
    .withMessage('Product is required')
    .isMongoId()
    .withMessage('Invalid product ID')
    .custom(async (productId) => {
      const product = await Product.findById(productId);
      if (!product) {
        throw new Error('Product not found');
      }
    }),

  body('rating')
    .notEmpty()
    .withMessage('Rating is required')
    .isInt({ min: 1, max: 5 })
    .withMessage('Rating must be between 1 and 5'),

  body('comment')
    .trim()
    .notEmpty()
    .withMessage('Comment is required')
    .isLength({ min: 10, max: 1000 })
    .withMessage('Comment must be between 10 and 1000 characters'),

  handleValidationErrors,
];
```

---

### 4.6.5 Authorization & Business Rule Validations

#### A. Product Ownership Check
```javascript
// Middleware: Check if user owns the product
export const checkProductOwnership = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Admin can edit any product
    if (req.user.role === 'admin') {
      return next();
    }

    // Employee can only edit their own products
    if (req.user.role === 'employee' && product.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'You can only edit your own products' });
    }

    next();
  } catch (error) {
    return res.status(500).json({ error: 'Error checking product ownership' });
  }
};
```

#### B. Role-Based Access Control
```javascript
// Middleware: Require admin role
export const requireAdmin = [
  authenticate,
  (req, res, next) => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    next();
  },
];

// Middleware: Require employee or admin
export const requireEmployeeOrAdmin = [
  authenticate,
  (req, res, next) => {
    if (req.user.role !== 'employee' && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Employee or Admin access required' });
    }
    next();
  },
];

// Usage in routes
router.post('/leads', requireEmployeeOrAdmin, createLeadValidation, createLead);
router.delete('/leads/:id', requireEmployeeOrAdmin, deleteLead);
router.get('/admin/employees', requireAdmin, getEmployees);
```

#### C. Tenant Isolation
```javascript
// Validation: Ensure user can only access their own tenant's data
export const validateTenantAccess = async (req, res, next) => {
  const resource = await Lead.findById(req.params.id);

  if (!resource) {
    return res.status(404).json({ error: 'Resource not found' });
  }

  // Check tenant match
  if (resource.tenantId !== req.user.tenantId) {
    return res.status(403).json({ error: 'Access denied' });
  }

  next();
};

// Usage
router.get('/leads/:id', validateTenantAccess, getLead);
```

---

### 4.6.6 File Upload Validations

```javascript
// Multer configuration with validations
import multer from 'multer';

const fileFilter = (req, file, cb) => {
  // Only allow specific file types
  const allowedMimes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'model/gltf+json',
    'model/gltf-binary',
    'application/octet-stream', // GLB files
  ];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type'));
  }
};

const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB
  },
  fileFilter,
});

// Usage
router.post('/products/:id/model', upload.single('model'), uploadProductModel);
```

---

## 4.7 Client-Side Validations

### Overview
Client-side validations provide immediate user feedback, improve UX, and reduce unnecessary server requests while maintaining security through server-side validation.

---

### 4.7.1 Formik + Yup Validation Pattern

#### A. Setup & Validation Schema
```typescript
// src/components/leads/LeadForm.tsx

import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';

// Define validation schema
const validationSchema = Yup.object({
  title: Yup.string()
    .required('Title is required')
    .min(3, 'Title must be at least 3 characters')
    .max(100, 'Title must not exceed 100 characters'),

  description: Yup.string()
    .max(500, 'Description must not exceed 500 characters'),

  contactId: Yup.string()
    .required('Contact is required'),

  source: Yup.string()
    .oneOf(['website', 'referral', 'social', 'email', 'phone', 'other'], 'Invalid source')
    .required('Source is required'),

  status: Yup.string()
    .oneOf(['New', 'Contacted', 'Qualified', 'Lost', 'Converted'], 'Invalid status')
    .required('Status is required'),

  value: Yup.number()
    .min(0, 'Value must be positive')
    .optional()
    .nullable(),

  expectedCloseDate: Yup.date()
    .min(new Date(), 'Date must be in the future')
    .optional()
    .nullable(),

  notes: Yup.string()
    .max(1000, 'Notes must not exceed 1000 characters'),
});

export function LeadForm({ lead, isOpen, onSuccess, onCancel }: LeadFormProps) {
  const createMutation = useCreateLead();
  const updateMutation = useUpdateLead();

  const initialValues: LeadFormValues = {
    title: lead?.title || '',
    description: lead?.description || '',
    contactId: lead?.contactId?._id || '',
    source: lead?.source || 'website',
    status: lead?.status || 'New',
    value: lead?.value?.toString() || '',
    expectedCloseDate: lead?.expectedCloseDate?.split('T')[0] || '',
    notes: lead?.notes || '',
  };

  const handleSubmit = async (values: LeadFormValues, { setSubmitting }: FormikHelpers<LeadFormValues>) => {
    try {
      const submitData: CreateLeadData = {
        title: values.title,
        description: values.description || undefined,
        contactId: values.contactId || undefined,
        source: values.source as Lead['source'],
        status: values.status as Lead['status'],
        value: values.value ? parseFloat(values.value) : undefined,
        expectedCloseDate: values.expectedCloseDate || undefined,
        notes: values.notes || undefined,
      };

      if (lead) {
        await updateMutation.mutateAsync({ id: lead._id, data: submitData });
      } else {
        await createMutation.mutateAsync(submitData);
      }

      onSuccess();
    } catch (error) {
      console.error('Form submission error:', error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Formik
      initialValues={initialValues}
      validationSchema={validationSchema}
      onSubmit={handleSubmit}
      enableReinitialize
      validateOnChange
      validateOnBlur
    >
      {({ errors, touched, isSubmitting, values }) => (
        <Form className="space-y-4">
          {/* Title Field */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Title <span className="text-red-400">*</span>
            </label>
            <Field
              type="text"
              name="title"
              placeholder="Enter lead title"
              className="w-full px-4 py-2 bg-[#3C3C42] border border-[#4D4D52] rounded text-white"
            />
            {errors.title && touched.title && (
              <ErrorMessage name="title">
                {(msg) => <div className="text-red-400 text-sm mt-1">{msg}</div>}
              </ErrorMessage>
            )}
          </div>

          {/* Source Dropdown */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Source <span className="text-red-400">*</span>
            </label>
            <Field
              as="select"
              name="source"
              className="w-full px-4 py-2 bg-[#3C3C42] border border-[#4D4D52] rounded text-white"
            >
              <option value="">Select source</option>
              <option value="website">Website</option>
              <option value="referral">Referral</option>
              <option value="social">Social Media</option>
              <option value="email">Email</option>
              <option value="phone">Phone</option>
              <option value="other">Other</option>
            </Field>
            {errors.source && touched.source && (
              <ErrorMessage name="source">
                {(msg) => <div className="text-red-400 text-sm mt-1">{msg}</div>}
              </ErrorMessage>
            )}
          </div>

          {/* Value Field with Number Validation */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Value
            </label>
            <Field
              type="number"
              name="value"
              placeholder="0.00"
              step="0.01"
              min="0"
              className="w-full px-4 py-2 bg-[#3C3C42] border border-[#4D4D52] rounded text-white"
            />
            {errors.value && touched.value && (
              <ErrorMessage name="value">
                {(msg) => <div className="text-red-400 text-sm mt-1">{msg}</div>}
              </ErrorMessage>
            )}
          </div>

          {/* Date Field */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Expected Close Date
            </label>
            <Field
              type="date"
              name="expectedCloseDate"
              min={new Date().toISOString().split('T')[0]}
              className="w-full px-4 py-2 bg-[#3C3C42] border border-[#4D4D52] rounded text-white"
            />
            {errors.expectedCloseDate && touched.expectedCloseDate && (
              <ErrorMessage name="expectedCloseDate">
                {(msg) => <div className="text-red-400 text-sm mt-1">{msg}</div>}
              </ErrorMessage>
            )}
          </div>

          {/* Submit Buttons */}
          <div className="flex gap-4 pt-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 bg-[#B39CD0] text-[#1A1A1C] rounded font-medium py-2 hover:bg-[#C9A3E8] disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : lead ? 'Update' : 'Create'}
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 bg-[#3C3C42] text-gray-300 rounded font-medium py-2 hover:bg-[#4D4D52]"
            >
              Cancel
            </button>
          </div>
        </Form>
      )}
    </Formik>
  );
}
```

---

### 4.7.2 Real-Time Field Validation

#### A. Email Validation with Debounce
```typescript
// src/components/auth/RegisterForm.tsx

import { useState, useCallback } from 'react';
import { debounce } from 'lodash';
import { checkEmailExists } from '../../services/api/auth';

interface EmailFieldProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
}

export function EmailField({ value, onChange, error }: EmailFieldProps) {
  const [isChecking, setIsChecking] = useState(false);
  const [emailError, setEmailError] = useState<string>('');

  // Debounced email availability check
  const checkEmailAvailability = useCallback(
    debounce(async (email: string) => {
      if (!email || !isValidEmail(email)) {
        setEmailError('');
        return;
      }

      setIsChecking(true);
      try {
        const exists = await checkEmailExists(email);
        setEmailError(exists ? 'Email already registered' : '');
      } catch (err) {
        setEmailError('Could not verify email');
      } finally {
        setIsChecking(false);
      }
    }, 500),
    []
  );

  const handleChange = (newValue: string) => {
    onChange(newValue);
    checkEmailAvailability(newValue);
  };

  const isValidEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-300 mb-2">
        Email
      </label>
      <div className="relative">
        <input
          type="email"
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          placeholder="your@email.com"
          className="w-full px-4 py-2 bg-[#3C3C42] border border-[#4D4D52] rounded text-white"
        />
        {isChecking && (
          <div className="absolute right-3 top-2.5">
            <div className="animate-spin h-5 w-5 border-2 border-[#B39CD0] border-t-transparent rounded-full"></div>
          </div>
        )}
      </div>
      {(error || emailError) && (
        <p className="text-red-400 text-sm mt-1">{error || emailError}</p>
      )}
    </div>
  );
}
```

#### B. Password Strength Indicator
```typescript
// src/components/auth/PasswordStrengthIndicator.tsx

interface PasswordStrengthIndicatorProps {
  password: string;
}

export function PasswordStrengthIndicator({ password }: PasswordStrengthIndicatorProps) {
  const calculateStrength = () => {
    let strength = 0;

    if (password.length >= 8) strength++;
    if (password.match(/[a-z]/) && password.match(/[A-Z]/)) strength++;
    if (password.match(/\d/)) strength++;
    if (password.match(/[^A-Za-z\d]/)) strength++;

    return strength;
  };

  const strength = calculateStrength();
  const strengthLabels = ['Weak', 'Fair', 'Good', 'Strong', 'Very Strong'];
  const strengthColors = ['red-500', 'orange-500', 'yellow-500', 'lime-500', 'green-500'];

  return (
    <div className="space-y-2">
      <div className="flex gap-1">
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded ${
              i < strength ? `bg-${strengthColors[strength - 1]}` : 'bg-gray-600'
            }`}
          />
        ))}
      </div>
      <p className="text-sm text-gray-400">
        Strength: <span className="text-white">{strengthLabels[strength - 1] || 'Too weak'}</span>
      </p>
    </div>
  );
}
```

---

### 4.7.3 Form-Level Validation

#### A. Registration Form with Multiple Validations
```typescript
// src/pages/auth/RegisterPage.tsx

const registrationSchema = Yup.object({
  name: Yup.string()
    .required('Name is required')
    .min(2, 'Name must be at least 2 characters')
    .max(50, 'Name must not exceed 50 characters'),

  email: Yup.string()
    .required('Email is required')
    .email('Invalid email address')
    .test('email-format', 'Invalid email format', (value) => {
      return !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
    }),

  password: Yup.string()
    .required('Password is required')
    .min(6, 'Password must be at least 6 characters')
    .matches(/[A-Z]/, 'Password must contain uppercase letter')
    .matches(/[a-z]/, 'Password must contain lowercase letter')
    .matches(/[0-9]/, 'Password must contain number'),

  confirmPassword: Yup.string()
    .required('Please confirm your password')
    .oneOf([Yup.ref('password')], 'Passwords must match'),

  phone: Yup.object({
    countryCode: Yup.string()
      .required('Country code required')
      .matches(/^\+\d{1,4}$/, 'Invalid country code'),
    number: Yup.string()
      .required('Phone number required')
      .matches(/^[\d\s-()]+$/, 'Invalid phone format')
      .min(7, 'Phone must be at least 7 characters'),
  }),

  agreeToTerms: Yup.boolean()
    .oneOf([true], 'You must agree to terms and conditions'),
});

export function RegisterPage() {
  const navigate = useNavigate();
  const { registerMutation } = useRegister();

  return (
    <Formik
      initialValues={{
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
        phone: { countryCode: '+1', number: '' },
        agreeToTerms: false,
      }}
      validationSchema={registrationSchema}
      onSubmit={async (values) => {
        try {
          await registerMutation.mutateAsync({
            name: values.name,
            email: values.email,
            password: values.password,
            phone: values.phone,
          });
          navigate('/auth/verify-pending');
        } catch (error) {
          console.error('Registration failed:', error);
        }
      }}
    >
      {/* Form fields */}
    </Formik>
  );
}
```

---

### 4.7.4 Dynamic Field Validation

#### A. Conditional Required Fields
```typescript
// Validation schema with conditional requirements

const dealSchema = Yup.object({
  title: Yup.string().required('Title is required'),
  stage: Yup.string().required('Stage is required'),
  
  // Value is required only for certain stages
  value: Yup.number().when('stage', {
    is: (stage) => ['Proposal', 'Negotiation', 'Closed Won', 'Closed Lost'].includes(stage),
    then: (schema) => schema.required('Value is required for this stage').min(0),
    otherwise: (schema) => schema.optional(),
  }),

  // Close date is required only for closed deals
  closeDate: Yup.date().when('stage', {
    is: (stage) => ['Closed Won', 'Closed Lost'].includes(stage),
    then: (schema) => schema.required('Close date is required for closed deals'),
    otherwise: (schema) => schema.optional(),
  }),
});
```

#### B. Cross-Field Validation
```typescript
// Invoice line items validation with totals

const invoiceSchema = Yup.object({
  lineItems: Yup.array()
    .min(1, 'At least one line item required')
    .of(
      Yup.object({
        description: Yup.string().required('Description required'),
        quantity: Yup.number().min(1, 'Quantity must be at least 1'),
        unitPrice: Yup.number().min(0, 'Unit price must be positive'),
      })
    )
    .test('total-validation', 'Total must be greater than zero', function (lineItems) {
      if (!lineItems) return true;
      const total = lineItems.reduce((sum, item) => {
        const subtotal = (item.quantity || 0) * (item.unitPrice || 0);
        const tax = subtotal * ((item.taxRate || 0) / 100);
        return sum + subtotal + tax;
      }, 0);
      return total > 0;
    }),
});
```

---

### 4.7.5 Async Field Validation

```typescript
// src/hooks/useAsyncValidation.ts

export function useAsyncValidation() {
  const checkEmailExists = useCallback(async (email: string): Promise<boolean> => {
    try {
      const response = await fetch(`${API_URL}/auth/check-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();
      return data.exists;
    } catch (error) {
      console.error('Email check failed:', error);
      return false;
    }
  }, []);

  const checkSkuExists = useCallback(async (sku: string): Promise<boolean> => {
    try {
      const response = await fetch(`${API_URL}/products/check-sku`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sku }),
      });
      const data = await response.json();
      return data.exists;
    } catch (error) {
      return false;
    }
  }, []);

  return { checkEmailExists, checkSkuExists };
}

// Usage in validation schema
const productSchema = Yup.object({
  sku: Yup.string()
    .required('SKU required')
    .test('sku-exists', 'SKU already in use', async (value) => {
      if (!value) return true;
      const exists = await asyncValidation.checkSkuExists(value);
      return !exists;
    }),
});
```

---

### 4.7.6 Custom Validation Components

#### A. Form Validation Summary
```typescript
// src/components/common/FormValidationSummary.tsx

interface ValidationError {
  field: string;
  message: string;
}

interface FormValidationSummaryProps {
  errors: ValidationError[];
}

export function FormValidationSummary({ errors }: FormValidationSummaryProps) {
  if (errors.length === 0) return null;

  return (
    <div className="rounded-lg bg-red-900/20 border border-red-500/50 p-4">
      <h3 className="font-medium text-red-400 mb-2">Please fix the following errors:</h3>
      <ul className="space-y-1">
        {errors.map((error, index) => (
          <li key={index} className="text-sm text-red-300 flex items-start gap-2">
            <span className="mt-1">•</span>
            <span>
              <strong>{error.field}:</strong> {error.message}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// Usage
<FormValidationSummary
  errors={Object.entries(errors).map(([field, message]) => ({
    field,
    message: message as string,
  }))}
/>
```

#### B. Field-Level Validation Feedback
```typescript
// src/components/common/FormField.tsx

interface FormFieldProps {
  label: string;
  name: string;
  type?: string;
  value: string;
  error?: string;
  touched?: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBlur: (e: React.FocusEvent<HTMLInputElement>) => void;
  required?: boolean;
  placeholder?: string;
}

export function FormField({
  label,
  name,
  type = 'text',
  value,
  error,
  touched,
  onChange,
  onBlur,
  required = false,
  placeholder,
}: FormFieldProps) {
  const hasError = touched && !!error;

  return (
    <div className="space-y-2">
      <label htmlFor={name} className="block text-sm font-medium text-gray-300">
        {label}
        {required && <span className="text-red-400 ml-1">*</span>}
      </label>
      <div className="relative">
        <input
          id={name}
          name={name}
          type={type}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          placeholder={placeholder}
          className={`w-full px-4 py-2 rounded border transition ${
            hasError
              ? 'border-red-500 bg-red-900/10 text-red-100'
              : 'border-[#4D4D52] bg-[#3C3C42] text-white'
          }`}
        />
        {hasError && (
          <div className="absolute right-3 top-2.5 text-red-400">
            <AlertCircle size={20} />
          </div>
        )}
      </div>
      {hasError && (
        <p className="text-red-400 text-sm flex items-center gap-1">
          <AlertCircle size={16} />
          {error}
        </p>
      )}
    </div>
  );
}
```

---

### 4.7.7 Validation Best Practices

#### Summary Table
| Aspect | Best Practice | Implementation |
|--------|--------------|-----------------|
| **Email** | Real-time availability check | Debounced API call with loading state |
| **Password** | Strength indicator + requirements | Pattern matching + visual feedback |
| **Numbers** | Min/Max with step | HTML5 input type + Yup constraints |
| **Dates** | Future date validation | `min` attribute + custom validation |
| **Conditionals** | Dynamic requirements | Yup `.when()` for conditional fields |
| **Cross-Field** | Matching values (e.g., passwords) | Yup refs & custom tests |
| **Async** | Availability checks | Debounced async validators |
| **Display** | Clear, actionable errors | Field-level + form-level summaries |

---

## Summary

This comprehensive documentation covers:

1. **4.3 Business Logic**: Service layer patterns, controllers, CRUD operations, complex workflows, error handling
2. **4.4 Separation of Concerns**: API services → Hooks → Containers → Presentational components
3. **4.5 Navigation**: Router configuration, protected routes, role-based flows
4. **4.6 Server Validations**: Middleware, express-validator, auth, CRM, file uploads, RBAC
5. **4.7 Client Validations**: Formik/Yup, real-time feedback, async validation, custom components

All sections include actual code examples from your ERP-CRM-Zentro project.
