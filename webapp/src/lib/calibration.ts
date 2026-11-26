import type {
  CalibrationResult,
  CalibrationSpot,
  CaptureRecommendation,
  InterpolatedTide,
  LandmarkThreshold,
  Observation,
  ObservationResidual,
  TideEvent,
} from '../types';

export function formatOffsetMinutes(minutes: number): string {
  const sign = minutes >= 0 ? '+' : '-';
  const abs = Math.abs(Math.round(minutes));
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  if (h === 0) return `${sign}${m}m`;
  if (m === 0) return `${sign}${h}h`;
  return `${sign}${h}h ${m}m`;
}

export function formatWallClock(timestampMs: number): {
  localDate: string;
  localTime: string;
  displayTime: string;
} {
  const d = new Date(timestampMs);
  const y = d.getUTCFullYear();
  const mo = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  const h24 = d.getUTCHours();
  const min = String(d.getUTCMinutes()).padStart(2, '0');
  const ampm = h24 >= 12 ? 'PM' : 'AM';
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return {
    localDate: `${y}-${mo}-${day}`,
    localTime: `${String(h24).padStart(2, '0')}:${min}`,
    displayTime: `${h12}:${min} ${ampm}`,
  };
}

export function interpolateTideCurve(
  events: TideEvent[],
  timestampMs: number
): InterpolatedTide | null {
  if (events.length === 0) return null;
  const sorted = [...events].sort((a, b) => a.timestampMs - b.timestampMs);

  let minH = Infinity;
  let maxH = -Infinity;
  for (const e of sorted) {
    if (e.heightM < minH) minH = e.heightM;
    if (e.heightM > maxH) maxH = e.heightM;
  }
  const globalSpan = maxH - minH > 0.05 ? maxH - minH : 1;

  let nearestEvent = sorted[0];
  let bestDist = Math.abs(timestampMs - sorted[0].timestampMs);
  for (const e of sorted) {
    const dist = Math.abs(timestampMs - e.timestampMs);
    if (dist < bestDist) {
      bestDist = dist;
      nearestEvent = e;
    }
  }

  // Clamp if outside range
  if (timestampMs <= sorted[0].timestampMs) {
    const e = sorted[0];
    return {
      heightM: e.heightM,
      normalizedLevel: Math.max(0, Math.min(1, (e.heightM - minH) / globalSpan)),
      slope: 'slack',
      prevEvent: null,
      nextEvent: sorted[1] ?? null,
      nearestEvent,
    };
  }

  const last = sorted[sorted.length - 1];
  if (timestampMs >= last.timestampMs) {
    return {
      heightM: last.heightM,
      normalizedLevel: Math.max(0, Math.min(1, (last.heightM - minH) / globalSpan)),
      slope: 'slack',
      prevEvent: sorted[sorted.length - 2] ?? null,
      nextEvent: null,
      nearestEvent,
    };
  }

  let prevEvent = sorted[0];
  let nextEvent = sorted[1];
  for (let i = 0; i < sorted.length - 1; i++) {
    if (timestampMs >= sorted[i].timestampMs && timestampMs <= sorted[i + 1].timestampMs) {
      prevEvent = sorted[i];
      nextEvent = sorted[i + 1];
      break;
    }
  }

  const spanMs = Math.max(1, nextEvent.timestampMs - prevEvent.timestampMs);
  const progress = (timestampMs - prevEvent.timestampMs) / spanMs;
  const cosineWeight = (1 - Math.cos(Math.PI * progress)) / 2;
  const heightM = prevEvent.heightM + (nextEvent.heightM - prevEvent.heightM) * cosineWeight;
  const normalizedLevel = Math.max(0, Math.min(1, (heightM - minH) / globalSpan));

  let slope: 'rising' | 'falling' | 'slack' = 'slack';
  if (progress > 0.08 && progress < 0.92) {
    slope = nextEvent.heightM >= prevEvent.heightM ? 'rising' : 'falling';
  }

  return {
    heightM,
    normalizedLevel,
    slope,
    prevEvent,
    nextEvent,
    nearestEvent,
  };
}

