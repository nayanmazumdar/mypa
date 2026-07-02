const app = require('./app');
const config = require('./config/env');
const logger = require('./config/logger');
const { initDatabase } = require('./config/db');

const PORT = config.port;

const startServer = async () => {
  await initDatabase();

  app.listen(PORT, () => {
    logger.info(`Server running on port ${PORT} in ${config.nodeEnv} mode`);
    logger.info(`Swagger docs available at http://localhost:${PORT}/api-docs`);
  });
};

startServer();
