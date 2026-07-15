# Eat BKK — Bangkok Chinese Food Map

Eat BKK is a mobile-first restaurant discovery map for exploring Chinese food in Bangkok. It combines a verified restaurant dataset, distance-aware recommendations, Google Maps, and a compact map-and-list interface designed for use while moving around the city.

**Live application:** [eat-in-bkk.vercel.app](https://eat-in-bkk.vercel.app/)

**Feedback and data corrections:** [Google Form](https://forms.gle/uHMsEYj7UphzyWRW6)

## What the current version does

- Shows nearby Chinese restaurants on an interactive Google Map.
- Keeps the map and restaurant list visible together on mobile through a three-position bottom sheet.
- Draws the selected search radius around the draggable cat location marker.
- Connects restaurant cards and map markers in both directions.
- Clusters dense groups of restaurants without replacing individual restaurant identity.
- Supports four recommendation modes:
  - **Free:** every matching restaurant in the selected radius, ordered by distance.
  - **Quick:** five nearby recommendations balancing distance, rating, and popularity.
  - **Explore:** more varied and less obvious choices.
  - **Budget:** choices closest to the selected price limit.
- Filters by radius, budget, primary cuisine, and cuisine subtype.
- Provides direct Google Maps directions for every result.
- Handles mobile location timeouts with retry instructions and manual marker movement.
- Displays the source Google rating to users while retaining the Bayesian weighted score only for ranking.
- Shows the dataset's last-updated date and an in-product correction link.

## Data and recommendation logic

The canonical source is [`data/bangkok_food_combined_ready.xlsx`](data/bangkok_food_combined_ready.xlsx). The build pipeline validates and exports 199 restaurants to [`restaurants.json`](restaurants.json).

Each public record contains the original rating and separate derived ranking fields:

```json
{
  "name": "Restaurant name",
  "lat": 13.7563,
  "lon": 100.5018,
  "primary_cuisine": "Sichuan & Chongqing",
  "cuisine_subtype": "Hotpot",
  "rating": 4.6,
  "weighted_rating": 4.54,
  "rating_norm": 0.72,
  "review_count": 385,
  "review_weight_norm": 0.65,
  "price_min": 200,
  "price_max": 400,
  "price_mid": 300,
  "address": "Bangkok",
  "url": "https://www.google.com/maps/...",
  "image_url": "https://..."
}
```

`rating` is the source rating shown in the interface. `weighted_rating` uses a Bayesian adjustment based on rating and review count; it feeds `rating_norm` and recommendation ranking but is not presented as the restaurant's public star rating.

The builder also writes [`data/quality-report.json`](data/quality-report.json), including:

- source path, checksum, and Excel modification date;
- restaurant and cuisine counts;
- missing optional-field warnings;
- duplicate-name warnings;
- validation status and errors.

The modification date is read from the canonical Excel file and displayed automatically in the application after each data rebuild.

## Data workflow

```text
Canonical Excel/CSV
        ↓
Python cleaning and validation
        ↓
Derived ranking fields
        ↓
restaurants.json + quality-report.json
        ↓
GitHub Actions verification
        ↓
Vercel deployment
```

Validation rejects missing required fields, invalid Bangkok-region coordinates, ratings outside 0–5, invalid review counts or price ranges, and duplicate Google Maps URLs.

## Project structure

```text
EatBKK/
├── api/
│   ├── config.js                 # Returns the public map ID
│   └── maps.js                   # Injects the restricted Maps browser key
├── data/
│   ├── bangkok_food_combined_ready.xlsx
│   └── quality-report.json
├── scripts/
│   ├── build_data.py             # Canonical build and validation pipeline
│   ├── clean_google_maps_dataset.py
│   └── generate_restaurants_json.py
├── tests/
│   ├── app.smoke.spec.js         # Mobile browser smoke test
│   └── test_build_data.py        # Data pipeline unit tests
├── .github/workflows/data-pipeline.yml
├── app.js
├── index.html
├── playwright.config.js
├── restaurants.json
└── styles.css
```

## Local development

Requirements:

- Node.js 18 or newer
- Python 3.12 recommended

Install dependencies and verify the repository:

```bash
npm install
python3 -m pip install -r requirements.txt
npm run build-data
npm run check-data
npm test
npx playwright install chromium
npm run test:smoke
```

For a static interface preview:

```bash
npm run serve
```

Then open [http://localhost:8000](http://localhost:8000). Restaurant data, recommendations, filters, and cards work through the static server. The full Google Maps integration uses Vercel serverless routes, so run the project with Vercel development tooling and local environment variables when testing the map itself.

## Google Maps and Vercel configuration

The Google Maps browser key is not committed to the current source tree. Vercel reads:

- `GOOGLE_MAPS_KEY`
- `GOOGLE_MAPS_MAP_ID`

The key is delivered to the browser through `/api/maps`. Browser map keys are visible to users by design, so security depends on Google Cloud restrictions:

1. Restrict the key to **Websites (HTTP referrers)**.
2. Allow only the production, required preview, and explicit localhost origins.
3. Restrict the key to **Maps JavaScript API**.
4. Keep billing budgets, alerts, and daily API quotas configured in Google Cloud.
5. Never commit `.env` or `.env.local`; use [`.env.example`](.env.example) as the template.

Vercel deploys the `main` branch through the repository's Git integration.

## Continuous integration

Every pull request and every push to `main` now runs:

1. JavaScript syntax checks for the frontend and serverless API routes.
2. Python data cleaning and validation.
3. Data pipeline unit tests.
4. Generated-file consistency checks on pull requests.
5. A Playwright mobile browser smoke test covering restaurant loading, source date, correction link, and displayed rating.

The verification job has read-only repository access. A separate write-enabled job runs only after a successful push to `main` and commits regenerated data files when the canonical source has changed.

## Updating restaurant data

1. Edit or replace `data/bangkok_food_combined_ready.xlsx`, keeping the required column names.
2. Save the workbook so its document modification date reflects the update.
3. Run `npm run build-data` locally and review `data/quality-report.json`.
4. Run `npm test` and `npm run test:smoke`.
5. Commit the source and generated files. GitHub Actions validates them again before deployment.

Required source columns:

- `name`
- `lat`
- `lon`
- `rating`
- `review_count`
- `primary_cuisine`
- `price_level`
- `url`

Optional source columns include `cuisine_subtype`, `address`, `image_url`, `city`, and `country`.

## Current limitations and next improvements

- Restaurant data remains a curated snapshot rather than a live Google Places feed.
- Opening hours and real-time open/closed status are not yet available.
- A dedicated keyboard and screen-reader audit is still recommended.
- The current Google Maps quota is suitable for a controlled public beta; a larger launch should review traffic and quota capacity first.

## License

This repository is currently published for research and portfolio purposes. No open-source reuse license has been granted yet.
