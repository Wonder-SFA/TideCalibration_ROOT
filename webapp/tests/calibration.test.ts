import { describe, expect, it } from 'vitest';
import { localDateTimeToMs } from '../shared/tideParser';
import { interpolateTideCurve, solveCalibration } from '../src/lib/calibration';
import { ENTRY_1_OBSERVATION, SAN_ISIDRO_SPOT } from '../src/lib/seedData';
import { parsePastedTideTable } from '../src/lib/tideClient';
import type { Observation } from '../src/types';

describe('interpolateTideCurve', () => {
  it('returns exact turning point height at event timestamp and midpoint height halfway between', () => {
    const tLow = localDateTimeToMs('2026-11-26', '00:17');
    const tHigh = localDateTimeToMs('2026-11-26', '06:50');
    const lowInterp = interpolateTideCurve(SAN_ISIDRO_SPOT.events, tLow);
    const highInterp = interpolateTideCurve(SAN_ISIDRO_SPOT.events, tHigh);
    const midInterp = interpolateTideCurve(SAN_ISIDRO_SPOT.events, (tLow + tHigh) / 2);

    expect(lowInterp?.heightM).toBeCloseTo(-0.12, 2);
    expect(highInterp?.heightM).toBeCloseTo(1.76, 2);
    expect(midInterp?.heightM).toBeCloseTo((-0.12 + 1.76) / 2, 2);
    expect(midInterp?.slope).toBe('rising');
  });
});

describe('solveCalibration', () => {
  it('identifies ~5.5-6h inversion and preliminary confidence on Entry #1 alone', () => {
    const res = solveCalibration(SAN_ISIDRO_SPOT, [ENTRY_1_OBSERVATION]);
    expect(res.bestOffsetMinutes).not.toBeNull();
    expect(Math.abs(res.bestOffsetMinutes!)).toBeGreaterThanOrEqual(300);
    expect(res.confidence).toBe('preliminary');
  });

  it('converges within ±10 minutes on a synthetic +180m (3h later) multi-phase dataset', () => {
    const trueOffsetMin = 180;
    const sampleTimes = [
      { date: '2026-11-26', time: '09:50', stage: 'high' as const },
      { date: '2026-11-26', time: '12:30', stage: 'falling' as const },
      { date: '2026-11-26', time: '15:19', stage: 'low' as const },
      { date: '2026-11-26', time: '18:15', stage: 'rising' as const },
      { date: '2026-11-26', time: '21:16', stage: 'high' as const },
    ];

    const syntheticObs: Observation[] = sampleTimes.map((s, idx) => {
      const ts = localDateTimeToMs(s.date, s.time);
      const interp = interpolateTideCurve(
        SAN_ISIDRO_SPOT.events,
        ts - trueOffsetMin * 60 * 1000
      )!;
      return {
        id: `syn-${idx}`,
        spotId: SAN_ISIDRO_SPOT.id,
        localDate: s.date,
        localTime: `${s.time}:00`,
        timestampMs: ts,
        exifVerified: true,
        stage: s.stage,
        levelPercent: Math.round(interp.normalizedLevel * 100),
        landmarkStates: {},
        photoIds: [],
        notes: '',
        createdAt: new Date().toISOString(),
      };
    });

    const res = solveCalibration(SAN_ISIDRO_SPOT, syntheticObs);
    expect(res.bestOffsetMinutes).not.toBeNull();
    expect(Math.abs(res.bestOffsetMinutes! - trueOffsetMin)).toBeLessThanOrEqual(10);
    expect(res.confidence).toBe('high');
    expect(res.ambiguousInversion).toBe(false);
  });
});

describe('parsePastedTideTable', () => {
  it('parses copy-pasted High/Low lines into sorted TideEvents', () => {
    const text = `
      2026-11-26 Low Tide 12:19 PM 0.65 m
      2026-11-26 High Tide 6:50 AM 1.76 m
    `;
    const events = parsePastedTideTable(text, '2026-11-26');
    expect(events).toHaveLength(2);
    expect(events[0]).toMatchObject({ type: 'high', localTime: '06:50', heightM: 1.76 });
    expect(events[1]).toMatchObject({ type: 'low', localTime: '12:19', heightM: 0.65 });
  });
});
