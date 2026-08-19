import { useState } from "react";
import { Btn, Input, Label, Modal } from "../design/components";
import { P } from "../design/tokens";

/** Cambio PIN: richiede il PIN attuale, poi due volte il nuovo. */
export default function PinChangeModal({
  currentPin,
  onSave,
  onClose,
}: {
  currentPin: string;
  onSave: (next: string) => void;
  onClose: () => void;
}) {
  const [old, setOld] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");

  const isPin = (v: string) => /^\d{4}$/.test(v);
  const error =
    old && old !== currentPin
      ? "PIN attuale errato"
      : next && !isPin(next)
        ? "Il nuovo PIN deve avere 4 cifre"
        : confirm && confirm !== next
          ? "I due PIN non coincidono"
          : "";
  const valid = old === currentPin && isPin(next) && next === confirm;

  return (
    <Modal onClose={onClose}>
      <h3 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 12px" }}>🔑 Cambia PIN</h3>
      <Label>PIN attuale</Label>
      <Input type="password" inputMode="numeric" maxLength={4} value={old} onChange={(e) => setOld(e.target.value)} style={{ marginBottom: 8 }} />
      <Label>Nuovo PIN</Label>
      <Input type="password" inputMode="numeric" maxLength={4} value={next} onChange={(e) => setNext(e.target.value)} style={{ marginBottom: 8 }} />
      <Label>Conferma nuovo PIN</Label>
      <Input type="password" inputMode="numeric" maxLength={4} value={confirm} onChange={(e) => setConfirm(e.target.value)} style={{ marginBottom: 8 }} />
      {error && <p style={{ color: P.red, fontSize: 11, margin: "0 0 8px" }}>{error}</p>}
      <div style={{ display: "flex", gap: 8 }}>
        <Btn style={{ flex: 1 }} grad={P.mintG} disabled={!valid} onClick={() => onSave(next)}>
          Salva
        </Btn>
        <Btn style={{ flex: 1 }} color={P.tx3} onClick={onClose}>
          Annulla
        </Btn>
      </div>
    </Modal>
  );
}
