const fs = require("node:fs");
const vm = require("node:vm");
const assert = require("node:assert/strict");
const script = fs.readFileSync(require("node:path").join(__dirname, "../previews.js"), "utf8");

for (const pathname of ["/", "/index.html", "/quiz", "/quiz/", "/quiz/index.html"]) {
  for (const reduced of [false, true]) {
    const listeners = {};
    const button = { addEventListener: (event, callback) => { listeners[event] = callback; }, setAttribute() {} };
    const motion = { matches: reduced, addEventListener: (event, callback) => { listeners[event] = callback; } };
    const image = { dataset: { animation: "gameplay/fill-the-map.gif", still: "gameplay/fill-the-map.jpg" } };
    const source = { getAttribute: () => "gameplay/fill-the-map.jpg" };
    vm.runInNewContext(script, {
      URL, location: { href: "https://streetlore.nyc" + pathname },
      document: {
        querySelector: () => button,
        querySelectorAll: selector => selector.endsWith("img") ? [image] : [source],
      },
      matchMedia: () => motion,
    });
    const base = "https://streetlore.nyc" + (pathname.startsWith("/quiz") ? "/quiz/" : "/") + "gameplay/fill-the-map";
    assert.equal(image.src, base + (reduced ? ".jpg" : ".gif"), pathname);
    assert.equal(source.srcset, base + ".jpg", pathname);
    assert.equal(button.hidden, reduced);
    listeners.click();
    assert.equal(image.src, base + ".jpg");
    listeners.click();
    assert.equal(image.src, base + (reduced ? ".jpg" : ".gif"));
    motion.matches = !reduced;
    listeners.change();
    assert.equal(image.src, base + (motion.matches ? ".jpg" : ".gif"));
    assert.equal(button.hidden, motion.matches);
  }
}
console.log("Preview URLs, pause/resume, and reduced motion pass on standalone and /quiz paths");
