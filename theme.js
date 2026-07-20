// Shared page chrome, appended to every built page: a home link back to the menu
// and the light/dark switch. Every page already styles :root[data-theme=…], so the
// switch only has to set the attribute and remember the choice. With nothing chosen
// the pages follow the OS, and the button matching the OS starts pressed.
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
    .theme-pick { position: fixed; top: 12px; right: 12px; z-index: 5; display: flex; gap: 6px; align-items: stretch; }
    .theme-pick a.home {
      display: grid; place-items: center; text-decoration: none;
      font: 600 10px/1 var(--display, sans-serif); letter-spacing: 0.1em; text-transform: uppercase;
      color: var(--dim); background: var(--panel); border: 1px solid var(--line);
      border-radius: 2px; padding: 8px 10px; margin-right: 4px;
    }
    .theme-pick a.home:hover { color: var(--text); border-color: var(--text); }
    .theme-pick a.home:focus-visible { outline: 2px solid var(--text); outline-offset: 2px; }
    .theme-pick button {
      font: 600 10px/1 var(--display, sans-serif); letter-spacing: 0.1em; text-transform: uppercase;
      color: var(--dim); background: var(--panel); border: 1px solid var(--line);
      border-radius: 2px; padding: 8px 10px; cursor: pointer;
    }
    .theme-pick button:hover { color: var(--text); border-color: var(--text); }
    .theme-pick button:focus-visible { outline: 2px solid var(--text); outline-offset: 2px; }
    .theme-pick button[aria-pressed="true"] { background: var(--text); color: var(--paper); border-color: var(--text); }
    @media (max-width: 480px) { .theme-pick { top: 8px; right: 8px; } }
    .site-credit {
      max-width: 1080px; margin: 0 auto; padding: 0 20px 32px;
      font-family: var(--mono, monospace); font-size: 12px; color: var(--dim);
    }
  `;
  document.head.appendChild(style);

  const box = document.createElement("div");
  box.className = "theme-pick";

  // Every page but the menu itself gets a way back to the menu.
  const onMenu = /(^\/?|\/)(index\.html)?$/.test(location.pathname);
  if (!onMenu) {
    const home = document.createElement("a");
    home.className = "home";
    home.href = "index.html";
    home.textContent = "← Menu";
    box.appendChild(home);
  }

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

  // Byline, appended after the switch so it really is the last thing on the page.
  const credit = document.createElement("footer");
  credit.className = "site-credit";
  credit.textContent = "Created by Joseph Ruocco";
  document.body.appendChild(credit);

  // self-check
  console.assert(getComputedStyle(box).position === "fixed", "theme switch stays out of the layout");
  console.assert(buttons.filter(([, b]) => b.getAttribute("aria-pressed") === "true").length === 1,
    "exactly one theme reads as active");
  // A saved choice must survive the reload that brought us here.
  console.assert(!saved || root.dataset.theme === saved, "the saved theme is applied on load");
  console.assert(onMenu === !box.querySelector("a.home"), "every page but the menu has a way home");
  console.assert(document.body.lastElementChild === credit, "the byline sits at the bottom of the page");
})();
