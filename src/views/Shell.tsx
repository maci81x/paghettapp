import { useState } from "react";
import type { ReactNode } from "react";
import { useThemeMode } from "../hooks/useThemeMode";
import GuideModal from "../modals/GuideModal";
import { P, gls, screen } from "../design/tokens";

/** Layout comune: header, contenuto scrollabile, bottom nav fissa. */
export default function Shell({
  avatar,
  title,
  subtitle,
  tint = P.acc,
  bgPattern,
  bgSize,
  onBack,
  onLogout,
  onAvatarClick,
  nav,
  children,
}: {
  avatar: ReactNode;
  title: string;
  subtitle?: ReactNode;
  tint?: string;
  /** Pattern CSS scelto dalla figlia, sovrapposto allo sfondo dell'app. */
  bgPattern?: string;
  bgSize?: string;
  onBack?: () => void;
  onLogout: () => void;
  onAvatarClick?: () => void;
  nav: ReactNode;
  children: ReactNode;
}) {
  const [guide, setGuide] = useState(false);
  const { label, toggle } = useThemeMode();
  const bg = bgPattern && bgPattern !== "none" ? `${bgPattern},${P.bg2}` : P.bg2;
  return (
    <div style={{ ...screen, backgroundImage: bg, backgroundSize: bgSize, display: "flex", flexDirection: "column", position: "relative" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 16px",
          borderBottom: `1px solid ${P.gb}`,
          background: `linear-gradient(180deg,${tint}06,transparent)`,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {onBack && (
            <button onClick={onBack} style={{ background: "none", border: "none", color: P.acc, fontSize: 20, cursor: "pointer", padding: 0 }}>
              ‹
            </button>
          )}
          <div
            onClick={onAvatarClick}
            style={{
              width: 30,
              height: 30,
              borderRadius: 10,
              background: tint + "1a",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 16,
              cursor: onAvatarClick ? "pointer" : "default",
            }}
          >
            {avatar}
          </div>
          <div>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 700, letterSpacing: -0.3 }}>{title}</p>
            {subtitle && <p style={{ margin: 0, fontSize: 9, color: P.tx3 }}>{subtitle}</p>}
          </div>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button
            onClick={toggle}
            title={`Tema ${label.l} · tocca per cambiare`}
            style={{
              minWidth: 34,
              padding: "2px 5px",
              borderRadius: 9,
              ...gls,
              color: P.tx2,
              cursor: "pointer",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              lineHeight: 1.1,
            }}
          >
            <span style={{ fontSize: 13 }}>{label.i}</span>
            <span style={{ fontSize: 7, color: P.tx3, fontWeight: 700 }}>{label.l}</span>
          </button>
          <button
            onClick={() => setGuide(true)}
            style={{ width: 28, height: 28, borderRadius: 9, ...gls, color: P.gold, fontSize: 13, fontWeight: 800, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            ?
          </button>
          <button onClick={onLogout} style={{ ...gls, padding: "4px 10px", color: P.tx3, borderRadius: 9, fontSize: 10, cursor: "pointer", fontWeight: 600 }}>
            Esci
          </button>
        </div>
      </div>

      <div style={{ flex: 1, overflow: "auto", padding: 16, paddingBottom: "calc(80px + env(safe-area-inset-bottom))" }}>{children}</div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-around",
          alignItems: "center",
          padding: "5px 6px calc(10px + env(safe-area-inset-bottom))",
          borderTop: `1px solid ${P.gb}`,
          position: "fixed",
          bottom: 0,
          left: "50%",
          transform: "translateX(-50%)",
          width: "100%",
          maxWidth: 420,
          background: P.surf,
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
        }}
      >
        {nav}
      </div>

      {guide && <GuideModal onClose={() => setGuide(false)} />}
    </div>
  );
}
