# ResQMap AI — From Early Warning to Trusted Action

ResQMap AI is an IGAD Hackathon 2026 prototype for turning hazard intelligence into clear, multilingual, safety-checked action for East African communities.

Public website: https://resqmap-live-site.vercel.app

## What It Demonstrates

- Live hazard intelligence for IGAD and East African communities.
- Globally extensible map architecture with search and geolocation.
- Connected source status for USGS earthquakes, GDACS alerts and a weather-risk model.
- Clear data labels: `LIVE`, `MODEL-DERIVED`, `SIMULATED` and `COMMUNITY-REPORTED`.
- Citizen alert view with English, Kiswahili and Somali guidance plus browser voice playback.
- ResQGuard translation validation that blocks dangerous changes before delivery.
- Community report and authority verification flow.
- IndexedDB offline prototype for the last verified warning and queued reports.

## Data Sources

| Source | Status in prototype | Classification | Use |
| --- | --- | --- | --- |
| USGS Earthquakes | Connected | LIVE | Recent earthquake events |
| GDACS Alerts | Connected | LIVE | Flood and drought alert feed |
| Open-Meteo | Connected | MODEL-DERIVED | Soil-moisture and rainfall risk signals |
| ResQMap scenario data | Local | SIMULATED | Lower Shabelle judge demonstration and shelter data |

External API calls use request timeouts so one slow feed does not freeze the full hazard response. The client also refreshes source data automatically every five minutes and supports manual retry.

## ResQGuard Evaluation

The executable evaluation fixture contains 72 manually reviewed alert cases:

- 24 safe messages
- 48 unsafe mutations
- 3 languages: English, Kiswahili and Somali
- 8 unsafe categories: changed numbers, changed units, missing instructions, wrong severity, wrong location, dangerous wording, incomplete translation and wrong hazard
- Expected result recorded for every case

Current measured result from `node --test tests/resqguard-evaluation.test.mjs`:

- Unsafe messages detected: 48/48
- Safe messages approved: 22/24
- Number and unit decisions correct: 69/72
- Severity decisions correct: 72/72

The CSV fixture is available at `public/resqguard-evaluation-cases.csv`.

## Prototype Limitations

This is not a certified government warning system. The Lower Shabelle flood card is intentionally labelled as a simulated scenario. The community report and authority dashboard demonstrate the verification journey inside one browser session; they are not a production multi-user backend. Offline behavior stores one verified warning and queued report records in browser IndexedDB for prototype evidence.

## Run Locally

```bash
npm install
npm run dev
```

## Verify

```bash
node --test tests/resqguard-evaluation.test.mjs
npm run vercel-build
```

## Submission Package

Supporting judge materials are in `submission/`:

- `FIVE_MINUTE_DEMO.md`
- `ARCHITECTURE_AND_DATA.md`
- `RESQGUARD_METHODOLOGY.md`
- `WORKFLOW_TEST_REPORT.md`
- `SCREENSHOT_CHECKLIST.md`
- `SUBMISSION_PACKAGE.md`
