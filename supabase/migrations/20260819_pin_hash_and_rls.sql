-- ═══════════════════════════════════════════════════════════════════════════
-- PIN fuori dalla portata del client + RLS esplicita su tutte le tabelle
--
-- Cosa cambia davvero:
--   • i PIN non viaggiano più verso il browser e non sono più in chiaro:
--     restano in `user_pins`, con hash bcrypt, in una tabella che il client
--     non può leggere;
--   • la verifica avviene con la funzione check_pin(), che risponde solo
--     sì/no e ha un freno di un quarto di secondo per tentativo;
--   • sulla tabella `users` il client può aggiornare solo le colonne del
--     profilo: non può più riscrivere i punti di un'altra o toccare i PIN.
--
-- Cosa NON cambia: senza login vero le policy restano aperte a chiunque abbia
-- la chiave anon. È un irrobustimento, non autenticazione. Per quella serve
-- Supabase Auth con un account per figlia.
--
-- Da eseguire nella SQL Editor di Supabase, una volta sola.
-- Applicala DOPO 20260819_paghettapp_extra_columns.sql.
-- ═══════════════════════════════════════════════════════════════════════════

-- pgcrypto sta in `extensions` sui progetti Supabase recenti e in `public` su
-- quelli vecchi: tenendo entrambi nel search_path lo script funziona comunque.
set search_path = public, extensions;

create extension if not exists pgcrypto;

-- ── 1. i PIN in una tabella a parte, con hash ──────────────────────────────

create table if not exists user_pins (
  user_id text primary key references users (id) on delete cascade,
  pin_hash text not null,
  updated_at timestamptz not null default now()
);

-- travaso dei PIN esistenti (bcrypt) e rimozione della colonna in chiaro
do $$
begin
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'users' and column_name = 'pin') then
    insert into user_pins (user_id, pin_hash)
    select id, crypt(pin, gen_salt('bf', 10)) from users
    on conflict (user_id) do nothing;

    alter table users drop column pin;
  end if;
end $$;

-- rete di sicurezza: se mancasse un PIN, quello di fabbrica
insert into user_pins (user_id, pin_hash)
select v.id, crypt(v.pin, gen_salt('bf', 10))
from (values ('mia', '2806'), ('samira', '0811'), ('admin', '0000')) as v (id, pin)
where exists (select 1 from users u where u.id = v.id)
on conflict (user_id) do nothing;

alter table user_pins enable row level security;
-- nessuna policy: la tabella resta invisibile al client, ci si passa solo
-- attraverso le funzioni qui sotto
revoke all on table user_pins from anon, authenticated;

-- ── 2. funzioni: l'unico modo per usare i PIN ─────────────────────────────

/** Vero se il PIN corrisponde. Non rivela nulla in caso di errore. */
create or replace function check_pin(p_user_id text, p_pin text)
returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  stored text;
begin
  -- un PIN sono 4 cifre: senza un freno si prova tutto lo spazio in pochi minuti
  perform pg_sleep(0.25);
  select pin_hash into stored from user_pins where user_id = p_user_id;
  if stored is null then
    return false;
  end if;
  return stored = crypt(p_pin, stored);
end;
$$;

/** Cambio PIN da parte dell'interessata: serve quello attuale. */
create or replace function set_pin(p_user_id text, p_old_pin text, p_new_pin text)
returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if p_new_pin !~ '^\d{4}$' then
    return false;
  end if;
  if not check_pin(p_user_id, p_old_pin) then
    return false;
  end if;
  update user_pins
     set pin_hash = crypt(p_new_pin, gen_salt('bf', 10)),
         updated_at = now()
   where user_id = p_user_id;
  return true;
end;
$$;

/** Cambio o reset da parte dell'admin: serve il PIN dell'admin. */
create or replace function admin_set_pin(p_admin_pin text, p_user_id text, p_new_pin text)
returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if p_new_pin !~ '^\d{4}$' then
    return false;
  end if;
  if not check_pin('admin', p_admin_pin) then
    return false;
  end if;
  insert into user_pins (user_id, pin_hash)
  values (p_user_id, crypt(p_new_pin, gen_salt('bf', 10)))
  on conflict (user_id) do update
    set pin_hash = excluded.pin_hash, updated_at = now();
  return true;
end;
$$;

revoke all on function check_pin(text, text) from public;
revoke all on function set_pin(text, text, text) from public;
revoke all on function admin_set_pin(text, text, text) from public;
grant execute on function check_pin(text, text) to anon, authenticated;
grant execute on function set_pin(text, text, text) to anon, authenticated;
grant execute on function admin_set_pin(text, text, text) to anon, authenticated;

-- ── 3. tabella users: lettura libera, scrittura solo sul profilo ──────────

alter table users enable row level security;

drop policy if exists users_read on users;
drop policy if exists users_update on users;
create policy users_read on users for select to anon, authenticated using (true);
create policy users_update on users for update to anon, authenticated using (true) with check (true);
-- niente insert né delete: i tre profili sono fissi

revoke insert, update, delete on table users from anon, authenticated;
grant select on table users to anon, authenticated;
grant update (avatar, nickname, theme_colors, bg_pattern, profile_photo, total_pts, streak, last_active)
  on table users to anon, authenticated;

-- ── 4. RLS esplicita sulle tabelle dei dati ───────────────────────────────
-- L'app non ha login, quindi qui le policy restano aperte: servono a rendere
-- esplicita la scelta e a togliere l'allarme "RLS disabilitata". Il giorno in
-- cui arriva Supabase Auth, è qui che si stringe (using: auth.uid() = user_id).

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

-- PostgREST deve accorgersi delle nuove funzioni e della colonna sparita
notify pgrst, 'reload schema';
