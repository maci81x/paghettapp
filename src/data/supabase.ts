import { createClient } from "@supabase/supabase-js";

/**
 * Chiave anon: è pubblica per definizione (viaggia nel bundle del client).
 * Il progetto non ha autenticazione: chiunque abbia la chiave può leggere e
 * scrivere le tabelle, PIN compresi. Va bene per un'app di famiglia, non per
 * dati sensibili.
 */
const SUPABASE_URL = "https://olxesmxfadtgsinxrkcr.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9seGVzbXhmYWR0Z3Npbnhya2NyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcxNTI5NDAsImV4cCI6MjEwMjcyODk0MH0.OwgdRecCN8y5bmN5gH1fkP5ZLk3kqpZ0bLudKlclW2k";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
