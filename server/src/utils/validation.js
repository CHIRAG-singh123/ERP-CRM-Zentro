import { body, validationResult } from 'express-validator';

export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array(),
    });
  }
  next();
};

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
    .normalizeEmail(),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
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

export const loginValidation = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
  handleValidationErrors,
];

export const updateProfileValidation = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters'),
  body('profile.timezone')
    .optional()
    .isString()
    .withMessage('Timezone must be a string'),
  body('profile.companyInfo')
    .optional()
    .isString()
    .withMessage('Company info must be a string'),
  body('phone.countryCode')
    .optional({ checkFalsy: true })
    .matches(/^\+\d{1,4}$/)
    .withMessage('Invalid country code format'),
  body('phone.number')
    .optional({ checkFalsy: true, values: 'falsy' })
    .custom((value) => {
      // Allow empty string, null, undefined, or falsy values for optional phone number
      if (!value || (typeof value === 'string' && value.trim() === '')) {
        return true;
      }
      const phoneStr = String(value).trim();
      // Validate format if provided
      if (!/^[\d\s-()]+$/.test(phoneStr)) {
        throw new Error('Invalid phone number format');
      }
      if (phoneStr.length < 7 || phoneStr.length > 20) {
        throw new Error('Phone number must be between 7 and 20 characters');
      }
      return true;
    }),
  handleValidationErrors,
];

export const updateEmailValidation = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),
  body('password').notEmpty().withMessage('Current password is required'),
  handleValidationErrors,
];

export const updatePasswordValidation = [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword')
    .notEmpty()
    .withMessage('New password is required')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
  handleValidationErrors,
];

export const forgotPasswordValidation = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),
  handleValidationErrors,
];

export const resetPasswordValidation = [
  body('token').notEmpty().withMessage('Reset token is required'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
  handleValidationErrors,
];

