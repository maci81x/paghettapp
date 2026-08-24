/**
 * Formattazione delle date mostrate nell'app.
 * I campi possono essere sia "YYYY-MM-DD" (giorno) sia un timestamp ISO
 * completo: entrambe le forme devono restare leggibili.
 */

const parts = (iso: string) => {
  const [date, rest] = iso.split("T");
  const [y, m, d] = date.split("-");
  return { y, m, d, time: rest?.slice(0, 5) };
};

/** "2026-08-24" → "24/08". */
export const fmtDay = (iso: string) => {
  const { m, d } = parts(iso);
  return d && m ? `${d}/${m}` : iso;
};

/** "2026-08-24T13:05:00Z" → "24/08 alle 15:05" (ora locale). */
export const fmtDayTime = (iso: string) => {
  const day = fmtDay(iso);
  if (!iso.includes("T")) return day;
  const t = new Date(iso);
  if (Number.isNaN(t.getTime())) return day;
  const hh = String(t.getHours()).padStart(2, "0");
  const mm = String(t.getMinutes()).padStart(2, "0");
  return `${String(t.getDate()).padStart(2, "0")}/${String(t.getMonth() + 1).padStart(2, "0")} alle ${hh}:${mm}`;
};
