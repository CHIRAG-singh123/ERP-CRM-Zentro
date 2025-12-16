import Task from '../models/Task.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { getIO } from '../socket/socketServer.js';

// @desc    Get all tasks
// @route   GET /api/tasks
// @access  Private (Admin/Employee only, customers cannot access)
export const getTasks = asyncHandler(async (req, res) => {
  // Restrict access: customers cannot view tasks
  if (req.user.role === 'customer') {
    return res.status(403).json({ error: 'Access denied. Customers cannot view tasks.' });
  }

  const { page = 1, limit = 10, status, assignedTo, dueDate, startDate, endDate } = req.query;
  const skip = (page - 1) * limit;

  const query = {};
  if (req.user.tenantId) {
    query.tenantId = req.user.tenantId;
  }
  if (status) {
    query.status = status;
  }
  if (assignedTo) {
    query.assignedTo = assignedTo;
  } else if (req.user.role !== 'admin') {
    // Employees can only see tasks where they are in the assignedTo array
    query.assignedTo = { $in: [req.user._id] };
  }
  
  // Date filtering logic:
  // - Only apply date filters when explicitly provided
  // - If no date params provided, return ALL tasks (including those without dueDate)
  if (startDate || endDate) {
    // Date range filter (for week/month filters)
    query.dueDate = {};
    if (startDate) {
      query.dueDate.$gte = new Date(startDate);
    }
    if (endDate) {
      query.dueDate.$lte = new Date(endDate);
    }
  } else if (dueDate) {
    // Single date filter (for overdue filter)
    query.dueDate = { $lte: new Date(dueDate) };
  }
  // If no date params provided, don't add dueDate filter - return all tasks

  const tasks = await Task.find(query)
    .skip(skip)
    .limit(parseInt(limit))
    .sort({ dueDate: 1, createdAt: -1 })
    .populate('assignedTo', 'name email')
    .populate('createdBy', 'name email');

  const total = await Task.countDocuments(query);

  res.json({
    tasks,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit),
    },
  });
});

// @desc    Get single task
// @route   GET /api/tasks/:id
// @access  Private (Admin/Employee only, customers cannot access)
export const getTask = asyncHandler(async (req, res) => {
  // Restrict access: customers cannot view tasks
  if (req.user.role === 'customer') {
    return res.status(403).json({ error: 'Access denied. Customers cannot view tasks.' });
  }

  const query = { _id: req.params.id };
  if (req.user.tenantId) {
    query.tenantId = req.user.tenantId;
  }

  const task = await Task.findOne(query)
    .populate('assignedTo', 'name email')
    .populate('createdBy', 'name email');

  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }

  // Employees can only view tasks assigned to them
  if (req.user.role !== 'admin') {
    const assignedToArray = Array.isArray(task.assignedTo) ? task.assignedTo : [task.assignedTo];
    const assignedToIds = assignedToArray
      .filter(Boolean)
      .map((user) => (user._id ? user._id.toString() : user.toString()));
    if (!assignedToIds.includes(req.user._id.toString())) {
      return res.status(403).json({ error: 'Access denied. You can only view tasks assigned to you.' });
    }
  }

  // Ensure assignedTo is always an array in response
  const taskObj = task.toObject();
  if (taskObj.assignedTo && !Array.isArray(taskObj.assignedTo)) {
    taskObj.assignedTo = [taskObj.assignedTo];
  } else if (!taskObj.assignedTo) {
    taskObj.assignedTo = [];
  }

  res.json({ task: taskObj });
});

