-- Migration 010: Add designation column to user_shops
ALTER TABLE user_shops ADD COLUMN designation VARCHAR(100) DEFAULT NULL;
