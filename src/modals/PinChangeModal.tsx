import { useState } from "react";
import { Btn, Input, Label, Modal } from "../design/components";
import { P } from "../design/tokens";

/**
 * Cambio PIN. Il PIN attuale non è più noto al client: si manda al database
 * e si guarda la risposta. Quando chi cambia è l'admin, che il PIN l'ha già
 * digitato al login, il campo "PIN attuale" non serve.
 */
export default function PinChangeModal({
  requireCurrent = true,
  title = "🔑 Cambia PIN",
  onSave,
  onClose,
}: {
  requireCurrent?: boolean;
  title?: string;
  /** Ritorna true se il database ha accettato il cambio. */
  onSave: (next: string, current: string) => Promise<boolean>;
  onClose: () => void;
}) {
  const [old, setOld] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);

  const isPin = (v: string) => /^\d{4}$/.test(v);
  const error = failed
    ? "PIN attuale errato"
    : next && !isPin(next)
      ? "Il nuovo PIN deve avere 4 cifre"
      : confirm && confirm !== next
        ? "I due PIN non coincidono"
        : "";
  const valid = (!requireCurrent || isPin(old)) && isPin(next) && next === confirm;

  const save = async () => {
    if (!valid || saving) return;
    setSaving(true);
    const ok = await onSave(next, old);
    setSaving(false);
    if (!ok) setFailed(true);
  };

  return (
    <Modal onClose={onClose}>
      <h3 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 12px" }}>{title}</h3>
      {requireCurrent && (
        <>
          <Label>PIN attuale</Label>
          <Input
            type="password"
            inputMode="numeric"
            maxLength={4}
            value={old}
            onChange={(e) => {
              setOld(e.target.value);
              setFailed(false);
            }}
            style={{ marginBottom: 8 }}
          />
        </>
      )}
      <Label>Nuovo PIN</Label>
      <Input type="password" inputMode="numeric" maxLength={4} value={next} onChange={(e) => setNext(e.target.value)} style={{ marginBottom: 8 }} />
      <Label>Conferma nuovo PIN</Label>
      <Input type="password" inputMode="numeric" maxLength={4} value={confirm} onChange={(e) => setConfirm(e.target.value)} style={{ marginBottom: 8 }} />
      {error && <p style={{ color: P.red, fontSize: 11, margin: "0 0 8px" }}>{error}</p>}
      <div style={{ display: "flex", gap: 8 }}>
        <Btn style={{ flex: 1 }} grad={P.mintG} disabled={!valid || saving} onClick={save}>
          {saving ? "Salvo…" : "Salva"}
        </Btn>
        <Btn style={{ flex: 1 }} color={P.tx3} onClick={onClose}>
          Annulla
        </Btn>
      </div>
    </Modal>
  );
}
