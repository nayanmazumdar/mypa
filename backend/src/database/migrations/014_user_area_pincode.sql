-- Migration 014: Add area and pincode fields to users table
ALTER TABLE users ADD COLUMN area VARCHAR(255) DEFAULT NULL;
ALTER TABLE users ADD COLUMN pincode VARCHAR(10) DEFAULT NULL;
