import { useState } from "react";
import type { ImportResult } from "../data/activityImport";
import { parseActivityRows } from "../data/activityImport";
import { CATS, FREQ_UNIT } from "../data/constants";
import { Btn, Modal } from "../design/components";
import { P, alpha } from "../design/tokens";
import { readSpreadsheet } from "../utils/spreadsheet";

/**
 * Import delle attività da un file Excel (.xlsx) o CSV. Prima l'anteprima,
 * con le righe scartate e i doppioni segnalati; poi, solo su conferma,
 * l'aggiunta alle attività esistenti.
 */
export default function ImportActivitiesModal({
  existingNames,
  onImport,
  onClose,
}: {
  existingNames: string[];
  /** Crea le attività e restituisce quante ne ha aggiunte. */
  onImport: (res: ImportResult) => Promise<number>;
  onClose: () => void;
}) {
  const [res, setRes] = useState<ImportResult | null>(null);
  const [fileErr, setFileErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<number | null>(null);

  const pick = async (file: File | undefined) => {
    if (!file) return;
    setFileErr(null);
    setRes(null);
    try {
      setRes(parseActivityRows(await readSpreadsheet(file), existingNames));
    } catch (e) {
      setFileErr(`Non riesco a leggere il file: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  const fresh = res?.items.filter((i) => !i.duplicate) ?? [];

  if (done !== null) {
    return (
      <Modal onClose={onClose}>
        <p style={{ fontSize: 34, textAlign: "center", margin: "4px 0" }}>✅</p>
        <p style={{ color: P.tx, fontSize: 14, fontWeight: 700, textAlign: "center", margin: "0 0 14px" }}>
          {done} attività aggiunte
        </p>
        <Btn full grad={P.accG} onClick={onClose}>
          Chiudi
        </Btn>
      </Modal>
    );
  }

  return (
    <Modal onClose={onClose}>
      <h3 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 4px" }}>📥 Importa attività</h3>
      <p style={{ color: P.tx3, fontSize: 10, margin: "0 0 10px", lineHeight: 1.5 }}>
        File .xlsx o .csv. Prima riga con le intestazioni: <b>nome</b>, <b>punteggio</b> (obbligatorie), descrizione, penalità, categoria, daily, sfida. Le
        attività si aggiungono a quelle esistenti; quelle con lo stesso nome vengono saltate.
      </p>
      <label
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: 48,
          borderRadius: 12,
          border: `1.5px dashed ${alpha(P.acc, 50)}`,
          color: P.acc,
          fontSize: 12,
          fontWeight: 600,
          cursor: "pointer",
          marginBottom: 10,
        }}
      >
        📄 Scegli il file
        <input
          type="file"
          accept=".xlsx,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          style={{ display: "none" }}
          onChange={(e) => void pick(e.target.files?.[0])}
        />
      </label>
      {fileErr && <p style={{ color: P.red, fontSize: 11, margin: "0 0 8px" }}>{fileErr}</p>}

      {res && (
        <>
          <p style={{ color: P.tx2, fontSize: 11, margin: "0 0 6px" }}>
            <b style={{ color: P.mint }}>{fresh.length} nuove</b>
            {res.items.length > fresh.length && ` · ${res.items.length - fresh.length} già presenti`}
            {res.errors.length > 0 && <span style={{ color: P.red }}> · {res.errors.length} scartate</span>}
          </p>
          <div style={{ maxHeight: 240, overflow: "auto", marginBottom: 10 }}>
            {res.items.map((it, i) => {
              const cat = CATS.find((c) => c.id === it.cat);
              return (
                <div key={i} style={{ padding: "5px 0", borderBottom: `1px solid ${P.gb}`, opacity: it.duplicate ? 0.45 : 1 }}>
                  <p style={{ color: P.tx, fontSize: 12, margin: 0 }}>
                    {cat?.i} {it.name} {it.ch ? "⚡" : ""}
                    {it.duplicate && <span style={{ color: P.tx3, fontSize: 9 }}> · già presente</span>}
                  </p>
                  <p style={{ color: P.tx3, fontSize: 9, margin: 0 }}>
                    <span style={{ color: P.mint }}>+{it.pts}pt</span>
                    {it.pen < 0 && <span style={{ color: P.red }}> · {it.pen}pt</span>} · 1/{FREQ_UNIT[it.freq]}
                    {it.desc && ` · ${it.desc}`}
                  </p>
                </div>
              );
            })}
            {res.errors.map((e) => (
              <p key={e} style={{ color: P.red, fontSize: 10, margin: "4px 0 0" }}>
                ⚠️ {e}
              </p>
            ))}
          </div>
        </>
      )}

      <div style={{ display: "flex", gap: 8 }}>
        <Btn
          style={{ flex: 1, minHeight: 48 }}
          grad={P.accG}
          disabled={fresh.length === 0 || busy}
          onClick={async () => {
            if (!res) return;
            setBusy(true);
            setDone(await onImport(res));
            setBusy(false);
          }}
        >
          {busy ? "Importo…" : `Importa ${fresh.length || ""}`}
        </Btn>
        <Btn style={{ minHeight: 48 }} color={P.tx3} onClick={onClose}>
          Annulla
        </Btn>
      </div>
    </Modal>
  );
}
