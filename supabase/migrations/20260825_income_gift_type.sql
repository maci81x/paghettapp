-- Terzo tipo di entrata: il regalo.
--
-- Un regalo non è una paghetta né un'entrata extra: arriva da qualcuno, ha un
-- motivo, e va tutto nel salvadanaio Personale senza lo split 30/60/10.
-- `income.type` ha un CHECK che ammette solo allowance/extra/bonus: senza
-- questa migrazione l'insert con 'gift' viene rifiutato.
--
-- Facoltativa: finché non è applicata l'app registra i regali come 'extra'
-- con la nota "🎁 Da <chi> — <motivo>", che è come li riconosce e li mostra.
-- Applicandola i regali nuovi usano il tipo giusto; quelli già registrati
-- restano 'extra' e continuano a comparire correttamente grazie alla nota.
--
-- Idempotente: rieseguirla non cambia niente.
--
-- Da eseguire nella SQL Editor di Supabase (una volta sola).

-- Il vincolo da sostituire si riconosce dalla colonna su cui insiste, non
-- dalla parola "type" nel suo testo: cercarla a stringa rischia di colpire un
-- CHECK diverso che quella parola ce l'ha per caso (`piggybank_type`, ...).
-- Vengono rimossi tutti i CHECK che insistono sulla sola colonna `type`.
DO $$
DECLARE
  con text;
  col smallint;
BEGIN
  SELECT attnum INTO col
    FROM pg_attribute
   WHERE attrelid = 'income'::regclass AND attname = 'type' AND NOT attisdropped;

  IF col IS NULL THEN
    RAISE EXCEPTION 'la tabella income non ha una colonna "type"';
  END IF;

  FOR con IN
    SELECT conname
      FROM pg_constraint
     WHERE conrelid = 'income'::regclass
       AND contype = 'c'
       AND conkey = ARRAY[col]
  LOOP
    EXECUTE format('ALTER TABLE income DROP CONSTRAINT %I', con);
  END LOOP;
END $$;

ALTER TABLE income
  ADD CONSTRAINT income_type_check
  CHECK (type IN ('allowance', 'extra', 'bonus', 'gift'));

NOTIFY pgrst, 'reload schema';

-- ── prima di applicarla, se vuoi vedere cosa verrà rimosso ────────────────
--
--   select conname, pg_get_constraintdef(oid)
--     from pg_constraint
--    where conrelid = 'income'::regclass and contype = 'c';
