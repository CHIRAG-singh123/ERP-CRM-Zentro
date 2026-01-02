import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import { seedUsers } from './usersSeeder.js';
import { seedCompanies } from './companiesSeeder.js';
import { seedContacts } from './contactsSeeder.js';
import { seedLeads } from './leadsSeeder.js';
import { seedDeals } from './dealsSeeder.js';

dotenv.config();

const seedAll = async () => {
  try {
    console.log('🚀 Starting Comprehensive Seeding Process...\n');
    
    // Connect to database
    await connectDB();
    console.log('✓ Database connected\n');

    // Run seeders sequentially
    console.log('='.repeat(50));
    await seedUsers();
    console.log('='.repeat(50));
    await seedCompanies();
    console.log('='.repeat(50));
    await seedContacts();
    console.log('='.repeat(50));
    await seedLeads();
    console.log('='.repeat(50));
    await seedDeals();
    console.log('='.repeat(50));

    // Final summary
    const { User } = await import('../models/User.js');
    const Company = (await import('../models/Company.js')).default;
    const Contact = (await import('../models/Contact.js')).default;
    const Lead = (await import('../models/Lead.js')).default;
    const Deal = (await import('../models/Deal.js')).default;

    const userCount = await User.countDocuments();
    const companyCount = await Company.countDocuments();
    const contactCount = await Contact.countDocuments();
    const leadCount = await Lead.countDocuments();
    const dealCount = await Deal.countDocuments();

    console.log('\n🎉 All Seeders Completed Successfully!');
    console.log('\n📊 Final Database Summary:');
    console.log(`- Users: ${userCount} (1 Admin, 9 Employees, 50 Customers)`);
    console.log(`- Companies: ${companyCount}`);
    console.log(`- Contacts: ${contactCount}`);
    console.log(`- Leads: ${leadCount}`);
    console.log(`- Deals: ${dealCount}`);
    console.log('\n✨ Seeding process completed!');

    await mongoose.connection.close();
    console.log('Database connection closed.');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error in seeding process:');
    console.error(error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
    }
    process.exit(1);
  }
};

seedAll();
