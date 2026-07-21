// Shared page chrome, appended to every built page: a home link back to the menu
// and the light/dark switch. Every page already styles :root[data-theme=…], so the
// switch only has to set the attribute and remember the choice. With nothing chosen
// the pages follow the OS, and the button matching the OS starts pressed.
(() => {
  const root = document.documentElement;

  // These pages link to each other with relative hrefs. Standalone that's fine,
  // but proxied under streetlore.nyc/quiz a URL missing the trailing slash (/quiz)
  // or a clean one (/quiz/subway) makes those links resolve against the site root
  // and 404. Compute the mount and rewrite the internal page links to keep it —
  // done directly rather than via <base>, which didn't reliably re-resolve links
  // already parsed into the page. Empty (a no-op) on the standalone site.
  const _p = location.pathname;
  const _qi = _p.indexOf("/quiz/");
  const MOUNT = _qi >= 0 ? _p.slice(0, _qi) + "/quiz/" : (_p === "/quiz" ? "/quiz/" : "");
  // Match a quiz page in any form Netlify might serve it — "pinpoint.html",
  // "/pinpoint" (Pretty URLs strips the extension and makes it root-absolute), or
  // "pinpoint" — and repoint it at the mount. The origin serves both the clean and
  // the .html path, so /quiz/pinpoint resolves either way.
  const PAGES = ["fill-the-map", "pinpoint", "subway", "which-train", "name-them-all", "index"];
  // Emit the .html form: it serves directly everywhere, with no reliance on the
  // host's clean-URL support (and no extra redirect hop through the proxy).
  const toMount = h => {
    if (!MOUNT) return null;   // standalone: leave links exactly as authored
    const m = /^\/?([\w-]+)(?:\.html)?([?#].*)?$/.exec(h);
    return m && PAGES.includes(m[1]) ? MOUNT + m[1] + ".html" + (m[2] || "") : null;
  };
  if (MOUNT) {
    for (const a of document.querySelectorAll("a[href]")) {
      const to = toMount(a.getAttribute("href"));
      if (to) a.setAttribute("href", to);
    }
  }

  const KEY = "nyc-quiz-theme";
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
    /* On a phone a fixed bar just sits on top of the quiz. Make it absolute so it
       scrolls away, and give the page room so it doesn't land on the heading. */
    @media (max-width: 700px) {
      .theme-pick { position: absolute; top: 8px; right: 8px; }
      body { padding-top: 42px; }
    }
    .site-credit {
      max-width: 1080px; margin: 0 auto; padding: 24px 20px 40px; text-align: center;
      font-family: var(--mono, monospace); font-size: 12px; color: var(--dim);
      border-top: 1px solid var(--line);
    }
    .site-credit .promo { display: block; font-size: 13px; color: var(--text); margin-bottom: 10px; }
    .site-credit a { color: var(--text); text-decoration: none; border-bottom: 1px solid var(--line); }
    .site-credit a:hover { border-bottom-color: var(--text); }
    .site-credit a:focus-visible { outline: 2px solid var(--text); outline-offset: 2px; }
  `;
  document.head.appendChild(style);

  const box = document.createElement("div");
  box.className = "theme-pick";

  // Every page but the menu itself gets a way back to the menu. Detect the menu by
  // its game grid rather than the URL, so it holds under the proxy's clean paths.
  const onMenu = !!document.querySelector(".games");
  if (!onMenu) {
    const home = document.createElement("a");
    home.className = "home";
    home.setAttribute("href", MOUNT + "index.html");
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

  // Funnel back to the app. Absolute so it points at StreetLore from the proxied
  // quiz and from the standalone site alike.
  const promo = document.createElement("a");
  promo.className = "promo";
  promo.href = "https://streetlore.nyc";
  promo.textContent = "Live in New York? Download StreetLore NYC →";
  credit.appendChild(promo);

  credit.append("Created by ");
  const me = document.createElement("a");
  me.href = "https://josephruocco.net";
  me.textContent = "Joseph Ruocco";
  credit.appendChild(me);
  document.body.appendChild(credit);

  // self-check
  // fixed on desktop, absolute under the mobile breakpoint — either keeps it out of flow.
  console.assert(/fixed|absolute/.test(getComputedStyle(box).position), "theme switch stays out of the layout");
  console.assert(buttons.filter(([, b]) => b.getAttribute("aria-pressed") === "true").length === 1,
    "exactly one theme reads as active");
  // A saved choice must survive the reload that brought us here.
  console.assert(!saved || root.dataset.theme === saved, "the saved theme is applied on load");
  console.assert(onMenu === !box.querySelector("a.home"), "every page but the menu has a way home");
  // Under a /quiz mount, every quiz-page link must carry it, in whatever form it arrived.
  console.assert(toMount("/pinpoint") === (MOUNT ? MOUNT + "pinpoint.html" : null), "root-absolute prettified link rewrites");
  console.assert(toMount("pinpoint.html") === (MOUNT ? MOUNT + "pinpoint.html" : null), "relative .html link rewrites");
  console.assert(toMount("https://example.com") === null, "external links are left alone");
  // Not "is it the last node" — the penguin page appends a <script> after this one,
  // and script tags don't render. What matters is that it sits below the content.
  const main = document.querySelector(".wrap") || document.body.firstElementChild;
  console.assert(!main || credit.getBoundingClientRect().top >= main.getBoundingClientRect().bottom - 1,
    "the byline renders below the page content");
  console.assert(me.href === "https://josephruocco.net/", "the byline links out");
  console.assert(promo.href === "https://streetlore.nyc/", "the app promo links to StreetLore");
})();
