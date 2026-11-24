-- Rollback di 20261124_users_allowance_nudge.sql: toglie la colonna (si perde
-- solo la data dell'ultimo promemoria). Idempotente.
ALTER TABLE users DROP COLUMN IF EXISTS allowance_nudged_at;
NOTIFY pgrst, 'reload schema';