// @desc    Create task
// @route   POST /api/tasks
// @access  Private (Admin only)
export const createTask = asyncHandler(async (req, res) => {
  // Only admin can create tasks
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied. Only admins can create tasks.' });
  }

  // Handle assignedTo as array - convert single value to array if needed
  let assignedToArray = [];
  if (req.body.assignedTo) {
    assignedToArray = Array.isArray(req.body.assignedTo) ? req.body.assignedTo : [req.body.assignedTo];
  }

  const taskData = {
    ...req.body,
    assignedTo: assignedToArray.length > 0 ? assignedToArray : [],
    createdBy: req.user._id,
    tenantId: req.user.tenantId,
  };

  const task = await Task.create(taskData);
  const populatedTask = await Task.findById(task._id)
    .populate('assignedTo', 'name email')
    .populate('createdBy', 'name email');
  
  // Emit socket event to all assigned users
  const io = getIO();
  const taskObj = populatedTask.toObject ? populatedTask.toObject() : JSON.parse(JSON.stringify(populatedTask));
  
  // Ensure assignedTo is an array
  const assignedToIds = Array.isArray(taskObj.assignedTo) 
    ? taskObj.assignedTo.map(u => u._id?.toString() || u.toString())
    : taskObj.assignedTo 
      ? [taskObj.assignedTo._id?.toString() || taskObj.assignedTo.toString()]
      : [];
  
  // Emit to all assigned users
  assignedToIds.forEach((userId) => {
    io.to(`user:${userId}`).emit('taskCreated', taskObj);
  });
  
  // Emit dashboard metrics update to all dashboard viewers
  io.emit('dashboardMetricsUpdated');
  
  res.status(201).json({ task: populatedTask });
});

// @desc    Update task
// @route   PUT /api/tasks/:id
// @access  Private (Admin only)
export const updateTask = asyncHandler(async (req, res) => {
  // Only admin can update tasks
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied. Only admins can update tasks.' });
  }

  const query = { _id: req.params.id };
  if (req.user.tenantId) {
    query.tenantId = req.user.tenantId;
  }

  if (req.body.status === 'Done' && !req.body.completedDate) {
    req.body.completedDate = new Date();
  }

  // Handle assignedTo as array - convert single value to array if needed
  if (req.body.assignedTo !== undefined) {
    if (Array.isArray(req.body.assignedTo)) {
      req.body.assignedTo = req.body.assignedTo;
    } else if (req.body.assignedTo) {
      req.body.assignedTo = [req.body.assignedTo];
    } else {
      req.body.assignedTo = [];
    }
  }

  // Get old task to find previous assignees
  const oldTask = await Task.findOne(query).populate('assignedTo', 'name email');
  
  const task = await Task.findOneAndUpdate(query, req.body, {
    new: true,
    runValidators: true,
  })
    .populate('assignedTo', 'name email')
    .populate('createdBy', 'name email');

  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }

  // Emit socket event to all assigned users (old and new)
  const io = getIO();
  const taskObj = task.toObject ? task.toObject() : JSON.parse(JSON.stringify(task));
  
  // Get all user IDs who should be notified (old assignees + new assignees)
  const oldAssignedToIds = oldTask && oldTask.assignedTo
    ? (Array.isArray(oldTask.assignedTo) 
        ? oldTask.assignedTo.map(u => u._id?.toString() || u.toString())
        : [oldTask.assignedTo._id?.toString() || oldTask.assignedTo.toString()])
    : [];
  
  const newAssignedToIds = Array.isArray(taskObj.assignedTo)
    ? taskObj.assignedTo.map(u => u._id?.toString() || u.toString())
    : taskObj.assignedTo
      ? [taskObj.assignedTo._id?.toString() || taskObj.assignedTo.toString()]
      : [];
  
  // Combine and deduplicate
  const allAssignedToIds = [...new Set([...oldAssignedToIds, ...newAssignedToIds])];
  
  // Emit to all assigned users
  allAssignedToIds.forEach((userId) => {
    io.to(`user:${userId}`).emit('taskUpdated', taskObj);
  });
  
  // Emit dashboard metrics update
  io.emit('dashboardMetricsUpdated');

  res.json({ task });
});

// @desc    Delete task
// @route   DELETE /api/tasks/:id
// @access  Private (Admin only)
export const deleteTask = asyncHandler(async (req, res) => {
  // Only admin can delete tasks
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied. Only admins can delete tasks.' });
  }

  const query = { _id: req.params.id };
  if (req.user.tenantId) {
    query.tenantId = req.user.tenantId;
  }

  // Get task before deletion to notify assigned users
  const task = await Task.findOne(query).populate('assignedTo', 'name email');

  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }

  // Get assigned user IDs before deletion
  const assignedToIds = task.assignedTo
    ? (Array.isArray(task.assignedTo)
        ? task.assignedTo.map(u => u._id?.toString() || u.toString())
        : [task.assignedTo._id?.toString() || task.assignedTo.toString()])
    : [];

  // Delete the task
  await Task.findOneAndDelete(query);

  // Emit socket event to all assigned users
  const io = getIO();
  assignedToIds.forEach((userId) => {
    io.to(`user:${userId}`).emit('taskDeleted', {
      taskId: task._id.toString(),
      deletedBy: req.user._id.toString(),
    });
  });
  
  // Emit dashboard metrics update
  io.emit('dashboardMetricsUpdated');

  res.json({ message: 'Task deleted successfully' });
});

