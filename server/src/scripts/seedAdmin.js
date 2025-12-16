import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { User } from '../models/User.js';
import bcrypt from 'bcryptjs';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/CRM_DB';

const seedAdmin = async () => {
  try {
    console.log('Starting admin seed script...');
    console.log(`Connecting to MongoDB: ${MONGODB_URI.replace(/\/\/.*@/, '//***@')}`);

    // Connect to database with timeout
    const connectionTimeout = setTimeout(() => {
      console.error('Connection timeout: MongoDB connection took too long. Please check:');
      console.error('1. Is MongoDB running?');
      console.error('2. Is the MONGODB_URI correct in your .env file?');
      console.error('3. For local MongoDB: mongodb://localhost:27017/CRM_DB');
      console.error('4. For MongoDB Atlas: mongodb+srv://username:password@cluster.mongodb.net/dbname');
      process.exit(1);
    }, 10000); // 10 second timeout

    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000, // 5 second timeout
      socketTimeoutMS: 45000,
    });

    clearTimeout(connectionTimeout);
    console.log('✓ MongoDB Connected successfully');

    // Check if admin already exists
    console.log('Checking for existing admin user...');
    const existingAdmin = await User.findOne({ email: 'admin_erp-crm@gmail.com' });
    
    if (existingAdmin) {
      console.log('✓ Admin user already exists. Skipping seed.');
      console.log(`  Email: ${existingAdmin.email}`);
      console.log(`  Role: ${existingAdmin.role}`);
      await mongoose.connection.close();
      process.exit(0);
    }

    // Hash password
    console.log('Hashing password...');
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash('ABCdef@1234', saltRounds);

    // Create admin user
    console.log('Creating admin user...');
    const admin = await User.create({
      name: 'Admin User',
      email: 'admin_erp-crm@gmail.com',
      passwordHash,
      role: 'admin',
      isActive: true,
      mustChangePassword: false,
    });

    console.log('\n✓ Admin user created successfully!');
    console.log(`  Email: ${admin.email}`);
    console.log(`  Password: ABCdef@1234`);
    console.log(`  Role: ${admin.role}`);
    console.log(`  ID: ${admin._id}\n`);

    await mongoose.connection.close();
    console.log('Database connection closed.');
    process.exit(0);
  } catch (error) {
    console.error('\n✗ Error seeding admin user:');
    console.error(error.message);
    if (error.name === 'MongoServerSelectionError') {
      console.error('\nMongoDB Connection Error:');
      console.error('Please ensure MongoDB is running and accessible.');
      console.error('Check your MONGODB_URI in the .env file.');
    }
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
    }
    process.exit(1);
  }
};

seedAdmin();

