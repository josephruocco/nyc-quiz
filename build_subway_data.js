// Turns MTA's service-line geometry and station list into the blob embedded in
// subway.html.
//   curl -sL -o subway_lines.json    "https://data.ny.gov/resource/s692-irgq.json?\$limit=5000"
//   curl -sL -o subway_stations.json "https://data.ny.gov/resource/39hk-dx4f.json?\$limit=5000"
//   node build_subway_data.js > subway_data.json
const fs = require("fs");

const TOL = 0.0002;   // ~20m; ponytail: plain point-drop, same as the neighborhood builder.

// The feed splits some services in ways a rider wouldn't: rush-hour 5 is its own
// row, and the three shuttles are SF/ST/SR but all wear an S bullet. Fold them
// together. SIR is the Staten Island Railway — not the subway, and including it
// would zoom the whole map out to reach it, so it goes.
const FOLD = { "5 Peak": "5", SF: "S", ST: "S", SR: "S" };
const DROP = new Set(["SIR"]);

const round = p => [+p[0].toFixed(4), +p[1].toFixed(4)];

const simplify = ring => {
  const out = [ring[0]];
  for (const p of ring) {
    const q = out[out.length - 1];
    if (Math.abs(p[0] - q[0]) > TOL || Math.abs(p[1] - q[1]) > TOL) out.push(p);
  }
  if (out.length < 2) return ring.map(round);
  return out.map(round);
};

const lines = JSON.parse(fs.readFileSync("subway_lines.json", "utf8"));
const stops = JSON.parse(fs.readFileSync("subway_stations.json", "utf8"));

const routes = new Map();   // id -> { r, n, p: [polyline, ...] }

for (const row of lines) {
  const raw = (row.service || "").trim();
  const id = FOLD[raw] || raw;
  if (!id || DROP.has(id)) continue;

  const g = row.geometry;
  if (!g) continue;
  const parts = g.type === "LineString" ? [g.coordinates] : g.coordinates;

  const entry = routes.get(id) || { r: id, n: row.service_name || id, p: [] };
  for (const part of parts) {
    const s = simplify(part);
    if (s.length > 1) entry.p.push(s);
  }
  routes.set(id, entry);
}

// A station is a fair target only if we can name the lines that serve it.
const stations = [];
for (const s of stops) {
  const serving = (s.daytime_routes || "").split(/\s+/).filter(Boolean)
    .map(r => FOLD[r] || r).filter(r => routes.has(r));
  if (!serving.length) continue;
  const lon = +s.gtfs_longitude, lat = +s.gtfs_latitude;
  if (!isFinite(lon) || !isFinite(lat)) continue;
  stations.push({ n: s.stop_name, b: s.borough, r: [...new Set(serving)], c: round([lon, lat]) });
}

const out = {
  routes: [...routes.values()].sort((a, b) => a.r.localeCompare(b.r, undefined, { numeric: true })),
  stations: stations.sort((a, b) => a.n.localeCompare(b.n)),
};

// ---- self-checks. A silently-wrong data file here means an unwinnable quiz.
const ids = new Set(out.routes.map(r => r.r));
const bad = [];
if (!out.routes.every(r => r.p.length && r.p.every(l => l.length > 1)))
  bad.push("a route has empty geometry");
if (!out.stations.every(s => s.r.every(r => ids.has(r))))
  bad.push("a station references a route with no geometry");
if (out.stations.some(s => s.c[0] < -74.3 || s.c[0] > -73.6 || s.c[1] < 40.4 || s.c[1] > 40.95))
  bad.push("a station sits outside NYC");
if ([...ids].some(id => DROP.has(id))) bad.push("a dropped service survived");

// Every route must pass near at least one of its own stations, or the geometry
// and the station list disagree about what that route is.
const near = (pt, route) => {
  let best = Infinity;
  for (const line of route.p)
    for (let i = 1; i < line.length; i++) best = Math.min(best, segDist(pt, line[i - 1], line[i]));
  return best;
};
function segDist(p, a, b) {
  const kx = Math.cos(40.7 * Math.PI / 180);
  const px = (p[0] - a[0]) * kx, py = p[1] - a[1];
  const bx = (b[0] - a[0]) * kx, by = b[1] - a[1];
  const len = bx * bx + by * by;
  const t = len ? Math.max(0, Math.min(1, (px * bx + py * by) / len)) : 0;
  return Math.hypot(px - bx * t, py - by * t) * 69;   // degrees -> miles
}
for (const route of out.routes) {
  const mine = out.stations.filter(s => s.r.includes(route.r));
  if (!mine.length) { bad.push(`route ${route.r} has no stations`); continue; }
  const worst = Math.min(...mine.map(s => near(s.c, route)));
  if (worst > 0.2) bad.push(`route ${route.r} runs nowhere near its own stations (${worst.toFixed(2)} mi)`);
}

if (bad.length) { process.stderr.write(bad.join("\n") + "\n"); process.exit(1); }

process.stdout.write(JSON.stringify(out));
process.stderr.write(
  `${out.routes.length} routes (${[...ids].join(" ")}), ${out.stations.length} stations, ` +
  `${out.routes.reduce((n, r) => n + r.p.reduce((m, l) => m + l.length, 0), 0)} points\n`);
