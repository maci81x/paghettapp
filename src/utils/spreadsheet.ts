/**
 * Lettura minima di fogli di calcolo, senza dipendenze: CSV e .xlsx.
 *
 * Un .xlsx è uno zip di file XML. Qui si legge l'indice dello zip, si
 * scompatta con `DecompressionStream` (nativo nei browser) e si prendono le
 * celle del primo foglio. Formule, stili e date vere non servono: l'import
 * delle attività legge solo testi e numeri.
 */

/** Righe di un CSV (separatore `,` o `;`, virgolette doppie per i campi con separatori). */
export const parseCsv = (text: string): string[][] => {
  const clean = text.replace(/^﻿/, "");
  const firstLine = clean.split(/\r?\n/, 1)[0] ?? "";
  // Excel in italiano esporta con il punto e virgola
  const sep = (firstLine.match(/;/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0) ? ";" : ",";
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i];
    if (quoted) {
      if (ch === '"' && clean[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === sep) {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && clean[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else cell += ch;
  }
  if (cell !== "" || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
};

interface ZipEntry {
  name: string;
  method: number;
  size: number;
  offset: number;
}

const zipEntries = (buf: ArrayBuffer): ZipEntry[] => {
  const v = new DataView(buf);
  // fine della directory centrale: firma 0x06054b50 negli ultimi ~64KB
  let eocd = -1;
  for (let i = buf.byteLength - 22; i >= Math.max(0, buf.byteLength - 65557); i--) {
    if (v.getUint32(i, true) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error("il file non è un .xlsx valido");
  const count = v.getUint16(eocd + 10, true);
  let p = v.getUint32(eocd + 16, true);
  const dec = new TextDecoder();
  const out: ZipEntry[] = [];
  for (let n = 0; n < count; n++) {
    if (v.getUint32(p, true) !== 0x02014b50) break;
    const method = v.getUint16(p + 10, true);
    const size = v.getUint32(p + 20, true);
    const nameLen = v.getUint16(p + 28, true);
    const extraLen = v.getUint16(p + 30, true);
    const commentLen = v.getUint16(p + 32, true);
    const local = v.getUint32(p + 42, true);
    const name = dec.decode(new Uint8Array(buf, p + 46, nameLen));
    // i dati partono dopo l'intestazione locale, che ha lunghezze sue
    const offset = local + 30 + v.getUint16(local + 26, true) + v.getUint16(local + 28, true);
    out.push({ name, method, size, offset });
    p += 46 + nameLen + extraLen + commentLen;
  }
  return out;
};

const readEntry = async (buf: ArrayBuffer, e: ZipEntry): Promise<string> => {
  const data = new Uint8Array(buf, e.offset, e.size);
  if (e.method === 0) return new TextDecoder().decode(data);
  if (e.method !== 8) throw new Error("compressione non supportata");
  const stream = new Blob([data]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  return new Response(stream).text();
};

/** Indice di colonna da un riferimento di cella: "C7" → 2. */
const colIndex = (ref: string) => {
  const letters = ref.replace(/\d+/g, "");
  let n = 0;
  for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
};

const parseXlsx = async (buf: ArrayBuffer): Promise<string[][]> => {
  const entries = zipEntries(buf);
  const sheet = entries
    .filter((e) => /^xl\/worksheets\/sheet\d+\.xml$/.test(e.name))
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))[0];
  if (!sheet) throw new Error("nessun foglio trovato nel file");
  const xml = new DOMParser();
  const sharedEntry = entries.find((e) => e.name === "xl/sharedStrings.xml");
  const shared = sharedEntry
    ? [...xml.parseFromString(await readEntry(buf, sharedEntry), "application/xml").getElementsByTagName("si")].map((si) =>
        [...si.getElementsByTagName("t")].map((t) => t.textContent ?? "").join(""),
      )
    : [];
  const doc = xml.parseFromString(await readEntry(buf, sheet), "application/xml");
  const rows: string[][] = [];
  for (const r of doc.getElementsByTagName("row")) {
    const row: string[] = [];
    for (const c of r.getElementsByTagName("c")) {
      const t = c.getAttribute("t");
      const raw = c.getElementsByTagName("v")[0]?.textContent ?? "";
      const val =
        t === "s"
          ? (shared[Number(raw)] ?? "")
          : t === "inlineStr"
            ? [...c.getElementsByTagName("t")].map((x) => x.textContent ?? "").join("")
            : t === "b"
              ? raw === "1"
                ? "sì"
                : ""
              : raw;
      row[colIndex(c.getAttribute("r") ?? "A")] = val;
    }
    rows.push(Array.from(row, (x) => x ?? ""));
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
};

/** Righe del file scelto, .xlsx o .csv, come testo. */
export const readSpreadsheet = async (file: File): Promise<string[][]> => {
  if (/\.(csv|txt)$/i.test(file.name)) return parseCsv(await file.text());
  if (/\.xls$/i.test(file.name)) throw new Error("il vecchio formato .xls non è supportato: salva il file come .xlsx o .csv");
  return parseXlsx(await file.arrayBuffer());
};