function stageMatchesSlope(stage: Observation['stage'], slope: 'rising' | 'falling' | 'slack'): boolean {
  if (stage === 'rising') return slope === 'rising';
  if (stage === 'falling') return slope === 'falling';
  return true;
}

function spansBothDailyCycles(observations: Observation[]): boolean {
  if (observations.length < 2) return false;
  const minutesOfDay = observations.map((obs) => {
    const d = new Date(obs.timestampMs);
    return d.getUTCHours() * 60 + d.getUTCMinutes();
  });
  const hasMorning = minutesOfDay.some((m) => m < 720);
  const hasAfternoonEvening = minutesOfDay.some((m) => m >= 720);
  if (!hasMorning || !hasAfternoonEvening) return false;

  let maxCircularSep = 0;
  for (let i = 0; i < minutesOfDay.length; i++) {
    for (let j = i + 1; j < minutesOfDay.length; j++) {
      const diff = Math.abs(minutesOfDay[i] - minutesOfDay[j]);
      const circular = Math.min(diff, 1440 - diff);
      if (circular > maxCircularSep) maxCircularSep = circular;
    }
  }
  return maxCircularSep >= 360;
}

export function solveCalibration(
  spot: CalibrationSpot,
  observations: Observation[]
): CalibrationResult {
  const thresholds: LandmarkThreshold[] = spot.landmarks.map((lm) => {
    let exposedCount = 0;
    let waterlineCount = 0;
    let submergedCount = 0;
    let maxExposedPct: number | null = null;
    let waterlinePctSum = 0;
    let minSubmergedPct: number | null = null;

    for (const obs of observations) {
      const st = obs.landmarkStates[lm.id];
      if (st === 'exposed') {
        exposedCount++;
        maxExposedPct = maxExposedPct === null ? obs.levelPercent : Math.max(maxExposedPct, obs.levelPercent);
      } else if (st === 'waterline') {
        waterlineCount++;
        waterlinePctSum += obs.levelPercent;
      } else if (st === 'submerged') {
        submergedCount++;
        minSubmergedPct =
          minSubmergedPct === null ? obs.levelPercent : Math.min(minSubmergedPct, obs.levelPercent);
      }
    }

    return {
      landmarkId: lm.id,
      name: lm.name,
      exposedCount,
      waterlineCount,
      submergedCount,
      maxExposedPct,
      waterlinePct: waterlineCount > 0 ? Math.round(waterlinePctSum / waterlineCount) : null,
      minSubmergedPct,
    };
  });

  if (observations.length === 0 || spot.events.length < 2) {
    return {
      observationCount: observations.length,
      bestOffsetMinutes: null,
      altInversionMinutes: null,
      ambiguousInversion: false,
      confidence: 'none',
      solverStage: 'none',
      searchWindowHours: 0,
      stageNote: null,
      rmsErrorPct: null,
      perObservationResiduals: {},
      landmarkThresholds: thresholds,
      summaryFormula: 'Log at least 1 shore photo to compute an initial offset.',
    };
  }

  const isStage2 = observations.length >= 4 && spansBothDailyCycles(observations);
  const maxOffsetMin = isStage2 ? 720 : 360;
  const solverStage: CalibrationResult['solverStage'] = isStage2 ? 'stage2-12h' : 'stage1-6h';
  const searchWindowHours: CalibrationResult['searchWindowHours'] = isStage2 ? 12 : 6;
  const stageNote = isStage2
    ? 'Full ±12h diurnal calibration active — matching both turning-point timing and daily high/low inequality.'
    : 'Timing calibrated — log a photo from the opposite daily tide cycle to confirm which peak/low is larger.';

  // Grid search offsetMinutes in [-maxOffsetMin, +maxOffsetMin] in 5-min increments.
  // Convention: Local Tide at time T ≈ Baseline Chart at time (T - offsetMinutes).
  // So positive offsetMinutes means Local Tide occurs LATER than Baseline Chart.
  const scores: Array<{ offset: number; loss: number }> = [];
  for (let offset = -maxOffsetMin; offset <= maxOffsetMin; offset += 5) {
    let totalSq = 0;
    let penalty = 0;
    let validCount = 0;

    for (const obs of observations) {
      const shiftedTs = obs.timestampMs - offset * 60 * 1000;
      const interp = interpolateTideCurve(spot.events, shiftedTs);
      if (!interp) continue;
      const predPct = interp.normalizedLevel * 100;
      const diff = predPct - obs.levelPercent;
      totalSq += diff * diff;
      if (!stageMatchesSlope(obs.stage, interp.slope)) {
        penalty += 400; // Penalize rising vs falling mismatch
      }
      validCount++;
    }

    if (validCount > 0) {
      scores.push({
        offset,
        loss: totalSq / validCount + penalty / validCount,
      });
    }
  }

  if (scores.length === 0) {
    return {
      observationCount: observations.length,
      bestOffsetMinutes: null,
      altInversionMinutes: null,
      ambiguousInversion: false,
      confidence: 'none',
      solverStage: 'none',
      searchWindowHours: 0,
      stageNote: null,
      rmsErrorPct: null,
      perObservationResiduals: {},
      landmarkThresholds: thresholds,
      summaryFormula: 'Baseline events do not cover the observation timestamps.',
    };
  }

  scores.sort((a, b) => a.loss - b.loss);
  const best = scores[0];

  // Check if there is an inverted peak (e.g. +330m vs -360m when N=1 at a turning point)
  let altInversionMinutes: number | null = null;
  let ambiguousInversion = false;
  if (observations.length < 3) {
    const opposite = scores.find(
      (s) => Math.abs(s.offset - best.offset) >= 180 && s.loss <= best.loss + 60
    );
    if (opposite) {
      altInversionMinutes = opposite.offset;
      ambiguousInversion = true;
    }
  }

  const residuals: Record<string, ObservationResidual> = {};
  let sqErrSum = 0;
  let errCount = 0;
  for (const obs of observations) {
    const interp = interpolateTideCurve(spot.events, obs.timestampMs - best.offset * 60 * 1000);
    if (!interp) continue;
    const predictedPct = Math.round(interp.normalizedLevel * 100);
    const errorPct = Math.round(obs.levelPercent - predictedPct);
    residuals[obs.id] = {
      observationId: obs.id,
      predictedPct,
      observedPct: obs.levelPercent,
      errorPct,
    };
    sqErrSum += errorPct * errorPct;
    errCount++;
  }

  const rmsErrorPct = errCount > 0 ? Math.round(Math.sqrt(sqErrSum / errCount)) : null;

  let confidence: CalibrationResult['confidence'] = 'preliminary';
  if (observations.length >= 4 && !ambiguousInversion && (rmsErrorPct ?? 100) <= 18) {
    confidence = 'high';
  } else if (observations.length >= 2 && !ambiguousInversion) {
    confidence = 'moderate';
  }

  const offsetLabel = formatOffsetMinutes(best.offset);
  const summaryFormula = ambiguousInversion
    ? `${spot.name} ≈ ${spot.baselineName} ${offsetLabel} (or ${formatOffsetMinutes(
        altInversionMinutes!
      )} — ~6h inversion; add a mid-tide shot to resolve)`
    : `${spot.name} tide ≈ ${spot.baselineName} ${offsetLabel}`;

  return {
    observationCount: observations.length,
    bestOffsetMinutes: best.offset,
    altInversionMinutes,
    ambiguousInversion,
    confidence,
    solverStage,
    searchWindowHours,
    stageNote,
    rmsErrorPct,
    perObservationResiduals: residuals,
    landmarkThresholds: thresholds,
    summaryFormula,
  };
}

