# Tide Calibration Research Findings: San Isidro, Northern Samar

**Document Scope:** Synthesis of primary local observations (`tide_log.md`, timestamped shore photography, EXIF metadata) and primary hydrographic/oceanographic sources for calibrating online tide charts against actual shoreline water levels in **San Isidro, Northern Samar**.

---

## 1. Executive Summary & Current Calibration Hypothesis

Publicly available tide tables (including NAMRIA, Tideschart, and Tide-Forecast) exhibit a major phase discrepancy relative to observed shoreline water levels in San Isidro, Northern Samar (`12.388° N, 124.331° E`) [`tide_log.md`]. Rather than switching between multiple coastal stations, the project locks onto a single fixed reference curve—**Tide-Forecast: Allen, Northern Samar** (`12.50° N, 124.28° E`)—to measure the empirical time and height offset directly from shore photos [`tide_log.md`].

### Current Calibration Hypothesis
- **Initial observation (Entry #1, 06:47 AM):** At `06:47 AM` on Thursday, November 26, 2026—just 3 minutes before the Allen baseline chart's predicted **High Tide at 6:50 AM**—the San Isidro shoreline was visibly at or near **Low Tide**, initially suggesting a ~5.5–6.0 hour phase inversion [`tide_log.md`].
- **Follow-up observation (Entry #2, 08:31 AM):** At `08:31 AM` (1 hr 41 min after Allen's 6:50 AM High Tide, ~31% into the predicted ebb toward Allen's `12:19 PM` Low Tide), the water level in San Isidro had **dropped further or bottomed out** compared to `06:47 AM`, exposing a wide band of dry coral/gravel flat in front of the seawall and grounding moored outrigger boats [`tide_log.md`, `20261126_083107.jpg`].
- **Midday high-water observations (Entries #3 & #4, 12:35 PM & 1:01 PM):** At `12:35 PM` (16 min past Allen's `12:19 PM` Low Tide) and `1:01 PM` (42 min past Allen's `12:19 PM` Low Tide), San Isidro was visibly **high / near Slack High**: the seawall coral/gravel flat and rocky reef flat were completely submerged, *DAHJAY* and adjacent outriggers were floating cleanly, and the distant reef bar was reduced to a thin hairline crest awash at the surface [`tide_log.md`, `20261126_123517.jpg`, `20261126_130109.jpg`].
- **Refined Phase Offset Estimate:** True Low Tide in San Isidro on November 26, 2026 occurred around **~8:00–8:30 AM**, and water rose to near **High Tide by ~12:35–1:01 PM** (placing local Slack High around **~1:00–2:30 PM**). Relative to the Allen baseline chart, this confirms a full **~5.5–7.5 hour phase inversion**—either:
  - A **~6.2–7.7 hour lag** behind Allen's `6:50 AM` High Tide (consistent with the **~7.5–8 hour lag** behind Allen's `12:17 AM` Low Tide), **or**
  - A **~3.8–5.3 hour lead** ahead of Allen's `6:16 PM` High Tide (consistent with the **~4–4.5 hour lead** ahead of Allen's `12:19 PM` Low Tide) [`tide_log.md`, Tide-Forecast Allen].
  *(Capturing a **2:00–3:30 PM** bracket as the tide turns to ebb will pinpoint Slack High and narrow the ±12-hour cycle ambiguity.)*

---

## 2. Site Coordinates & Baseline Chart Reference

| Parameter | Value / Details | Source |
| :--- | :--- | :--- |
| **Observation Site** | San Isidro, Northern Samar (`12.388° N, 124.331° E`), facing the northern Samar Sea | [`tide_log.md`](../../tide_log.md) |
| **Active Baseline Chart** | **Tide-Forecast — Allen, Northern Samar** (`12.50° N, 124.28° E`), ~14–16 km straight-line north-northwest of San Isidro | [`tide_log.md`](../../tide_log.md); [Tide-Forecast Allen](https://www.tide-forecast.com/locations/Allen-2/tides/latest) |
| **Previous Baseline (Entry #1)** | **Tideschart — San Jose, Northern Samar** (~`12.53° N, 124.51° E`; predicted ~1.13 m High Tide at 6:50 AM on Nov 26, 2026) | [`tide_log.md`](../../tide_log.md); [Tideschart San Jose](https://www.tideschart.com/Philippines/Eastern-Visayas/Province-of-Northern-Samar/San-Jose/) |
| **Baseline Turning Points (Nov 26, 2026 — Allen)** | **Low:** `00:17 AM` • **High:** `6:50 AM` • **Low:** `12:19 PM` • **High:** `6:16 PM` (Sunrise `5:45 AM`, Sunset `5:14 PM`) | [Tide-Forecast Allen](https://www.tide-forecast.com/locations/Allen-2/tides/latest); [`tide_log.md`](../../tide_log.md) |
| **Webapp Integration** | `webapp` fetches `tide-forecast.com` High/Low turning points via `/api/tide` (with manual fallback for NAMRIA/Tideschart/CSV) and solves empirical phase offsets and ±6h inversion ambiguity | [`webapp/README.md`](../../webapp/README.md) |

---

## 3. Oceanographic Context (San Bernardino Strait / Samar Sea Phase Offset)

The discrepancy between Allen (at the northwestern tip of Northern Samar, directly bordering the **San Bernardino Strait**) and San Isidro (further south along the **Samar Sea** coast) is consistent with established Philippine archipelago hydrography:

1. **Predominantly Semidiurnal Regime with Prominent Diurnal Inequality:**
   Official hydrographic assessments (NAMRIA) and ocean energy/tidal studies (PNNL/NOAA) classify the San Bernardino Strait and Samar Sea tidal regime as predominantly semidiurnal (two highs and two lows per lunar day) with a **prominent diurnal inequality**, meaning successive high and low tides differ substantially in both height and time interval depending on lunar declination [NOAA; PNNL; NAMRIA].
2. **Hydraulic Constriction & Phase Lag Across the Strait Sill:**
   The **San Bernardino Strait** is a narrow, shallow sill passage connecting the open **Philippine Sea** (western Pacific Ocean) to the interior **Samar Sea** basin [Gordon et al., 2011; Jones et al., 2011]. Because of the sill between Luzon and Capul Island—and surrounding island channels (Capul Pass, Dalupiri Pass, Naranjo Islands)—the tidal wave does not propagate instantaneously into the Samar Sea. Instead, intense tidal currents (2–3 m/s in PhilEx ADCP measurements, and up to 4–8 knots / ~4.5 m/s in narrow passes) and bathymetric friction create a marked **phase lag** and localized amplitude/timing shifts between the Pacific/strait entrance (Allen) and interior Samar Sea coastlines (San Isidro) [NGA Pub. 162; Jones et al., 2011; Gordon et al., 2011].
3. **Net Landward Flux & Mixing:**
   Shipboard ADCP and towed profiling observations from the Philippine Straits Dynamics Experiment (PhilEx) documented vigorous vertical (diapycnal) mixing over the sill during flood tide and a net landward transport from the Pacific into the interior Samar Sea [Jones et al., 2011]. Consequently, open-coast co-tidal approximations or Pacific-facing reference stations (like Allen or San Jose) systematically mispredict turning-point timing inside the Samar Sea unless local harmonic constants or empirical offsets are applied [NAMRIA].

---

## 4. Fixed Shore Reference Landmarks

To ensure consistent waterline comparison across all photo entries, three fixed landmarks are tracked at the San Isidro shore site [`tide_log.md`]:

1. **Landmark 1 — Concrete Seawall & Moored Outrigger Boats (Foreground):**
   Tracks the vertical height of the waterline against the stone/concrete seawall base and whether the moored outrigger boats (including *DAHJAY* and the adjacent outrigger) are floating freely or grounded on the coral/gravel flat.
2. **Landmark 2 — Rocky Reef Flat (Midground, Directly Past Seawall):**
   Tracks the horizontal and vertical exposure of dark rocky coral heads and green seagrass beds extending seaward from the seawall toward the red channel buoy.
3. **Landmark 3 — Long Exposed Reef Bar / Shoal (Background, Past Foreground Coconut Tree):**
   Tracks the exposure width and continuity of the offshore reef bar/shoal visible past the single foreground coconut tree, as well as the adjacent right-hand shoreline flat.

---

## 5. Empirical Photo & EXIF Analysis (Nov 26, 2026)

### 5.1 EXIF & Timestamp Verification

All fourteen local shore photos were inspected directly and verified with macOS `sips` (`creation`, `pixelWidth`, `pixelHeight`):

| Entry | Filename | EXIF `creation` | Dimensions | Logged Time Note |
| :--- | :--- | :--- | :--- | :--- |
| **#1** | `photos/entry_01_2026-11-26_0647/20261126_064707.jpg` | `2026:11:26 06:47:07` | `4000 × 3000` | EXIF `06:47:07` (early handoff note listed `6:57 AM`; EXIF is authoritative) |
| **#1** | `photos/entry_01_2026-11-26_0647/20261126_064720.jpg` | `2026:11:26 06:47:20` | `4000 × 3000` | Telephoto/zoomed view of Landmark 3 (coconut tree & reef bar) |
| **#2** | `photos/entry_02_2026-11-26_0831/20261126_083056.jpg` | `2026:11:26 08:30:56` | `4000 × 3000` | Wide shot matching `20261126_064707.jpg` framing |
| **#2** | `photos/entry_02_2026-11-26_0831/20261126_083107.jpg` | `2026:11:26 08:31:07` | `4000 × 3000` | Zoomed view of Landmark 1 & 2 (seawall, *DAHJAY*, reef flat) |
| **#2** | `photos/entry_02_2026-11-26_0831/20261126_083113.jpg` | `2026:11:26 08:31:13` | `4000 × 3000` | Zoomed view of Landmark 3 (coconut tree & reef bar) |
| **#3** | `photos/entry_03_2026-11-26_1235/20261126_123503.jpg` | `2026:11:26 12:35:03` | `4000 × 3000` | Wide shot matching `064707` / `083056` framing (rotated EXIF orientation) |
| **#3** | `photos/entry_03_2026-11-26_1235/20261126_123509.jpg` | `2026:11:26 12:35:09` | `4000 × 3000` | Zoomed view of Landmark 1 & 2 (seawall, floating outriggers, submerged reef flat) |
| **#3** | `photos/entry_03_2026-11-26_1235/20261126_123517.jpg` | `2026:11:26 12:35:17` | `4000 × 3000` | Upright zoomed view of Landmark 3 (coconut tree, thin reef bar crest, right resort seawall) |
| **#3** | `photos/entry_03_2026-11-26_1235/20261126_123523.jpg` | `2026:11:26 12:35:23` | `4000 × 3000` | Wide view including *DAHJAY* canopy, coconut tree, and right-hand resort seawall |
| **#3** | `photos/entry_03_2026-11-26_1235/20261126_123526.jpg` | `2026:11:26 12:35:25` | `4000 × 3000` | Open-water / reef-bar horizon view past the coconut tree |
| **#4** | `photos/entry_04_2026-11-26_1301/20261126_130102.jpg` | `2026:11:26 13:01:02` | `4000 × 3000` | Zoomed view of Landmark 1 & 2 (left outrigger floating against seawall, submerged reef flat) |
| **#4** | `photos/entry_04_2026-11-26_1301/20261126_130105.jpg` | `2026:11:26 13:01:05` | `4000 × 3000` | Zoomed view of Landmark 1 & 2 (*DAHJAY* floating high at seawall, submerged reef flat) |
| **#4** | `photos/entry_04_2026-11-26_1301/20261126_130109.jpg` | `2026:11:26 13:01:09` | `4000 × 3000` | Zoomed view of Landmark 3 (coconut tree, hairline reef bar crest awash, right resort seawall) |
| **#4** | `photos/entry_04_2026-11-26_1301/20261126_130114.jpg` | `2026:11:26 13:01:13` | `4000 × 3000` | Zoomed view of right-hand shoreline & resort seawall (dry flat completely submerged) |

### 5.2 Landmark-by-Landmark Comparison: Entries #1–#4 (06:47 AM to 1:01 PM)

| Landmark | Entry #1 (`06:47 AM`) | Entry #2 (`08:31 AM`) | Entry #3 (`12:35 PM`) | Entry #4 (`1:01 PM`) | Observed Progression |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **1. Concrete Seawall & Moored Boats** | Water sits very low at the base of the concrete seawall; moored outrigger boats rest near the shallow flat [`20261126_064707.jpg`]. | **Wide band of dry coral/gravel flat** exposed in front of the seawall; *DAHJAY* and adjacent outrigger **visibly grounded** [`20261126_083107.jpg`]. | Coral/gravel flat **completely submerged**; water sits high on the seawall and both *DAHJAY* and the adjacent outrigger are **floating cleanly** [`20261126_123509.jpg`, `20261126_123523.jpg`]. | Water remains **high against the seawall**; *DAHJAY* and adjacent outrigger continue **floating freely** [`20261126_130102.jpg`, `20261126_130105.jpg`]. | Dropped to Slack Low around `08:31 AM`, then flooded strongly to high water by `12:35 PM` and held/rose slightly through `1:01 PM`. |
| **2. Rocky Reef Flat** | Heavily exposed directly past the seawall, with numerous dark rock/coral patches breaking the surface [`20261126_064707.jpg`]. | Rocky reef flat and **green seagrass beds even more exposed** than at `06:47 AM` [`20261126_083107.jpg`]. | **Completely submerged**; no exposed rock/coral heads or seagrass patches visible [`20261126_123503.jpg`, `20261126_123509.jpg`]. | **Completely submerged** under choppy/rippled water [`20261126_130102.jpg`, `20261126_130105.jpg`]. | Transitioned from maximum low-tide exposure at `08:31 AM` to 100% submergence by `12:35 PM`–`1:01 PM`. |
| **3. Long Reef Bar / Shoal (Coconut Tree)** | Long reef bar/shoal **fully exposed** past the coconut tree; small outrigger in right channel [`20261126_064720.jpg`]. | Long reef bar/shoal **fully exposed**, with **slightly wider exposure** along the right-hand shoreline flat [`20261126_083113.jpg`]. | **Almost completely submerged**, leaving only a **thin broken dark crest** breaking the surface; right-hand resort seawall flat submerged [`20261126_123517.jpg`]. | **Thin dark hairline crest awash** at the surface (slightly more submerged/awash than at `12:35 PM`), with water right up against the right-hand resort seawall base [`20261126_130109.jpg`, `20261126_130114.jpg`]. | 26-minute delta (`12:35` → `1:01 PM`) shows water holding high or still creeping upward near Slack High. |

### 5.3 Phase Offset Analysis

- **Allen Baseline Comparison:**
  - At `06:47 AM`, Allen was 3 min before High Tide (`6:50 AM`).
  - At `08:31 AM`, Allen was 1 hr 41 min into its falling tide (~31% into the ebb toward `12:19 PM` Low).
  - At `12:35 PM`, Allen was 16 min past Low Tide (`12:19 PM`, `0.65 m`, ~4% into the flood toward `6:16 PM` High).
  - At `1:01 PM`, Allen was 42 min past Low Tide (`12:19 PM`, ~12% into the flood toward `6:16 PM` High).
- **San Isidro Reality:**
  - San Isidro water levels **fell** between `06:47 AM` and `08:31 AM` (local Low Tide ~**8:00–8:30 AM**), then **rose** to submerge the seawall flat, rocky reef flat, and nearly the entire distant reef bar by `12:35 PM`, holding high / cresting at `1:01 PM`.
  - Because the distant reef bar was still a thin hairline awash at `1:01 PM` (and the 26-minute delta from `12:35 PM` to `1:01 PM` showed steady/slightly higher water), local **Slack High** is bracketed around **~1:00–2:30 PM**.
- **Implied Offset:**
  - San Isidro is operating roughly **~5.5–7.5 hours out of phase** with Allen: when Allen is at High Tide (`6:50 AM`), San Isidro is near Low Tide (`6:47 AM`), and when Allen is at Low Tide (`12:19 PM`), San Isidro is at/near High Tide (`12:35–1:01 PM`).
  - Relative to Allen's `6:50 AM` High Tide, a San Isidro High Tide around **~1:00–2:30 PM** corresponds to a **~6.2–7.7 hour lag** (matching the **~7.5–8 hour lag** behind Allen's `12:17 AM` Low Tide and the physical propagation delay through the San Bernardino Strait sill into the Samar Sea). Alternatively, relative to Allen's `6:16 PM` High Tide, it corresponds to a **~3.8–5.3 hour lead**.

---

## 6. Open Questions & Next Calibration Windows

1. **Pinpoint Slack High & Ebb Onset (Immediate Next Window):**
   The `12:35 PM` → `1:01 PM` pair confirmed High Tide / near-Slack High, but has not yet captured the ebb turn. Capturing photos around **2:00–2:30 PM** and **3:30–4:00 PM** today will show when the distant reef bar (Landmark 3) re-emerges and pinpoint exact Slack High.
2. **Resolve the Lag vs. Lead Ambiguity (±12h / Diurnal Inequality):**
   Comparing the afternoon High Tide (~1:00–2:30 PM) and evening/next-morning turning points across multiple days (e.g., tracking how San Isidro shifts as Allen's turning points advance ~45–50 min/day) will definitively separate a **~6.5–7.7 hr lag** from a **~4–5 hr lead**.
3. **Landmark Height Thresholds:**
   Establish rough vertical benchmarks on Landmark 1 (e.g., seawall stone courses, *DAHJAY* floating/grounding threshold) and Landmark 3 (reef bar crest submergence) so future photos can calibrate **height/amplitude** as well as **phase/time**.

---

## 7. Sources & References

### Primary Local Files & Photo Archives
- **Project Log:** [`tide_log.md`](../../tide_log.md) — Site coordinates (`12.388° N, 124.331° E`), baseline chart selection, fixed landmarks, and Entries #1–#2.
- **Webapp Documentation:** [`webapp/README.md`](../../webapp/README.md) — `/api/tide` proxy behavior and empirical calibration solver overview.
- **Entry #1 Photos (06:47 AM EXIF):**
  - [`photos/entry_01_2026-11-26_0647/20261126_064707.jpg`](../../photos/entry_01_2026-11-26_0647/20261126_064707.jpg) (`2026:11:26 06:47:07`, `4000×3000`)
  - [`photos/entry_01_2026-11-26_0647/20261126_064720.jpg`](../../photos/entry_01_2026-11-26_0647/20261126_064720.jpg) (`2026:11:26 06:47:20`, `4000×3000`)
  - [Google Drive Folder — Entry #1](https://drive.google.com/drive/folders/1YjSrHpOPz0goHlgBEKlEwSxZ-nvvOQcH)
- **Entry #2 Photos (08:31 AM EXIF):**
  - [`photos/entry_02_2026-11-26_0831/20261126_083056.jpg`](../../photos/entry_02_2026-11-26_0831/20261126_083056.jpg) (`2026:11:26 08:30:56`, `4000×3000`)
  - [`photos/entry_02_2026-11-26_0831/20261126_083107.jpg`](../../photos/entry_02_2026-11-26_0831/20261126_083107.jpg) (`2026:11:26 08:31:07`, `4000×3000`)
  - [`photos/entry_02_2026-11-26_0831/20261126_083113.jpg`](../../photos/entry_02_2026-11-26_0831/20261126_083113.jpg) (`2026:11:26 08:31:13`, `4000×3000`)
  - [Google Drive Folder — Entry #2](https://drive.google.com/drive/folders/1EVdVplSLpV-NYWqiIYinWQT3GfkpgkG3)
- **Entry #3 Photos (12:35 PM EXIF):**
  - [`photos/entry_03_2026-11-26_1235/20261126_123503.jpg`](../../photos/entry_03_2026-11-26_1235/20261126_123503.jpg) (`2026:11:26 12:35:03`, `4000×3000`)
  - [`photos/entry_03_2026-11-26_1235/20261126_123509.jpg`](../../photos/entry_03_2026-11-26_1235/20261126_123509.jpg) (`2026:11:26 12:35:09`, `4000×3000`)
  - [`photos/entry_03_2026-11-26_1235/20261126_123517.jpg`](../../photos/entry_03_2026-11-26_1235/20261126_123517.jpg) (`2026:11:26 12:35:17`, `4000×3000`)
  - [`photos/entry_03_2026-11-26_1235/20261126_123523.jpg`](../../photos/entry_03_2026-11-26_1235/20261126_123523.jpg) (`2026:11:26 12:35:23`, `4000×3000`)
  - [`photos/entry_03_2026-11-26_1235/20261126_123526.jpg`](../../photos/entry_03_2026-11-26_1235/20261126_123526.jpg) (`2026:11:26 12:35:25`, `4000×3000`)
  - [Google Drive Folder — Entry #3](https://drive.google.com/drive/folders/1d6dFKze-FsHaTAkXjmIVW7KqaEde5Ghj)
- **Entry #4 Photos (1:01 PM EXIF):**
  - [`photos/entry_04_2026-11-26_1301/20261126_130102.jpg`](../../photos/entry_04_2026-11-26_1301/20261126_130102.jpg) (`2026:11:26 13:01:02`, `4000×3000`)
  - [`photos/entry_04_2026-11-26_1301/20261126_130105.jpg`](../../photos/entry_04_2026-11-26_1301/20261126_130105.jpg) (`2026:11:26 13:01:05`, `4000×3000`)
  - [`photos/entry_04_2026-11-26_1301/20261126_130109.jpg`](../../photos/entry_04_2026-11-26_1301/20261126_130109.jpg) (`2026:11:26 13:01:09`, `4000×3000`)
  - [`photos/entry_04_2026-11-26_1301/20261126_130114.jpg`](../../photos/entry_04_2026-11-26_1301/20261126_130114.jpg) (`2026:11:26 13:01:13`, `4000×3000`)
  - [Google Drive Folder — Entry #4](https://drive.google.com/drive/folders/1wNu2CeeSzs6uv7qKLSuxT2XRYTBkYRAr)

### External Tide Charts & Hydrographic / Oceanographic Primary Sources
- **Tide-Forecast (Active Baseline — Allen, Northern Samar):** <https://www.tide-forecast.com/locations/Allen-2/tides/latest> (`12.50° N, 124.28° E`; Nov 26, 2026 turning points: `00:17 AM` Low, `6:50 AM` High, `12:19 PM` Low, `6:16 PM` High).
- **Tideschart (Previous Baseline — San Jose, Northern Samar):** <https://www.tideschart.com/Philippines/Eastern-Visayas/Province-of-Northern-Samar/San-Jose/> (`~12.53° N, 124.51° E`).
- **NAMRIA (National Mapping and Resource Information Authority — Hydrography Branch):** Official Philippine Tide and Current Tables & *PH Tides* platform (<https://www.namria.gov.ph/>).
- **NGA Pub. 162:** *Sailing Directions (Enroute): Philippine Islands* — Navigational documentation of tidal currents, rips, eddies, and phase behavior through San Bernardino Strait, Capul Pass, and Dalupiri Pass into the Samar Sea.
- **Gordon, A. L., Sprintall, J., & Ffield, A. (2011).** *Regional oceanography of the Philippine Archipelago.* *Oceanography*, 24(1), 14–27. The Oceanography Society (<https://tos.org/>).
- **Jones, B. H., Lee, C. M., Toro-Farmer, G., Boss, E. S., Gregg, M. C., & Villanoy, C. L. (2011).** *Tidally driven exchange in an archipelago strait: Biological and optical responses.* *Oceanography*, 24(1), 142–155. The Oceanography Society (<https://tos.org/>).
- **NOAA / PNNL:** Tidal regime definitions (semidiurnal with diurnal inequality) and San Bernardino Strait tidal stream characterization.
