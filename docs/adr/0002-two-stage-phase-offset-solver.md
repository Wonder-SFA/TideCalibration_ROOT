---
status: accepted
---

# Two-stage phase offset solver (±6h timing lock, then ±12h wave lock)

The calibration solver uses a two-stage phase offset search rather than a single fixed window. In **Stage 1** (1–3 observations, or observations covering only one half of the daily cycle), the search is restricted to `±6h` (`-360..+360` minutes) so the solver accurately locks in the timing of the two daily highs and lows without flip-flopping by 12 hours on minor rating tweaks, while prompting the user to log a photo from the opposite daily tide cycle. **Stage 2** automatically unlocks `±12h` (`-720..+720` minutes) once a Spot has **4 or more observations**, **observations separated by at least 6 hours in time-of-day** (spanning both halves of the daily cycle), and at least a **30% observed water-level spread**—allowing landmarks to distinguish the taller vs. smaller daily peak/low and lock onto the true physical wave.

## Considered Options

- **Fixed `±6h` window only**: Prevents 12-hour jumps, but forces a true `+7.5–8h` lag to wrap as a `-4–4.5h` lead and cannot match diurnal inequality between morning and afternoon tides.
- **Fixed `±12h` window from the first observation**: Captures diurnal inequality immediately in theory, but causes early sparse fits to jump unpredictably by ±12h on small water-level rating changes.

## Consequences

- Early calibration UX stays stable and predictable while timing is being bracketed.
- Once opposite-cycle observations are logged, the solver resolves both turning-point timing and diurnal inequality without manual switching.
