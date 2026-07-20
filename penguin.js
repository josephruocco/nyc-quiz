// Easter egg: every so often a penguin waddles along the bottom edge and leaves.
// Appended to every built page by build.js. Rules it must never break: no pointer
// interception, no focus stealing, no layout shift, nothing above the content —
// a player mid-quiz should be able to ignore it entirely.
(() => {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const MIN = 75_000, MAX = 240_000;   // ponytail: fixed range, not tuned. Widen if it feels chatty.
  const WALK = 14_000;                 // ms to cross the screen

  const svg = `
  <svg viewBox="0 0 40 52" width="40" height="52" aria-hidden="true">
    <ellipse cx="20" cy="49" rx="13" ry="2.5" fill="rgba(0,0,0,0.16)"/>
    <path d="M20 4c8 0 13 7 13 17v13c0 7-5 12-13 12S7 41 7 34V21C7 11 12 4 20 4z" fill="#1B1E24"/>
    <path d="M20 13c5 0 8 5 8 12v8c0 5-3 8-8 8s-8-3-8-8v-8c0-7 3-12 8-12z" fill="#F2F3F5"/>
    <path d="M9 22c-2 4-2 11 0 15 1 2 2 1 2-1V23c0-2-1-3-2-1z" fill="#12151A"/>
    <path d="M31 22c2 4 2 11 0 15-1 2-2 1-2-1V23c0-2 1-3 2-1z" fill="#12151A"/>
    <circle cx="16" cy="16" r="1.9" fill="#F2F3F5"/>
    <circle cx="24" cy="16" r="1.9" fill="#F2F3F5"/>
    <circle cx="16.4" cy="16.3" r="1" fill="#12151A"/>
    <circle cx="23.6" cy="16.3" r="1" fill="#12151A"/>
    <path d="M20 19l-3.2 2.4h6.4L20 19z" fill="#E8934F"/>
    <path d="M14 45l-4 3.5h8L14 45zM26 45l-4 3.5h8L26 45z" fill="#E8934F"/>
  </svg>`;

  const style = document.createElement("style");
  style.textContent = `
    @keyframes peng-walk { from { transform: translateX(var(--from)); } to { transform: translateX(var(--to)); } }
    @keyframes peng-waddle { 0%,100% { transform: rotate(-4deg) translateY(0); } 50% { transform: rotate(4deg) translateY(-2px); } }
    .peng {
      position: fixed; bottom: -2px; left: 0; z-index: 0;
      pointer-events: none; opacity: 0.85;
      animation: peng-walk var(--dur) linear forwards;
    }
    .peng > svg { animation: peng-waddle 0.42s ease-in-out infinite; transform-origin: 50% 90%; }
    .peng.flip > svg { scale: -1 1; }
  `;
  document.head.appendChild(style);

  function waddle() {
    const rtl = Math.random() < 0.5;
    const off = -60, on = innerWidth + 60;
    const box = document.createElement("div");
    box.className = "peng" + (rtl ? " flip" : "");
    box.style.setProperty("--from", (rtl ? on : off) + "px");
    box.style.setProperty("--to", (rtl ? off : on) + "px");
    box.style.setProperty("--dur", WALK + "ms");
    box.innerHTML = svg;
    document.body.appendChild(box);
    setTimeout(() => box.remove(), WALK + 500);
  }

  const later = () => setTimeout(() => { if (!document.hidden) waddle(); later(); }, MIN + Math.random() * (MAX - MIN));
  later();

  // console.assert-style self-check: the penguin must never be clickable or focusable.
  waddle();
  const p = document.querySelector(".peng");
  console.assert(getComputedStyle(p).pointerEvents === "none", "penguin never intercepts clicks");
  console.assert(!p.querySelector("a, button, input, [tabindex]"), "penguin holds nothing focusable");
  p.remove();
})();
