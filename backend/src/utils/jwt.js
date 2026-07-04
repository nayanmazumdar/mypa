const jwt = require('jsonwebtoken');
const config = require('../config/env');

const generateToken = (payload) => {
  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn,
  });
};

const verifyToken = (token) => {
  return jwt.verify(token, config.jwt.secret);
};

const generateRefreshToken = (payload) => {
  return jwt.sign(payload, config.jwt.secret + '_refresh', { expiresIn: '30d' });
};

const verifyRefreshToken = (token) => {
  return jwt.verify(token, config.jwt.secret + '_refresh');
};

module.exports = { generateToken, verifyToken, generateRefreshToken, verifyRefreshToken };
