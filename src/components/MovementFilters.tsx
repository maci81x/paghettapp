import { FUNDS, fundName } from "../data/constants";
import type { ConfirmFilter, IncomeKind, MovementFilter, Range } from "../data/movements";
import { INCOME_KINDS, RANGES } from "../data/movements";
import type { Fund, User } from "../data/types";
import { Pill } from "../design/components";
import { P } from "../design/tokens";

const CONFIRMS: { k: ConfirmFilter; l: string }[] = [
  { k: "all", l: "Tutte" },
  { k: "yes", l: "✅ Confermate" },
  { k: "no", l: "⏳ Non confermate" },
];

const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div style={{ marginBottom: 6 }}>
    <p style={{ color: P.tx3, fontSize: 9, fontWeight: 700, letterSpacing: 0.3, margin: "0 0 3px", textTransform: "uppercase" }}>{label}</p>
    <div style={{ display: "flex", gap: 3, overflowX: "auto", paddingBottom: 3 }}>{children}</div>
  </div>
);

/**
 * Filtri dei movimenti, condivisi fra la Wallet delle ragazze e la scheda
 * admin. Tipi e salvadanai sono a selezione multipla: nessuno selezionato
 * vuol dire "tutti", così il filtro vuoto non nasconde niente.
 */
export default function MovementFilters({
  u,
  value,
  onChange,
  showConfirmed,
}: {
  u: User;
  value: MovementFilter;
  onChange: (f: MovementFilter) => void;
  /** Il filtro sulla conferma di ricezione ha senso solo per l'admin. */
  showConfirmed?: boolean;
}) {
  const toggle = <T,>(list: T[], v: T): T[] => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  return (
    <div style={{ marginBottom: 8 }}>
      <Row label="Periodo">
        {RANGES.map((r) => (
          <Pill key={r.k} active={value.range === r.k} onClick={() => onChange({ ...value, range: r.k as Range })} color={P.acc} s>
            {r.l}
          </Pill>
        ))}
      </Row>

      <Row label="Entrate">
        <Pill active={value.kinds.length === 0} onClick={() => onChange({ ...value, kinds: [] })} color={P.mint} s>
          Tutte
        </Pill>
        {INCOME_KINDS.map((k) => (
          <Pill
            key={k.k}
            active={value.kinds.includes(k.k)}
            onClick={() => onChange({ ...value, kinds: toggle(value.kinds, k.k as IncomeKind) })}
            color={P.mint}
            s
          >
            {k.icon} {k.l}
          </Pill>
        ))}
      </Row>

      <Row label="Uscite">
        <Pill active={value.funds.length === 0} onClick={() => onChange({ ...value, funds: [] })} color={P.gold} s>
          Tutte
        </Pill>
        {FUNDS.map((f) => (
          <Pill key={f} active={value.funds.includes(f)} onClick={() => onChange({ ...value, funds: toggle(value.funds, f as Fund) })} color={P.gold} s>
            {fundName(u, f)}
          </Pill>
        ))}
      </Row>

      {showConfirmed && (
        <Row label="Paghette">
          {CONFIRMS.map((c) => (
            <Pill key={c.k} active={(value.confirmed ?? "all") === c.k} onClick={() => onChange({ ...value, confirmed: c.k })} color={P.blue} s>
              {c.l}
            </Pill>
          ))}
        </Row>
      )}
    </div>
  );
}
