-- Notifiche push di PaghettApp.
--
-- push_config: le chiavi VAPID. Le genera la funzione `push` al primo avvio e
--   le tiene qui: nessuno le copia a mano, nessuno le vede in chiaro.
-- push_subscriptions: un telefono per riga (chi è, dove mandare la notifica).
-- Entrambe hanno RLS attiva e NESSUNA policy: dall'app (chiave anon) non si
-- leggono né si scrivono. Ci arriva solo la funzione, con la service role.
--
-- v_arrears: le paghette arretrate con la stessa regola di src/data/arrears.ts
-- (settimane concluse, mai pagate, con almeno un'attività approvata e non
-- pagata o da approvare; importo dalla fascia dei soli punti approvati).
--
-- Il promemoria del lunedì alle 19 (ora italiana) parte da pg_cron: gira alle
-- 17 e alle 18 UTC e la funzione invia solo se in Italia sono le 19.
--
-- Rollback: supabase/rollback/20261124_push_notifications_rollback.sql

set lock_timeout = '3s';

CREATE TABLE IF NOT EXISTS push_config (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  public_key TEXT NOT NULL,
  private_key TEXT NOT NULL,
  last_weekly_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE push_config ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE push_config FROM anon, authenticated;

CREATE TABLE IF NOT EXISTS push_subscriptions (
  endpoint TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE push_subscriptions FROM anon, authenticated;

CREATE OR REPLACE VIEW v_arrears WITH (security_invoker = true) AS
WITH l AS (
  SELECT user_id,
         date_trunc('week', coalesce(activity_date, created_at::date))::date AS wk,
         points, approved, paid, rejected_at, coalesce(revoked, false) AS revoked
  FROM activity_logs
),
w AS (
  SELECT user_id, wk,
         coalesce(sum(points) FILTER (WHERE approved), 0) AS pts,
         count(*) FILTER (WHERE (approved AND NOT paid) OR (NOT approved AND rejected_at IS NULL AND NOT revoked)) AS open_logs
  FROM l GROUP BY user_id, wk
)
SELECT w.user_id, w.wk AS week_start, w.pts,
       CASE WHEN w.pts >= 500 THEN 15 WHEN w.pts >= 350 THEN 10 WHEN w.pts >= 250 THEN 5 ELSE 2 END::numeric AS amount
FROM w
WHERE w.open_logs > 0
  AND w.wk + 7 <= (now() AT TIME ZONE 'Europe/Rome')::date
  AND NOT EXISTS (SELECT 1 FROM income i WHERE i.user_id = w.user_id AND i.type = 'allowance' AND i.week_start = w.wk);
REVOKE ALL ON v_arrears FROM anon, authenticated;

NOTIFY pgrst, 'reload schema';
