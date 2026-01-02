import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { faker } from '@faker-js/faker';
import Lead from '../models/Lead.js';
import Contact from '../models/Contact.js';
import Company from '../models/Company.js';
import { User } from '../models/User.js';
import { connectDB } from '../config/db.js';

dotenv.config();

export const seedLeads = async () => {
  try {
    console.log('🌱 Starting Leads Seeder...');
    
    // Connect if not already connected
    if (mongoose.connection.readyState === 0) {
      await connectDB();
    }

    // Get admin user for createdBy
    const adminUser = await User.findOne({ 
      email: 'chiragsinghpawar@gmail.com',
      role: 'admin'
    });

    if (!adminUser) {
      throw new Error('Admin user not found. Please run seed:users first.');
    }

    // Get contacts
    const contacts = await Contact.find().limit(100);
    if (contacts.length === 0) {
      throw new Error('No contacts found. Please run seed:contacts first.');
    }

    // Get companies
    const companies = await Company.find().limit(20);
    if (companies.length === 0) {
      throw new Error('No companies found. Please run seed:companies first.');
    }

    // Get employee users for ownerId assignment
    const employees = await User.find({ role: 'employee' }).limit(9);
    if (employees.length === 0) {
      throw new Error('No employee users found. Please run seed:users first.');
    }

    // Check existing lead count
    const existingLeadCount = await Lead.countDocuments();
    const targetLeadCount = 80;
    const leadsToCreate = Math.max(0, targetLeadCount - existingLeadCount);

    if (leadsToCreate > 0) {
      console.log(`Creating ${leadsToCreate} leads...`);
      
      // Lead statuses from model enum
      const leadStatuses = ['New', 'Contacted', 'Qualified', 'Lost', 'Converted'];
      
      // Lead sources from model enum
      const leadSources = ['website', 'referral', 'social', 'email', 'phone', 'other'];

      const leads = [];
      
      for (let i = 0; i < leadsToCreate; i++) {
        // Get random contact and its company, or random company
        const contact = faker.helpers.arrayElement(contacts);
        const company = contact.companyId 
          ? await Company.findById(contact.companyId) || faker.helpers.arrayElement(companies)
          : faker.helpers.arrayElement(companies);
        
        // Assign to random employee
        const ownerId = faker.helpers.arrayElement(employees)._id;
        
        // Generate lead title
        const contactName = `${contact.firstName} ${contact.lastName}`;
        const title = `${contactName} - ${faker.company.buzzPhrase()}`;
        
        // Random status
        const status = faker.helpers.arrayElement(leadStatuses);
        
        // Random source
        const source = faker.helpers.arrayElement(leadSources);
        
        // Random value between 1000 and 50000
        const value = faker.number.int({ min: 1000, max: 50000 });
        
        // Random expected close date (within next 90 days)
        const expectedCloseDate = faker.date.future({ days: 90 });

        const lead = await Lead.create({
          title,
          description: faker.lorem.paragraph(),
          contactId: contact._id,
          companyId: company._id,
          source,
          status,
          value,
          notes: faker.lorem.sentences(2),
          expectedCloseDate,
          ownerId,
          tenantId: null,
          createdBy: adminUser._id,
        });
        leads.push(lead);
      }
      console.log(`✓ Created ${leads.length} leads`);
    } else {
      console.log(`✓ Leads already exist (${existingLeadCount} found)`);
    }

    // Summary
    const finalLeadCount = await Lead.countDocuments();
    const statusBreakdown = await Lead.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    console.log('\n✨ Leads Seeder Completed!');
    console.log(`Summary:`);
    console.log(`- Total Leads: ${finalLeadCount}`);
    console.log(`- Status Breakdown:`);
    statusBreakdown.forEach(({ _id, count }) => {
      console.log(`  - ${_id}: ${count}`);
    });

    return { success: true };
  } catch (error) {
    console.error('\n❌ Error seeding leads:');
    console.error(error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    throw error;
  }
};

// Run standalone if executed directly
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);

if (process.argv[1] && (process.argv[1].includes('leadsSeeder.js') || __filename.includes('leadsSeeder.js'))) {
  seedLeads()
    .then(() => {
      mongoose.connection.close();
      console.log('Database connection closed.');
      process.exit(0);
    })
    .catch((error) => {
      if (mongoose.connection.readyState === 1) {
        mongoose.connection.close();
      }
      process.exit(1);
    });
}
