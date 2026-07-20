// Builds dist/ — the folder Netlify publishes.
//   node build_map_data.js nta.geojson > map_data.json
//   node build_subway_data.js > subway_data.json
//   node build.js
// *.template.html get their data inlined at the markers below; the pages must stay
// self-contained single files, so the data is embedded, not fetched. A template may
// use more than one marker (the subway page draws the neighbourhoods as a backdrop).
// Every other root .html (index, name-them-all) is copied through as-is.
const fs = require("fs");

const OUT = "dist";
const STATIC = ["index.html", "name-them-all.html"];

const BLOBS = {
  "/*DATA*/": "map_data.json",
  "/*SUBWAY*/": "subway_data.json",
};

const wrap = f => `\n<script>\n${fs.readFileSync(f, "utf8")}</script>\n`;
const theme = wrap("theme.js");   // every page
const egg = wrap("penguin.js");   // one page

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT);

const EGG_PAGE = "pinpoint.html";   // the easter egg lives on exactly one page

const write = (name, html) => {
  fs.writeFileSync(`${OUT}/${name}`, html + theme + (name === EGG_PAGE ? egg : ""));
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
