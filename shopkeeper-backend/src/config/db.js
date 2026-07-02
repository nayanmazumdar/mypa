/**
 * Database connection manager — MySQL only.
 */
const { getPool, testConnection } = require('./mysql');
const logger = require('./logger');

/**
 * Initialize database connection.
 */
const initDatabase = async () => {
  const connected = await testConnection();
  if (!connected) {
    logger.error('MySQL connection failed. Please ensure MySQL is running.');
    process.exit(1);
  }
  logger.info('Database mode: MySQL');
};

module.exports = { initDatabase, getPool };
