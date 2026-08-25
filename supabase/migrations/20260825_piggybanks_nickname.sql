-- Nome che la ragazza dà a ciascun salvadanaio.
--
-- `note` è già occupata: è il "dove lo tieni" ("Salvadanaio rosa sulla
-- scrivania"), che resta com'è. Il nome è un'altra cosa e vuole una colonna
-- sua, altrimenti le due informazioni si sovrascrivono a vicenda.
--
-- Facoltativa ma necessaria per la feature: finché non è applicata l'app
-- rileva l'assenza della colonna, non chiede i nomi e mostra ovunque le
-- etichette generiche. Nessun errore, nessuna schermata bloccata.
--
-- Da eseguire nella SQL Editor di Supabase (una volta sola).

ALTER TABLE piggybanks ADD COLUMN IF NOT EXISTS nickname TEXT;
