-- Spese in due tempi: prima il previsto, poi l'effettivo.
--
-- La ragazza annota cosa pensa di spendere ("Gelato con amiche, €5"): la
-- spesa nasce `previsto` e il saldo del salvadanaio non si muove, perché i
-- soldi sono ancora lì. Quando li spende davvero indica quanto ("€3,50"): la
-- spesa diventa `effettivo`, `amount` prende l'importo reale e solo allora il
-- saldo scende. `planned_amount` conserva la cifra prevista, per il confronto.
--
-- Le spese registrate prima restano `ok`: già pagate, nessun previsto.
--
-- Facoltativa: finché non è applicata l'app rileva l'assenza della colonna e
-- registra le spese come prima, in un passaggio solo.
--
-- Da eseguire nella SQL Editor di Supabase (una volta sola). Idempotente.

ALTER TABLE expenses ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'ok';
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS planned_amount NUMERIC(10,2);

DO $$
BEGIN
  ALTER TABLE expenses ADD CONSTRAINT expenses_status_check CHECK (status IN ('ok', 'previsto', 'effettivo'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

NOTIFY pgrst, 'reload schema';
