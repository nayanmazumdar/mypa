/**
 * Database connection manager.
 * Uses MySQL as primary database, falls back to SQLite when offline.
 */
const { getPool, testConnection } = require('./mysql');
const { getDb, initDb } = require('./sqlite');
const logger = require('./logger');

let mysqlAvailable = false;
let checkInterval = null;

/**
 * Test if MySQL is currently reachable
 */
const isMysqlAvailable = () => mysqlAvailable;

/**
 * Check MySQL connectivity and update status
 */
const checkMysql = async () => {
  try {
    const pool = getPool();
    const conn = await pool.getConnection();
    conn.release();
    if (!mysqlAvailable) {
      logger.info('MySQL connection restored');
    }
    mysqlAvailable = true;
  } catch {
    if (mysqlAvailable) {
      logger.warn('MySQL connection lost, switching to SQLite offline mode');
    }
    mysqlAvailable = false;
  }
};

/**
 * Initialize database connections.
 * Sets up MySQL check interval and initializes SQLite as fallback.
 */
const initDatabase = async () => {
  // Initialize SQLite for offline fallback
  await initDb();

  // Initial MySQL check
  mysqlAvailable = await testConnection();

  // Periodically check MySQL connectivity (every 30 seconds)
  checkInterval = setInterval(checkMysql, 30000);

  if (mysqlAvailable) {
    logger.info('Database mode: MySQL (primary)');
  } else {
    logger.warn('Database mode: SQLite (offline fallback) — MySQL is unavailable');
  }
};

/**
 * Stop the MySQL health check interval
 */
const stopHealthCheck = () => {
  if (checkInterval) {
    clearInterval(checkInterval);
    checkInterval = null;
  }
};

module.exports = { isMysqlAvailable, initDatabase, stopHealthCheck, getPool, getDb };
