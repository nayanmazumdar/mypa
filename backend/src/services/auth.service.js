const { getPool } = require('../config/db');
const { hashPassword, comparePassword } = require('../utils/hash');
const { generateToken, generateRefreshToken, verifyRefreshToken } = require('../utils/jwt');
const { generateId } = require('../utils/helper');
const logger = require('../config/logger');

class AuthService {
  // ─── Register ────────────────────────────────────────────────────────────────
  async register({ name, email, password, phone, shop_name, role }) {
    const db = getPool();

    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) {
      const error = new Error('Email already registered');
      error.statusCode = 409;
      throw error;
    }

    const hashedPassword = await hashPassword(password);
    const uuid = generateId();

    const info = db.prepare(
      'INSERT INTO users (uuid, name, email, phone, password, role, shop_name) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(uuid, name, email, phone || null, hashedPassword, role || 'shopkeeper', shop_name || null);

    const user = {
      id: info.lastInsertRowid,
      uuid,
      name,
      email,
      role: role || 'shopkeeper',
      shop_name: shop_name || null,
    };

    const token = generateToken({ id: user.id, uuid: user.uuid, email: user.email, role: user.role });
    const refreshToken = generateRefreshToken({ id: user.id, uuid: user.uuid, email: user.email, role: user.role });

    // Store refresh token
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    db.prepare(
      'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES (?, ?, ?)'
    ).run(user.id, refreshToken, expiresAt);

    logger.info(`User registered: ${email}`);
    return { user, token, refreshToken };
  }

  // ─── Login ───────────────────────────────────────────────────────────────────
  async login({ email, password }) {
    const db = getPool();

    const user = db.prepare(
      'SELECT id, uuid, name, email, password, role, shop_name, is_active FROM users WHERE email = ?'
    ).get(email);

    if (!user) {
      const error = new Error('Invalid credentials');
      error.statusCode = 401;
      throw error;
    }

    if (!user.is_active) {
      const error = new Error('Account is deactivated');
      error.statusCode = 403;
      throw error;
    }

    const isMatch = await comparePassword(password, user.password);
    if (!isMatch) {
      const error = new Error('Invalid credentials');
      error.statusCode = 401;
      throw error;
    }

    const tokenPayload = { id: user.id, uuid: user.uuid, email: user.email, role: user.role };
    const token = generateToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    // Store refresh token
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    db.prepare(
      'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES (?, ?, ?)'
    ).run(user.id, refreshToken, expiresAt);

    logger.info(`User logged in: ${email}`);
    return {
      user: {
        id: user.id,
        uuid: user.uuid,
        name: user.name,
        email: user.email,
        role: user.role,
        shop_name: user.shop_name,
      },
      token,
      refreshToken,
    };
  }

  // ─── Refresh Token ───────────────────────────────────────────────────────────
  async refreshToken(token) {
    if (!token) {
      const error = new Error('Refresh token is required');
      error.statusCode = 400;
      throw error;
    }

    // Verify the token signature
    let decoded;
    try {
      decoded = verifyRefreshToken(token);
    } catch (err) {
      const error = new Error('Invalid or expired refresh token');
      error.statusCode = 401;
      throw error;
    }

    const db = getPool();

    // Check token exists in DB and is not expired
    const stored = db.prepare(
      'SELECT id, user_id, expires_at FROM refresh_tokens WHERE token = ?'
    ).get(token);

    if (!stored) {
      const error = new Error('Refresh token not found');
      error.statusCode = 401;
      throw error;
    }

    if (new Date(stored.expires_at) < new Date()) {
      // Clean up expired token
      db.prepare('DELETE FROM refresh_tokens WHERE id = ?').run(stored.id);
      const error = new Error('Refresh token has expired');
      error.statusCode = 401;
      throw error;
    }

    // Fetch user
    const user = db.prepare(
      'SELECT id, uuid, email, role, is_active FROM users WHERE id = ?'
    ).get(stored.user_id);

    if (!user || !user.is_active) {
      const error = new Error('User not found or deactivated');
      error.statusCode = 401;
      throw error;
    }

    // Rotate: delete old, issue new
    db.prepare('DELETE FROM refresh_tokens WHERE id = ?').run(stored.id);

    const tokenPayload = { id: user.id, uuid: user.uuid, email: user.email, role: user.role };
    const newAccessToken = generateToken(tokenPayload);
    const newRefreshToken = generateRefreshToken(tokenPayload);

    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    db.prepare(
      'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES (?, ?, ?)'
    ).run(user.id, newRefreshToken, expiresAt);

    logger.info(`Tokens refreshed for user: ${user.email}`);
    return { token: newAccessToken, refreshToken: newRefreshToken };
  }

