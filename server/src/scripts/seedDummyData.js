import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { connectDB } from '../config/db.js';
import Company from '../models/Company.js';
import Contact from '../models/Contact.js';
import Lead from '../models/Lead.js';
import Deal from '../models/Deal.js';
import Task from '../models/Task.js';
import { Product } from '../models/Product.js';
import Quote from '../models/Quote.js';
import Invoice from '../models/Invoice.js';
import Activity from '../models/Activity.js';
import { User } from '../models/User.js';

dotenv.config();

const generateDummyData = async () => {
  try {
    await connectDB();

    // Get or create a test user
    let testUser = await User.findOne({ email: 'test@example.com' });
    if (!testUser) {
      testUser = await User.create({
        name: 'Test User',
        email: 'test@example.com',
        passwordHash: '$2a$10$dummyhash', // Dummy hash
        role: 'user',
        isActive: true,
      });
    }

    const userId = testUser._id;
    const tenantId = testUser.tenantId;

    console.log('🌱 Seeding dummy data...');

    // Clear existing data (optional - comment out if you want to keep existing data)
    // await Company.deleteMany({ tenantId });
    // await Contact.deleteMany({ tenantId });
    // await Lead.deleteMany({ tenantId });
    // await Deal.deleteMany({ tenantId });
    // await Task.deleteMany({ tenantId });
    // await Product.deleteMany({});
    // await Quote.deleteMany({ tenantId });
    // await Invoice.deleteMany({ tenantId });
    // await Activity.deleteMany({ tenantId });

    // Seed Companies
    const companies = [];
    const companyNames = [
      'Acme Corporation',
      'Tech Solutions Inc',
      'Global Industries',
      'Digital Ventures',
      'Innovation Labs',
      'Future Systems',
      'Smart Solutions',
      'Enterprise Corp',
      'NextGen Technologies',
      'Cloud Services Ltd',
      'Data Analytics Co',
      'Software Solutions',
      'Business Partners',
      'Strategic Consulting',
      'Market Leaders Inc',
    ];

    for (let i = 0; i < 15; i++) {
      const company = await Company.create({
        name: companyNames[i],
        email: `contact@${companyNames[i].toLowerCase().replace(/\s+/g, '')}.com`,
        phone: `+1-555-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`,
        website: `https://www.${companyNames[i].toLowerCase().replace(/\s+/g, '')}.com`,
        industry: ['Technology', 'Finance', 'Healthcare', 'Retail', 'Manufacturing'][
          Math.floor(Math.random() * 5)
        ],
        address: {
          street: `${Math.floor(Math.random() * 9999)} Main St`,
          city: ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix'][
            Math.floor(Math.random() * 5)
          ],
          state: ['NY', 'CA', 'IL', 'TX', 'AZ'][Math.floor(Math.random() * 5)],
          zipCode: String(Math.floor(Math.random() * 90000) + 10000),
          country: 'USA',
        },
        tags: ['Enterprise', 'SMB', 'Startup'][Math.floor(Math.random() * 3)],
        createdBy: userId,
        tenantId,
      });
      companies.push(company);
    }
    console.log(`✅ Created ${companies.length} companies`);

    // Seed Contacts
    const contacts = [];
    const firstNames = [
      'John', 'Jane', 'Michael', 'Sarah', 'David', 'Emily', 'Robert', 'Jessica', 'William', 'Ashley',
      'James', 'Amanda', 'Richard', 'Melissa', 'Joseph', 'Michelle',
    ];
    const lastNames = [
      'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez',
      'Hernandez', 'Lopez', 'Wilson', 'Anderson', 'Thomas', 'Taylor',
    ];

    for (let i = 0; i < 15; i++) {
      const company = companies[Math.floor(Math.random() * companies.length)];
      const contact = await Contact.create({
        firstName: firstNames[i % firstNames.length],
        lastName: lastNames[i % lastNames.length],
        companyId: company._id,
        emails: [
          {
            email: `${firstNames[i % firstNames.length].toLowerCase()}.${lastNames[i % lastNames.length].toLowerCase()}@example.com`,
            type: 'work',
            isPrimary: true,
          },
        ],
        phones: [
          {
            phone: `+1-555-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`,
            type: 'work',
            isPrimary: true,
          },
        ],
        jobTitle: ['CEO', 'CTO', 'CFO', 'VP Sales', 'Director', 'Manager', 'Analyst'][
          Math.floor(Math.random() * 7)
        ],
        department: ['Sales', 'Marketing', 'Engineering', 'Finance', 'Operations'][
          Math.floor(Math.random() * 5)
        ],
        createdBy: userId,
        tenantId,
      });
      contacts.push(contact);
    }
    console.log(`✅ Created ${contacts.length} contacts`);

    // Seed Products
    const products = [];
    const productNames = [
      'Enterprise License',
      'Professional Package',
      'Basic Plan',
      'Premium Suite',
      'Standard Edition',
      'Advanced Tools',
      'Business Solution',
      'Starter Kit',
      'Deluxe Package',
      'Ultimate Plan',
      'Core System',
      'Extended Features',
      'Complete Bundle',
      'Essential Tools',
      'Full Suite',
    ];

    for (let i = 0; i < 15; i++) {
      const product = await Product.create({
        name: productNames[i],
        description: `Description for ${productNames[i]}`,
        price: Math.floor(Math.random() * 10000) + 100,
        sku: `SKU-${Date.now()}-${i + 1}-${Math.random().toString(36).substring(2, 8)}`,
        category: ['Software', 'Service', 'Hardware', 'Consulting'][Math.floor(Math.random() * 4)],
        isActive: true,
        createdBy: userId,
      });
      products.push(product);
    }
    console.log(`✅ Created ${products.length} products`);

    // Seed Leads
    const leads = [];
    const leadSources = ['website', 'referral', 'social', 'email', 'phone', 'other'];
    const leadStatuses = ['New', 'Contacted', 'Qualified', 'Lost', 'Converted'];

    for (let i = 0; i < 15; i++) {
      const contact = contacts[Math.floor(Math.random() * contacts.length)];
      const company = contact.companyId || companies[Math.floor(Math.random() * companies.length)];
      const lead = await Lead.create({
        title: `Lead ${i + 1}: ${contact.firstName} ${contact.lastName}`,
        contactId: contact._id,
        companyId: company._id,
        source: leadSources[Math.floor(Math.random() * leadSources.length)],
        status: leadStatuses[Math.floor(Math.random() * leadStatuses.length)],
        value: Math.floor(Math.random() * 100000) + 10000,
        description: `Lead description for ${contact.firstName} ${contact.lastName}`,
        ownerId: userId,
        createdBy: userId,
        tenantId,
      });
      leads.push(lead);
    }
    console.log(`✅ Created ${leads.length} leads`);

    // Seed Deals
    const deals = [];
    const dealStages = ['Prospecting', 'Qualification', 'Proposal', 'Negotiation', 'Closed Won', 'Closed Lost'];

    for (let i = 0; i < 15; i++) {
      const contact = contacts[Math.floor(Math.random() * contacts.length)];
      const company = contact.companyId || companies[Math.floor(Math.random() * companies.length)];
      const deal = await Deal.create({
        title: `Deal ${i + 1}: ${company.name}`,
        contactId: contact._id,
        companyId: company._id,
        value: Math.floor(Math.random() * 200000) + 20000,
        currency: 'USD',
        stage: dealStages[Math.floor(Math.random() * dealStages.length)],
        probability: Math.floor(Math.random() * 100),
        closeDate: new Date(Date.now() + Math.random() * 90 * 24 * 60 * 60 * 1000),
        products: [
          {
            productId: products[Math.floor(Math.random() * products.length)]._id,
            quantity: Math.floor(Math.random() * 10) + 1,
            unitPrice: products[Math.floor(Math.random() * products.length)].price,
          },
        ],
        ownerId: userId,
        createdBy: userId,
        tenantId,
      });
      deals.push(deal);
    }
    console.log(`✅ Created ${deals.length} deals`);

    // Seed Tasks
    const tasks = [];
    const taskPriorities = ['Low', 'Medium', 'High', 'Urgent'];
    const taskStatuses = ['Todo', 'In Progress', 'Done', 'Cancelled'];

    for (let i = 0; i < 15; i++) {
      const task = await Task.create({
        title: `Task ${i + 1}: Follow up with client`,
        description: `Task description ${i + 1}`,
        status: taskStatuses[Math.floor(Math.random() * taskStatuses.length)],
        priority: taskPriorities[Math.floor(Math.random() * taskPriorities.length)],
        assignedTo: userId,
        createdBy: userId,
        dueDate: new Date(Date.now() + Math.random() * 30 * 24 * 60 * 60 * 1000),
        relatedTo: {
          type: ['Lead', 'Deal', 'Contact'][Math.floor(Math.random() * 3)],
          id: [leads, deals, contacts][Math.floor(Math.random() * 3)][
            Math.floor(Math.random() * 15)
          ]._id,
        },
        tenantId,
      });
      tasks.push(task);
    }
    console.log(`✅ Created ${tasks.length} tasks`);

    // Seed Quotes
    const quoteCount = await Quote.countDocuments();
    for (let i = 0; i < 10; i++) {
      const deal = deals[Math.floor(Math.random() * deals.length)];
      await Quote.create({
        quoteNumber: `QT-${String(quoteCount + i + 1).padStart(6, '0')}`,
        dealId: deal._id,
        contactId: deal.contactId,
        companyId: deal.companyId,
        status: ['Draft', 'Sent', 'Accepted', 'Rejected', 'Expired'][Math.floor(Math.random() * 5)],
        lineItems: [
          {
            productId: products[Math.floor(Math.random() * products.length)]._id,
            quantity: Math.floor(Math.random() * 5) + 1,
            unitPrice: products[Math.floor(Math.random() * products.length)].price,
            discount: Math.floor(Math.random() * 20),
            tax: Math.floor(Math.random() * 100),
          },
        ],
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        createdBy: userId,
        tenantId,
      });
    }
    console.log(`✅ Created 10 quotes`);

    // Seed Invoices
    const invoiceCount = await Invoice.countDocuments();
    for (let i = 0; i < 10; i++) {
      const deal = deals[Math.floor(Math.random() * deals.length)];
      await Invoice.create({
        invoiceNumber: `INV-${String(invoiceCount + i + 1).padStart(6, '0')}`,
        dealId: deal._id,
        contactId: deal.contactId,
        companyId: deal.companyId,
        status: ['Draft', 'Sent', 'Paid', 'Overdue'][Math.floor(Math.random() * 4)],
        lineItems: [
          {
            productId: products[Math.floor(Math.random() * products.length)]._id,
            quantity: Math.floor(Math.random() * 5) + 1,
            unitPrice: products[Math.floor(Math.random() * products.length)].price,
            discount: Math.floor(Math.random() * 20),
            tax: Math.floor(Math.random() * 100),
          },
        ],
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        amountPaid: Math.floor(Math.random() * 5000),
        createdBy: userId,
        tenantId,
      });
    }
    console.log(`✅ Created 10 invoices`);

    // Seed Activities
    const activityTypes = ['Call', 'Email', 'Meeting', 'Note', 'Task'];
    for (let i = 0; i < 15; i++) {
      await Activity.create({
        type: activityTypes[Math.floor(Math.random() * activityTypes.length)],
        title: `Activity ${i + 1}`,
        description: `Activity description ${i + 1}`,
        relatedTo: {
          type: ['Lead', 'Deal', 'Contact', 'Company'][Math.floor(Math.random() * 4)],
          id: [leads, deals, contacts, companies][Math.floor(Math.random() * 4)][
            Math.floor(Math.random() * 15)
          ]._id,
        },
        performedBy: userId,
        tenantId,
      });
    }
    console.log(`✅ Created 15 activities`);

    console.log('\n✨ Dummy data seeding completed!');
    console.log(`\nSummary:`);
    console.log(`- Companies: ${companies.length}`);
    console.log(`- Contacts: ${contacts.length}`);
    console.log(`- Products: ${products.length}`);
    console.log(`- Leads: ${leads.length}`);
    console.log(`- Deals: ${deals.length}`);
    console.log(`- Tasks: ${tasks.length}`);
    console.log(`- Quotes: 10`);
    console.log(`- Invoices: 10`);
    console.log(`- Activities: 15`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding dummy data:', error);
    process.exit(1);
  }
};

generateDummyData();

