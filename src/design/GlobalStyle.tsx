const css = `@keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
@keyframes glow{0%,100%{filter:drop-shadow(0 0 6px var(--gc,#7c5cfc33))}50%{filter:drop-shadow(0 0 14px var(--gc,#7c5cfc66))}}
*{box-sizing:border-box;-webkit-tap-highlight-color:transparent}
html,body,#root{margin:0;padding:0;min-height:100%;background:#0a0a1a}
input,select,button,textarea{font-family:inherit}
::-webkit-scrollbar{width:0;height:0}
.anim{animation:fadeIn .35s ease}`;

export default function GlobalStyle() {
  return <style>{css}</style>;
}
