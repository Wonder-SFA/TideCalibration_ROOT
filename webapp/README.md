# Tide Calibration Webapp

A local-first, privacy-preserving web application for calibrating public tide charts against real-world shoreline observations using timestamped shore photos and fixed landmarks.

## Features
- **Local-First Storage (IndexedDB):** All spots, shore photos, EXIF metadata, and observations stay in your browser.
- **Full Backup & Export:** Export/import everything as JSON (with or without photos) or export a Markdown log compatible with `tide_log.md`.
- **Live `/api/tide` Proxy:** Fetches and parses `tide-forecast.com` High/Low turning points with HTTP caching, plus a **Quick Paste / Manual Table** fallback for NAMRIA, Tideschart, or CSV data.
- **Custom Proxy Support:** Configure your own `/api/tide` proxy URL in Settings if desired.
- **Empirical Calibration Solver:** Automatically computes the phase/time offset, detects ±6h inversion ambiguity, maps landmark exposure thresholds, and plans the next optimal turning-point bracket captures.

## Local Development

```bash
npm install
npm run dev
```

The Vite dev server automatically serves `/api/tide?url=...` locally.

## Deploy Your Own Free Instance

### Cloudflare Pages
1. Connect this repository (`webapp` as root directory).
2. Build command: `npm run build`
3. Output directory: `dist`
4. `functions/api/tide.ts` is automatically deployed as `/api/tide`.

### Vercel
1. Import this repository (`webapp` as root directory).
2. Framework preset: **Vite** (`npm run build`, output `dist`).
3. `api/tide.ts` is automatically deployed as `/api/tide`.

### Netlify
1. Connect this repository (`webapp` as base directory).
2. `netlify.toml` configures `npm run build`, `dist`, and redirects `/api/tide` to `netlify/functions/tide.ts`.
