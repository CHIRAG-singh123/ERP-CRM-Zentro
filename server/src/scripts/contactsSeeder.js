import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { faker } from '@faker-js/faker';
import Contact from '../models/Contact.js';
import Company from '../models/Company.js';
import { User } from '../models/User.js';
import { connectDB } from '../config/db.js';

dotenv.config();

export const seedContacts = async () => {
  try {
    console.log('🌱 Starting Contacts Seeder...');
    
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

    // Get companies
    const companies = await Company.find().limit(20);
    if (companies.length === 0) {
      throw new Error('No companies found. Please run seed:companies first.');
    }

    // Get employee users for ownerId assignment
    const employees = await User.find({ role: 'employee' }).limit(9);

    // Check existing contact count
    const existingContactCount = await Contact.countDocuments();
    const targetContactCount = 100;
    const contactsToCreate = Math.max(0, targetContactCount - existingContactCount);

    if (contactsToCreate > 0) {
      console.log(`Creating ${contactsToCreate} contacts...`);
      
      const jobTitles = [
        'CEO',
        'CTO',
        'CFO',
        'VP Sales',
        'VP Marketing',
        'Director',
        'Manager',
        'Senior Manager',
        'Analyst',
        'Senior Analyst',
        'Coordinator',
        'Specialist',
        'Executive',
        'Consultant',
        'Engineer',
        'Developer',
        'Designer',
        'Accountant',
        'HR Manager',
        'Operations Manager',
      ];

      const departments = [
        'Sales',
        'Marketing',
        'Engineering',
        'Finance',
        'Operations',
        'Human Resources',
        'Customer Service',
        'Product',
        'Business Development',
        'IT',
      ];

      const contacts = [];
      
      for (let i = 0; i < contactsToCreate; i++) {
        const firstName = faker.person.firstName();
        const lastName = faker.person.lastName();
        const email = faker.internet.email({ firstName, lastName }).toLowerCase();
        
        // Get random company
        const company = faker.helpers.arrayElement(companies);
        
        // Optionally assign to an employee (70% chance)
        const ownerId = employees.length > 0 && Math.random() > 0.3 
          ? faker.helpers.arrayElement(employees)._id 
          : undefined;

        const jobTitle = faker.helpers.arrayElement(jobTitles);
        const department = faker.helpers.arrayElement(departments);

        const contact = await Contact.create({
          firstName,
          lastName,
          emails: [
            {
              email,
              type: 'work',
              isPrimary: true,
            },
          ],
          phones: [
            {
              phone: faker.phone.number('+1-###-###-####'),
              type: faker.helpers.arrayElement(['work', 'mobile']),
              isPrimary: true,
            },
          ],
          jobTitle,
          department,
          companyId: company._id,
          ownerId,
          address: {
            street: faker.location.streetAddress(),
            city: faker.location.city(),
            state: faker.location.state({ abbreviated: true }),
            zipCode: faker.location.zipCode(),
            country: faker.location.country(),
          },
          notes: faker.lorem.sentence(),
          tags: faker.helpers.arrayElements(['VIP', 'Key Contact', 'Decision Maker', 'Influencer'], { min: 0, max: 2 }),
          tenantId: null,
          createdBy: adminUser._id,
        });
        contacts.push(contact);
      }
      console.log(`✓ Created ${contacts.length} contacts`);
    } else {
      console.log(`✓ Contacts already exist (${existingContactCount} found)`);
    }

    // Summary
    const finalContactCount = await Contact.countDocuments();
    console.log('\n✨ Contacts Seeder Completed!');
    console.log(`Summary:`);
    console.log(`- Total Contacts: ${finalContactCount}`);

    return { success: true };
  } catch (error) {
    console.error('\n❌ Error seeding contacts:');
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

if (process.argv[1] && (process.argv[1].includes('contactsSeeder.js') || __filename.includes('contactsSeeder.js'))) {
  seedContacts()
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
