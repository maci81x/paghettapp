-- Settimane saldate fuori dall'app.
--
-- Prima che l'app registrasse le paghette, alcune settimane sono state pagate
-- in contanti. Comparirebbero per sempre fra le "settimane da chiudere", e
-- confermarle accrediterebbe i salvadanai una seconda volta.
--
-- "Segna come pagata fuori app" scrive una riga di paghetta per quella
-- settimana con `paid_outside = true` e importo 0: niente entra nei
-- salvadanai, ma la settimana risulta chiusa. `tier` conserva l'importo che
-- sarebbe spettato, per lo storico. Essendo una riga `allowance` con il suo
-- `week_start`, occupa il posto della settimana nell'indice unico
-- `idx_income_one_allowance_per_week`: non si può poi pagarla di nuovo per
-- sbaglio. Annullarla dallo storico la riporta fra quelle da chiudere.
--
-- Facoltativa: finché non è applicata l'app non mostra il pulsante.
--
-- Da eseguire nella SQL Editor di Supabase (una volta sola). Idempotente.

ALTER TABLE income ADD COLUMN IF NOT EXISTS paid_outside BOOLEAN NOT NULL DEFAULT false;

NOTIFY pgrst, 'reload schema';
