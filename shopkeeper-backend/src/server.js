const app = require('./app');
const config = require('./config/env');
const logger = require('./config/logger');
const { testConnection } = require('./config/mysql');

const PORT = config.port;

const startServer = async () => {
  // Test MySQL connection
  const mysqlConnected = await testConnection();
  if (!mysqlConnected) {
    logger.warn('MySQL connection failed. Server will start but some features may not work.');
  }

  app.listen(PORT, () => {
    logger.info(`Server running on port ${PORT} in ${config.nodeEnv} mode`);
    logger.info(`Swagger docs available at http://localhost:${PORT}/api-docs`);
  });
};

startServer();
