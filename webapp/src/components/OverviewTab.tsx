import React from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  Compass,
  Waves,
} from 'lucide-react';
import {
  formatOffsetMinutes,
  formatWallClock,
  generateCapturePlan,
  interpolateTideCurve,
} from '../lib/calibration';
import type { CalibrationResult, CalibrationSpot, Observation, UnitSystem } from '../types';
import { TideChart } from './TideChart';

interface OverviewTabProps {
  spot: CalibrationSpot;
  observations: Observation[];
  calibration: CalibrationResult;
  nowMs: number;
  units: UnitSystem;
  onGoToQuickLog: (prefillTimestampMs?: number) => void;
  onSelectObservation: (obs: Observation) => void;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({
  spot,
  observations,
  calibration,
  nowMs,
  units,
  onGoToQuickLog,
  onSelectObservation,
}) => {
  const offsetMs = (calibration.bestOffsetMinutes ?? 0) * 60 * 1000;
  const currentBaseline = interpolateTideCurve(spot.events, nowMs);
  const currentCalibrated =
    calibration.bestOffsetMinutes !== null
      ? interpolateTideCurve(spot.events, nowMs - offsetMs)
      : null;

  const upcomingTurns = spot.events
    .filter((e) => e.timestampMs + offsetMs >= nowMs - 30 * 60 * 1000)
    .slice(0, 4);

  const capturePlan = generateCapturePlan(spot, observations, nowMs);

  const confidenceBadge: Record<CalibrationResult['confidence'], string> = {
    none: 'bg-slate-100 text-slate-700',
    preliminary: 'bg-amber-100 text-amber-800',
    moderate: 'bg-sky-100 text-sky-800',
    high: 'bg-emerald-100 text-emerald-800',
  };

  return (
    <div className="space-y-6">
      {/* Empirical Conversion Rule Hero Card */}
      <div className="rounded-2xl border border-teal-200 bg-gradient-to-br from-teal-900 via-teal-800 to-sky-900 p-5 text-white shadow-md">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-teal-200">
              <Compass className="h-4 w-4" />
              Empirical Tide Conversion Rule
            </div>
            <h2 className="text-xl font-bold sm:text-2xl">{calibration.summaryFormula}</h2>
            <p className="text-sm text-teal-100">
              {observations.length} observation{observations.length === 1 ? '' : 's'} logged against{' '}
              <span className="font-medium text-white">{spot.baselineName}</span>
              {calibration.rmsErrorPct !== null && ` • RMS error ±${calibration.rmsErrorPct}%`}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {calibration.solverStage !== 'none' && (
              <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-teal-100 ring-1 ring-white/25">
                {calibration.solverStage === 'stage2-12h' ? 'Stage 2 (±12h)' : 'Stage 1 (±6h)'}
              </span>
            )}
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${
                confidenceBadge[calibration.confidence]
              }`}
            >
              {calibration.confidence === 'none'
                ? 'Needs Data'
                : `${calibration.confidence} confidence`}
            </span>
          </div>
        </div>

        {calibration.stageNote && (
          <div className="mt-3 rounded-xl bg-white/10 px-3.5 py-2 text-xs text-teal-100 ring-1 ring-white/15">
            {calibration.stageNote}
          </div>
        )}

        {calibration.ambiguousInversion && (
          <div className="mt-4 flex items-start gap-2.5 rounded-xl bg-amber-500/20 px-3.5 py-2.5 text-xs text-amber-100 ring-1 ring-amber-300/30">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
            <span>
              With only {observations.length} observation(s) near a turning point, a{' '}
              <strong>~6-hour inversion</strong> can fit both{' '}
              {formatOffsetMinutes(calibration.bestOffsetMinutes!)} and{' '}
              {formatOffsetMinutes(calibration.altInversionMinutes!)}. Log one mid-tide (rising or
              falling) shot to lock in the exact direction.
            </span>
          </div>
        )}

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl bg-white/10 p-3 backdrop-blur-sm">
            <div className="text-xs text-teal-200">Right Now (Calibrated)</div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-lg font-bold">
                {currentCalibrated
                  ? `${Math.round(currentCalibrated.normalizedLevel * 100)}%`
                  : '—'}
              </span>
              <span className="text-xs capitalize text-teal-100">
                {currentCalibrated ? currentCalibrated.slope : 'No model yet'}
              </span>
            </div>
            <div className="mt-0.5 text-[11px] text-teal-200">
              Baseline says:{' '}
              {currentBaseline
                ? `${Math.round(currentBaseline.normalizedLevel * 100)}% (${currentBaseline.slope})`
                : 'N/A'}
            </div>
          </div>

          {upcomingTurns.slice(0, 3).map((ev) => {
            const shifted = formatWallClock(ev.timestampMs + offsetMs);
            return (
              <div key={ev.id} className="rounded-xl bg-white/10 p-3 backdrop-blur-sm">
                <div className="text-xs text-teal-200">
                  Next Local {ev.type === 'high' ? 'High' : 'Low'}
                </div>
                <div className="mt-1 text-lg font-bold">{shifted.displayTime}</div>
                <div className="mt-0.5 text-[11px] text-teal-200">
                  {shifted.localDate} • Chart {ev.localTime}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 48-Hour Curve */}
      <TideChart
        spot={spot}
        observations={observations}
        calibration={calibration}
        nowMs={nowMs}
        units={units}
        onSelectObservation={onSelectObservation}
      />

      {/* Smart Next-Capture Plan & Landmark Thresholds */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CalendarClock className="h-4 w-4 text-teal-700" />
              <h3 className="text-sm font-semibold text-slate-800">Next Optimal Capture Plan</h3>
            </div>
            <button
              type="button"
              onClick={() => onGoToQuickLog()}
              className="inline-flex items-center gap-1 rounded-lg bg-teal-700 px-2.5 py-1 text-xs font-medium text-white hover:bg-teal-800"
            >
              Quick Log <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="space-y-2.5">
            {capturePlan.map((rec) => (
              <div
                key={rec.id}
                className={`flex items-start justify-between gap-3 rounded-lg border p-3 ${
                  rec.completed
                    ? 'border-emerald-200 bg-emerald-50/60'
                    : 'border-slate-200 bg-slate-50/70'
                }`}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    {rec.completed ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                    ) : (
                      <Waves className="h-4 w-4 shrink-0 text-sky-600" />
                    )}
                    <span className="text-xs font-semibold text-slate-800">{rec.title}</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-600">{rec.reason}</p>
                </div>
                <div className="shrink-0 text-right">
                  <div className="text-xs font-semibold text-slate-800">{rec.targetLocalTime}</div>
                  <div className="text-[11px] text-slate-500">{rec.targetLocalDate}</div>
                  {!rec.completed && rec.category !== 'lag-confirm' && rec.category !== 'spring-neap' && (
                    <button
                      type="button"
                      onClick={() => onGoToQuickLog(rec.targetTimestampMs)}
                      className="mt-1 text-[11px] font-medium text-teal-700 hover:underline"
                    >
                      Log this time
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Landmark Threshold Table */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="mb-3 text-sm font-semibold text-slate-800">
            Fixed Landmark Exposure Thresholds
          </h3>
          {calibration.landmarkThresholds.length === 0 ? (
            <p className="text-xs text-slate-500">No landmarks configured yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500">
                    <th className="pb-2 font-medium">Landmark</th>
                    <th className="pb-2 font-medium">Max Exposed</th>
                    <th className="pb-2 font-medium">Waterline</th>
                    <th className="pb-2 font-medium">Min Submerged</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {calibration.landmarkThresholds.map((lt) => (
                    <tr key={lt.landmarkId}>
                      <td className="py-2.5 pr-2 font-medium text-slate-800">{lt.name}</td>
                      <td className="py-2.5 text-amber-700">
                        {lt.maxExposedPct !== null ? `≤ ${lt.maxExposedPct}%` : '—'}
                      </td>
                      <td className="py-2.5 text-sky-700">
                        {lt.waterlinePct !== null ? `~${lt.waterlinePct}%` : '—'}
                      </td>
                      <td className="py-2.5 text-teal-700">
                        {lt.minSubmergedPct !== null ? `≥ ${lt.minSubmergedPct}%` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="mt-3 text-[11px] text-slate-500">
            Thresholds refine automatically as you tag landmarks across Low, Mid, and High tides.
          </p>
        </div>
      </div>
    </div>
  );
};