// @desc    Get overdue tasks
// @route   GET /api/tasks/overdue
// @access  Private (Admin/Employee only, customers cannot access)
export const getOverdueTasks = asyncHandler(async (req, res) => {
  // Restrict access: customers cannot view tasks
  if (req.user.role === 'customer') {
    return res.status(403).json({ error: 'Access denied. Customers cannot view tasks.' });
  }

  const { page = 1, limit = 50 } = req.query;
  const skip = (page - 1) * limit;

  const query = {
    status: { $ne: 'Done' },
    dueDate: { $lt: new Date() },
  };

  if (req.user.tenantId) {
    query.tenantId = req.user.tenantId;
  }

  // Employees can only see tasks assigned to them
  if (req.user.role !== 'admin') {
    query.assignedTo = { $in: [req.user._id] };
  }

  const tasks = await Task.find(query)
    .skip(skip)
    .limit(parseInt(limit))
    .sort({ dueDate: 1, createdAt: -1 })
    .populate('assignedTo', 'name email')
    .populate('createdBy', 'name email');

  const total = await Task.countDocuments(query);

  // Ensure assignedTo is always an array in response
  const tasksWithArrayAssignedTo = tasks.map((task) => {
    const taskObj = task.toObject();
    if (taskObj.assignedTo && !Array.isArray(taskObj.assignedTo)) {
      taskObj.assignedTo = [taskObj.assignedTo];
    } else if (!taskObj.assignedTo) {
      taskObj.assignedTo = [];
    }
    return taskObj;
  });

  res.json({
    tasks: tasksWithArrayAssignedTo,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit),
    },
  });
});

// @desc    Get tasks as calendar events
// @route   GET /api/tasks/events
// @access  Private (Admin/Employee only, customers cannot access)
export const getTasksAsEvents = asyncHandler(async (req, res) => {
  // Restrict access: customers cannot view tasks
  if (req.user.role === 'customer') {
    return res.status(403).json({ error: 'Access denied. Customers cannot view tasks.' });
  }

  const { start, end } = req.query;

  const query = {};
  if (req.user.tenantId) {
    query.tenantId = req.user.tenantId;
  }

  // Employees can only see tasks assigned to them
  if (req.user.role !== 'admin') {
    query.assignedTo = { $in: [req.user._id] };
  }

  // Filter by date range if provided
  if (start || end) {
    query.dueDate = {};
    if (start) {
      query.dueDate.$gte = new Date(start);
    }
    if (end) {
      query.dueDate.$lte = new Date(end);
    }
  } else {
    // Default to current month
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    query.dueDate = { $gte: startOfMonth, $lte: endOfMonth };
  }

  const tasks = await Task.find(query)
    .populate('assignedTo', 'name email')
    .populate('createdBy', 'name email')
    .sort({ dueDate: 1 });

  // Transform tasks to calendar events format
  const events = tasks.map((task) => {
    // Ensure assignedTo is always an array
    const assignedToArray = Array.isArray(task.assignedTo) ? task.assignedTo : (task.assignedTo ? [task.assignedTo] : []);
    
    return {
      id: task._id.toString(),
      title: task.title,
      start: task.dueDate ? new Date(task.dueDate).toISOString() : new Date().toISOString(),
      end: task.dueDate
        ? new Date(new Date(task.dueDate).getTime() + 60 * 60 * 1000).toISOString() // 1 hour duration
        : new Date(new Date().getTime() + 60 * 60 * 1000).toISOString(),
      allDay: false,
      extendedProps: {
        description: task.description,
        status: task.status,
        priority: task.priority,
        assignedTo: assignedToArray,
      },
      backgroundColor:
        task.status === 'Done'
          ? '#10b981'
          : task.priority === 'Urgent'
            ? '#ef4444'
            : task.priority === 'High'
              ? '#f59e0b'
              : '#3b82f6',
    };
  });

  res.json({ events });
});

