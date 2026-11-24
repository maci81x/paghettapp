-- Mia e Sami usano lo stesso iPhone: lo stesso telefono (endpoint) deve poter
-- essere iscritto per tutte e due. Chiave primaria su (endpoint, user_id).
-- Applicata il 24/11. Rollback: tornare a PRIMARY KEY (endpoint) dopo aver
-- tolto i doppioni.
set lock_timeout = '3s';
ALTER TABLE push_subscriptions DROP CONSTRAINT IF EXISTS push_subscriptions_pkey;
ALTER TABLE push_subscriptions ADD PRIMARY KEY (endpoint, user_id);
NOTIFY pgrst, 'reload schema';
