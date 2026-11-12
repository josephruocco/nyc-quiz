const fs = require("node:fs");
const vm = require("node:vm");
const assert = require("node:assert/strict");
const test = require("node:test");
const source = fs.readFileSync(require("node:path").join(__dirname, "../theme.js"), "utf8");
const start = source.indexOf("  // ---- challenge a friend");
const script = source.slice(start, source.indexOf("  // self-check", start));

function harness(search = "", navigator = {}, fallback = false) {
  const nodes = {};
  const wrap = { firstChild: null, insertBefore: node => { nodes.banner = node; }, appendChild: node => { nodes.box = node; } };
  const document = {
    querySelector: () => wrap,
    execCommand: () => fallback,
    createElement: () => ({
      querySelector: selector => nodes[selector] ||= { addEventListener(event, listener) { this[event] = listener; }, focus() {}, select() {} },
    }),
  };
  const window = {};
  vm.runInNewContext(script, { document, window, navigator, URLSearchParams, location: { origin: "https://streetlore.nyc", pathname: "/quiz/pinpoint.html", search } });
  return { nodes, window };
}

test("score links preserve mode settings, include the total, and update on a new run", () => {
  const { nodes, window } = harness();
  window.showShareBox(17, 20, "Pinpoint the Neighborhood", "boro=bk&lines=0");
  const url = new URL(nodes[".share-url"].value);
  assert.equal(url.pathname, "/quiz/pinpoint.html");
  for (const [key, value] of Object.entries({ beat: "17", total: "20", boro: "bk", lines: "0" })) assert.equal(url.searchParams.get(key), value);
  window.hideShareBox();
  assert.equal(nodes.box.hidden, true);
  window.showShareBox(20, 20, "Pinpoint the Neighborhood");
  assert.equal(new URL(nodes[".share-url"].value).searchParams.get("beat"), "20");
  assert.equal(nodes.box.hidden, false);
});

test("friend sees the full score, and old links still work", () => {
  assert.match(harness("?beat=17&total=20").nodes.banner.innerHTML, /17\/20/);
  assert.match(harness("?beat=17").nodes.banner.innerHTML, /<b>17<\/b>/);
  assert.equal(harness("?beat=invalid").nodes.banner, undefined);
  assert.doesNotMatch(harness("?beat=17&total=%3Cscript%3E").nodes.banner.innerHTML, /script/);
});

test("native share includes the actual score and quiz link", async () => {
  let shared;
  const { nodes, window } = harness("", { share: async data => { shared = data; } });
  window.showShareBox(17, 20, "Pinpoint the Neighborhood");
  await nodes[".share-native"].click();
  assert.match(shared.text, /17\/20 on Pinpoint the Neighborhood/);
  assert.equal(shared.url, nodes[".share-url"].value);
  assert.equal(nodes[".share-status"].textContent, "Score shared!");
});

test("copy works without native sharing and reports clipboard failures honestly", async () => {
  let copied;
  const { nodes, window } = harness("", { clipboard: { writeText: async text => { copied = text; } } });
  window.showShareBox(0, 20, "Pinpoint the Neighborhood");
  await nodes[".share-native"].click();
  assert.equal(copied, nodes[".share-url"].value);
  assert.match(nodes[".share-status"].textContent, /Link copied/);
  const blocked = harness();
  blocked.window.showShareBox(0, 20, "Pinpoint the Neighborhood");
  await blocked.nodes[".share-copy"].click();
  assert.equal(blocked.nodes[".share-status"].textContent, "Select and copy the link to share your score.");
  const legacy = harness("", {}, true);
  legacy.window.showShareBox(0, 20, "Pinpoint the Neighborhood");
  await legacy.nodes[".share-copy"].click();
  assert.match(legacy.nodes[".share-status"].textContent, /Link copied/);
});

test("canceling native share does not copy anything or claim success", async () => {
  const { nodes, window } = harness("", { share: async () => { throw { name: "AbortError" }; }, clipboard: { writeText: () => assert.fail("must not copy") } });
  window.showShareBox(17, 20, "Pinpoint the Neighborhood");
  await nodes[".share-native"].click();
  assert.equal(nodes[".share-status"].textContent, "");
});
