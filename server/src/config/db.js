import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/CRM_DB';

const MAX_RETRIES = 5;
const RETRY_DELAY = 3000; // 3 seconds

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export const connectDB = async (retryCount = 0) => {
  try {
    const conn = await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
      socketTimeoutMS: 45000,
      family: 4, // Use IPv4, skip trying IPv6
    });
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    if (retryCount < MAX_RETRIES) {
      console.warn(`⚠️  MongoDB connection attempt ${retryCount + 1}/${MAX_RETRIES} failed. Retrying in ${RETRY_DELAY / 1000}s...`);
      console.warn(`   Error: ${error.message}`);
      await sleep(RETRY_DELAY);
      return connectDB(retryCount + 1);
    } else {
      console.error('\n❌ Failed to connect to MongoDB after multiple attempts.');
      console.error(`   Error: ${error.message}`);
      console.error('\n📋 Troubleshooting steps:');
      console.error('   1. Make sure MongoDB is installed and running');
      console.error('   2. Check if MongoDB service is started:');
      console.error('      - Windows: Check Services or run "mongod" in terminal');
      console.error('      - macOS: brew services start mongodb-community');
      console.error('      - Linux: sudo systemctl start mongod');
      console.error('   3. Verify MongoDB URI in .env file:');
      console.error(`      Current URI: ${MONGODB_URI}`);
      console.error('   4. If using MongoDB Atlas, check your connection string');
      console.error('   5. Check firewall settings if MongoDB is on a remote server\n');
      process.exit(1);
    }
  }
};

mongoose.connection.on('disconnected', () => {
  console.log('⚠️  MongoDB disconnected');
});

mongoose.connection.on('error', (err) => {
  console.error(`❌ MongoDB connection error: ${err.message}`);
});

mongoose.connection.on('reconnected', () => {
  console.log('✅ MongoDB reconnected');
});

