// Builds dist/ — the folder Netlify publishes.
//   node build_map_data.js nta.geojson > map_data.json
//   node build_subway_data.js > subway_data.json
//   node build.js
// *.template.html get their data inlined at the markers below; the pages must stay
// self-contained single files, so the data is embedded, not fetched. A template may
// use more than one marker (the subway page draws the neighbourhoods as a backdrop).
// Every other root .html (index, name-them-all) is copied through as-is.
//
// The penguin is left out by default, so the public build is the plain game.
// Pass PENGUIN=1 to include him:  PENGUIN=1 node build.js
const fs = require("fs");

const OUT = "dist";
const STATIC = ["index.html", "name-them-all.html"];

const BLOBS = {
  "/*DATA*/": "map_data.json",
  "/*SUBWAY*/": "subway_data.json",
};

const WITH_EGG = process.env.PENGUIN === "1";

const wrap = f => `\n<script>\n${fs.readFileSync(f, "utf8")}</script>\n`;
const theme = wrap("theme.js");                      // every page
const egg = WITH_EGG ? wrap("penguin.js") : "";      // one page, and only when asked for

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT);

const EGG_PAGE = "pinpoint.html";   // the easter egg lives on exactly one page

const write = (name, html) => {
  fs.writeFileSync(`${OUT}/${name}`, html + theme + (name === EGG_PAGE && WITH_EGG ? egg : ""));
  console.log(`${OUT}/${name}  ${(fs.statSync(`${OUT}/${name}`).size / 1024).toFixed(0)}K`);
};

for (const f of fs.readdirSync(".").filter(f => f.endsWith(".template.html"))) {
  let src = fs.readFileSync(f, "utf8");
  const used = Object.keys(BLOBS).filter(m => src.includes(m));
  if (!used.length) { console.error(`${f}: no data marker, skipped`); continue; }
  for (const marker of used) src = src.replace(marker, () => fs.readFileSync(BLOBS[marker], "utf8"));
  write(f.replace(".template", ""), src);
}

for (const f of STATIC) write(f, fs.readFileSync(f, "utf8"));

console.log(WITH_EGG ? "penguin: in (PENGUIN=1)" : "penguin: out (public build)");

// The public build must not ship the egg, and the private one must.
const built = fs.readFileSync(`${OUT}/${EGG_PAGE}`, "utf8");
if (built.includes("peng-waddle") !== WITH_EGG) {
  console.error(`${EGG_PAGE}: penguin ${WITH_EGG ? "missing from" : "leaked into"} the build`);
  process.exit(1);
}
if (!WITH_EGG && fs.readdirSync(OUT).some(f => fs.readFileSync(`${OUT}/${f}`, "utf8").includes("peng-waddle"))) {
  console.error("penguin leaked into a page other than " + EGG_PAGE);
  process.exit(1);
}
