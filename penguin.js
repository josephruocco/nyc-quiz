// Easter egg, pinpoint.html only: every so often a penguin waddles along the bottom
// edge. Click it and it flops onto its belly, blows a kiss, and slides off.
// Rules it must never break: no focus stealing, no layout shift, nothing above the
// content. Only the 40px penguin itself takes clicks — the rest of the layer is
// transparent to the mouse, so a guess aimed at the map is still a guess.
(() => {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const MIN = 75_000, MAX = 240_000;   // ponytail: fixed range, not tuned. Widen if it feels chatty.
  const WALK = 14_000;                 // ms to waddle across the screen
  const SLIDE = 2_600;                 // ms to belly-slide off once clicked

  const svg = `
  <svg viewBox="0 0 40 52" width="40" height="52" aria-hidden="true">
    <ellipse cx="20" cy="49" rx="13" ry="2.5" fill="rgba(0,0,0,0.16)"/>
    <path d="M20 4c8 0 13 7 13 17v13c0 7-5 12-13 12S7 41 7 34V21C7 11 12 4 20 4z" fill="#1B1E24"/>
    <path d="M20 13c5 0 8 5 8 12v8c0 5-3 8-8 8s-8-3-8-8v-8c0-7 3-12 8-12z" fill="#F2F3F5"/>
    <path class="wing" d="M9 22c-2 4-2 11 0 15 1 2 2 1 2-1V23c0-2-1-3-2-1z" fill="#12151A"/>
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
    @keyframes peng-waddle { 0%,100% { transform: rotate(-4deg) translateY(0); } 50% { transform: rotate(4deg) translateY(-2px); } }
    @keyframes peng-kiss { from { transform: translate(0,0) scale(0.5); opacity: 0; }
                           25%  { opacity: 0.9; }
                           to   { transform: translate(6px,-42px) scale(1.1); opacity: 0; } }
    .peng { position: fixed; bottom: -2px; left: 0; z-index: 0; pointer-events: none; opacity: 0.85; }
    .peng > svg { animation: peng-waddle 0.42s ease-in-out infinite; transform-origin: 50% 90%; pointer-events: auto; cursor: pointer; }
    .peng.flip > svg { scale: -1 1; }
    /* Belly-down. The translateY is applied before the rotate, so it's a plain
       screen-space lift — without it the rotated box hangs ~25px below the fold. */
    .peng.slide > svg { animation: none; transform-origin: 50% 100%; transform: translateY(-21px) rotate(74deg); cursor: default; pointer-events: none; }
    .peng.slide .wing { transform: rotate(24deg); transform-origin: 10px 24px; }
    .peng-kiss { position: fixed; bottom: 34px; z-index: 0; pointer-events: none;
                 font-size: 15px; color: #E2557B; animation: peng-kiss 1.5s ease-out forwards; }
  `;
  document.head.appendChild(style);

  function kissAt(x) {
    const heart = document.createElement("div");
    heart.className = "peng-kiss";
    heart.textContent = "♥";
    heart.style.left = x + "px";
    document.body.appendChild(heart);
    setTimeout(() => heart.remove(), 1600);
  }

  function waddle() {
    const rtl = Math.random() < 0.5;
    const off = -60, on = innerWidth + 60;
    const to = rtl ? off : on;

    const box = document.createElement("div");
    box.className = "peng" + (rtl ? " flip" : "");
    box.innerHTML = svg;
    document.body.appendChild(box);

    const walk = box.animate(
      [{ transform: `translateX(${rtl ? on : off}px)` }, { transform: `translateX(${to}px)` }],
      { duration: WALK, easing: "linear", fill: "forwards" });

    let bye = setTimeout(() => box.remove(), WALK + 400);

    box.querySelector("svg").addEventListener("click", () => {
      // Retarget from wherever it currently is, or it teleports back to the start.
      const x = new DOMMatrix(getComputedStyle(box).transform).m41;
      walk.cancel();
      box.classList.add("slide");
      kissAt(x + (rtl ? 8 : 28));
      box.animate([{ transform: `translateX(${x}px)` }, { transform: `translateX(${to}px)` }],
        { duration: SLIDE, easing: "ease-out", fill: "forwards" });
      clearTimeout(bye);
      bye = setTimeout(() => box.remove(), SLIDE + 400);
    }, { once: true });

    return box;
  }

  const later = () => setTimeout(() => { if (!document.hidden) waddle(); later(); }, MIN + Math.random() * (MAX - MIN));
  later();

  // self-check: the layer must stay transparent to the mouse, hold nothing focusable,
  // and a click must actually put it on its belly and emit a kiss.
  const p = waddle();
  console.assert(getComputedStyle(p).pointerEvents === "none", "the penguin's layer never intercepts clicks");
  console.assert(!p.querySelector("a, button, input, [tabindex]"), "penguin holds nothing focusable");
  p.querySelector("svg").dispatchEvent(new MouseEvent("click", { bubbles: true }));
  console.assert(p.classList.contains("slide"), "clicking flips it onto its belly");
  console.assert(document.querySelector(".peng-kiss"), "clicking blows a kiss");
  console.assert(p.querySelector("svg").getBoundingClientRect().bottom <= innerHeight + 1,
    "the belly-sliding penguin stays on screen");
  p.remove();
  document.querySelector(".peng-kiss").remove();
})();
