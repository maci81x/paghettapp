-- Missioni: memoria di chi è già stato premiato, e un'emoji sempre presente.
--
-- `completed_by` è la guardia contro il doppio premio. I punti della missione
-- vengono assegnati appena il progresso tocca l'obiettivo, e la stessa cosa
-- può succedere su due dispositivi nello stesso momento: senza una traccia
-- condivisa i punti verrebbero dati due volte. La colonna registra
-- { "mia": "2026-08-25", "samira": "..." } e l'app premia solo chi non c'è.
--
-- `emoji` è NOT NULL nello schema ma l'app non l'ha mai inviata: senza un
-- default gli insert delle missioni nuove falliscono. Qui le si dà un valore
-- di riserva e si riempiono le righe eventualmente rimaste vuote.
--
-- Facoltativa: finché non è applicata l'app rileva l'assenza della colonna,
-- non assegna i punti in automatico e lo dice nella vista admin, invece di
-- premiare senza poterselo ricordare.
--
-- Da eseguire nella SQL Editor di Supabase (una volta sola).

ALTER TABLE missions ADD COLUMN IF NOT EXISTS completed_by JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE missions ALTER COLUMN emoji SET DEFAULT '🎯';
UPDATE missions SET emoji = '🎯' WHERE emoji IS NULL OR emoji = '';

NOTIFY pgrst, 'reload schema';
