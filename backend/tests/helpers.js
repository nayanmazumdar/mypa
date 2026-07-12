/**
 * Test helpers — generate auth tokens, make authenticated requests.
 */
const jwt = require('jsonwebtoken');

const JWT_SECRET = 'test_jwt_secret_key';

function generateTestToken({ id, uuid, email, role, shop_id }) {
  return jwt.sign({ id, uuid, email, role, shop_id }, JWT_SECRET, { expiresIn: '1h' });
}

function authHeader(token) {
  return { Authorization: `Bearer ${token}` };
}

module.exports = { generateTestToken, authHeader, JWT_SECRET };
