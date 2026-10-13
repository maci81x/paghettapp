# PaghettApp

PWA di famiglia per Mia e Samira: attività → punti → paghetta settimanale divisa in tre salvadanai (Risparmio 30% · Personale 60% · Beneficenza 10%), spese, missioni, match tra sorelle e investimenti simulati.

- **Stack:** React + TypeScript + Vite, PWA (`vite-plugin-pwa`), Supabase (`olxesmxfadtgsinxrkcr`, eu-west-1).
- **Deploy:** GitHub Pages, automatico a ogni push su `main` → https://maci81x.github.io/paghettapp/
- **Accesso:** PIN a 4 cifre verificati sul database (`check_pin`, bcrypt), mai inviati al browser.

## Sviluppo

```bash
npm ci
npm run dev            # http://localhost:5173/paghettapp/
npm run lint
npm run build
node --test src/**/*.test.ts
```

## Migrazioni

Stanno in `supabase/migrations/` e si eseguono **una volta** nella SQL Editor di Supabase, in ordine di nome. Sono tutte idempotenti e facoltative: finché una manca, l'app se ne accorge all'avvio e spegne solo la funzione che ne dipende.

| Migrazione | Cosa abilita |
|---|---|
| `20261013_expenses_planned.sql` | Spese in due tempi: ⏳ previsto → ✓ effettivo |
| `20261013_log_photos.sql` | 📸 Foto-prova sulle attività e scheda Foto dell'admin |

## Settimane e paghetta

La settimana va da lunedì a domenica e i punti contano sulla **data dell'attività**. Dal lunedì la settimana appena finita compare nella Dashboard admin fra le **settimane da chiudere**, con l'importo già calcolato dal tier: l'admin la conferma, la modifica prima di confermarla, o le chiude tutte insieme. Nessuna si chiude da sola. Un indice unico sul database impedisce di pagare due volte la stessa settimana.
