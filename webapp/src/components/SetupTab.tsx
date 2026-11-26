import React, { useState } from 'react';
import { Globe, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { fetchTideForecast, parsePastedTideTable } from '../lib/tideClient';
import type { CalibrationSpot, LandmarkDef, TideEvent } from '../types';

interface SetupTabProps {
  spot: CalibrationSpot;
  customProxyUrl: string;
  onUpdateSpot: (updated: CalibrationSpot) => Promise<void>;
  onDeleteSpot?: (spotId: string) => Promise<void>;
  canDeleteSpot: boolean;
}

export const SetupTab: React.FC<SetupTabProps> = ({
  spot,
  customProxyUrl,
  onUpdateSpot,
  onDeleteSpot,
  canDeleteSpot,
}) => {
  const [name, setName] = useState(spot.name);
  const [lat, setLat] = useState(spot.latitude !== null ? String(spot.latitude) : '');
  const [lon, setLon] = useState(spot.longitude !== null ? String(spot.longitude) : '');
  const [baselineName, setBaselineName] = useState(spot.baselineName);
  const [baselineUrl, setBaselineUrl] = useState(spot.baselineUrl);
  const [landmarks, setLandmarks] = useState<LandmarkDef[]>(spot.landmarks);
  const [pasteText, setPasteText] = useState('');
  const [defaultDate, setDefaultDate] = useState(new Date().toISOString().slice(0, 10));
  const [fetching, setFetching] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    await onUpdateSpot({
      ...spot,
      name: name.trim() || spot.name,
      latitude: lat.trim() ? parseFloat(lat) : null,
      longitude: lon.trim() ? parseFloat(lon) : null,
      baselineName: baselineName.trim() || spot.baselineName,
      baselineUrl: baselineUrl.trim(),
      landmarks: landmarks.filter((l) => l.name.trim().length > 0),
    });
    setStatusMsg('Spot settings & landmarks saved.');
    setErrorMsg(null);
  };

  const handleFetchLive = async () => {
    setFetching(true);
    setErrorMsg(null);
    setStatusMsg(null);
    try {
      const data = await fetchTideForecast(baselineUrl, customProxyUrl);
      const mergedMap = new Map<string, TideEvent>();
      for (const ev of spot.events) mergedMap.set(ev.id, ev);
      for (const ev of data.events) mergedMap.set(ev.id, ev);
      const merged = Array.from(mergedMap.values()).sort((a, b) => a.timestampMs - b.timestampMs);

      await onUpdateSpot({
        ...spot,
        baselineUrl: baselineUrl.trim(),
        baselineName: data.locationName ? `${data.locationName} (Tide-Forecast)` : baselineName,
        baselineSourceType: 'tide-forecast',
        events: merged,
        lastFetchedAt: data.fetchedAt,
      });
      setStatusMsg(`Fetched ${data.events.length} turning points from ${data.locationName}.`);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to fetch Tide-Forecast URL.');
    } finally {
      setFetching(false);
    }
  };

  const handleImportPaste = async () => {
    setErrorMsg(null);
    setStatusMsg(null);
    const parsed = parsePastedTideTable(pasteText, defaultDate);
    if (parsed.length === 0) {
      setErrorMsg('No High/Low tide rows detected. Include "High" or "Low" and a time (e.g. 6:50 AM).');
      return;
    }

    const mergedMap = new Map<string, TideEvent>();
    for (const ev of spot.events) mergedMap.set(ev.id, ev);
    for (const ev of parsed) mergedMap.set(ev.id, ev);
    const merged = Array.from(mergedMap.values()).sort((a, b) => a.timestampMs - b.timestampMs);

    await onUpdateSpot({
      ...spot,
      events: merged,
    });
    setPasteText('');
    setStatusMsg(`Imported ${parsed.length} turning points into baseline chart.`);
  };

  const addLandmark = () => {
    setLandmarks((prev) => [
      ...prev,
      {
        id: `lm-${Date.now()}`,
        name: '',
        description: '',
        order: prev.length + 1,
      },
    ]);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Spot Profile & Landmarks */}
      <form
        onSubmit={handleSaveProfile}
        className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-800">Spot Profile & Fixed Landmarks</h3>
          {canDeleteSpot && onDeleteSpot && (
            <button
              type="button"
              onClick={() => onDeleteSpot(spot.id)}
              className="text-xs font-medium text-red-600 hover:underline"
            >
              Delete Spot
            </button>
          )}
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600">Spot Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-600">Latitude (°N)</label>
            <input
              type="text"
              value={lat}
              onChange={(e) => setLat(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600">Longitude (°E)</label>
            <input
              type="text"
              value={lon}
              onChange={(e) => setLon(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="space-y-2.5 pt-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Fixed Shore Landmarks
            </span>
            <button
              type="button"
              onClick={addLandmark}
              className="inline-flex items-center gap-1 text-xs font-medium text-teal-700 hover:underline"
            >
              <Plus className="h-3.5 w-3.5" /> Add Landmark
            </button>
          </div>
          {landmarks.map((lm, idx) => (
            <div key={lm.id} className="rounded-lg border border-slate-200 bg-slate-50 p-2.5">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder={`Landmark #${idx + 1} name`}
                  value={lm.name}
                  onChange={(e) =>
                    setLandmarks((prev) =>
                      prev.map((x) => (x.id === lm.id ? { ...x, name: e.target.value } : x))
                    )
                  }
                  className="flex-1 rounded border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium"
                />
                <button
                  type="button"
                  onClick={() => setLandmarks((prev) => prev.filter((x) => x.id !== lm.id))}
                  className="p-1 text-slate-400 hover:text-red-600"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
              <input
                type="text"
                placeholder="Description (e.g. water level on wall)"
                value={lm.description}
                onChange={(e) =>
                  setLandmarks((prev) =>
                    prev.map((x) => (x.id === lm.id ? { ...x, description: e.target.value } : x))
                  )
                }
                className="mt-1.5 w-full rounded border border-slate-300 bg-white px-2.5 py-1 text-xs text-slate-600"
              />
            </div>
          ))}
        </div>

        <button
          type="submit"
          className="w-full rounded-xl bg-teal-700 py-2 text-sm font-semibold text-white hover:bg-teal-800"
        >
          Save Spot & Landmarks
        </button>
      </form>

      {/* Baseline Chart Manager */}
      <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-800">
          <Globe className="h-4 w-4 text-teal-700" />
          Baseline Tide Chart ({spot.events.length} events loaded)
        </h3>

        {statusMsg && (
          <div className="rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
            {statusMsg}
          </div>
        )}
        {errorMsg && (
          <div className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-800">{errorMsg}</div>
        )}

        <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <label className="block text-xs font-semibold text-slate-700">
            Option A: Live Tide-Forecast URL
          </label>
          <input
            type="text"
            value={baselineName}
            onChange={(e) => setBaselineName(e.target.value)}
            placeholder="Baseline label"
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs"
          />
          <div className="flex gap-2">
            <input
              type="url"
              value={baselineUrl}
              onChange={(e) => setBaselineUrl(e.target.value)}
              placeholder="https://www.tide-forecast.com/locations/Allen-2/tides/latest"
              className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs"
            />
            <button
              type="button"
              onClick={handleFetchLive}
              disabled={fetching || !baselineUrl}
              className="inline-flex items-center gap-1.5 rounded-lg bg-sky-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-sky-800 disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${fetching ? 'animate-spin' : ''}`} />
              {fetching ? 'Fetching...' : 'Fetch Live'}
            </button>
          </div>
          {spot.lastFetchedAt && (
            <p className="text-[11px] text-slate-500">
              Last fetched: {new Date(spot.lastFetchedAt).toLocaleString()}
            </p>
          )}
        </div>

        <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-700">
              Option B: Quick Paste Table (NAMRIA / Tideschart / CSV)
            </label>
            <input
              type="date"
              value={defaultDate}
              onChange={(e) => setDefaultDate(e.target.value)}
              className="rounded border border-slate-300 bg-white px-2 py-0.5 text-[11px]"
            />
          </div>
          <textarea
            rows={4}
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            placeholder={
              'Paste lines like:\n2026-11-26 Low Tide 12:19 PM 0.65 m\n2026-11-26 High Tide 6:16 PM 1.62 m'
            }
            className="w-full rounded-lg border border-slate-300 bg-white p-2.5 font-mono text-xs"
          />
          <button
            type="button"
            onClick={handleImportPaste}
            disabled={!pasteText.trim()}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
          >
            Parse & Merge Events
          </button>
        </div>

        <div className="max-h-56 overflow-y-auto rounded-lg border border-slate-200">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 bg-slate-100 text-slate-600">
              <tr>
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Time</th>
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2">Height</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {spot.events.map((ev) => (
                <tr key={ev.id}>
                  <td className="px-3 py-1.5 text-slate-600">{ev.localDate}</td>
                  <td className="px-3 py-1.5 font-medium text-slate-800">{ev.localTime}</td>
                  <td className="px-3 py-1.5 uppercase">
                    <span
                      className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                        ev.type === 'high'
                          ? 'bg-teal-100 text-teal-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {ev.type}
                    </span>
                  </td>
                  <td className="px-3 py-1.5 text-slate-700">{ev.heightM.toFixed(2)} m</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
