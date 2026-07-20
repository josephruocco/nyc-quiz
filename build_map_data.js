// Turns NYC's NTA boundary GeoJSON into the compact blob embedded in pinpoint.html.
//   curl -sL -o nta.geojson "https://data.cityofnewyork.us/api/geospatial/9nt8-h7nd?method=export&format=GeoJSON"
//   node build_map_data.js nta.geojson > map_data.json
//   node -e '...' # inject into pinpoint.template.html at the /*DATA*/ marker
const fs = require("fs");

const TOL = 0.00025; // ~25m; ponytail: plain point-drop, not Douglas-Peucker. Good enough at this zoom.

const round = p => [+p[0].toFixed(4), +p[1].toFixed(4)];

const simplify = ring => {
  const out = [ring[0]];
  for (const p of ring) {
    const q = out[out.length - 1];
    if (Math.abs(p[0] - q[0]) > TOL || Math.abs(p[1] - q[1]) > TOL) out.push(p);
  }
  if (out.length < 4) return ring.map(round); // too small to simplify, keep raw
  out.push(out[0]);
  return out.map(round);
};

const area = ring => {
  let a = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++)
    a += ring[j][0] * ring[i][1] - ring[i][0] * ring[j][1];
  return a / 2;
};

const inside = ([mx, my], rings) => {
  let hit = false;
  for (const r of rings)
    for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
      const [ax, ay] = r[i], [bx, by] = r[j];
      if ((ay > my) !== (by > my) && mx < ((bx - ax) * (my - ay)) / (by - ay) + ax) hit = !hit;
    }
  return hit;
};

const src = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const hoods = [];

for (const f of src.features) {
  const p = f.properties;
  if (p.ntatype !== "0") continue;           // drop parks, airports, cemeteries, islands

  // keep only outer rings; holes don't matter for hit-testing at this scale
  const polys = (f.geometry.type === "Polygon" ? [f.geometry.coordinates] : f.geometry.coordinates)
    .map(poly => simplify(poly[0]))
    .filter(r => r.length > 3);
  if (!polys.length) continue;

  const main = polys.reduce((a, b) => (Math.abs(area(b)) > Math.abs(area(a)) ? b : a));
  const A = area(main);
  let cx = 0, cy = 0;
  for (let i = 0, j = main.length - 1; i < main.length; j = i++) {
    const c = main[j][0] * main[i][1] - main[i][0] * main[j][1];
    cx += (main[j][0] + main[i][0]) * c;
    cy += (main[j][1] + main[i][1]) * c;
  }
  const gy = cy / (6 * A);

  // Label point. The plain centroid is unusable for horseshoe neighborhoods like
  // Marine Park-Mill Basin-Bergen Beach, where it lands in the void or a hair off
  // an edge. Take the centroid's latitude and sit in the middle of the widest
  // interior span on that line: always inside, and far from the nearest edges.
  const xs = [];
  for (const r of polys)
    for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
      const [ax, ay] = r[i], [bx, by] = r[j];
      if ((ay > gy) !== (by > gy)) xs.push(ax + ((bx - ax) * (gy - ay)) / (by - ay));
    }
  xs.sort((a, b) => a - b);
  let label = [cx / (6 * A), gy], span = -1;
  for (let i = 0; i + 1 < xs.length; i += 2)   // consecutive pairs bracket interior spans
    if (xs[i + 1] - xs[i] > span) { span = xs[i + 1] - xs[i]; label = [(xs[i] + xs[i + 1]) / 2, gy]; }

  hoods.push({ n: p.ntaname, b: p.boroname === "Bronx" ? "The Bronx" : p.boroname, c: round(label), p: polys });
}

hoods.sort((a, b) => a.b.localeCompare(b.b) || a.n.localeCompare(b.n));

// self-check: every label point must sit inside its own neighborhood, with a
// margin wider than the 1px rounding a real MouseEvent applies to click coords.
const M = 0.0004;
const bad = hoods.filter(h => !inside(h.c, h.p) ||
  ![[M, 0], [-M, 0], [0, M], [0, -M]].every(([dx, dy]) => inside([h.c[0] + dx, h.c[1] + dy], h.p)));
if (bad.length) {
  process.stderr.write(`label point too close to an edge: ${bad.map(h => h.n).join(", ")}\n`);
  process.exit(1);
}

process.stdout.write(JSON.stringify(hoods));
process.stderr.write(`${hoods.length} neighborhoods, ${hoods.reduce((n, h) => n + h.p.reduce((m, r) => m + r.length, 0), 0)} points\n`);
