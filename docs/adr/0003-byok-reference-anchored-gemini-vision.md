---
status: accepted
---

# BYOK reference-anchored Gemini Vision assist

Provide optional shoreline photo scoring via client-side Bring-Your-Own-Key (BYOK) Gemini Vision called directly from the browser. When invoked, the app sends the new photo together with the Spot's **2 most recent labeled photos** (client-side downscaled to ~1024px JPEG, along with their timestamps and labeled states) plus the Spot's Landmark descriptions, then pre-fills the Quick Log form (**Suggest & Confirm**) for 1-tap user review before saving. The Gemini API key is stored locally in browser IndexedDB (with a Clear Key button in Settings) and omitted from JSON exports by default, with an optional opt-in checkbox to include it.

## Considered Options

- **Lowest + Highest labeled anchor photos**: Better for absolute water-level range, but weaker for judging rising vs. falling direction during turning-point brackets and less consistent on same-day lighting, weather, and camera angle than the 2 most recent shots.
- **Single-photo zero-shot analysis**: Lower token cost, but lacks visual reference for subtle waterline shifts at a specific shoreline.
- **Hosted serverless Gemini proxy**: Avoids BYOK setup, but requires server-side API key management, quotas, and rate limiting.
- **Auto-save without confirmation**: Faster, but risks polluting the calibration solver with misread landmark states.

## Consequences

- Vision assist stays zero-cost to host and respects the local-first SPA architecture.
- Sequential reference anchors improve rising/falling detection during turning-point brackets.
- Users must supply their own Gemini API key in Settings to enable AI-assisted pre-fill, while manual EXIF + 2-tap landmark tagging continues to work without a key.
