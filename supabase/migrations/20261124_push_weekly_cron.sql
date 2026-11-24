-- Promemoria del lunedì alle 19 (ora italiana).
-- pg_cron lavora in UTC: gira alle 17 e alle 18 UTC del lunedì, la funzione
-- `push` invia solo se in Italia sono le 19 (estate o inverno) e al massimo
-- una volta ogni 6 giorni. La chiave nell'intestazione è quella pubblica
-- (anon) già presente nell'app: serve solo a passare il controllo JWT.
-- Rollback: incluso in 20261124_push_notifications_rollback.sql
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

SELECT cron.unschedule('paghettapp-lunedi') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'paghettapp-lunedi');
SELECT cron.schedule(
  'paghettapp-lunedi',
  '0 17,18 * * 1',
  $$ SELECT net.http_post(
       url := 'https://olxesmxfadtgsinxrkcr.supabase.co/functions/v1/push',
       headers := '{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9seGVzbXhmYWR0Z3Npbnhya2NyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcxNTI5NDAsImV4cCI6MjEwMjcyODk0MH0.OwgdRecCN8y5bmN5gH1fkP5ZLk3kqpZ0bLudKlclW2k"}'::jsonb,
       body := '{"action":"weekly"}'::jsonb
     ) $$
);
