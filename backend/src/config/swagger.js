const swaggerJsdoc = require('swagger-jsdoc');
const config = require('./env');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'MyPA - Shop Management API',
      version: '1.0.0',
      description: 'REST API for MyPA shop management application — manage products, sales, purchases, inventory, customers, suppliers, POS, expenses, reports, and more.',
      contact: {
        name: 'MyPA Support',
      },
    },
    servers: [
      {
        url: `http://localhost:${config.port}`,
        description: 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your JWT token obtained from /api/auth/login',
        },
      },
    },
    security: [{ bearerAuth: [] }],
    tags: [
      { name: 'Auth', description: 'Authentication & user management' },
      { name: 'Users', description: 'User management (admin)' },
      { name: 'Products', description: 'Product catalog management' },
      { name: 'Categories', description: 'Product categories' },
      { name: 'Customers', description: 'Customer management & ledger' },
      { name: 'Suppliers', description: 'Supplier management' },
      { name: 'Inventory', description: 'Stock & inventory management' },
      { name: 'Sales', description: 'Sales & invoices' },
      { name: 'Purchases', description: 'Purchase orders' },
      { name: 'POS', description: 'Point of Sale operations' },
      { name: 'Invoices', description: 'Invoice generation' },
      { name: 'Payments', description: 'Payment records' },
      { name: 'Expenses', description: 'Expense tracking' },
      { name: 'Offers', description: 'Offers & promotions' },
      { name: 'Reports', description: 'Business reports & analytics' },
      { name: 'Shop', description: 'Shop settings' },
      { name: 'Customer Ledger', description: 'Customer credit/debit ledger' },
    ],
  },
  apis: ['./src/routes/*.js'],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
