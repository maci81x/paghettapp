-- Rollback di 20261124_push_notifications.sql e del promemoria pianificato.
-- Si perdono le iscrizioni dei telefoni e le chiavi (al reinstallo se ne creano di nuove).
SELECT cron.unschedule('paghettapp-lunedi') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'paghettapp-lunedi');
DROP VIEW IF EXISTS v_arrears;
DROP TABLE IF EXISTS push_subscriptions;
DROP TABLE IF EXISTS push_config;
NOTIFY pgrst, 'reload schema';
