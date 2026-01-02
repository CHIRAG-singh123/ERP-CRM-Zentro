import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { faker } from '@faker-js/faker';
import Company from '../models/Company.js';
import { User } from '../models/User.js';
import { connectDB } from '../config/db.js';

dotenv.config();

export const seedCompanies = async () => {
  try {
    console.log('🌱 Starting Companies Seeder...');
    
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

    // Check existing company count
    const existingCompanyCount = await Company.countDocuments();
    const targetCompanyCount = 20;
    const companiesToCreate = Math.max(0, targetCompanyCount - existingCompanyCount);

    if (companiesToCreate > 0) {
      console.log(`Creating ${companiesToCreate} companies...`);
      const industries = [
        'Technology',
        'Finance',
        'Healthcare',
        'Retail',
        'Manufacturing',
        'Education',
        'Real Estate',
        'Consulting',
        'Media & Entertainment',
        'Transportation',
        'Energy',
        'Telecommunications',
      ];

      const tags = ['Enterprise', 'SMB', 'Startup', 'Non-Profit', 'Government'];

      const companies = [];
      
      for (let i = 0; i < companiesToCreate; i++) {
        const companyName = faker.company.name();
        
        // Ensure unique company name
        const existingCompany = await Company.findOne({ name: companyName });
        if (existingCompany) {
          console.log(`⚠ Skipping duplicate company name: ${companyName}`);
          continue;
        }

        const industry = faker.helpers.arrayElement(industries);
        const city = faker.location.city();
        const state = faker.location.state({ abbreviated: true });
        const zipCode = faker.location.zipCode();
        const country = faker.location.country();
        
        const company = await Company.create({
          name: companyName,
          email: faker.internet.email({ provider: companyName.toLowerCase().replace(/\s+/g, '') }),
          phone: faker.phone.number('+1-###-###-####'),
          website: `https://www.${companyName.toLowerCase().replace(/\s+/g, '')}.com`,
          industry,
          address: {
            street: faker.location.streetAddress(),
            city,
            state,
            zipCode,
            country,
          },
          tags: [faker.helpers.arrayElement(tags)],
          description: faker.company.catchPhrase(),
          tenantId: null,
          createdBy: adminUser._id,
        });
        companies.push(company);
      }
      console.log(`✓ Created ${companies.length} companies`);
    } else {
      console.log(`✓ Companies already exist (${existingCompanyCount} found)`);
    }

    // Summary
    const finalCompanyCount = await Company.countDocuments();
    console.log('\n✨ Companies Seeder Completed!');
    console.log(`Summary:`);
    console.log(`- Total Companies: ${finalCompanyCount}`);

    return { success: true };
  } catch (error) {
    console.error('\n❌ Error seeding companies:');
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

if (process.argv[1] && (process.argv[1].includes('companiesSeeder.js') || __filename.includes('companiesSeeder.js'))) {
  seedCompanies()
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
