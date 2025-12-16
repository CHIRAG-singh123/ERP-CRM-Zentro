import { User } from '../models/User.js';
import { Product } from '../models/Product.js';
import { Review } from '../models/Review.js';
import { EmployeePerformance } from '../models/EmployeePerformance.js';
import bcrypt from 'bcryptjs';
import { parseEmployeesCSV } from '../utils/csvParser.js';

// Get all employees
export const getEmployees = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', isActive } = req.query;
    const skip = (page - 1) * limit;

    const query = { role: 'employee' };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }

    const employees = await User.find(query)
      .select('-passwordHash')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await User.countDocuments(query);

    res.json({
      employees,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Create single employee
export const createEmployee = async (req, res) => {
  try {
    const { name, email } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    // Hash default password
    const defaultPassword = 'Employee@123';
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(defaultPassword, saltRounds);

    // Create employee
    const employee = await User.create({
      name,
      email: email.toLowerCase(),
      passwordHash,
      role: 'employee',
      createdBy: req.user._id,
      mustChangePassword: true,
      isActive: true,
    });

    res.status(201).json({
      employee: {
        _id: employee._id,
        name: employee.name,
        email: employee.email,
        role: employee.role,
        isActive: employee.isActive,
        createdAt: employee.createdAt,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update employee
export const updateEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, isActive } = req.body;

    const employee = await User.findById(id);
    if (!employee || employee.role !== 'employee') {
      return res.status(404).json({ error: 'Employee not found' });
    }

    if (email && email !== employee.email) {
      const existingUser = await User.findOne({ email: email.toLowerCase() });
      if (existingUser) {
        return res.status(400).json({ error: 'Email already in use' });
      }
      employee.email = email.toLowerCase();
    }

    if (name) employee.name = name;
    if (isActive !== undefined) employee.isActive = isActive;

    await employee.save();

    res.json({
      employee: {
        _id: employee._id,
        name: employee.name,
        email: employee.email,
        role: employee.role,
        isActive: employee.isActive,
        updatedAt: employee.updatedAt,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Delete employee (soft delete)
export const deleteEmployee = async (req, res) => {
  try {
    const { id } = req.params;

    const employee = await User.findById(id);
    if (!employee || employee.role !== 'employee') {
      return res.status(404).json({ error: 'Employee not found' });
    }

    employee.isActive = false;
    await employee.save();

    res.json({ message: 'Employee deactivated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Upload employees CSV
export const uploadEmployeesCSV = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'CSV file is required' });
    }

    const { employees, errors } = await parseEmployeesCSV(req.file.buffer);

    if (employees.length === 0) {
      return res.status(400).json({ error: 'No valid employees found in CSV', errors });
    }

    // Check for existing emails
    const emails = employees.map((e) => e.email);
    const existingUsers = await User.find({ email: { $in: emails } });
    const existingEmails = new Set(existingUsers.map((u) => u.email));

    const validEmployees = employees.filter((e) => !existingEmails.has(e.email));
    const duplicateEmails = employees.filter((e) => existingEmails.has(e.email));

    if (validEmployees.length === 0) {
      return res.status(400).json({
        error: 'All employees already exist',
        duplicates: duplicateEmails.map((e) => e.email),
      });
    }

    // Add createdBy to all employees
    const employeesToCreate = validEmployees.map((emp) => ({
      ...emp,
      createdBy: req.user._id,
    }));

    const createdEmployees = await User.insertMany(employeesToCreate);

    res.status(201).json({
      message: `${createdEmployees.length} employees created successfully`,
      created: createdEmployees.length,
      duplicates: duplicateEmails.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get employee performance
export const getEmployeePerformance = async (req, res) => {
  try {
    const { id } = req.params;

    const employee = await User.findById(id);
    if (!employee || employee.role !== 'employee') {
      return res.status(404).json({ error: 'Employee not found' });
    }

    // Get products created by employee
    const productsCreated = await Product.countDocuments({ createdBy: id, isActive: true });

    // Get average rating of products
    const products = await Product.find({ createdBy: id, isActive: true }).select('_id');
    const productIds = products.map((p) => p._id);

    let averageProductRating = 0;
    if (productIds.length > 0) {
      const reviews = await Review.find({ productId: { $in: productIds } });
      if (reviews.length > 0) {
        const totalRating = reviews.reduce((sum, r) => sum + r.rating, 0);
        averageProductRating = totalRating / reviews.length;
      }
    }

    // Get reviews received (reviews on products created by employee)
    const reviewsReceived = await Review.countDocuments({ productId: { $in: productIds } });

    // Get tasks completed (placeholder - can be extended with Task model)
    const tasksCompleted = 0; // TODO: Implement when Task model is available

    // Calculate total sales (placeholder)
    const totalSales = 0; // TODO: Implement when sales tracking is available

    const performance = {
      employeeId: employee._id,
      employeeName: employee.name,
      employeeEmail: employee.email,
      productsCreated,
      averageProductRating: Math.round(averageProductRating * 10) / 10,
      tasksCompleted,
      reviewsReceived,
      totalSales,
    };

    res.json({ performance });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Promote employee to admin
export const promoteToAdmin = async (req, res) => {
  try {
    const { id } = req.params;

    const employee = await User.findById(id);
    if (!employee || employee.role !== 'employee') {
      return res.status(404).json({ error: 'Employee not found' });
    }

    employee.role = 'admin';
    await employee.save();

    res.json({
      message: 'Employee promoted to admin successfully',
      employee: {
        _id: employee._id,
        name: employee.name,
        email: employee.email,
        role: employee.role,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get all users (for admin management)
export const getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', role = '', isActive } = req.query;
    const skip = (page - 1) * limit;

    const query = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    if (role) {
      query.role = role;
    }

    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }

    const users = await User.find(query)
      .select('-passwordHash')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await User.countDocuments(query);

    res.json({
      users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update any user (admin only)
export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, role, isActive, profile, password } = req.body;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Prevent admin from modifying themselves
    if (user._id.toString() === req.user._id.toString() && (role || isActive === false)) {
      return res.status(400).json({ error: 'You cannot modify your own role or deactivate yourself' });
    }

    if (email && email !== user.email) {
      const existingUser = await User.findOne({ email: email.toLowerCase() });
      if (existingUser && existingUser._id.toString() !== id) {
        return res.status(400).json({ error: 'Email already in use' });
      }
      user.email = email.toLowerCase();
    }

    if (name) user.name = name;
    if (role) user.role = role;
    if (isActive !== undefined) user.isActive = isActive;

    // Update profile
    if (profile) {
      if (profile.timezone !== undefined) user.profile.timezone = profile.timezone;
      if (profile.companyInfo !== undefined) user.profile.companyInfo = profile.companyInfo;
      if (profile.avatar !== undefined) user.profile.avatar = profile.avatar;
    }

    // Update password if provided
    if (password) {
      if (password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters' });
      }
      const saltRounds = 10;
      user.passwordHash = await bcrypt.hash(password, saltRounds);
      user.mustChangePassword = false;
    }

    await user.save();

    const updatedUser = await User.findById(user._id).select('-passwordHash');

    res.json({ user: updatedUser });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Delete user (hard delete - admin only)
export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Prevent admin from deleting themselves
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ error: 'You cannot delete yourself' });
    }

    await User.findByIdAndDelete(id);

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Block/Unblock user (admin only)
export const toggleUserStatus = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Prevent admin from blocking themselves
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ error: 'You cannot block yourself' });
    }

    user.isActive = !user.isActive;
    await user.save();

    res.json({
      message: user.isActive ? 'User activated successfully' : 'User blocked successfully',
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        isActive: user.isActive,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Upload avatar for any user (admin only)
export const uploadUserAvatar = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { id } = req.params;
    const avatarPath = `/uploads/avatars/${req.file.filename}`;
    
    const user = await User.findByIdAndUpdate(
      id,
      { $set: { 'profile.avatar': avatarPath } },
      { new: true }
    ).select('-passwordHash');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.status(201).json({
      message: 'Avatar uploaded successfully',
      avatarUrl: avatarPath,
      user,
    });
  } catch (error) {
    next(error);
  }
};

