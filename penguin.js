// Easter egg, pinpoint.html only. Every so often a penguin turns up along the
// bottom edge and does one of a few small routines, then leaves the way he came.
// He is scenery: no pointer events, no focus, no layout shift, never rotated off
// the bottom edge. A player mid-quiz can ignore him completely.
(() => {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const FIRST = [18_000, 40_000];    // first appearance after load
  const GAP = [50_000, 110_000];     // and roughly every minute or two after that
  const IN = 1400, OUT = 1100;
  const CROSS = 13_000;              // time to waddle the full width

  // Weighted so the full greeting stays the headline act and the rest are garnish.
  const ROUTINES = [
    ["greet", 5],   // peek in, wave, blow a kiss, leave
    ["wave", 3],    // peek in, wave, leave
    ["shy", 3],     // peek in, think better of it, duck straight back out
    ["cross", 2],   // waddle the whole way across and off the far side
  ];
  const TOTAL = ROUTINES.reduce((n, r) => n + r[1], 0);
  function pickRoutine() {
    let roll = Math.random() * TOTAL;
    for (const [name, weight] of ROUTINES) if ((roll -= weight) < 0) return name;
    return "greet";
  }

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
    @keyframes peng-look  { 0%,100% { transform: rotate(0deg); } 50% { transform: rotate(-9deg); } }
    @keyframes peng-kiss  { from { transform: translate(0,0) scale(0.5); opacity: 0; }
                            25%  { opacity: 0.9; }
                            to   { transform: translate(4px,-40px) scale(1.1); opacity: 0; } }
    /* bottom:0 and no rotation on the body, so he stands on the bottom edge always. */
    .peng { position: fixed; bottom: 0; left: 0; z-index: 0; pointer-events: none; opacity: 0.9; }
    .peng > svg { transform-origin: 50% 90%; }
    .peng.walking > svg { animation: peng-waddle 0.42s ease-in-out infinite; }
    .peng.looking > svg { animation: peng-look 1.1s ease-in-out 1; }
    .peng.flip > svg { scale: -1 1; }
    .peng.waving .wing { animation: peng-wave 0.36s ease-in-out 5; transform-origin: 30px 24px; }
    .peng-kiss { position: fixed; bottom: 36px; z-index: 0; pointer-events: none;
                 font-size: 15px; color: #E2557B; animation: peng-kiss 1.5s ease-out forwards; }
  `;
  document.head.appendChild(style);

  const wait = ms => new Promise(r => setTimeout(r, ms));
  const between = ([lo, hi]) => lo + Math.random() * (hi - lo);

  function kissAt(x) {
    const heart = document.createElement("div");
    heart.className = "peng-kiss";
    heart.textContent = "♥";
    heart.style.left = x + "px";
    document.body.appendChild(heart);
    setTimeout(() => heart.remove(), 1600);
  }

  let busy = false;

  async function visit(routine = pickRoutine()) {
    if (busy) return null;
    busy = true;

    const fromRight = Math.random() < 0.5;
    const off = fromRight ? innerWidth + 10 : -50;
    const away = fromRight ? -50 : innerWidth + 10;   // the far side, for a crossing
    const showing = 18 + Math.random() * 14;          // how much of him clears the edge
    const peek = fromRight ? innerWidth - showing : showing - 40;

    const box = document.createElement("div");
    box.className = "peng walking" + (fromRight ? " flip" : "");
    box.innerHTML = svg;
    box.style.transform = `translateX(${off}px)`;
    document.body.appendChild(box);

    const slide = (a, b, ms, easing) => box.animate(
      [{ transform: `translateX(${a}px)` }, { transform: `translateX(${b}px)` }],
      { duration: ms, easing, fill: "forwards" }).finished;

    if (routine === "cross") {
      await slide(off, away, CROSS, "linear");
    } else {
      await slide(off, peek, IN, "ease-out");
      box.classList.remove("walking");            // stand still
      if (routine === "shy") {
        box.classList.add("looking");
        await wait(1100);
        box.classList.remove("looking");
      } else {
        box.classList.add("waving");
        await wait(900);
        if (routine === "greet") kissAt(peek + (fromRight ? 6 : 26));
        await wait(1500);
        box.classList.remove("waving");
      }
      box.classList.add("walking");
      await slide(peek, off, OUT, "ease-in");      // back out the way he came
    }

    box.remove();
    busy = false;
    return routine;
  }

  // Keeps coming back, unlike the old one-shot. Skipped while the tab is hidden.
  (function schedule(range) {
    setTimeout(async () => {
      if (!document.hidden) await visit();
      schedule(GAP);
    }, between(range));
  })(FIRST);

  // Shift+P summons him on demand. Waiting out the timer to check an animation
  // change is not a good use of anyone's afternoon.
  addEventListener("keydown", e => {
    // Browsers report "P" with shift held; some automation reports "p". Accept both.
    if (e.key.toLowerCase() !== "p" || !e.shiftKey || e.metaKey || e.ctrlKey || e.altKey) return;
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) || e.target.isContentEditable) return;
    visit();
  });

  // ---- self-checks: scenery only, standing on the bottom edge, and every routine
  // in the table is one the player can actually get.
  const probe = document.createElement("div");
  probe.className = "peng walking";
  probe.innerHTML = svg;
  document.body.appendChild(probe);
  const r = probe.getBoundingClientRect();   // the container, not the mid-waddle svg
  console.assert(getComputedStyle(probe).pointerEvents === "none", "the penguin never intercepts clicks");
  console.assert(!probe.querySelector("a, button, input, [tabindex]"), "penguin holds nothing focusable");
  console.assert(Math.round(r.bottom) === innerHeight, "penguin stands on the bottom edge");
  console.assert(document.body.scrollWidth <= innerWidth + 1, "penguin adds no horizontal scroll");
  probe.remove();
  console.assert(new Set(Array.from({ length: 400 }, pickRoutine)).size === ROUTINES.length,
    "every routine is reachable");
  console.assert(ROUTINES.every(([name]) => ["greet", "wave", "shy", "cross"].includes(name)),
    "no routine name without a branch to run it");
})();
