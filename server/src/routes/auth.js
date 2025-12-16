import express from 'express';
import {
  register,
  login,
  logout,
  refreshToken,
  getMe,
  updateProfile,
  updateEmail,
  updatePassword,
  uploadAvatar,
  forgotPassword,
  resetPassword,
} from '../controllers/authController.js';
import { authenticate } from '../middlewares/auth.js';
import {
  registerValidation,
  loginValidation,
  updateProfileValidation,
  updateEmailValidation,
  updatePasswordValidation,
  forgotPasswordValidation,
  resetPasswordValidation,
} from '../utils/validation.js';
import { avatarUpload } from '../utils/upload.js';

const router = express.Router();

router.post('/register', registerValidation, register);
router.post('/login', loginValidation, login);
router.post('/logout', logout);
router.post('/refresh', refreshToken);
router.post('/forgot', forgotPasswordValidation, forgotPassword);
router.post('/reset', resetPasswordValidation, resetPassword);
router.get('/me', authenticate, getMe);
router.put('/profile', authenticate, updateProfileValidation, updateProfile);
router.put('/email', authenticate, updateEmailValidation, updateEmail);
router.put('/password', authenticate, updatePasswordValidation, updatePassword);
router.post('/avatar', authenticate, avatarUpload.single('avatar'), uploadAvatar);

export default router;

