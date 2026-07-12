-- Migration 008: Store user's chosen default module
-- This locks in the RBAC module choice made during first-time setup.
-- Safe to run multiple times (uses IF NOT EXISTS pattern via try/catch in runner).

ALTER TABLE users
  ADD COLUMN default_module VARCHAR(50) DEFAULT NULL AFTER role;
