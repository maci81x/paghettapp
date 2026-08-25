-- Catalogo attività dal foglio originale.
--
-- Idempotente e non distruttiva: le attività aggiunte a mano dall'admin e non
-- presenti in questa lista NON vengono toccate né disattivate, e quelle che
-- l'admin aveva eliminato restano eliminate.
--
-- Tre passaggi:
--   1. rinomina le voci che il foglio chiama in modo più esteso, così non
--      nascono doppioni ("Faccende di casa" → "Fare le faccende di casa");
--   2. aggiorna punti, penalità, frequenza e categoria di quelle già presenti;
--   3. inserisce le mancanti.
--
-- Il confronto è sul nome, senza distinzione di maiuscole e spazi ai bordi.
--
-- Le categorie `crescita`, `studio` e `famiglia` sono nuove: l'app le conosce
-- dalla stessa versione che porta questa migrazione.
--
-- Da eseguire nella SQL Editor di Supabase (una volta sola).

-- ── 1. allineamento dei nomi già in uso ───────────────────────────────────
-- Solo rinomine sicure: stessa attività, nome più esteso nel foglio. Le voci
-- eliminate (active = false) si rinominano comunque, così il passaggio 3 non
-- ne inserisce un doppione accanto — ma restano eliminate.
update activities set name = 'Preparare colazione a tutti'            where lower(trim(name)) = 'preparare colazione';
update activities set name = 'Colazione a tema (ideata e cucinata)'   where lower(trim(name)) = 'colazione a tema';
update activities set name = 'Fare le faccende di casa'               where lower(trim(name)) = 'faccende di casa';
update activities set name = 'Buttare la spazzatura'                  where lower(trim(name)) = 'spazzatura';
update activities set name = 'Preparare una cena semplice'            where lower(trim(name)) = 'preparare cena';
update activities set name = 'Leggere 20 pagine del libro'            where lower(trim(name)) = 'leggere 20min';
update activities set name = 'Fare i compiti (anche non assegnati)'   where lower(trim(name)) = 'compiti senza aiuto';

-- ── catalogo ──────────────────────────────────────────────────────────────
drop table if exists catalog;

-- niente `on commit drop`: se la SQL Editor esegue le istruzioni una per una
-- invece che in un'unica transazione, la tabella sparirebbe prima dei
-- passaggi 2 e 3
create temporary table catalog (
  name text,
  emoji text,
  category text,
  points int,
  penalty int,
  frequency text,
  max_completions int,
  challenge boolean
);

