// Set env vars BEFORE any module loads (including config/env.js)
process.env.NODE_ENV = 'test';
process.env.MYSQL_DATABASE = 'shopkeeper_test_db';
process.env.JWT_SECRET = 'test_jwt_secret_key';
