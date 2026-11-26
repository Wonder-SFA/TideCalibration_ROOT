import React, { useState } from 'react';
import { X } from 'lucide-react';
import { fetchTideForecast } from '../lib/tideClient';
import type { CalibrationSpot, TideEvent } from '../types';

interface NewSpotModalProps {
  customProxyUrl: string;
  onCreateSpot: (spot: CalibrationSpot) => Promise<void>;
  onClose: () => void;
}

export const NewSpotModal: React.FC<NewSpotModalProps> = ({
  customProxyUrl,
  onCreateSpot,
  onClose,
}) => {
  const [name, setName] = useState('');
  const [baselineUrl, setBaselineUrl] = useState('');
  const [creating, setCreating] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    setErr(null);

    let events: TideEvent[] = [];
    let baselineName = 'Manual Tide Chart';
    let lastFetchedAt: string | undefined;

    if (baselineUrl.trim()) {
      try {
        const res = await fetchTideForecast(baselineUrl.trim(), customProxyUrl);
        events = res.events;
        baselineName = `${res.locationName} (Tide-Forecast)`;
        lastFetchedAt = res.fetchedAt;
      } catch (e) {
        setErr(
          e instanceof Error
            ? `${e.message} (You can still create the spot and paste tide events manually.)`
            : 'Could not fetch URL.'
        );
      }
    }

    const spot: CalibrationSpot = {
      id: `spot-${Date.now()}`,
      name: name.trim(),
      latitude: null,
      longitude: null,
      baselineName,
      baselineUrl: baselineUrl.trim(),
      baselineSourceType: baselineUrl.trim() ? 'tide-forecast' : 'manual',
      landmarks: [
        {
          id: `lm-${Date.now()}-1`,
          name: 'Primary Shoreline / Seawall',
          description: 'Waterline height on fixed rock, piling, or seawall.',
          order: 1,
        },
        {
          id: `lm-${Date.now()}-2`,
          name: 'Inner Reef / Tidal Flat',
          description: 'Exposed vs submerged inner flat or sandbar.',
          order: 2,
        },
      ],
      events,
      lastFetchedAt,
      createdAt: new Date().toISOString(),
    };

    await onCreateSpot(spot);
    setCreating(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <form onSubmit={handleSubmit} className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900">New Calibration Spot</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-700">Shoreline Spot Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Rosario Beach, Northern Samar"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700">
              Baseline Tide-Forecast URL (optional)
            </label>
            <input
              type="url"
              value={baselineUrl}
              onChange={(e) => setBaselineUrl(e.target.value)}
              placeholder="https://www.tide-forecast.com/locations/Allen-2/tides/latest"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
            />
          </div>
          {err && <p className="text-xs text-amber-700">{err}</p>}
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={creating}
            className="rounded-lg bg-teal-700 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-800"
          >
            {creating ? 'Creating...' : 'Create Spot'}
          </button>
        </div>
      </form>
    </div>
  );
};
