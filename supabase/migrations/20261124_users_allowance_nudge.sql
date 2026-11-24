-- Promemoria "Ricordalo a papà".
--
-- Quando restano paghette da riscuotere, la ragazza può ricordarlo a papà dalla
-- Home, una volta ogni 7 giorni. Qui si salva solo l'ora dell'ultimo
-- promemoria: papà lo vede nella sua area e le notifiche push lo usano.
--
-- Facoltativa: finché non è applicata l'app non mostra il pulsante.
-- Da eseguire nella SQL Editor di Supabase (una volta sola). Idempotente.
-- Rollback: supabase/rollback/20261124_users_allowance_nudge_rollback.sql

set lock_timeout = '3s';

ALTER TABLE users ADD COLUMN IF NOT EXISTS allowance_nudged_at TIMESTAMPTZ;

NOTIFY pgrst, 'reload schema';
