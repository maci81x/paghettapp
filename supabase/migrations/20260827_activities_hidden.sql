-- Attività nascondibili.
--
-- `active = false` è l'eliminazione (soft delete): l'attività sparisce da
-- tutte le liste. `hidden = true` è la via di mezzo: l'attività resta
-- nell'elenco dell'admin, ma non viene più proposta alle ragazze.
--
-- Lo storico non cambia: i log già registrati restano visibili, e una
-- missione che l'aveva già collegata continua a contarla.
--
-- Facoltativa: finché la migrazione non viene applicata il toggle resta
-- disattivato e l'app funziona come prima.
--
-- Da eseguire nella SQL Editor di Supabase (una volta sola).

ALTER TABLE activities ADD COLUMN IF NOT EXISTS hidden BOOLEAN DEFAULT false;

-- le attività già presenti restano tutte visibili
UPDATE activities SET hidden = false WHERE hidden IS NULL;
