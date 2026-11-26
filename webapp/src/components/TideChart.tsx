import React, { useMemo, useState } from 'react';
import { formatWallClock, interpolateTideCurve } from '../lib/calibration';
import type { CalibrationResult, CalibrationSpot, Observation, UnitSystem } from '../types';

interface TideChartProps {
  spot: CalibrationSpot;
  observations: Observation[];
  calibration: CalibrationResult;
  nowMs: number;
  units: UnitSystem;
  onSelectObservation?: (obs: Observation) => void;
}

export const TideChart: React.FC<TideChartProps> = ({
  spot,
  observations,
  calibration,
  nowMs,
  units,
  onSelectObservation,
}) => {
  const [hoveredObs, setHoveredObs] = useState<Observation | null>(null);

  const chartData = useMemo(() => {
    const sorted = [...spot.events].sort((a, b) => a.timestampMs - b.timestampMs);
    if (sorted.length < 2) return null;

    // Show 48-hour window anchored around nowMs or the earliest event
    const anchor =
      nowMs >= sorted[0].timestampMs && nowMs <= sorted[sorted.length - 1].timestampMs
        ? nowMs - 12 * 3600 * 1000
        : sorted[0].timestampMs;
    const startMs = Math.max(sorted[0].timestampMs, anchor);
    const endMs = Math.min(sorted[sorted.length - 1].timestampMs, startMs + 48 * 3600 * 1000);
    if (endMs <= startMs) return null;

    const width = 800;
    const height = 270;
    const padL = 44;
    const padR = 20;
    const padT = 26;
    const padB = 34;
    const plotW = width - padL - padR;
    const plotH = height - padT - padB;

    const xForTs = (ts: number) => padL + ((ts - startMs) / (endMs - startMs)) * plotW;
    const yForNorm = (norm: number) => padT + (1 - norm) * plotH;

    const steps = 160;
    const basePts: string[] = [];
    const calPts: string[] = [];
    const offsetMs = (calibration.bestOffsetMinutes ?? 0) * 60 * 1000;

    for (let i = 0; i <= steps; i++) {
      const ts = startMs + (i / steps) * (endMs - startMs);
      const x = xForTs(ts).toFixed(1);
      const base = interpolateTideCurve(sorted, ts);
      if (base) {
        basePts.push(`${x},${yForNorm(base.normalizedLevel).toFixed(1)}`);
      }
      if (calibration.bestOffsetMinutes !== null) {
        const cal = interpolateTideCurve(sorted, ts - offsetMs);
        if (cal) {
          calPts.push(`${x},${yForNorm(cal.normalizedLevel).toFixed(1)}`);
        }
      }
    }

    const visibleEvents = sorted.filter((e) => e.timestampMs >= startMs && e.timestampMs <= endMs);
    const visibleObs = observations.filter((o) => o.timestampMs >= startMs && o.timestampMs <= endMs);

    // 6-hour grid ticks
    const ticks: Array<{ x: number; label: string; isDay: boolean }> = [];
    const firstTick = Math.ceil(startMs / (6 * 3600 * 1000)) * (6 * 3600 * 1000);
    for (let ts = firstTick; ts <= endMs; ts += 6 * 3600 * 1000) {
      const wc = formatWallClock(ts);
      const h = new Date(ts).getUTCHours();
      ticks.push({
        x: xForTs(ts),
        label: h === 0 ? wc.localDate.slice(5) : wc.displayTime.replace(':00 ', ''),
        isDay: h === 0,
      });
    }

    return {
      width,
      height,
      padL,
      padR,
      padT,
      padB,
      plotH,
      startMs,
      endMs,
      basePath: `M ${basePts.join(' L ')}`,
      calPath: calPts.length > 0 ? `M ${calPts.join(' L ')}` : null,
      visibleEvents,
      visibleObs,
      ticks,
      xForTs,
      yForNorm,
    };
  }, [spot.events, observations, calibration.bestOffsetMinutes, nowMs]);

  if (!chartData) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
        Add at least 2 baseline High/Low events in Spot Setup to render the tide curve.
      </div>
    );
  }

  const formatH = (m: number) =>
    units === 'imperial' ? `${(m * 3.28084).toFixed(1)} ft` : `${m.toFixed(2)} m`;

  const nowInWindow = nowMs >= chartData.startMs && nowMs <= chartData.endMs;
  const nowX = chartData.xForTs(nowMs);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm font-semibold text-slate-800">48-Hour Baseline vs. Calibrated Curve</div>
        <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-0.5 w-5 border-t-2 border-dashed border-slate-400" />
            Baseline ({spot.baselineName.split('(')[0].trim()})
          </span>
          {chartData.calPath && (
            <span className="flex items-center gap-1.5 font-medium text-teal-700">
              <span className="inline-block h-0.5 w-5 bg-teal-600" />
              Calibrated Local Curve
            </span>
          )}
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-amber-500 ring-2 ring-amber-200" />
            Shore Observation
          </span>
        </div>
      </div>

      <div className="relative overflow-x-auto">
        <svg
          viewBox={`0 0 ${chartData.width} ${chartData.height}`}
          className="h-auto w-full min-w-[560px] select-none"
        >
          {/* Horizontal grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((lvl) => {
            const y = chartData.yForNorm(lvl);
            return (
              <g key={lvl}>
                <line
                  x1={chartData.padL}
                  y1={y}
                  x2={chartData.width - chartData.padR}
                  y2={y}
                  stroke="#e2e8f0"
                  strokeWidth="1"
                />
                <text x={6} y={y + 4} fontSize="10" fill="#64748b">
                  {Math.round(lvl * 100)}%
                </text>
              </g>
            );
          })}

          {/* Vertical time ticks */}
          {chartData.ticks.map((t, i) => (
            <g key={i}>
              <line
                x1={t.x}
                y1={chartData.padT}
                x2={t.x}
                y2={chartData.height - chartData.padB}
                stroke={t.isDay ? '#cbd5e1' : '#f1f5f9'}
                strokeWidth="1"
              />
              <text
                x={t.x}
                y={chartData.height - 12}
                textAnchor="middle"
                fontSize="10"
                fontWeight={t.isDay ? '600' : '400'}
                fill={t.isDay ? '#334155' : '#64748b'}
              >
                {t.label}
              </text>
            </g>
          ))}

          {/* Baseline curve */}
          <path
            d={chartData.basePath}
            fill="none"
            stroke="#94a3b8"
            strokeWidth="2"
            strokeDasharray="6 4"
          />

          {/* Calibrated local curve */}
          {chartData.calPath && (
            <path d={chartData.calPath} fill="none" stroke="#0f766e" strokeWidth="2.75" />
          )}

          {/* Now line */}
          {nowInWindow && (
            <g>
              <line
                x1={nowX}
                y1={chartData.padT}
                x2={nowX}
                y2={chartData.height - chartData.padB}
                stroke="#0284c7"
                strokeWidth="1.5"
                strokeDasharray="3 3"
              />
              <text x={nowX + 4} y={chartData.padT + 10} fontSize="10" fontWeight="600" fill="#0284c7">
                Now
              </text>
            </g>
          )}

          {/* Turning point labels */}
          {chartData.visibleEvents.map((ev) => {
            const interp = interpolateTideCurve(spot.events, ev.timestampMs);
            if (!interp) return null;
            const x = chartData.xForTs(ev.timestampMs);
            const y = chartData.yForNorm(interp.normalizedLevel);
            const isHigh = ev.type === 'high';
            return (
              <g key={ev.id}>
                <circle cx={x} cy={y} r={3} fill="#64748b" />
                <text
                  x={x}
                  y={isHigh ? y - 8 : y + 14}
                  textAnchor="middle"
                  fontSize="9.5"
                  fill="#475569"
                >
                  {ev.localTime} ({formatH(ev.heightM)})
                </text>
              </g>
            );
          })}

          {/* Shore observation dots */}
          {chartData.visibleObs.map((obs) => {
            const x = chartData.xForTs(obs.timestampMs);
            const y = chartData.yForNorm(obs.levelPercent / 100);
            return (
              <g
                key={obs.id}
                className="cursor-pointer"
                onMouseEnter={() => setHoveredObs(obs)}
                onMouseLeave={() => setHoveredObs(null)}
                onClick={() => onSelectObservation?.(obs)}
              >
                <circle cx={x} cy={y} r={10} fill="#f59e0b" fillOpacity="0.2" />
                <circle cx={x} cy={y} r={5.5} fill="#d97706" stroke="#ffffff" strokeWidth="1.75" />
              </g>
            );
          })}
        </svg>
      </div>

      {hoveredObs && (
        <div className="mt-2 flex items-center justify-between rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">
          <span>
            <strong>
              {hoveredObs.localDate} {hoveredObs.localTime}
            </strong>{' '}
            — Observed <strong>{hoveredObs.stage.toUpperCase()}</strong> ({hoveredObs.levelPercent}%)
          </span>
          <span className="text-amber-700">Click to inspect in Observations</span>
        </div>
      )}
    </div>
  );
};
