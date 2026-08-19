-- Colonne che l'app usa e che lo schema iniziale non prevedeva.
-- Tutte facoltative: finché la migrazione non viene applicata l'app funziona
-- lo stesso, ma penalità, sfide, missioni di squadra, note dei salvadanai e
-- salvadanaio dei desideri restano ai valori di default.
--
-- Da eseguire nella SQL Editor di Supabase (una volta sola).

alter table activities add column if not exists penalty numeric default 0;
alter table activities add column if not exists challenge boolean default false;
alter table activities add column if not exists challenge_points numeric default 0;

alter table missions add column if not exists team boolean default false;
-- giorno di creazione: contano solo i completamenti da qui in poi
alter table missions add column if not exists since date;

-- "dove tieni i soldi", scritto dalle ragazze nella Home
alter table piggybanks add column if not exists note text;

-- da quale salvadanaio si paga il desiderio ('personal' | 'savings' | 'charity')
alter table wishes add column if not exists piggybank_type text default 'personal';

-- penalità e sfide delle attività iniziali, come nella versione localStorage
update activities set penalty = -5 where name in ('Rifarsi il letto', 'Faccende di casa');
update activities set penalty = -4 where name = 'Pulire le scale';
update activities set penalty = -3 where name in ('Portare fuori Tia', 'Spazzatura');
update activities set penalty = -2 where name in ('Preparare colazione', 'Lavare i piatti', 'Stendere bucato');

update activities set challenge = true, challenge_points = 15 where name = 'Colazione a tema';
update activities set challenge = true, challenge_points = 10 where name = 'Pulire le scale';
update activities set challenge = true, challenge_points = 8 where name = 'Spazzatura';
