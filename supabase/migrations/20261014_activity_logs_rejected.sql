-- Rifiuto non distruttivo delle attività.
--
-- Finora rifiutare cancellava la riga di `activity_logs`, e con lei la
-- foto-prova (ON DELETE CASCADE su `log_photos`): se una ragazza contestava
-- non restava niente da riguardare. Ora la riga resta, con:
--   rejected_at → quando l'admin l'ha rifiutata (NULL = non rifiutata);
--   admin_note  → il motivo, che la ragazza vede.
--
-- Lo stato resta letto da `approved` / `revoked` / `rejected_at` insieme,
-- invece di una colonna `status` in più: una seconda fonte di verità
-- potrebbe contraddire `approved`. Una voce rifiutata ha approved = false,
-- non dà punti e non consuma il limite giornaliero dell'attività.
--
-- Il ritiro da parte della ragazza (un invio sbagliato, prima che l'admin lo
-- guardi) resta una cancellazione vera.
--
-- Facoltativa: finché non è applicata l'app rifiuta cancellando, come prima,
-- e il campo della nota non compare.
--
-- Da eseguire nella SQL Editor di Supabase (una volta sola). Idempotente.

ALTER TABLE activity_logs ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ;
ALTER TABLE activity_logs ADD COLUMN IF NOT EXISTS admin_note TEXT;

NOTIFY pgrst, 'reload schema';
