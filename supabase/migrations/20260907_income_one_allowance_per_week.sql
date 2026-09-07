-- Una paghetta sola per settimana, garantita dal database.
--
-- La migrazione `activity_date_and_income_week` ha dato a `income` la colonna
-- `week_start`; il controllo che impedisce di pagare due volte la stessa
-- settimana però vive solo nell'app, e l'app vede una copia dei dati: due
-- dispositivi che registrano insieme, o uno rimasto offline, passano
-- entrambi. L'indice unico parziale è il blocco vero.
--
-- Da eseguire nella SQL Editor di Supabase (una volta sola), dopo
-- 20260904_activity_date_and_income_week.sql.

-- Nome allineato a quello creato in produzione il 07/09/2026: rilanciare
-- questo blocco è un no-op, non crea un secondo indice identico.
--
-- Lo storico può già contenere dei doppioni: in quel caso l'indice non nasce.
-- La migrazione lo segnala invece di fallire — la paghetta di troppo va
-- annullata dall'app (o cancellata a mano), poi si rilancia questo blocco.
DO $$
BEGIN
  CREATE UNIQUE INDEX idx_income_one_allowance_per_week
      ON income (user_id, week_start)
   WHERE type = 'allowance' AND week_start IS NOT NULL;
EXCEPTION
  WHEN duplicate_table THEN
    RAISE NOTICE 'idx_income_one_allowance_per_week esiste già: niente da fare.';
  WHEN unique_violation THEN
    RAISE WARNING 'Paghette doppie nello storico: indice non creato. Trovale così, tieni la riga giusta e rilancia questo blocco:';
    RAISE WARNING 'SELECT user_id, week_start, count(*), array_agg(id) FROM income WHERE type = ''allowance'' GROUP BY 1, 2 HAVING count(*) > 1;';
END
$$;

-- PostgREST deve accorgersi del vincolo nuovo
NOTIFY pgrst, 'reload schema';
