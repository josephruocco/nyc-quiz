// Easter egg, pinpoint.html only. Once per page load a penguin peeks in from one
// side, stops just shy of the edge, waves, blows a kiss, and backs out the same
// way. Stays upright on the bottom edge the whole time. It is scenery: no pointer
// events, no focus, no layout shift — a player mid-quiz can ignore it completely.
(() => {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const WAIT_MIN = 30_000, WAIT_MAX = 70_000;   // ponytail: untuned range. Widen if it shows up too eagerly.
  const IN = 1400, HOLD = 3400, OUT = 1100;
  const PEEK = 24;   // px of penguin left showing at the edge — "a touch off the side"

  const svg = `
  <svg viewBox="0 0 40 52" width="40" height="52" aria-hidden="true">
    <ellipse cx="20" cy="49" rx="13" ry="2.5" fill="rgba(0,0,0,0.16)"/>
    <path d="M20 4c8 0 13 7 13 17v13c0 7-5 12-13 12S7 41 7 34V21C7 11 12 4 20 4z" fill="#1B1E24"/>
    <path d="M20 13c5 0 8 5 8 12v8c0 5-3 8-8 8s-8-3-8-8v-8c0-7 3-12 8-12z" fill="#F2F3F5"/>
    <path class="wing" d="M31 22c2 4 2 11 0 15-1 2-2 1-2-1V23c0-2 1-3 2-1z" fill="#12151A"/>
    <path d="M9 22c-2 4-2 11 0 15 1 2 2 1 2-1V23c0-2-1-3-2-1z" fill="#12151A"/>
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
    @keyframes peng-wave  { 0%,100% { transform: rotate(0deg); } 50% { transform: rotate(-58deg); } }
    @keyframes peng-kiss  { from { transform: translate(0,0) scale(0.5); opacity: 0; }
                            25%  { opacity: 0.9; }
                            to   { transform: translate(4px,-40px) scale(1.1); opacity: 0; } }
    /* bottom:0 and no rotation anywhere — he stands on the bottom edge, always. */
    .peng { position: fixed; bottom: 0; left: 0; z-index: 0; pointer-events: none; opacity: 0.9; }
    .peng > svg { transform-origin: 50% 90%; }
    .peng.walking > svg { animation: peng-waddle 0.42s ease-in-out infinite; }
    .peng.flip > svg { scale: -1 1; }
    .peng.waving .wing { animation: peng-wave 0.36s ease-in-out 5; transform-origin: 30px 24px; }
    .peng-kiss { position: fixed; bottom: 36px; z-index: 0; pointer-events: none;
                 font-size: 15px; color: #E2557B; animation: peng-kiss 1.5s ease-out forwards; }
  `;
  document.head.appendChild(style);

  const wait = ms => new Promise(r => setTimeout(r, ms));

  function kissAt(x) {
    const heart = document.createElement("div");
    heart.className = "peng-kiss";
    heart.textContent = "♥";
    heart.style.left = x + "px";
    document.body.appendChild(heart);
    setTimeout(() => heart.remove(), 1600);
  }

  async function visit() {
    const fromRight = Math.random() < 0.5;
    const off = fromRight ? innerWidth + 10 : -50;
    const peek = fromRight ? innerWidth - PEEK : PEEK - 40;

    const box = document.createElement("div");
    box.className = "peng walking" + (fromRight ? " flip" : "");
    box.innerHTML = svg;
    box.style.transform = `translateX(${off}px)`;
    document.body.appendChild(box);

    const slide = (a, b, ms, easing) => box.animate(
      [{ transform: `translateX(${a}px)` }, { transform: `translateX(${b}px)` }],
      { duration: ms, easing, fill: "forwards" }).finished;

    await slide(off, peek, IN, "ease-out");
    box.classList.remove("walking");     // stand still to say hello
    box.classList.add("waving");
    await wait(900);
    kissAt(peek + (fromRight ? 6 : 26));
    await wait(HOLD - 900);
    box.classList.remove("waving");
    box.classList.add("walking");
    await slide(peek, off, OUT, "ease-in");   // back out the way he came
    box.remove();
    return box;
  }

  // Once per page load, after a while. No repeat scheduler.
  setTimeout(() => { if (!document.hidden) visit(); }, WAIT_MIN + Math.random() * (WAIT_MAX - WAIT_MIN));

  // self-check: scenery only, and standing on the bottom edge rather than floating.
  const probe = document.createElement("div");
  probe.className = "peng walking";
  probe.innerHTML = svg;
  document.body.appendChild(probe);
  // Measure the pinned container, not the svg: the waddle bobs it a couple of px.
  const r = probe.getBoundingClientRect();
  console.assert(getComputedStyle(probe).pointerEvents === "none", "the penguin never intercepts clicks");
  console.assert(!probe.querySelector("a, button, input, [tabindex]"), "penguin holds nothing focusable");
  console.assert(Math.round(r.bottom) === innerHeight, "penguin stands on the bottom edge");
  console.assert(document.body.scrollWidth <= innerWidth + 1, "penguin adds no horizontal scroll");
  probe.remove();
})();
