# nyc-quiz

Three quizzes over NYC's 181 neighborhoods (Manhattan, Brooklyn, Queens, the Bronx),
built from the city's NTA boundary data. Each game is a single self-contained HTML
file with the geometry embedded — no runtime fetches, no dependencies.

- **Fill In the Map** — type a neighborhood, it paints itself onto the city. Pick your
  boroughs, free-form or one-at-a-time, with or without a 15-minute clock.
- **Pinpoint the Neighborhood** — boundaries drawn, none labeled. Click where you think
  the named one sits. 20 rounds, scored on miss distance.
- **Name Every Neighborhood** — no map, just a list to fill in.

## Build

```sh
node build.js          # -> dist/
```

`build.js` inlines `map_data.json` into each `*.template.html` at the `/*DATA*/`
marker, copies the static pages through, and appends `penguin.js` to every page.

To regenerate the geometry from scratch:

```sh
curl -sL -o nta.geojson "https://data.cityofnewyork.us/api/geospatial/9nt8-h7nd?method=export&format=GeoJSON"
node build_map_data.js nta.geojson > map_data.json
node build.js
```

## Deploy

`netlify.toml` is set up already — connect the repo to Netlify and it runs
`node build.js` and publishes `dist/`. Or run the build locally and drop the
`dist` folder on <https://app.netlify.com/drop>.

Each page opens its own dev checks with `console.assert`; the browser console
should be silent on load.
