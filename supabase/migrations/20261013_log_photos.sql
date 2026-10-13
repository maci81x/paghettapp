-- Foto-prova delle attività.
--
-- La ragazza può allegare una foto a un'attività segnata ("ecco il letto
-- rifatto"). La foto sta in una tabella a parte e non in `activity_logs`:
-- l'app legge tutto lo storico a ogni avvio, e decine di immagini dentro
-- quella lettura la renderebbero lenta. Qui all'avvio si legge solo l'indice
-- (quali voci hanno una foto); l'immagine arriva quando qualcuno la apre.
--
-- La foto è un JPEG ridimensionato dal telefono (lato lungo 800px) salvato
-- come data URL: niente bucket da configurare, e le policy restano quelle
-- delle altre tabelle.
--
-- Rifiutare un'attività cancella la riga del log, e con lei la sua foto
-- (ON DELETE CASCADE).
--
-- Facoltativa: finché non è applicata l'app non mostra il campo foto e la
-- scheda Foto dell'admin lo dice.
--
-- Da eseguire nella SQL Editor di Supabase (una volta sola). Idempotente.

CREATE TABLE IF NOT EXISTS log_photos (
  log_id BIGINT PRIMARY KEY REFERENCES activity_logs (id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  photo TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS log_photos_user_idx ON log_photos (user_id, created_at DESC);

-- Stessa impostazione delle altre tabelle dell'app: RLS attiva, policy aperta
-- perché l'accesso passa dai PIN e non da Supabase Auth.
ALTER TABLE log_photos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS app_all ON log_photos;
CREATE POLICY app_all ON log_photos FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE log_photos TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
