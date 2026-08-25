import type { Match } from "./types";

/**
 * I match vivono solo in localStorage, quindi qualsiasi valore iniziale qui
 * viene riseminato su ogni dispositivo che non ha ancora la chiave — e su
 * quello dove era stato cancellato, se i dati del sito vengono ripuliti.
 * Un match di esempio con id fisso tornava così all'infinito: si parte vuoti,
 * i match veri li crea l'admin.
 */
export const initMatches = (): Match[] => [];
