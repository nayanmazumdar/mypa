const app = require('./app');
const config = require('./config/env');
const logger = require('./config/logger');
const { initDatabase } = require('./config/db');

const PORT = config.port || 5000;

const startServer = () => {
  initDatabase();

  app.listen(PORT, () => {
    logger.info(`✅ MyPA Backend running on http://localhost:${PORT}`);
    logger.info(`📖 Swagger docs: http://localhost:${PORT}/api-docs`);
    logger.info(`🗄️  Database: SQLite`);
  });
};

startServer();
