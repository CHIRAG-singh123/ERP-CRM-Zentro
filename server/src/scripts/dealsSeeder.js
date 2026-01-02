import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { faker } from '@faker-js/faker';
import Deal from '../models/Deal.js';
import Lead from '../models/Lead.js';
import Contact from '../models/Contact.js';
import Company from '../models/Company.js';
import { User } from '../models/User.js';
import { connectDB } from '../config/db.js';

dotenv.config();

export const seedDeals = async () => {
  try {
    console.log('🌱 Starting Deals Seeder...');
    
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

    // Check existing deal count
    const existingDealCount = await Deal.countDocuments();
    const targetDealCount = 60;
    const dealsToCreate = Math.max(0, targetDealCount - existingDealCount);

    if (dealsToCreate > 0) {
      console.log(`Creating ${dealsToCreate} deals...`);
      
      // Try to get leads with status 'Qualified' or 'Converted' first
      let availableLeads = await Lead.find({
        status: { $in: ['Qualified', 'Converted'] }
      }).limit(dealsToCreate);

      // If not enough qualified/converted leads, get any leads
      if (availableLeads.length < dealsToCreate) {
        const additionalLeads = await Lead.find({
          _id: { $nin: availableLeads.map(l => l._id) }
        }).limit(dealsToCreate - availableLeads.length);
        availableLeads = [...availableLeads, ...additionalLeads];
      }

      if (availableLeads.length === 0) {
        throw new Error('No leads found. Please run seed:leads first.');
      }

      // Deal stages from model enum
      const dealStages = ['Prospecting', 'Qualification', 'Proposal', 'Negotiation', 'Closed Won', 'Closed Lost'];

      const deals = [];
      
      for (let i = 0; i < dealsToCreate && i < availableLeads.length; i++) {
        const lead = availableLeads[i];
        
        // Populate lead to get contact and company
        await lead.populate('contactId companyId ownerId');
        
        const contact = lead.contactId;
        const company = lead.companyId;
        const ownerId = lead.ownerId || adminUser._id;

        if (!contact || !company) {
          console.log(`⚠ Skipping lead ${lead._id}: missing contact or company`);
          continue;
        }

        // Generate deal title
        const title = `${company.name} - ${faker.company.buzzPhrase()}`;
        
        // Random stage
        const stage = faker.helpers.arrayElement(dealStages);
        
        // Random value between 1000 and 50000
        const value = faker.number.int({ min: 1000, max: 50000 });
        
        // Random probability between 10 and 100
        const probability = faker.number.int({ min: 10, max: 100 });
        
        // Random close date (within next 120 days)
        const closeDate = faker.date.future({ days: 120 });

        const deal = await Deal.create({
          title,
          leadId: lead._id,
          contactId: contact._id,
          companyId: company._id,
          value,
          currency: 'USD',
          stage,
          probability,
          closeDate,
          description: faker.lorem.paragraph(),
          notes: faker.lorem.sentences(2),
          ownerId,
          tenantId: null,
          createdBy: adminUser._id,
        });
        deals.push(deal);

        // Update lead's convertedToDealId if deal is created from a converted lead
        if (lead.status === 'Converted' && !lead.convertedToDealId) {
          lead.convertedToDealId = deal._id;
          await lead.save();
        }
      }
      console.log(`✓ Created ${deals.length} deals`);
    } else {
      console.log(`✓ Deals already exist (${existingDealCount} found)`);
    }

    // Summary
    const finalDealCount = await Deal.countDocuments();
    const stageBreakdown = await Deal.aggregate([
      {
        $group: {
          _id: '$stage',
          count: { $sum: 1 },
        },
      },
    ]);

    const valueStats = await Deal.aggregate([
      {
        $group: {
          _id: null,
          totalValue: { $sum: '$value' },
          avgValue: { $avg: '$value' },
          minValue: { $min: '$value' },
          maxValue: { $max: '$value' },
        },
      },
    ]);

    console.log('\n✨ Deals Seeder Completed!');
    console.log(`Summary:`);
    console.log(`- Total Deals: ${finalDealCount}`);
    console.log(`- Stage Breakdown:`);
    stageBreakdown.forEach(({ _id, count }) => {
      console.log(`  - ${_id}: ${count}`);
    });
    if (valueStats.length > 0) {
      const stats = valueStats[0];
      console.log(`- Value Statistics:`);
      console.log(`  - Total Value: $${stats.totalValue.toLocaleString()}`);
      console.log(`  - Average Value: $${Math.round(stats.avgValue).toLocaleString()}`);
      console.log(`  - Min Value: $${stats.minValue.toLocaleString()}`);
      console.log(`  - Max Value: $${stats.maxValue.toLocaleString()}`);
    }

    return { success: true };
  } catch (error) {
    console.error('\n❌ Error seeding deals:');
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

if (process.argv[1] && (process.argv[1].includes('dealsSeeder.js') || __filename.includes('dealsSeeder.js'))) {
  seedDeals()
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
