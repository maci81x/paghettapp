-- Interessi accreditati davvero sul salvadanaio Risparmio.
--
-- Finora l'interesse composto era solo una simulazione: il saldo non cresceva
-- mai da solo. Ogni mese chiuso l'app capitalizza il 10% annuo (0,833% al
-- mese) e lascia qui la ricevuta.
--
-- Il vincolo UNIQUE è la parte importante: senza, due dispositivi che aprono
-- l'app lo stesso giorno accrediterebbero due volte lo stesso mese. L'app
-- scrive prima questa riga e solo dopo tocca il saldo.
--
-- Facoltativa: finché non è applicata l'app rileva l'assenza della tabella e
-- salta la capitalizzazione, continuando a mostrare solo le proiezioni.
--
-- Da eseguire nella SQL Editor di Supabase (una volta sola).

CREATE TABLE IF NOT EXISTS interest_log (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  piggybank_type TEXT NOT NULL DEFAULT 'savings',
  balance_before NUMERIC(10,2) NOT NULL,
  interest_amount NUMERIC(10,2) NOT NULL,
  rate_applied NUMERIC(8,6) NOT NULL,
  period TEXT NOT NULL,  -- '2026-08', formato YYYY-MM
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, piggybank_type, period)
);

CREATE INDEX IF NOT EXISTS interest_log_user_period ON interest_log (user_id, period);

-- Stessa impostazione delle altre tabelle dell'app: RLS attiva, policy aperta
-- perché non c'è autenticazione, privilegi espliciti per la chiave anon.
ALTER TABLE interest_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS app_all ON interest_log;
CREATE POLICY app_all ON interest_log FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE interest_log TO anon, authenticated;
GRANT USAGE, SELECT ON SEQUENCE interest_log_id_seq TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
