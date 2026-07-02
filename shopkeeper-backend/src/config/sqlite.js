const Database = require('better-sqlite3');
const path = require('path');
const config = require('./env');
const logger = require('./logger');

let db;

const getDb = () => {
  if (!db) {
    const dbPath = path.resolve(__dirname, '../../', config.sqlite.dbPath);
    db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    logger.info(`SQLite database connected at ${dbPath}`);
  }
  return db;
};

const closeDb = () => {
  if (db) {
    db.close();
    db = null;
    logger.info('SQLite database closed');
  }
};

module.exports = { getDb, closeDb };