export function generateCapturePlan(
  spot: CalibrationSpot,
  observations: Observation[],
  nowMs: number
): CaptureRecommendation[] {
  const recs: CaptureRecommendation[] = [];
  const sortedEvents = [...spot.events].sort((a, b) => a.timestampMs - b.timestampMs);

  // Find next daytime (06:00–18:00) turning point at or after nowMs - 60m
  const nextTurn = sortedEvents.find((e) => {
    if (e.timestampMs < nowMs - 60 * 60 * 1000) return false;
    const h = new Date(e.timestampMs).getUTCHours();
    return h >= 6 && h <= 18;
  }) ?? sortedEvents[0];

  const isLoggedNear = (targetMs: number, windowMin = 35) =>
    observations.some((o) => Math.abs(o.timestampMs - targetMs) <= windowMin * 60 * 1000);

  if (nextTurn) {
    const offsets = [
      { min: -45, label: 'Pre-turn bracket (-45m)' },
      { min: 0, label: 'Turning-point peak (0m)' },
      { min: 45, label: 'Post-turn bracket (+45m)' },
    ];
    for (const step of offsets) {
      const ts = nextTurn.timestampMs + step.min * 60 * 1000;
      const wc = formatWallClock(ts);
      recs.push({
        id: `bracket_${nextTurn.id}_${step.min}`,
        category: 'bracket',
        title: `${step.label} around ${nextTurn.type.toUpperCase()}`,
        targetLocalDate: wc.localDate,
        targetLocalTime: wc.displayTime,
        targetTimestampMs: ts,
        reason: `Brackets ${spot.baselineName}'s ${nextTurn.localTime} ${nextTurn.type} tide to pinpoint local turning time.`,
        completed: isLoggedNear(ts),
      });
    }

    // Mid-tide slope check 3 hours after turning point
    const midTs = nextTurn.timestampMs + 180 * 60 * 1000;
    const midWc = formatWallClock(midTs);
    recs.push({
      id: `slope_${nextTurn.id}`,
      category: 'slope-check',
      title: 'Mid-tide slope check (Rising vs Falling)',
      targetLocalDate: midWc.localDate,
      targetLocalTime: midWc.displayTime,
      targetTimestampMs: midTs,
      reason: 'Breaks ±6h inversion ambiguity by confirming whether water is rising or falling.',
      completed: isLoggedNear(midTs, 45),
    });
  }

  // Multi-day checks based on earliest observation or now
  const anchorMs = observations[0]?.timestampMs ?? nowMs;
  const day2Ms = anchorMs + 2 * 24 * 60 * 60 * 1000;
  const day2Wc = formatWallClock(day2Ms);
  recs.push({
    id: 'lag-confirm-2d',
    category: 'lag-confirm',
    title: 'Multi-day lag confirmation (+2 to 3 days)',
    targetLocalDate: day2Wc.localDate,
    targetLocalTime: 'Daytime turning point',
    targetTimestampMs: day2Ms,
    reason: 'Confirms the time offset stays constant across consecutive tidal days.',
    completed: observations.some((o) => o.timestampMs - anchorMs >= 40 * 60 * 60 * 1000),
  });

  const day7Ms = anchorMs + 7 * 24 * 60 * 60 * 1000;
  const day7Wc = formatWallClock(day7Ms);
  recs.push({
    id: 'spring-neap-7d',
    category: 'spring-neap',
    title: 'Spring / Neap amplitude check (~7 days)',
    targetLocalDate: day7Wc.localDate,
    targetLocalTime: 'High + Low pair',
    targetTimestampMs: day7Ms,
    reason: 'Calibrates landmark height thresholds under opposite tidal range.',
    completed: observations.some((o) => o.timestampMs - anchorMs >= 6 * 24 * 60 * 60 * 1000),
  });

  return recs;
}
