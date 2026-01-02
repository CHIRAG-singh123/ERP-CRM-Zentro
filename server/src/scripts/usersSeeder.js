import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { faker } from '@faker-js/faker';
import { User } from '../models/User.js';
import { connectDB } from '../config/db.js';
import bcrypt from 'bcryptjs';

dotenv.config();

export const seedUsers = async () => {
  try {
    console.log('🌱 Starting Users Seeder...');
    
    // Connect if not already connected
    if (mongoose.connection.readyState === 0) {
      await connectDB();
    }

    const saltRounds = 10;
    const defaultPassword = 'ABCdef@1234';
    const passwordHash = await bcrypt.hash(defaultPassword, saltRounds);

    // Check if admin already exists
    const existingAdmin = await User.findOne({ 
      email: 'chiragsinghpawar@gmail.com',
      role: 'admin'
    });

    let adminUser;
    if (existingAdmin) {
      console.log('✓ Admin user already exists. Using existing admin.');
      adminUser = existingAdmin;
    } else {
      // Create Admin User
      console.log('Creating admin user...');
      adminUser = await User.create({
        name: 'Chirag Singh Pawar',
        email: 'chiragsinghpawar@gmail.com',
        passwordHash,
        role: 'admin',
        isActive: true,
        mustChangePassword: false,
        phone: {
          countryCode: '+91',
          number: faker.phone.number('##########'),
        },
        tenantId: null,
      });
      console.log(`✓ Admin user created: ${adminUser.email}`);
    }

    // Check existing employee count
    const existingEmployeeCount = await User.countDocuments({ role: 'employee' });
    const targetEmployeeCount = 9;
    const employeesToCreate = Math.max(0, targetEmployeeCount - existingEmployeeCount);

    if (employeesToCreate > 0) {
      console.log(`Creating ${employeesToCreate} employee users...`);
      const employees = [];
      
      for (let i = 0; i < employeesToCreate; i++) {
        const firstName = faker.person.firstName();
        const lastName = faker.person.lastName();
        const email = faker.internet.email({ firstName, lastName }).toLowerCase();
        
        // Ensure unique email
        const existingUser = await User.findOne({ email });
        if (existingUser) {
          console.log(`⚠ Skipping duplicate email: ${email}`);
          continue;
        }

        const employee = await User.create({
          name: `${firstName} ${lastName}`,
          email,
          passwordHash,
          role: 'employee',
          isActive: true,
          mustChangePassword: false,
          phone: {
            countryCode: faker.helpers.arrayElement(['+1', '+91', '+44']),
            number: faker.phone.number('##########'),
          },
          tenantId: null,
          createdBy: adminUser._id,
        });
        employees.push(employee);
      }
      console.log(`✓ Created ${employees.length} employee users`);
    } else {
      console.log(`✓ Employee users already exist (${existingEmployeeCount} found)`);
    }

    // Check existing customer count
    const existingCustomerCount = await User.countDocuments({ role: 'customer' });
    const targetCustomerCount = 50;
    const customersToCreate = Math.max(0, targetCustomerCount - existingCustomerCount);

    if (customersToCreate > 0) {
      console.log(`Creating ${customersToCreate} customer users...`);
      const customers = [];
      
      for (let i = 0; i < customersToCreate; i++) {
        const firstName = faker.person.firstName();
        const lastName = faker.person.lastName();
        const email = faker.internet.email({ firstName, lastName }).toLowerCase();
        
        // Ensure unique email
        const existingUser = await User.findOne({ email });
        if (existingUser) {
          console.log(`⚠ Skipping duplicate email: ${email}`);
          continue;
        }

        const customer = await User.create({
          name: `${firstName} ${lastName}`,
          email,
          passwordHash,
          role: 'customer',
          isActive: true,
          mustChangePassword: false,
          phone: {
            countryCode: faker.helpers.arrayElement(['+1', '+91', '+44', '+86', '+81']),
            number: faker.phone.number('##########'),
          },
          tenantId: null,
          createdBy: adminUser._id,
        });
        customers.push(customer);
      }
      console.log(`✓ Created ${customers.length} customer users`);
    } else {
      console.log(`✓ Customer users already exist (${existingCustomerCount} found)`);
    }

    // Summary
    const finalAdminCount = await User.countDocuments({ role: 'admin' });
    const finalEmployeeCount = await User.countDocuments({ role: 'employee' });
    const finalCustomerCount = await User.countDocuments({ role: 'customer' });

    console.log('\n✨ Users Seeder Completed!');
    console.log(`Summary:`);
    console.log(`- Admins: ${finalAdminCount}`);
    console.log(`- Employees: ${finalEmployeeCount}`);
    console.log(`- Customers: ${finalCustomerCount}`);
    console.log(`\nDefault password for all users: ${defaultPassword}`);

    return { success: true };
  } catch (error) {
    console.error('\n❌ Error seeding users:');
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

if (process.argv[1] && (process.argv[1].includes('usersSeeder.js') || __filename.includes('usersSeeder.js'))) {
  seedUsers()
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