  // ─── Logout ──────────────────────────────────────────────────────────────────
  async logout(userId, refreshToken) {
    const db = getPool();

    if (refreshToken) {
      db.prepare(
        'DELETE FROM refresh_tokens WHERE user_id = ? AND token = ?'
      ).run(userId, refreshToken);
    } else {
      // Delete all refresh tokens for user if no specific token provided
      db.prepare('DELETE FROM refresh_tokens WHERE user_id = ?').run(userId);
    }

    logger.info(`User logged out: userId=${userId}`);
    return { message: 'Logged out successfully' };
  }

  // ─── Forgot Password ─────────────────────────────────────────────────────────
  async forgotPassword(email) {
    const db = getPool();

    const user = db.prepare('SELECT id, email FROM users WHERE email = ?').get(email);
    if (!user) {
      // Don't reveal whether email exists; return generic message
      return { message: 'OTP sent' };
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedOtp = await hashPassword(otp);
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    db.prepare(
      "UPDATE users SET otp_code = ?, otp_expires = ?, updated_at = datetime('now') WHERE id = ?"
    ).run(hashedOtp, otpExpires, user.id);

    // In dev mode, log the OTP (in production this would be sent via email/SMS)
    console.log(`[DEV] OTP for ${email}: ${otp}`);
    logger.info(`OTP generated for: ${email}`);

    return { message: 'OTP sent', otp };
  }

  // ─── Verify OTP ──────────────────────────────────────────────────────────────
  async verifyOtp(email, otp) {
    const db = getPool();

    const user = db.prepare(
      'SELECT id, otp_code, otp_expires FROM users WHERE email = ?'
    ).get(email);

    if (!user || !user.otp_code) {
      const error = new Error('OTP not found or already used');
      error.statusCode = 400;
      throw error;
    }

    if (new Date(user.otp_expires) < new Date()) {
      const error = new Error('OTP has expired');
      error.statusCode = 400;
      throw error;
    }

    const isMatch = await comparePassword(otp.toString(), user.otp_code);
    if (!isMatch) {
      const error = new Error('Invalid OTP');
      error.statusCode = 400;
      throw error;
    }

    return { verified: true };
  }

  // ─── Reset Password ──────────────────────────────────────────────────────────
  async resetPassword(email, otp, newPassword) {
    const db = getPool();

    // Reuse verifyOtp logic
    const user = db.prepare(
      'SELECT id, otp_code, otp_expires FROM users WHERE email = ?'
    ).get(email);

    if (!user || !user.otp_code) {
      const error = new Error('OTP not found or already used');
      error.statusCode = 400;
      throw error;
    }

    if (new Date(user.otp_expires) < new Date()) {
      const error = new Error('OTP has expired');
      error.statusCode = 400;
      throw error;
    }

    const isMatch = await comparePassword(otp.toString(), user.otp_code);
    if (!isMatch) {
      const error = new Error('Invalid OTP');
      error.statusCode = 400;
      throw error;
    }

    const hashedPassword = await hashPassword(newPassword);

    db.prepare(
      "UPDATE users SET password = ?, otp_code = NULL, otp_expires = NULL, updated_at = datetime('now') WHERE id = ?"
    ).run(hashedPassword, user.id);

    logger.info(`Password reset for: ${email}`);
    return { message: 'Password reset successfully' };
  }

  // ─── Get Profile ─────────────────────────────────────────────────────────────
  async getProfile(userId) {
    const db = getPool();
    return db.prepare(
      'SELECT id, uuid, name, email, phone, role, shop_name, address, is_active, created_at FROM users WHERE id = ?'
    ).get(userId) || null;
  }

  // ─── Update Profile ──────────────────────────────────────────────────────────
  async updateProfile(userId, data) {
    const db = getPool();

    const { name, phone, address } = data;

    db.prepare(
      "UPDATE users SET name = COALESCE(?, name), phone = COALESCE(?, phone), address = COALESCE(?, address), updated_at = datetime('now') WHERE id = ?"
    ).run(name || null, phone || null, address || null, userId);

    return this.getProfile(userId);
  }
}

module.exports = new AuthService();
