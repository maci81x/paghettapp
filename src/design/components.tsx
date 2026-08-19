import { useState } from "react";
import type { CSSProperties, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import type { Period } from "../data/types";
import { P, gls } from "./tokens";

/* ── Ring progressivo SVG ── */
export function Ring({
  pct,
  size = 140,
  stroke = 10,
  color,
  glow,
  children,
}: {
  pct: number;
  size?: number;
  stroke?: number;
  color: string;
  glow?: boolean;
  children?: ReactNode;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const off = c - (Math.min(Math.max(pct, 0), 100) / 100) * c;
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg
        width={size}
        height={size}
        style={{ transform: "rotate(-90deg)", "--gc": color + "66", animation: glow ? "glow 3s ease infinite" : "none" } as CSSProperties}
      >
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={off}
          style={{ transition: "stroke-dashoffset .8s ease", filter: `drop-shadow(0 0 6px ${color}44)` }}
        />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        {children}
      </div>
    </div>
  );
}

/* ── Card vetro ── */
export function GlassCard({ children, style, onClick }: { children: ReactNode; style?: CSSProperties; onClick?: () => void }) {
  return (
    <div className="anim" style={{ ...gls, padding: 16, marginBottom: 12, ...style }} onClick={onClick}>
      {children}
    </div>
  );
}

/* ── Pill / chip selezionabile ── */
export function Pill({
  children,
  active,
  color = P.acc,
  onClick,
  s,
}: {
  children: ReactNode;
  active?: boolean;
  color?: string;
  onClick?: () => void;
  s?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        background: active ? color + "1a" : "transparent",
        color: active ? color : P.tx3,
        border: `1.5px solid ${active ? color + "55" : "transparent"}`,
        borderRadius: 20,
        padding: s ? "3px 10px" : "5px 14px",
        fontSize: s ? 10 : 11,
        fontWeight: 600,
        cursor: "pointer",
        whiteSpace: "nowrap",
        flexShrink: 0,
        transition: "all .2s",
      }}
    >
      {children}
    </button>
  );
}

/* ── Bottone ── */
export function Btn({
  children,
  onClick,
  color = P.acc,
  grad,
  small,
  outline,
  disabled,
  full,
  style,
}: {
  children: ReactNode;
  onClick?: () => void;
  color?: string;
  grad?: string;
  small?: boolean;
  outline?: boolean;
  disabled?: boolean;
  full?: boolean;
  style?: CSSProperties;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        background: outline ? "transparent" : grad || color,
        color: outline ? color : "#fff",
        border: outline ? `1.5px solid ${color}` : "none",
        borderRadius: 12,
        padding: small ? "6px 14px" : "10px 18px",
        fontSize: small ? 11 : 13,
        fontWeight: 600,
        cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.4 : 1,
        width: full ? "100%" : "auto",
        transition: "all .15s",
        letterSpacing: 0.2,
        ...style,
      }}
    >
      {children}
    </button>
  );
}

/* ── Tooltip informativo ── */
export function InfoTip({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  return (
    <span style={{ position: "relative", display: "inline-block", marginLeft: 6, cursor: "pointer" }} onClick={() => setOpen(!open)}>
      <span
        style={{
          background: P.acc + "33",
          color: P.acc,
          borderRadius: "50%",
          width: 16,
          height: 16,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 9,
          fontWeight: 700,
        }}
      >
        i
      </span>
      {open && (
        <div
          style={{ position: "absolute", bottom: 22, left: -90, zIndex: 999, ...gls, background: "rgba(15,15,30,.95)", padding: 12, width: 220, fontSize: 11, color: P.tx2, lineHeight: 1.5 }}
          onClick={(e) => e.stopPropagation()}
        >
          {text}
          <div style={{ marginTop: 6, textAlign: "right" }}>
            <Pill active color={P.tx3} onClick={() => setOpen(false)} s>
              ✕
            </Pill>
          </div>
        </div>
      )}
    </span>
  );
}

/* ── Voce della bottom nav ── */
export function NavItem({
  icon,
  label,
  active,
  onClick,
  badge = 0,
  color = P.acc,
}: {
  icon: ReactNode;
  label: string;
  active?: boolean;
  onClick?: () => void;
  badge?: number;
  color?: string;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        background: "none",
        border: "none",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 1,
        cursor: "pointer",
        padding: "6px 4px 2px",
        position: "relative",
        minWidth: 44,
      }}
    >
      <div
        style={{
          width: 34,
          height: 34,
          borderRadius: 11,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: active ? color + "15" : "transparent",
          transition: "all .2s",
          fontSize: 17,
        }}
      >
        {icon}
      </div>
      <span style={{ fontSize: 8, fontWeight: active ? 700 : 500, color: active ? color : P.tx3, letterSpacing: 0.2 }}>{label}</span>
      {active && <div style={{ width: 18, height: 3, borderRadius: 2, background: color, marginTop: 1 }} />}
      {badge > 0 && (
        <span style={{ position: "absolute", top: 1, right: 0, background: P.red, color: "#fff", borderRadius: 10, fontSize: 7, padding: "1px 4px", fontWeight: 700 }}>
          {badge}
        </span>
      )}
    </button>
  );
}

/* ── Selettore di periodo ── */
const PERIODS: Period[] = ["7g", "30g", "3m", "1a"];
export function PeriodBar({ v, set }: { v: Period; set: (p: Period) => void }) {
  return (
    <div style={{ display: "flex", gap: 4, marginBottom: 10 }}>
      {PERIODS.map((p) => (
        <Pill key={p} active={v === p} onClick={() => set(p)} color={P.gold} s>
          {p}
        </Pill>
      ))}
    </div>
  );
}

/* ── Form ── */
export function Input({ style, ...p }: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...p} style={{ width: "100%", padding: 9, borderRadius: 10, ...gls, color: P.tx, fontSize: 12, ...style }} />;
}

export function Sel({ style, children, ...p }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select {...p} style={{ width: "100%", padding: 8, borderRadius: 10, ...gls, color: P.tx, fontSize: 12, ...style }}>
      {children}
    </select>
  );
}

export function TextArea({ style, ...p }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...p} style={{ width: "100%", padding: 8, borderRadius: 10, ...gls, color: P.tx, fontSize: 12, resize: "none", ...style }} />;
}

export function Label({ children }: { children: ReactNode }) {
  return <label style={{ fontSize: 10, color: P.tx3, display: "block", marginBottom: 3 }}>{children}</label>;
}

/* ── Modale ── */
export function Modal({ children, onClose }: { children: ReactNode; onClose: () => void }) {
  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.8)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ ...gls, background: "rgba(15,15,30,.96)", padding: 20, maxWidth: 380, maxHeight: "85vh", overflow: "auto", width: "100%" }}
      >
        {children}
      </div>
    </div>
  );
}

/* ── Titolo di sezione ── */
export function SectionTitle({ children }: { children: ReactNode }) {
  return <p style={{ color: P.tx, fontSize: 15, fontWeight: 700, margin: "0 0 10px", letterSpacing: -0.3 }}>{children}</p>;
}
