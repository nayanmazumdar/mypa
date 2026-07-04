const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');
const config = require('./env');
const logger = require('./logger');

let db;
let dbPath;

/**
 * Wrapper around sql.js to mimic better-sqlite3 synchronous API.
 * Methods supported: prepare().get(), prepare().run(), prepare().all(), exec(), transaction()
 */
class SqlJsWrapper {
  constructor(sqlDb, filePath) {
    this._db = sqlDb;
    this._filePath = filePath;
  }

  exec(sql) {
    this._db.run(sql);
    this._save();
  }

  pragma(pragmaStr) {
    const [key, value] = pragmaStr.split('=').map((s) => s.trim());
    if (value) {
      this._db.run(`PRAGMA ${key} = ${value}`);
    } else {
      this._db.run(`PRAGMA ${key}`);
    }
  }

  prepare(sql) {
    const self = this;
    return {
      get(...params) {
        const stmt = self._db.prepare(sql);
        if (params.length) stmt.bind(params);
        if (stmt.step()) {
          const row = stmt.getAsObject();
          stmt.free();
          return row;
        }
        stmt.free();
        return undefined;
      },
      all(...params) {
        const results = [];
        const stmt = self._db.prepare(sql);
        if (params.length) stmt.bind(params);
        while (stmt.step()) {
          results.push(stmt.getAsObject());
        }
        stmt.free();
        return results;
      },
      run(...params) {
        const stmt = self._db.prepare(sql);
        if (params.length) stmt.bind(params);
        stmt.step();
        stmt.free();
        const changes = self._db.getRowsModified();
        const info = self._db.exec("SELECT last_insert_rowid() as id");
        const lastInsertRowid = info.length > 0 ? info[0].values[0][0] : 0;
        self._save();
        return { changes, lastInsertRowid };
      },
    };
  }

  transaction(fn) {
    const self = this;
    return (...args) => {
      self._db.run('BEGIN TRANSACTION');
      try {
        const result = fn(...args);
        self._db.run('COMMIT');
        self._save();
        return result;
      } catch (err) {
        self._db.run('ROLLBACK');
        throw err;
      }
    };
  }

  close() {
    this._save();
    this._db.close();
  }

  _save() {
    if (this._filePath) {
      const data = this._db.export();
      fs.writeFileSync(this._filePath, Buffer.from(data));
    }
  }
}

let initPromise = null;

const initDb = async () => {
  if (db) return db;

  const SQL = await initSqlJs();
  dbPath = path.resolve(__dirname, '../../', config.sqlite.dbPath);

  // Ensure directory exists
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  let sqlDb;
  if (fs.existsSync(dbPath)) {
    const buffer = fs.readFileSync(dbPath);
    sqlDb = new SQL.Database(buffer);
  } else {
    sqlDb = new SQL.Database();
  }

  db = new SqlJsWrapper(sqlDb, dbPath);
  logger.info(`SQLite database connected at ${dbPath}`);
  return db;
};

const getDb = () => {
  if (!db) {
    // Synchronous init for backward compat — initDb must be called first at startup
    throw new Error('SQLite not initialized. Call initDb() at startup.');
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

module.exports = { getDb, initDb, closeDb };
