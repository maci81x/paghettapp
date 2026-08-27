-- Missioni nascondibili, come le attività (`activities.hidden`).
--
-- `active = false` è l'eliminazione (soft delete): la missione sparisce da
-- tutte le liste. `hidden = true` è la via di mezzo: resta nell'elenco
-- dell'admin, con il suo progresso, ma non viene più mostrata alle ragazze.
--
-- Il progresso non si azzera e i punti già assegnati non si toccano: una
-- missione nascosta si può rimostrare e riprende esattamente da dov'era.
--
-- Facoltativa: finché la migrazione non viene applicata il toggle resta
-- disattivato e l'app funziona come prima.
--
-- Da eseguire nella SQL Editor di Supabase (una volta sola).

ALTER TABLE missions ADD COLUMN IF NOT EXISTS hidden BOOLEAN DEFAULT false;

-- le missioni già presenti restano tutte visibili
UPDATE missions SET hidden = false WHERE hidden IS NULL;
