# nyc-quiz

Quizzes over NYC's 197 neighborhoods across all five boroughs, built from the
city's NTA boundary data, plus two over the subway network. Each game is a single self-contained HTML
file with the geometry embedded — no runtime fetches, no dependencies.

- **Fill In the Map** — type a neighborhood, it paints itself onto the city. Pick your
  boroughs, free-form or one-at-a-time, with or without a 15-minute clock.
- **Pinpoint the Neighborhood** — boundaries drawn, none labeled. Click where you think
  the named one sits. 20 rounds, scored on miss distance.
- **Name Every Neighborhood** — no map, just a list to fill in.
- **Pinpoint the Line** — the subway network drawn but unlabeled. Click anywhere along
  the train you're asked for. Hard mode gives you a station name instead, so you have
  to know which line serves it. Geographic map. Staten Island Railway is left out:
  it is a separate railway with no track connection, and fitting it would zoom the
  whole map across the harbour.
- **Which Train?** — a station name and the full set of bullets. Pick every line that
  stops there, with no map to work it out from.

## Build

```sh
node build.js          # -> dist/
```

`build.js` inlines the data blobs into each `*.template.html` (`/*DATA*/` →
`map_data.json`, `/*SUBWAY*/` → `subway_data.json`; the subway page uses both,
drawing the neighborhoods as a faint backdrop), copies the static pages through,
and appends `theme.js` to every page.

The penguin easter egg is **left out by default**, so `node build.js` is the
public build. To include him:

```sh
PENGUIN=1 node build.js
```

The build fails rather than shipping the wrong thing: it exits non-zero if the
egg is missing from a `PENGUIN=1` build, or present anywhere in a public one.

To regenerate the geometry from scratch:

```sh
curl -sL -o nta.geojson "https://data.cityofnewyork.us/api/geospatial/9nt8-h7nd?method=export&format=GeoJSON"
node build_map_data.js nta.geojson > map_data.json

curl -sL -o subway_lines.json    "https://data.ny.gov/resource/s692-irgq.json?\$limit=5000"
curl -sL -o subway_stations.json "https://data.ny.gov/resource/39hk-dx4f.json?\$limit=5000"
node build_subway_data.js > subway_data.json

node build.js
```

Both data builders refuse to write a broken file: `build_subway_data.js` exits
non-zero if a route has no geometry, references a station it doesn't pass near, or
a stop points at a line that isn't drawn.

## Deploy

`netlify.toml` is set up already — connect the repo to Netlify and it runs
`node build.js` and publishes `dist/`. Or run the build locally and drop the
`dist` folder on <https://app.netlify.com/drop>.

Each page opens its own dev checks with `console.assert`; the browser console
should be silent on load.
