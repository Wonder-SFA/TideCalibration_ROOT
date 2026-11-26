# Tide Calibration

Empirical calibration of public tide predictions against real-world coastal observations using timestamped shore photos and fixed landmarks.

## Language

**Spot**:
A specific coastal vantage point whose local tide behavior is being calibrated.
_Avoid_: Site, shore, location

**Baseline Station**:
The single fixed public tide station whose predicted tide curve serves as the reference for a **Spot**.
_Avoid_: Baseline chart, reference curve

**Turning Point**:
A predicted High or Low tide extremum published for a **Baseline Station**.
_Avoid_: Tide event, extremum, peak

**Landmark**:
A fixed physical shoreline feature at a **Spot** whose exposure state (`exposed`, `waterline`, or `submerged`) indicates real-world water level.
_Avoid_: Reference point, marker

**Observation**:
A timestamped field record at a **Spot** capturing shore photos, observed **Landmark** states, and estimated tide stage and water level.
_Avoid_: Entry, log, reading

**Phase Offset**:
The empirical time difference between a **Baseline Station**'s predicted tide and actual water level at a **Spot**.
_Avoid_: Lag, shift, inversion

**Capture Bracket**:
A short sequence of **Observations** taken before, at, and after a predicted **Turning Point** to pinpoint when the local tide actually turns.
_Avoid_: Window, schedule

**Reference Anchor**:
A prior labeled **Observation** at a **Spot** used alongside a new photo to judge waterline change and tide direction.
_Avoid_: Baseline photo, comparison shot
