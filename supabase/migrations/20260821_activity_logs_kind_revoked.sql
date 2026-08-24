-- Gestione dello storico dei punti da parte dell'admin.
--
-- `entry_kind` distingue le voci senza attività collegata (activity_id NULL):
--   'bonus'  → punti regalati dall'admin
--   'deduct' → punti tolti dall'admin
-- Senza questa colonna l'app le distingue dal segno dei punti, che però non
-- regge un bonus negativo.
--
-- `revoked` marca un'approvazione annullata dall'admin: resta a storico con
-- stato "❌ annullato" invece di tornare indistinguibile da una in attesa.
--
-- Entrambe facoltative: finché la migrazione non viene applicata l'app
-- funziona lo stesso, con le approssimazioni descritte sopra.
--
-- Da eseguire nella SQL Editor di Supabase (una volta sola).

ALTER TABLE activity_logs ADD COLUMN IF NOT EXISTS entry_kind TEXT;
ALTER TABLE activity_logs ADD COLUMN IF NOT EXISTS revoked BOOLEAN DEFAULT false;

-- le voci senza attività già presenti sono tutte punti bonus
UPDATE activity_logs SET entry_kind = 'bonus' WHERE activity_id IS NULL AND entry_kind IS NULL;
