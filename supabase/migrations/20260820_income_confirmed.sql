-- Conferma di ricezione della paghetta da parte della ragazza.
--
-- L'admin registra l'accredito, la ragazza conferma di aver ricevuto i soldi:
-- finché `confirmed` è false la Home mostra la card "Hai ricevuto la paghetta?".
--
-- Facoltativa: finché la migrazione non viene applicata l'app funziona lo
-- stesso e la conferma resta semplicemente nascosta.
--
-- Da eseguire nella SQL Editor di Supabase (una volta sola).

ALTER TABLE income ADD COLUMN IF NOT EXISTS confirmed BOOLEAN DEFAULT false;
ALTER TABLE income ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ;

-- le entrate già registrate prima di questa feature non vanno più confermate
UPDATE income SET confirmed = true, confirmed_at = created_at WHERE confirmed IS NOT true;
