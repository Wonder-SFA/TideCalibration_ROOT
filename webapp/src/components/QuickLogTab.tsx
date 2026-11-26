import React, { useEffect, useMemo, useState } from 'react';
import { Camera, Check, Clock, MapPin, Sparkles, Upload } from 'lucide-react';
import { localDateTimeToMs } from '../../shared/tideParser';
import { formatWallClock, interpolateTideCurve } from '../lib/calibration';
import { extractPhotoExif } from '../lib/exif';
import type {
  CalibrationSpot,
  LandmarkState,
  Observation,
  StoredPhoto,
  TideStage,
} from '../types';

interface QuickLogTabProps {
  spot: CalibrationSpot;
  existingObservations: Observation[];
  existingPhotos: StoredPhoto[];
  prefillTimestampMs?: number | null;
  onSaveObservation: (obs: Observation, photos: StoredPhoto[]) => Promise<void>;
}

const STAGE_OPTIONS: Array<{ value: TideStage; label: string; defaultPct: number }> = [
  { value: 'low', label: 'Low', defaultPct: 5 },
  { value: 'rising', label: 'Rising', defaultPct: 45 },
  { value: 'mid', label: 'Mid', defaultPct: 50 },
  { value: 'falling', label: 'Falling', defaultPct: 55 },
  { value: 'high', label: 'High', defaultPct: 95 },
];

const LANDMARK_STATES: Array<{ value: LandmarkState; label: string; activeClass: string }> = [
  { value: 'exposed', label: 'Exposed', activeClass: 'bg-amber-600 text-white border-amber-600' },
  { value: 'waterline', label: 'Waterline', activeClass: 'bg-sky-600 text-white border-sky-600' },
  { value: 'submerged', label: 'Submerged', activeClass: 'bg-teal-700 text-white border-teal-700' },
  { value: 'na', label: 'N/A', activeClass: 'bg-slate-600 text-white border-slate-600' },
];

