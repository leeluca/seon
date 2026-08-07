-- Intentional pre-launch reset. The previous custom-auth users cannot be
-- migrated safely into Better Auth accounts because their session/account
-- model is incompatible. Goal and entry rows are test data at this stage.
-- This migration must be applied explicitly during rollout.
TRUNCATE TABLE "entry", "goal", "refresh_token", "user" CASCADE;
