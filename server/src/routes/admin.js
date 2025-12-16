import express from 'express';
import multer from 'multer';
import { requireAdmin } from '../middlewares/rbac.js';
import { avatarUpload } from '../utils/upload.js';
import {
  getEmployees,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  uploadEmployeesCSV,
  getEmployeePerformance,
  promoteToAdmin,
  getAllUsers,
  updateUser,
  deleteUser,
  toggleUserStatus,
  uploadUserAvatar,
} from '../controllers/adminController.js';

const router = express.Router();

// Configure multer for CSV upload
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'), false);
    }
  },
});

// All routes require admin role
router.use(requireAdmin);

// Employee management routes
router.get('/employees', getEmployees);
router.post('/employees', createEmployee);
router.put('/employees/:id', updateEmployee);
router.delete('/employees/:id', deleteEmployee);
router.post('/employees/upload-csv', upload.single('file'), uploadEmployeesCSV);

// Performance and promotion routes
router.get('/employees/:id/performance', getEmployeePerformance);
router.put('/employees/:id/promote', promoteToAdmin);

// User management routes (all users, not just employees)
router.get('/users', getAllUsers);
router.put('/users/:id', updateUser);
router.delete('/users/:id', deleteUser);
router.put('/users/:id/toggle-status', toggleUserStatus);
router.post('/users/:id/avatar', avatarUpload.single('avatar'), uploadUserAvatar);

export default router;

