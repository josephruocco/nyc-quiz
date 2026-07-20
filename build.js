// Builds dist/ — the folder Netlify publishes.
//   node build_map_data.js nta.geojson > map_data.json && node build.js
// *.template.html get map_data.json inlined at the /*DATA*/ marker; the pages must
// stay self-contained single files, so the data is embedded, not fetched. Every
// other root .html (index, name-them-all) is copied through as-is.
const fs = require("fs");

const OUT = "dist";
const STATIC = ["index.html", "name-them-all.html"];

const data = fs.readFileSync("map_data.json", "utf8");
const egg = `\n<script>\n${fs.readFileSync("penguin.js", "utf8")}</script>\n`;

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT);

const EGG_PAGE = "pinpoint.html";   // the easter egg lives on exactly one page

const write = (name, html) => {
  fs.writeFileSync(`${OUT}/${name}`, name === EGG_PAGE ? html + egg : html);
  console.log(`${OUT}/${name}  ${(fs.statSync(`${OUT}/${name}`).size / 1024).toFixed(0)}K`);
};

for (const f of fs.readdirSync(".").filter(f => f.endsWith(".template.html"))) {
  const src = fs.readFileSync(f, "utf8");
  if (!src.includes("/*DATA*/")) { console.error(`${f}: no /*DATA*/ marker, skipped`); continue; }
  write(f.replace(".template", ""), src.replace("/*DATA*/", data));
}

for (const f of STATIC) write(f, fs.readFileSync(f, "utf8"));
