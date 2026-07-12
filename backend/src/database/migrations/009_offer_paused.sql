-- Add is_paused to track manual user pauses separately from date-driven is_active
ALTER TABLE offers ADD COLUMN is_paused BOOLEAN NOT NULL DEFAULT FALSE;
