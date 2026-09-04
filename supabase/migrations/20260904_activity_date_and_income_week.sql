-- Giorno dell'attività, separato dall'istante di inserimento della riga.
--
-- `created_at` dice quando la riga è stata scritta: se la ragazza segna oggi
-- un'attività fatta ieri, i punti finirebbero nel giorno (e quindi nella
-- settimana) sbagliato. `approved_at` copre già l'istante dell'approvazione,
-- `created_at` resta l'istante di creazione del record, e `activity_date`
-- diventa l'unica data su cui si contano i punti del giorno e della settimana.
--
-- La settimana saldata da un accredito viene dalla stessa esigenza: ricostruirla
-- dalla data dell'accredito sposta sulla settimana in corso una paghetta pagata
-- in ritardo, e con essa il controllo che impedisce di pagare due volte.
--
-- Facoltativa: finché non è applicata, l'app ricade su `created_at` per i log e
-- sulla nota dell'accredito per la settimana.
--
-- Da eseguire nella SQL Editor di Supabase (una volta sola).

ALTER TABLE activity_logs ADD COLUMN IF NOT EXISTS activity_date DATE;

UPDATE activity_logs
SET activity_date = (created_at AT TIME ZONE 'Europe/Rome')::date
WHERE activity_date IS NULL;

ALTER TABLE activity_logs ALTER COLUMN activity_date SET DEFAULT CURRENT_DATE;

CREATE INDEX IF NOT EXISTS activity_logs_user_date_idx ON activity_logs (user_id, activity_date);

-- Lunedì della settimana saldata da un accredito di paghetta.
ALTER TABLE income ADD COLUMN IF NOT EXISTS week_start DATE;

-- Le paghette già registrate portano la settimana nella nota
-- ("Paghetta settimanale 2026-08-24"); per quelle ancora più vecchie vale il
-- lunedì del giorno di accredito.
UPDATE income
SET week_start = COALESCE(
  NULLIF(substring(note from '\d{4}-\d{2}-\d{2}'), '')::date,
  (date_trunc('week', created_at AT TIME ZONE 'Europe/Rome'))::date
)
WHERE type = 'allowance' AND week_start IS NULL;

-- PostgREST deve accorgersi delle colonne nuove
NOTIFY pgrst, 'reload schema';
