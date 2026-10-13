-- Premio delle missioni in euro.
--
-- Finora il premio era in punti (`points`). I punti alimentano la fascia
-- settimanale, ma la fascia si ferma a 500: una ragazza già oltre i 500 punti
-- completava una missione e non guadagnava niente. Con `bonus_amount` il
-- premio è un importo in euro, versato nei tre salvadanai con lo split
-- 30/60/10 come la paghetta.
--
-- Le missioni esistenti NON vengono convertite: `bonus_amount` resta NULL e
-- continuano a premiare in punti come prima. Le nuove nascono in euro, con
-- `points = 0`.
--
-- Facoltativa: finché non è applicata l'app rileva l'assenza della colonna e
-- propone solo premi in punti, come prima.
--
-- Da eseguire nella SQL Editor di Supabase (una volta sola). Idempotente.

ALTER TABLE missions ADD COLUMN IF NOT EXISTS bonus_amount NUMERIC(6,2);

DO $$
BEGIN
  ALTER TABLE missions ADD CONSTRAINT missions_bonus_amount_check CHECK (bonus_amount IS NULL OR bonus_amount >= 0);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

NOTIFY pgrst, 'reload schema';
