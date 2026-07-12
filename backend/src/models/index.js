const { Sequelize } = require('sequelize');
const config = require('../config/env');
const logger = require('../config/logger');

// Initialize Sequelize with MySQL
const sequelize = new Sequelize(
  config.mysql.database,
  config.mysql.user,
  config.mysql.password,
  {
    host: config.mysql.host,
    port: config.mysql.port,
    dialect: 'mysql',
    logging: config.nodeEnv === 'development' ? (msg) => logger.debug(msg) : false,
    pool: {
      max: 10,
      min: 2,
      acquire: 30000,
      idle: 10000,
    },
    define: {
      timestamps: true,
      underscored: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
  }
);

// Import models
const User = require('./User')(sequelize);
const Shop = require('./Shop')(sequelize);
const UserShop = require('./UserShop')(sequelize);
const Category = require('./Category')(sequelize);
const Product = require('./Product')(sequelize);
const Customer = require('./Customer')(sequelize);
const Supplier = require('./Supplier')(sequelize);
const Inventory = require('./Inventory')(sequelize);
const StockMovement = require('./StockMovement')(sequelize);
const Sale = require('./Sale')(sequelize);
const SaleItem = require('./SaleItem')(sequelize);
const Purchase = require('./Purchase')(sequelize);
const PurchaseItem = require('./PurchaseItem')(sequelize);
const Payment = require('./Payment')(sequelize);
const Expense = require('./Expense')(sequelize);
const Offer = require('./Offer')(sequelize);
const PosTransaction = require('./PosTransaction')(sequelize);
const PosTransactionItem = require('./PosTransactionItem')(sequelize);
const CustomerLedger = require('./CustomerLedger')(sequelize);

// ─── Associations ───────────────────────────────────────────────────────────

// User <-> Shop (many-to-many via UserShop)
User.belongsToMany(Shop, { through: UserShop, foreignKey: 'user_id' });
Shop.belongsToMany(User, { through: UserShop, foreignKey: 'shop_id' });
User.hasMany(UserShop, { foreignKey: 'user_id' });
Shop.hasMany(UserShop, { foreignKey: 'shop_id' });
UserShop.belongsTo(User, { foreignKey: 'user_id' });
UserShop.belongsTo(Shop, { foreignKey: 'shop_id' });

// Shop owns entities
Shop.hasMany(Category, { foreignKey: 'shop_id' });
Category.belongsTo(Shop, { foreignKey: 'shop_id' });

Shop.hasMany(Product, { foreignKey: 'shop_id' });
Product.belongsTo(Shop, { foreignKey: 'shop_id' });
Product.belongsTo(Category, { foreignKey: 'category_id' });
Category.hasMany(Product, { foreignKey: 'category_id' });

Shop.hasMany(Customer, { foreignKey: 'shop_id' });
Customer.belongsTo(Shop, { foreignKey: 'shop_id' });

Shop.hasMany(Supplier, { foreignKey: 'shop_id' });
Supplier.belongsTo(Shop, { foreignKey: 'shop_id' });

// Inventory
Product.hasOne(Inventory, { foreignKey: 'product_id' });
Inventory.belongsTo(Product, { foreignKey: 'product_id' });

// Stock Movements
Product.hasMany(StockMovement, { foreignKey: 'product_id' });
StockMovement.belongsTo(Product, { foreignKey: 'product_id' });

// Sales
Shop.hasMany(Sale, { foreignKey: 'shop_id' });
Sale.belongsTo(Shop, { foreignKey: 'shop_id' });
Sale.belongsTo(Customer, { foreignKey: 'customer_id' });
Customer.hasMany(Sale, { foreignKey: 'customer_id' });
Sale.hasMany(SaleItem, { foreignKey: 'sale_id', as: 'items' });
SaleItem.belongsTo(Sale, { foreignKey: 'sale_id' });
SaleItem.belongsTo(Product, { foreignKey: 'product_id' });

// Purchases
Shop.hasMany(Purchase, { foreignKey: 'shop_id' });
Purchase.belongsTo(Shop, { foreignKey: 'shop_id' });
Purchase.belongsTo(Supplier, { foreignKey: 'supplier_id' });
Supplier.hasMany(Purchase, { foreignKey: 'supplier_id' });
Purchase.hasMany(PurchaseItem, { foreignKey: 'purchase_id', as: 'items' });
PurchaseItem.belongsTo(Purchase, { foreignKey: 'purchase_id' });
PurchaseItem.belongsTo(Product, { foreignKey: 'product_id' });

// Payments
Shop.hasMany(Payment, { foreignKey: 'shop_id' });
Payment.belongsTo(Shop, { foreignKey: 'shop_id' });

// Expenses
Shop.hasMany(Expense, { foreignKey: 'shop_id' });
Expense.belongsTo(Shop, { foreignKey: 'shop_id' });

// Offers
Shop.hasMany(Offer, { foreignKey: 'shop_id' });
Offer.belongsTo(Shop, { foreignKey: 'shop_id' });
Offer.belongsTo(Category, { foreignKey: 'category_id' });
Offer.belongsTo(Product, { foreignKey: 'product_id' });

// POS Transactions
Shop.hasMany(PosTransaction, { foreignKey: 'shop_id' });
PosTransaction.belongsTo(Shop, { foreignKey: 'shop_id' });
PosTransaction.belongsTo(Customer, { foreignKey: 'customer_id' });
PosTransaction.hasMany(PosTransactionItem, { foreignKey: 'transaction_id', as: 'items' });
PosTransactionItem.belongsTo(PosTransaction, { foreignKey: 'transaction_id' });
PosTransactionItem.belongsTo(Product, { foreignKey: 'product_id' });

// Customer Ledger
Customer.hasMany(CustomerLedger, { foreignKey: 'customer_id', as: 'ledger' });
CustomerLedger.belongsTo(Customer, { foreignKey: 'customer_id' });
Shop.hasMany(CustomerLedger, { foreignKey: 'shop_id' });
CustomerLedger.belongsTo(Shop, { foreignKey: 'shop_id' });

// ─── Export ─────────────────────────────────────────────────────────────────

const db = {
  sequelize,
  Sequelize,
  User,
  Shop,
  UserShop,
  Category,
  Product,
  Customer,
  Supplier,
  Inventory,
  StockMovement,
  Sale,
  SaleItem,
  Purchase,
  PurchaseItem,
  Payment,
  Expense,
  Offer,
  PosTransaction,
  PosTransactionItem,
  CustomerLedger,
};

module.exports = db;
