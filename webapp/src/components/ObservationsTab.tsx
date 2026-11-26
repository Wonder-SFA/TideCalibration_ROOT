import React, { useEffect, useMemo, useState } from 'react';
import { Columns2, Download, Sparkles, Trash2 } from 'lucide-react';
import { interpolateTideCurve } from '../lib/calibration';
import { exportSpotMarkdown } from '../lib/markdownExport';
import type { CalibrationResult, CalibrationSpot, Observation, StoredPhoto } from '../types';

interface ObservationsTabProps {
  spot: CalibrationSpot;
  observations: Observation[];
  photos: StoredPhoto[];
  calibration: CalibrationResult;
  highlightedObsId?: string | null;
  onDeleteObservation: (obsId: string) => Promise<void>;
}

export const ObservationsTab: React.FC<ObservationsTabProps> = ({
  spot,
  observations,
  photos,
  calibration,
  highlightedObsId,
  onDeleteObservation,
}) => {
  const [compareA, setCompareA] = useState<string>(observations[0]?.id ?? '');
  const [compareB, setCompareB] = useState<string>(
    observations[observations.length - 1]?.id ?? ''
  );

  const photoUrls = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of photos) {
      map.set(p.id, URL.createObjectURL(p.blob));
    }
    return map;
  }, [photos]);

  useEffect(() => {
    return () => {
      for (const url of photoUrls.values()) {
        URL.revokeObjectURL(url);
      }
    };
  }, [photoUrls]);

  const handleExportMd = () => {
    const md = exportSpotMarkdown(spot, observations, calibration);
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tide_log_${spot.name.toLowerCase().replace(/[^a-z0-9]+/g, '_')}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const obsA = observations.find((o) => o.id === compareA);
  const obsB = observations.find((o) => o.id === compareB);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-800">
            Logged Observations ({observations.length})
          </h2>
          <p className="text-xs text-slate-500">
            Chronological shore logs with EXIF timestamps and model residuals.
          </p>
        </div>
        <button
          type="button"
          onClick={handleExportMd}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
        >
          <Download className="h-3.5 w-3.5" /> Export Markdown (tide_log.md)
        </button>
      </div>

      {observations.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
          No observations logged yet. Use Quick Log to add your first shore photo.
        </div>
      ) : (
        <div className="space-y-4">
          {observations.map((obs, idx) => {
            const obsPhotos = photos.filter((p) => p.observationId === obs.id);
            const baseline = interpolateTideCurve(spot.events, obs.timestampMs);
            const residual = calibration.perObservationResiduals[obs.id];
            const isHighlighted = highlightedObsId === obs.id;

            return (
              <div
                key={obs.id}
                className={`rounded-xl border bg-white p-4 shadow-sm transition ${
                  isHighlighted ? 'border-amber-500 ring-2 ring-amber-200' : 'border-slate-200'
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-700">
                      #{idx + 1}
                    </span>
                    <span className="text-sm font-semibold text-slate-900">
                      {obs.localDate} • {obs.localTime}
                    </span>
                    {obs.exifVerified && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-800">
                        <Sparkles className="h-3 w-3" /> EXIF
                      </span>
                    )}
                    <span className="rounded-full bg-teal-100 px-2.5 py-0.5 text-xs font-semibold uppercase text-teal-800">
                      {obs.stage} ({obs.levelPercent}%)
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => onDeleteObservation(obs.id)}
                    className="rounded-md p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
                    title="Delete observation"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-xs text-slate-600">
                  <span>
                    Baseline:{' '}
                    <strong>
                      {baseline
                        ? `${Math.round(baseline.normalizedLevel * 100)}% (${baseline.slope})`
                        : 'N/A'}
                    </strong>
                  </span>
                  {residual && (
                    <span>
                      Calibrated fit: <strong>{residual.predictedPct}%</strong> (error{' '}
                      {residual.errorPct >= 0 ? '+' : ''}
                      {residual.errorPct}%)
                    </span>
                  )}
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {spot.landmarks.map((lm) => {
                    const st = obs.landmarkStates[lm.id] ?? 'na';
                    return (
                      <span
                        key={lm.id}
                        className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] text-slate-700"
                      >
                        <strong>{lm.name}:</strong> {st}
                      </span>
                    );
                  })}
                </div>

                {obs.notes && <p className="mt-2.5 text-xs text-slate-700">{obs.notes}</p>}

                {obsPhotos.length > 0 && (
                  <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {obsPhotos.map((p) => (
                      <div key={p.id} className="overflow-hidden rounded-lg border border-slate-200">
                        <img
                          src={photoUrls.get(p.id)}
                          alt={p.filename}
                          className="h-32 w-full object-cover"
                        />
                        <div className="truncate bg-slate-50 px-2 py-1 text-[10px] text-slate-500">
                          {p.filename}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Side-by-Side Photo Comparator */}
      {observations.length >= 2 && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800">
            <Columns2 className="h-4 w-4 text-teal-700" />
            Side-by-Side Photo Comparator
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { val: compareA, setVal: setCompareA, obs: obsA, label: 'Photo A' },
              { val: compareB, setVal: setCompareB, obs: obsB, label: 'Photo B' },
            ].map((side, i) => (
              <div key={i} className="space-y-2">
                <select
                  value={side.val}
                  onChange={(e) => side.setVal(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs"
                >
                  {observations.map((o, idx) => (
                    <option key={o.id} value={o.id}>
                      #{idx + 1} — {o.localDate} {o.localTime} ({o.stage.toUpperCase()})
                    </option>
                  ))}
                </select>
                {side.obs && (
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-2">
                    {photos
                      .filter((p) => p.observationId === side.obs!.id)
                      .slice(0, 1)
                      .map((p) => (
                        <img
                          key={p.id}
                          src={photoUrls.get(p.id)}
                          alt={p.filename}
                          className="h-52 w-full rounded object-cover"
                        />
                      ))}
                    <div className="mt-2 text-xs text-slate-700">
                      <strong>{side.obs.stage.toUpperCase()}</strong> ({side.obs.levelPercent}%)
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
