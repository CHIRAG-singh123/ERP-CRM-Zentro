import { User } from '../services/api/auth';

export interface Employee extends Omit<User, 'role'> {
  role: 'employee';
  createdBy?: string;
  mustChangePassword: boolean;
}

export interface EmployeePerformance {
  employeeId: string;
  employeeName: string;
  employeeEmail: string;
  productsCreated: number;
  averageProductRating: number;
  tasksCompleted: number;
  reviewsReceived: number;
  totalSales: number;
  productsByMonth?: Array<{
    _id: {
      year: number;
      month: number;
    };
    count: number;
  }>;
}

export interface EmployeePerformanceResponse {
  performance: EmployeePerformance;
}

export interface EmployeeListResponse {
  employees: Employee[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface CSVUploadResponse {
  message: string;
  created: number;
  duplicates: number;
  errors?: string[];
}

export interface EmployeeFormData {
  name: string;
  email: string;
}