insert into catalog values
  -- casa & faccende
  ('Rifarsi il letto',                                                    '🛏️', 'casa',     3,  -5,  'daily',   1, false),
  ('Preparare colazione a tutti',                                         '🍳', 'casa',     3,  -2,  'daily',   1, false),
  ('Colazione a tema (ideata e cucinata)',                                '🎨', 'casa',    10,   0,  'daily',   1, false),
  ('Fare le faccende di casa',                                            '🧹', 'casa',     4,  -5,  'daily',   1, false),
  ('Pulire le scale',                                                     '🧽', 'casa',     3,  -4,  'weekly',  1, false),
  ('Pulire le scale da agente segreto',                                   '🕵️', 'casa',    10,   0,  'weekly',  1, true),
  ('Portare fuori Tia',                                                   '🐕', 'casa',     5,  -6,  'daily',   2, false),
  ('Buttare la spazzatura',                                               '🗑️', 'casa',     5,  -6,  'daily',   1, false),
  ('Spazzatura da agente segreto',                                        '🕵️', 'casa',    10,   0,  'daily',   1, true),
  ('Gestione completa riciclo per una settimana',                         '♻️', 'casa',    10, -11,  'weekly',  1, false),
  ('Sistemare i propri panni',                                            '👕', 'casa',     3,  -5,  'daily',   1, false),
  ('Preparare una cena semplice',                                         '🍝', 'casa',     7,   0,  'daily',   1, false),
  ('Lista della spesa settimanale con budget',                            '📋', 'casa',     5,   0,  'weekly',  1, false),
  -- crescita personale
  ('Scrivere un biglietto di ringraziamento',                             '💌', 'crescita', 10, -5,  'weekly',  1, false),
  ('Risolvere un conflitto con gentilezza',                               '🤝', 'crescita', 10, -11, 'daily',   1, false),
  ('Operazione gentilezza invisibile',                                    '🤫', 'crescita', 20,  0,  'daily',   1, false),
  ('Non litigare con la sorella',                                         '✌️', 'crescita',  2, -2,  'daily',   1, false),
  ('Creare biglietti, disegni o braccialetti da barattare',               '🎨', 'crescita',  6,  0,  'daily',   1, false),
  ('Inventare un servizio da offrire',                                    '💡', 'crescita',  7,  0,  'weekly',  1, false),
  -- studio & lingue
  ('Leggere 20 pagine del libro',                                         '📚', 'studio',    5, -5,  'daily',   1, false),
  ('Fare i compiti (anche non assegnati)',                                '📝', 'studio',    5, -4,  'daily',   1, false),
  ('Creare un planner settimanale',                                       '📅', 'studio',    5, -5,  'weekly',  1, false),
  ('Guardare la TV in inglese o spagnolo',                                '🎬', 'studio',   10, -10, 'daily',   1, false),
  ('Scrivere 1 frase in inglese/spagnolo su foglietti in casa',           '🏷️', 'studio',    5, -5,  'daily',   1, false),
  ('Imparare una parola nuova al giorno',                                 '🌍', 'studio',   10, -10, 'daily',   1, false),
  ('Imparare 3 parole nuove in una lingua',                               '🗣️', 'studio',   10, -10, 'daily',   1, false),
  ('Diario multilingua (italiano + lingua straniera)',                    '📓', 'studio',   10, -10, 'daily',   1, false),
  ('Avvantaggiarsi con i compiti della settimana',                        '📝', 'studio',    8,  0,  'weekly',  1, false),
  -- educazione finanziaria
  ('Tenere un diario spese/guadagni',                                     '📒', 'finanza',  10, -11, 'daily',   1, false),
  -- famiglia & sociale
  ('Mangiare tutto quello che è nel piatto',                              '🍽️', 'famiglia',  5, -6,  'daily',   1, false),
  ('Aiutare i nonni',                                                     '👵', 'famiglia', 10, -10, 'daily',   1, false),
  ('Intervistare un nonno e scrivere il suo racconto',                    '🎙️', 'famiglia', 15,  0,  'monthly', 1, false),
  ('Registrare audio-recensione della giornata e del libro',              '🎙️', 'famiglia', 10,  0,  'daily',   1, false);

-- ── 2. aggiornamento di quelle già presenti ───────────────────────────────
update activities a
   set emoji = c.emoji,
       category = c.category,
       points = c.points,
       penalty = c.penalty,
       frequency = c.frequency,
       max_completions = c.max_completions,
       challenge = c.challenge,
       -- nella logica sfida i punti valgono doppio: il moltiplicatore vive
       -- nell'app, qui challenge_points resta pari ai punti base
       challenge_points = case when c.challenge then c.points else 0 end
       -- `active` non si tocca: forzarlo a true resusciterebbe le attività
       -- che l'admin aveva eliminato
  from catalog c
 where lower(trim(a.name)) = lower(trim(c.name));

-- ── 3. inserimento delle mancanti ─────────────────────────────────────────
insert into activities (name, emoji, category, points, penalty, frequency, max_completions, challenge, challenge_points, active, visible_to, description)
select c.name,
       c.emoji,
       c.category,
       c.points,
       c.penalty,
       c.frequency,
       c.max_completions,
       c.challenge,
       case when c.challenge then c.points else 0 end,
       true,
       '["mia","samira"]'::jsonb,
       null
  from catalog c
 where not exists (select 1 from activities a where lower(trim(a.name)) = lower(trim(c.name)));

drop table if exists catalog;

notify pgrst, 'reload schema';

-- ── verifica ──────────────────────────────────────────────────────────────
-- Dopo l'esecuzione, per contare cosa c'è e scoprire eventuali doppioni:
--
--   select category, count(*) from activities where active group by category order by category;
--   select lower(trim(name)), count(*) from activities where active
--    group by 1 having count(*) > 1;
--
-- Se una del catalogo era stata eliminata in passato e la rivuoi, riattivala
-- a mano — la migrazione di proposito non lo fa:
--
--   select name, active from activities order by active desc, category, name;
--   update activities set active = true where name = 'Buttare la spazzatura';