export const QuickLogTab: React.FC<QuickLogTabProps> = ({
  spot,
  existingObservations,
  existingPhotos,
  prefillTimestampMs,
  onSaveObservation,
}) => {
  const initialWc = formatWallClock(prefillTimestampMs ?? Date.now());
  const [localDate, setLocalDate] = useState(initialWc.localDate);
  const [localTime, setLocalTime] = useState(`${initialWc.localTime}:00`);
  const [exifVerified, setExifVerified] = useState(false);
  const [exifCoords, setExifCoords] = useState<{ lat?: number; lon?: number }>({});
  const [stage, setStage] = useState<TideStage>('low');
  const [levelPercent, setLevelPercent] = useState<number>(10);
  const [landmarkStates, setLandmarkStates] = useState<Record<string, LandmarkState>>(() =>
    Object.fromEntries(spot.landmarks.map((lm) => [lm.id, 'exposed' as LandmarkState]))
  );
  const [notes, setNotes] = useState('');
  const [pendingFiles, setPendingFiles] = useState<
    Array<{ file: File; previewUrl: string; exifTimestamp?: string }>
  >([]);
  const [saving, setSaving] = useState(false);
  const [savedBanner, setSavedBanner] = useState(false);

  useEffect(() => {
    if (prefillTimestampMs) {
      const wc = formatWallClock(prefillTimestampMs);
      setLocalDate(wc.localDate);
      setLocalTime(`${wc.localTime}:00`);
      setExifVerified(false);
    }
  }, [prefillTimestampMs]);

  useEffect(() => {
    setLandmarkStates((prev) => {
      const next: Record<string, LandmarkState> = {};
      for (const lm of spot.landmarks) {
        next[lm.id] = prev[lm.id] ?? 'na';
      }
      return next;
    });
  }, [spot.landmarks]);

  const timestampMs = useMemo(() => {
    const hhmm = localTime.slice(0, 5);
    const sec = parseInt(localTime.slice(6, 8) || '0', 10) || 0;
    return localDateTimeToMs(localDate, hhmm) + sec * 1000;
  }, [localDate, localTime]);

  const baselineAtShot = useMemo(
    () => interpolateTideCurve(spot.events, timestampMs),
    [spot.events, timestampMs]
  );

  // Reference photos from latest observation for side-by-side visual comparison
  const referenceThumbnails = useMemo(() => {
    const latest = existingObservations[existingObservations.length - 1];
    if (!latest) return [];
    return existingPhotos
      .filter((p) => p.observationId === latest.id)
      .slice(0, 2)
      .map((p) => ({
        id: p.id,
        filename: p.filename,
        url: URL.createObjectURL(p.blob),
        stage: latest.stage,
        time: `${latest.localDate} ${latest.localTime}`,
      }));
  }, [existingObservations, existingPhotos]);

  const handleFilesSelected = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const list = Array.from(files);
    const nextPending: Array<{ file: File; previewUrl: string; exifTimestamp?: string }> = [];

    for (let i = 0; i < list.length; i++) {
      const file = list[i];
      const exif = await extractPhotoExif(file);
      const previewUrl = URL.createObjectURL(file);
      const exifTimestamp =
        exif.localDate && exif.localTime ? `${exif.localDate} ${exif.localTime}` : undefined;

      if (i === 0 && exif.exifVerified && exif.localDate && exif.localTime) {
        setLocalDate(exif.localDate);
        setLocalTime(exif.localTime);
        setExifVerified(true);
        setExifCoords({ lat: exif.latitude, lon: exif.longitude });
      }
      nextPending.push({ file, previewUrl, exifTimestamp });
    }

    setPendingFiles((prev) => [...prev, ...nextPending]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const obsId = `obs-${Date.now()}`;
      const storedPhotos: StoredPhoto[] = pendingFiles.map((item, idx) => ({
        id: `photo-${Date.now()}-${idx}`,
        spotId: spot.id,
        observationId: obsId,
        filename: item.file.name,
        mimeType: item.file.type || 'image/jpeg',
        blob: item.file,
        exifTimestamp: item.exifTimestamp,
        createdAt: new Date().toISOString(),
      }));

      const obs: Observation = {
        id: obsId,
        spotId: spot.id,
        localDate,
        localTime: localTime.length === 5 ? `${localTime}:00` : localTime,
        timestampMs,
        exifVerified,
        exifLatitude: exifCoords.lat,
        exifLongitude: exifCoords.lon,
        stage,
        levelPercent,
        landmarkStates,
        photoIds: storedPhotos.map((p) => p.id),
        notes: notes.trim(),
        createdAt: new Date().toISOString(),
      };

      await onSaveObservation(obs, storedPhotos);
      setPendingFiles([]);
      setNotes('');
      setExifVerified(false);
      setSavedBanner(true);
      setTimeout(() => setSavedBanner(false), 3000);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-5">
      <div className="space-y-5 lg:col-span-3">
        {/* Step 1: Photo Upload + EXIF */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-800">
              <Camera className="h-4 w-4 text-teal-700" />
              1. Shore Photo(s) & Auto-EXIF Timestamp
            </h3>
            {exifVerified && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800">
                <Sparkles className="h-3 w-3" /> EXIF Verified
              </span>
            )}
          </div>

          <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center transition hover:border-teal-500 hover:bg-teal-50/40">
            <Upload className="mb-2 h-6 w-6 text-slate-400" />
            <span className="text-sm font-medium text-slate-700">
              Tap to select or drop shore photos
            </span>
            <span className="mt-1 text-xs text-slate-500">
              EXIF DateTimeOriginal & GPS are extracted automatically in your browser
            </span>
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => handleFilesSelected(e.target.files)}
            />
          </label>

          {pendingFiles.length > 0 && (
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {pendingFiles.map((item, idx) => (
                <div key={idx} className="overflow-hidden rounded-lg border border-slate-200">
                  <img
                    src={item.previewUrl}
                    alt={item.file.name}
                    className="h-28 w-full object-cover"
                  />
                  <div className="bg-slate-50 px-2 py-1 text-[11px] text-slate-600 truncate">
                    {item.exifTimestamp || item.file.name}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-slate-600">Date</label>
              <input
                type="date"
                value={localDate}
                onChange={(e) => {
                  setLocalDate(e.target.value);
                  setExifVerified(false);
                }}
                required
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-600 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600">Local Time</label>
              <input
                type="time"
                step="1"
                value={localTime}
                onChange={(e) => {
                  setLocalTime(e.target.value);
                  setExifVerified(false);
                }}
                required
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-600 focus:outline-none"
              />
            </div>
          </div>

          {exifCoords.lat !== undefined && exifCoords.lon !== undefined && (
            <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
              <MapPin className="h-3.5 w-3.5 text-teal-600" />
              Photo GPS: {exifCoords.lat}, {exifCoords.lon}
            </div>
          )}
        </div>

        {/* Step 2: 2-Tap Tide Stage & Landmarks */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="mb-3 text-sm font-semibold text-slate-800">
            2. Observed Tide Stage & Water Level
          </h3>

          <div className="grid grid-cols-5 gap-2">
            {STAGE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  setStage(opt.value);
                  setLevelPercent(opt.defaultPct);
                }}
                className={`rounded-lg border py-2 text-xs font-semibold transition ${
                  stage === opt.value
                    ? 'border-teal-700 bg-teal-700 text-white shadow-sm'
                    : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <div className="mt-4">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-slate-600">Relative Water Level</span>
              <span className="font-bold text-teal-700">{levelPercent}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={levelPercent}
              onChange={(e) => setLevelPercent(Number(e.target.value))}
              className="mt-1.5 w-full accent-teal-700"
            />
          </div>

          <div className="mt-5 space-y-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Fixed Landmarks (1-Tap Status)
            </div>
            {spot.landmarks.map((lm) => (
              <div key={lm.id} className="rounded-lg border border-slate-200 bg-slate-50/70 p-3">
                <div className="text-xs font-semibold text-slate-800">{lm.name}</div>
                <div className="mt-2 grid grid-cols-4 gap-1.5">
                  {LANDMARK_STATES.map((st) => {
                    const active = landmarkStates[lm.id] === st.value;
                    return (
                      <button
                        key={st.value}
                        type="button"
                        onClick={() =>
                          setLandmarkStates((prev) => ({ ...prev, [lm.id]: st.value }))
                        }
                        className={`rounded-md border py-1.5 text-[11px] font-medium transition ${
                          active
                            ? st.activeClass
                            : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        {st.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4">
            <label className="block text-xs font-medium text-slate-600">Notes (optional)</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g., Boats floating at seawall, reef bar barely awash..."
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-600 focus:outline-none"
            />
          </div>

          <div className="mt-4 flex items-center justify-between gap-3">
            {savedBanner ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700">
                <Check className="h-4 w-4" /> Observation saved & calibration updated!
              </span>
            ) : (
              <span className="text-xs text-slate-500">Saved locally in IndexedDB</span>
            )}
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-teal-800 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Observation'}
            </button>
          </div>
        </div>
      </div>

      {/* Right Column: Live Baseline Callout + Reference Photo Strip */}
      <div className="space-y-5 lg:col-span-2">
        <div className="rounded-xl border border-sky-200 bg-sky-50 p-4">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-sky-800">
            <Clock className="h-4 w-4" />
            Baseline Chart at This Time
          </div>
          {baselineAtShot ? (
            <div className="mt-2 space-y-1 text-sm text-sky-950">
              <div>
                Chart says:{' '}
                <strong className="capitalize">
                  {Math.round(baselineAtShot.normalizedLevel * 100)}% ({baselineAtShot.slope})
                </strong>
              </div>
              <div className="text-xs text-sky-800">
                Predicted height: <strong>{baselineAtShot.heightM.toFixed(2)} m</strong>
              </div>
              {baselineAtShot.nearestEvent && (
                <div className="text-xs text-sky-800">
                  Nearest turn: <strong>{baselineAtShot.nearestEvent.type.toUpperCase()}</strong> at{' '}
                  {baselineAtShot.nearestEvent.localTime}
                </div>
              )}
            </div>
          ) : (
            <p className="mt-2 text-xs text-sky-800">
              No baseline events cover {localDate}. Fetch or paste tide events in Spot Setup.
            </p>
          )}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Latest Reference Photo(s)
          </h4>
          {referenceThumbnails.length === 0 ? (
            <p className="mt-2 text-xs text-slate-500">No prior photos logged yet.</p>
          ) : (
            <div className="mt-3 space-y-3">
              {referenceThumbnails.map((ref) => (
                <div key={ref.id} className="overflow-hidden rounded-lg border border-slate-200">
                  <img src={ref.url} alt={ref.filename} className="h-40 w-full object-cover" />
                  <div className="bg-slate-50 px-2.5 py-1.5 text-xs text-slate-700">
                    <strong>{ref.stage.toUpperCase()}</strong> • {ref.time}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </form>
  );
};
