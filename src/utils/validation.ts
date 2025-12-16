import * as yup from 'yup';

// Email validation
export const emailSchema = yup.string().email('Invalid email address').required('Email is required');

// Password validation
export const passwordSchema = yup
  .string()
  .min(6, 'Password must be at least 6 characters')
  .required('Password is required');

// Name validation
export const nameSchema = yup
  .string()
  .min(2, 'Name must be at least 2 characters')
  .max(50, 'Name must be less than 50 characters')
  .required('Name is required');

// Phone validation
export const phoneSchema = yup.string().matches(/^\+?[\d\s-()]+$/, 'Invalid phone number');

// URL validation
export const urlSchema = yup.string().url('Invalid URL');

// Common validation schemas
export const loginSchema = yup.object({
  email: emailSchema,
  password: yup.string().required('Password is required'),
});

export const registerSchema = yup.object({
  name: nameSchema,
  email: emailSchema,
  password: passwordSchema,
  confirmPassword: yup
    .string()
    .oneOf([yup.ref('password')], 'Passwords must match')
    .required('Please confirm your password'),
});

export const profileUpdateSchema = yup.object({
  name: nameSchema.optional(),
  timezone: yup.string().optional(),
  companyInfo: yup.string().max(500, 'Company info must be under 500 characters').optional(),
});

export const emailUpdateSchema = yup.object({
  email: emailSchema,
  password: yup.string().required('Current password is required'),
});

export const passwordUpdateSchema = yup.object({
  currentPassword: yup.string().required('Current password is required'),
  newPassword: passwordSchema,
  confirmPassword: yup
    .string()
    .oneOf([yup.ref('newPassword')], 'Passwords must match')
    .required('Please confirm your new password'),
});

