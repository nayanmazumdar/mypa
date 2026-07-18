const express = require('express');
const cors = require('cors');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const hpp = require('hpp');
const config = require('./config/env');
const { errorHandler, notFoundHandler } = require('./middlewares/error.middleware');

// Import routes
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const productRoutes = require('./routes/product.routes');
const categoryRoutes = require('./routes/category.routes');
const customerRoutes = require('./routes/customer.routes');
const supplierRoutes = require('./routes/supplier.routes');
const inventoryRoutes = require('./routes/inventory.routes');
const purchaseRoutes = require('./routes/purchase.routes');
const salesRoutes = require('./routes/sales.routes');
const invoiceRoutes = require('./routes/invoice.routes');
const paymentRoutes = require('./routes/payment.routes');
const reportRoutes = require('./routes/report.routes');
const posRoutes = require('./routes/pos.routes');
const expenseRoutes = require('./routes/expense.routes');
const offerRoutes = require('./routes/offer.routes');
const shopRoutes = require('./routes/shop.routes');
const customerLedgerRoutes = require('./routes/customer-ledger.routes');
const individualRoutes = require('./routes/individual.routes');
const notesRoutes = require('./routes/notes.routes');
const subscriptionRoutes = require('./routes/subscription.routes');
const returnRoutes = require('./routes/return.routes');
const shiftRoutes = require('./routes/shift.routes');
const exportRoutes = require('./routes/export.routes');
const sseRoutes = require('./routes/sse.routes');
const attendanceRoutes = require('./routes/attendance.routes');
const loginLogRoutes = require('./routes/loginLog.routes');
const adminRoutes = require('./routes/admin.routes');
const rbacRoutes = require('./routes/rbac.routes');

const app = express();

// ===================
// SECURITY MIDDLEWARE
// ===================

// Helmet - HTTP security headers
app.use(helmet({
  contentSecurityPolicy: config.nodeEnv === 'production' ? undefined : false,
  crossOriginEmbedderPolicy: false,
}));

// CORS - Restrict origins in production
const corsOptions = {
  origin: config.nodeEnv === 'production'
    ? [process.env.FRONTEND_URL || 'http://localhost:3000']
    : true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400,
};
app.use(cors(corsOptions));

// Rate limiting - General
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // 200 requests per window
  message: { success: false, message: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', generalLimiter);

// Rate limiting - POS (higher limit for busy shops)
const posLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000, // POS needs high throughput during rush hours
  message: { success: false, message: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/pos/', posLimiter);

// Rate limiting - Auth (stricter)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 login attempts per window
  message: { success: false, message: 'Too many login attempts, please try again after 15 minutes' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// Compression
app.use(compression());

// HPP - HTTP Parameter Pollution protection
app.use(hpp());

// Body parsing with size limits
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ===================
// STATIC FILES
// ===================
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// ===================
// SWAGGER DOCS
// ===================
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'MyPA API Documentation',
}));

// ===================
// API ROUTES
// ===================
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/purchases', purchaseRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/pos', posRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/offers', offerRoutes);
app.use('/api/shop', shopRoutes);
app.use('/api/customer-ledger', customerLedgerRoutes);
app.use('/api/individual', individualRoutes);
app.use('/api/notes', notesRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/returns', returnRoutes);
app.use('/api/shifts', shiftRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/import', exportRoutes);
app.use('/api/events', sseRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/login-logs', loginLogRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/admin/dashboard', require('./routes/admin-dashboard.routes'));
app.use('/api/notifications', require('./routes/notification.routes'));
app.use('/api/rbac', rbacRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), env: config.nodeEnv });
});

// ===================
// PRODUCTION: Serve frontend
// ===================
if (config.nodeEnv === 'production') {
  const frontendPath = path.join(__dirname, '../../frontend/dist');
  app.use(express.static(frontendPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(frontendPath, 'index.html'));
  });
}

// ===================
// ERROR HANDLING
// ===================
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
