import { AVATARS } from "../data/constants";
import { Modal } from "../design/components";
import { P } from "../design/tokens";

export default function AvatarPicker({
  current,
  color,
  onPick,
  onClose,
}: {
  current: string;
  color: string;
  onPick: (av: string) => void;
  onClose: () => void;
}) {
  return (
    <Modal onClose={onClose}>
      <h3 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 12px" }}>Scegli il tuo avatar</h3>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(6,1fr)", gap: 8 }}>
        {AVATARS.map((av) => (
          <button
            key={av}
            onClick={() => onPick(av)}
            style={{
              width: 48,
              height: 48,
              borderRadius: 14,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 26,
              cursor: "pointer",
              background: current === av ? color + "22" : P.glass,
              border: `2px solid ${current === av ? color : P.gb}`,
              transition: "all .15s",
            }}
          >
            {av}
          </button>
        ))}
      </div>
    </Modal>
  );
}
