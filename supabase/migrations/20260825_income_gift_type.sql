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
-- Da eseguire nella SQL Editor di Supabase (una volta sola).

DO $$
DECLARE
  con text;
BEGIN
  -- il CHECK sul tipo può avere nomi diversi a seconda di come è nata la tabella
  SELECT conname INTO con
    FROM pg_constraint
   WHERE conrelid = 'income'::regclass
     AND contype = 'c'
     AND pg_get_constraintdef(oid) ILIKE '%type%';

  IF con IS NOT NULL THEN
    EXECUTE format('ALTER TABLE income DROP CONSTRAINT %I', con);
  END IF;
END $$;

ALTER TABLE income
  ADD CONSTRAINT income_type_check
  CHECK (type IN ('allowance', 'extra', 'bonus', 'gift'));

NOTIFY pgrst, 'reload schema';
