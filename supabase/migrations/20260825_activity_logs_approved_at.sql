-- Istante dell'approvazione di una voce dello storico.
--
-- `created_at` dice quando la ragazza ha segnato l'attività, non quando
-- l'admin l'ha approvata: con approvazioni fatte a giorni di distanza le due
-- date divergono e il solo `created_at` non basta a ricostruire lo storico.
--
-- Facoltativa e per ora non usata dall'app: la colonna resta pronta, nessuna
-- schermata la legge o la scrive finché non serve.
--
-- Da eseguire nella SQL Editor di Supabase (una volta sola).

ALTER TABLE activity_logs ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
