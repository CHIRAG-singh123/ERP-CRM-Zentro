import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    },
    passwordHash: {
      type: String,
      required: function() {
        // Password is required only for email registration
        return this.registrationMethod === 'email';
      },
      minlength: [6, 'Password must be at least 6 characters'],
    },
    googleId: {
      type: String,
      unique: true,
      sparse: true, // Allows multiple null values
      default: null,
    },
    registrationMethod: {
      type: String,
      enum: ['email', 'google'],
      default: 'email',
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    verificationToken: {
      type: String,
      default: null,
    },
    verificationTokenExpiry: {
      type: Date,
      default: null,
    },
    role: {
      type: String,
      enum: ['admin', 'user', 'sales', 'support', 'employee', 'customer'],
      default: 'user',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    mustChangePassword: {
      type: Boolean,
      default: false,
    },
    phone: {
      countryCode: {
        type: String,
        default: '+1',
      },
      number: {
        type: String,
        required: function() {
          // Only required for new email registrations
          return this.isNew && this.registrationMethod === 'email';
        },
        trim: true,
        validate: {
          validator: function(value) {
            // Allow empty string for optional phone numbers
            if (!value || value.trim() === '') {
              return true;
            }
            // Validate format if provided
            return /^[\d\s-()]+$/.test(value);
          },
          message: 'Invalid phone number format',
        },
      },
    },
    profile: {
      avatar: {
        type: String,
        default: '',
      },
      timezone: {
        type: String,
        default: 'UTC',
      },
      companyInfo: {
        type: String,
        default: '',
      },
    },
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    resetToken: {
      type: String,
      default: null,
    },
    resetTokenExpiry: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Method to compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.passwordHash);
};

// Method to exclude password and phone from JSON output (for privacy)
userSchema.methods.toJSON = function (options = {}) {
  const userObject = this.toObject();
  delete userObject.passwordHash;
  // Exclude phone by default for privacy (only include when explicitly requested)
  // Check both the instance property and options parameter
  if (!this._includePhone && !options.includePhone) {
    delete userObject.phone;
  }
  return userObject;
};

export const User = mongoose.model('User', userSchema);

