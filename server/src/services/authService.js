import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';

export const createUser = async (userData) => {
  const { name, email, password, phone } = userData;

  // Check if user already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new Error('User with this email already exists');
  }

  // Hash password
  const saltRounds = 10;
  const passwordHash = await bcrypt.hash(password, saltRounds);

  // Create user with customer role (only customers can register)
  const userDataToCreate = {
    name,
    email,
    passwordHash,
    role: 'customer',
  };

  // Add phone if provided
  if (phone && phone.countryCode && phone.number) {
    userDataToCreate.phone = {
      countryCode: phone.countryCode,
      number: phone.number.trim(),
    };
  }

  const user = await User.create(userDataToCreate);

  return user;
};

export const validateUserCredentials = async (email, password) => {
  const user = await User.findOne({ email });
  if (!user) {
    throw new Error('Invalid email or password');
  }

  if (!user.isActive) {
    throw new Error('Account is deactivated');
  }

  const isPasswordValid = await user.comparePassword(password);
  if (!isPasswordValid) {
    throw new Error('Invalid email or password');
  }

  return user;
};

