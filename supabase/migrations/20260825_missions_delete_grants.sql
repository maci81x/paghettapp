-- Le cancellazioni dell'admin devono poter arrivare al database.
--
-- Sintomo: una missione cancellata riappare dopo il refresh. La cancellazione
-- è un soft-delete (`update missions set active = false`) e il caricamento
-- filtra `active = true`: se l'UPDATE viene rifiutato, PostgREST risponde con
-- un errore che l'app metteva in coda in silenzio, la riga resta `active = true`
-- e la missione torna al primo fetch.
--
-- Due cose devono essere vere perché quell'UPDATE passi con la chiave anon:
-- una policy RLS che lo consenta, e il privilegio UPDATE sulla tabella. La
-- migrazione `20260819_pin_hash_and_rls.sql` crea la policy ma non tocca i
-- privilegi, che restano quelli di default: se su questo progetto erano stati
-- revocati, la policy da sola non basta.
--
-- Idempotente e sicura da rieseguire.
--
-- PRIMA di applicarla, per vedere se il problema è questo, esegui la query
-- diagnostica in fondo: dice quali privilegi ha davvero `anon`.
--
-- Da eseguire nella SQL Editor di Supabase (una volta sola).

-- ── policy: esplicita su ogni tabella dell'app ────────────────────────────
do $$
declare
  t text;
begin
  foreach t in array array['piggybanks', 'activities', 'activity_logs', 'missions', 'income', 'expenses', 'wishes', 'badges', 'investments']
  loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists app_all on %I', t);
    execute format('create policy app_all on %I for all to anon, authenticated using (true) with check (true)', t);
  end loop;
end $$;

-- ── privilegi: la policy non serve a niente senza il GRANT ────────────────
do $$
declare
  t text;
begin
  foreach t in array array['piggybanks', 'activities', 'activity_logs', 'missions', 'income', 'expenses', 'wishes', 'badges', 'investments']
  loop
    execute format('grant select, insert, update, delete on table %I to anon, authenticated', t);
  end loop;
end $$;

-- le sequenze degli id servono per gli insert
grant usage, select on all sequences in schema public to anon, authenticated;

notify pgrst, 'reload schema';

-- ── diagnostica ───────────────────────────────────────────────────────────
-- Esegui questa da sola per sapere se il problema era davvero qui:
--
--   select table_name, privilege_type
--     from information_schema.role_table_grants
--    where grantee = 'anon' and table_name = 'missions'
--    order by privilege_type;
--
-- Senza una riga UPDATE, le cancellazioni delle missioni non potevano passare.
