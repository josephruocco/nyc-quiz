// Light/dark switch, appended to every built page. Every page already styles
// :root[data-theme="light"|"dark"], so this only has to set the attribute and
// remember the choice. With nothing chosen the pages follow the OS, and the
// button matching the OS starts pressed.
(() => {
  const KEY = "nyc-quiz-theme";
  const root = document.documentElement;
  const system = () => matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";

  const saved = localStorage.getItem(KEY);
  if (saved === "light" || saved === "dark") root.dataset.theme = saved;

  // The map pages paint their canvas from the CSS variables, and this script runs
  // after they've already drawn — so a saved theme needs a repaint on load, not
  // just on click, or you get a light-mode map on a dark page.
  const repaint = () => { if (typeof window.draw === "function") window.draw(); };

  const style = document.createElement("style");
  style.textContent = `
    .theme-pick { position: fixed; top: 12px; right: 12px; z-index: 5; display: flex; gap: 6px; }
    .theme-pick button {
      font: 600 10px/1 var(--display, sans-serif); letter-spacing: 0.1em; text-transform: uppercase;
      color: var(--dim); background: var(--panel); border: 1px solid var(--line);
      border-radius: 2px; padding: 8px 10px; cursor: pointer;
    }
    .theme-pick button:hover { color: var(--text); border-color: var(--text); }
    .theme-pick button:focus-visible { outline: 2px solid var(--text); outline-offset: 2px; }
    .theme-pick button[aria-pressed="true"] { background: var(--text); color: var(--paper); border-color: var(--text); }
    @media (max-width: 480px) { .theme-pick { top: 8px; right: 8px; } }
  `;
  document.head.appendChild(style);

  const box = document.createElement("div");
  box.className = "theme-pick";
  box.setAttribute("role", "group");
  box.setAttribute("aria-label", "Colour theme");

  const buttons = ["light", "dark"].map(mode => {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = mode;
    b.addEventListener("click", () => {
      root.dataset.theme = mode;
      localStorage.setItem(KEY, mode);
      sync();
      repaint();
    });
    box.appendChild(b);
    return [mode, b];
  });

  const sync = () => {
    const now = root.dataset.theme || system();
    for (const [mode, b] of buttons) b.setAttribute("aria-pressed", String(mode === now));
  };

  sync();
  if (saved) repaint();
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => { if (!root.dataset.theme) sync(); });
  document.body.appendChild(box);

  // self-check
  console.assert(getComputedStyle(box).position === "fixed", "theme switch stays out of the layout");
  console.assert(buttons.filter(([, b]) => b.getAttribute("aria-pressed") === "true").length === 1,
    "exactly one theme reads as active");
  // A saved choice must survive the reload that brought us here.
  console.assert(!saved || root.dataset.theme === saved, "the saved theme is applied on load");
})();
