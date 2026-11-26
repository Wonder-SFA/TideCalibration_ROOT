import { interpolateTideCurve } from './calibration';
import type { CalibrationResult, CalibrationSpot, Observation } from '../types';

export function exportSpotMarkdown(
  spot: CalibrationSpot,
  observations: Observation[],
  calibration: CalibrationResult
): string {
  const lines: string[] = [];
  lines.push(`# Tide Calibration Project — ${spot.name}`);
  lines.push('');
  if (spot.latitude !== null && spot.longitude !== null) {
    lines.push(`**Coordinates:** \`${spot.latitude}° N, ${spot.longitude}° E\``);
  }
  lines.push(`**Baseline Chart:** ${spot.baselineName}`);
  if (spot.baselineUrl) {
    lines.push(`**Direct Link:** <${spot.baselineUrl}>`);
  }
  lines.push(`**Empirical Rule:** ${calibration.summaryFormula}`);
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('## Fixed Shore Reference Landmarks');
  lines.push('');
  spot.landmarks.forEach((lm, idx) => {
    lines.push(`${idx + 1}. **${lm.name}** — ${lm.description}`);
  });
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('## Logged Observations');
  lines.push('');
  lines.push(
    '| Entry | Date & Photo Time | Baseline Chart Prediction | Actual Shore Observation | Notes / Residual |'
  );
  lines.push('| --- | --- | --- | --- | --- |');

  observations.forEach((obs, idx) => {
    const base = interpolateTideCurve(spot.events, obs.timestampMs);
    const baseText = base
      ? `${Math.round(base.normalizedLevel * 100)}% (${base.slope}; nearest ${base.nearestEvent?.type.toUpperCase()} ${base.nearestEvent?.localTime})`
      : 'N/A';

    const lmSummary = spot.landmarks
      .map((lm, i) => `(${i + 1}) ${lm.name}: ${obs.landmarkStates[lm.id] ?? 'na'}`)
      .join('; ');

    const res = calibration.perObservationResiduals[obs.id];
    const resText = res ? `Model ${res.predictedPct}% vs ${res.observedPct}% (${res.errorPct >= 0 ? '+' : ''}${res.errorPct}%)` : '';
    const notes = [obs.notes, resText].filter(Boolean).join(' • ');

    lines.push(
      `| **#${idx + 1}** | ${obs.localDate} **${obs.localTime}**${obs.exifVerified ? ' (EXIF)' : ''} | ${baseText} | **${obs.stage.toUpperCase()}** (${obs.levelPercent}%) — ${lmSummary} | ${notes} |`
    );
  });

  return lines.join('\n') + '\n';
}
