-- Migration 013: Add budget_period to personal_budgets
-- budget_period stores year+month as a 6-digit integer, e.g. 202607 for July 2026.
-- This allows different spending limits per month rather than one global limit.

-- Step 1: Add the budget_period column (nullable first so backfill can run)
ALTER TABLE personal_budgets
  ADD COLUMN budget_period INT(6) NOT NULL DEFAULT 0
  AFTER user_id;

-- Step 2: Backfill existing rows with the current year+month
UPDATE personal_budgets
SET budget_period = CAST(DATE_FORMAT(NOW(), '%Y%m') AS UNSIGNED)
WHERE budget_period = 0;

-- Step 3: Drop the old unique key (user_id, category)
ALTER TABLE personal_budgets
  DROP INDEX uq_user_category;

-- Step 4: Add the new unique key including budget_period
ALTER TABLE personal_budgets
  ADD UNIQUE KEY uq_user_period_category (user_id, budget_period, category);

-- Step 5: Add an index on budget_period for fast lookups
ALTER TABLE personal_budgets
  ADD INDEX idx_budget_period (budget_period);
