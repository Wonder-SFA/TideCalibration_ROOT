---
status: accepted
---

# Local-first SPA with cached /api/tide serverless proxy

We store each user's spots, full-resolution shore photos, and observations privately in browser IndexedDB (with JSON and Markdown export/import), and pair the static SPA with a stateless, HTTP-cached `/api/tide` serverless function (supporting Cloudflare Pages, Vercel, Netlify free tiers, and local Vite dev middleware) for live Tide-Forecast fetching, plus an optional user-configured Custom Proxy URL in Settings. This avoids running or maintaining a dedicated backend server while still allowing live chart imports out of the box.

## Considered Options

- **Self-hosted Node server**: Gives full control over storage and scraping, but requires ongoing server hosting and maintenance.
- **Pure static manual-only SPA**: Zero backend required, but forces every user to copy-paste tide tables manually.
- **Cloud multi-user database & auth**: Enables shared community spots across devices, but introduces backend operational overhead, auth complexity, and photo storage costs.

## Consequences

- Zero-cost static/serverless hosting with no persistent server or database to maintain.
- User photos and calibration logs remain private in the browser; switching devices relies on JSON export/import.
- Any optional third-party AI or API integrations (such as Gemini Vision assist) follow a client-side Bring-Your-Own-Key (BYOK) pattern stored locally in browser settings.
