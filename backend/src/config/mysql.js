const mysql = require('mysql2/promise');
const config = require('./env');
const logger = require('./logger');

let pool;

const getPool = () => {
  if (!pool) {
    pool = mysql.createPool({
      host: config.mysql.host,
      port: config.mysql.port,
      user: config.mysql.user,
      password: config.mysql.password,
      database: config.mysql.database,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      timezone: '+05:30',
    });
    logger.info('MySQL connection pool created');
  }
  return pool;
};

const testConnection = async () => {
  try {
    const connection = await getPool().getConnection();
    await connection.ping();
    connection.release();
    logger.info('MySQL connection successful');
    return true;
  } catch (error) {
    logger.error('MySQL connection failed:', error.message);
    return false;
  }
};

module.exports = { getPool, testConnection };
