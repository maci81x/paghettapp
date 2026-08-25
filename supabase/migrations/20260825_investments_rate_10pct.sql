-- Il tasso di rendimento nel database deve dire la stessa cosa dell'app.
--
-- `investments.rate` non è mai letta né scritta dall'app: la proiezione usa
-- YIELD_YEAR (0.10) da src/data/constants.ts. La colonna resta però visibile
-- a chi guarda la tabella, e un default diverso dal 10% racconta una storia
-- sbagliata. Qui si allinea, default e righe già esistenti.
--
-- Facoltativa: nessun comportamento dell'app cambia.
--
-- Da eseguire nella SQL Editor di Supabase (una volta sola).

ALTER TABLE investments ALTER COLUMN rate SET DEFAULT 0.10;

UPDATE investments SET rate = 0.10 WHERE rate IS DISTINCT FROM 0.10;
