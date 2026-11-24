-- Rollback delle 5 migrazioni di ottobre (20261013_* e 20261014_*).
-- ATTENZIONE: cancella i dati salvati nelle colonne nuove (foto-prova, note di
-- rifiuto, spese previste, premi in euro, settimane pagate fuori app).
-- Da usare solo se le migrazioni creano problemi. Idempotente.

DROP TABLE IF EXISTS log_photos;

ALTER TABLE expenses DROP CONSTRAINT IF EXISTS expenses_status_check;
ALTER TABLE expenses DROP COLUMN IF EXISTS status;
ALTER TABLE expenses DROP COLUMN IF EXISTS planned_amount;

ALTER TABLE activity_logs DROP COLUMN IF EXISTS rejected_at;
ALTER TABLE activity_logs DROP COLUMN IF EXISTS admin_note;

ALTER TABLE income DROP COLUMN IF EXISTS paid_outside;

ALTER TABLE missions DROP CONSTRAINT IF EXISTS missions_bonus_amount_check;
ALTER TABLE missions DROP COLUMN IF EXISTS bonus_amount;

NOTIFY pgrst, 'reload schema';
