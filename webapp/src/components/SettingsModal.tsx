import React, { useState } from 'react';
import { CheckCircle2, Download, RotateCcw, Upload, X } from 'lucide-react';
import { exportAllData, importAllData, type ExportBundle } from '../lib/db';
import { fetchTideForecast } from '../lib/tideClient';
import type { AppSettings } from '../types';

interface SettingsModalProps {
  settings: AppSettings;
  onSaveSettings: (next: AppSettings) => Promise<void>;
  onResetSeed: () => Promise<void>;
  onReloadAll: () => Promise<void>;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  settings,
  onSaveSettings,
  onResetSeed,
  onReloadAll,
  onClose,
}) => {
  const [proxyUrl, setProxyUrl] = useState(settings.customProxyUrl);
  const [units, setUnits] = useState(settings.units);
  const [includePhotos, setIncludePhotos] = useState(true);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleTestProxy = async () => {
    setBusy(true);
    setTestResult(null);
    try {
      const res = await fetchTideForecast(
        'https://www.tide-forecast.com/locations/Allen-2/tides/latest',
        proxyUrl
      );
      setTestResult(`OK: Fetched ${res.events.length} events for ${res.locationName}.`);
    } catch (err) {
      setTestResult(`Error: ${err instanceof Error ? err.message : 'Proxy test failed'}`);
    } finally {
      setBusy(false);
    }
  };

  const handleSave = async () => {
    await onSaveSettings({
      ...settings,
      customProxyUrl: proxyUrl.trim(),
      units,
    });
    onClose();
  };

  const handleExportJson = async () => {
    setBusy(true);
    try {
      const bundle = await exportAllData(includePhotos);
      const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tide_calibration_backup_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setBusy(false);
    }
  };

  const handleImportJson = async (file: File | null) => {
    if (!file) return;
    setBusy(true);
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as ExportBundle;
      await importAllData(parsed);
      await onReloadAll();
      setTestResult('Backup imported successfully.');
    } catch (err) {
      setTestResult(`Import failed: ${err instanceof Error ? err.message : 'Invalid JSON'}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-5 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900">Settings & Local Backup</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-5">
          {/* Custom Proxy URL */}
          <div className="space-y-2 rounded-xl border border-slate-200 p-3.5">
            <label className="block text-xs font-semibold text-slate-800">
              Custom <code>/api/tide</code> Proxy URL (Optional)
            </label>
            <p className="text-[11px] text-slate-500">
              Leave blank to use this app&apos;s built-in <code>/api/tide</code> endpoint. Power users can point to their own Cloudflare/Vercel/Netlify instance.
            </p>
            <div className="flex gap-2">
              <input
                type="url"
                value={proxyUrl}
                onChange={(e) => setProxyUrl(e.target.value)}
                placeholder="https://my-proxy.example.com/api/tide"
                className="flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xs"
              />
              <button
                type="button"
                onClick={handleTestProxy}
                disabled={busy}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Test
              </button>
            </div>
            {testResult && (
              <div className="flex items-center gap-1.5 text-xs text-slate-700">
                <CheckCircle2 className="h-3.5 w-3.5 text-teal-600" />
                {testResult}
              </div>
            )}
          </div>

          {/* Units */}
          <div className="flex items-center justify-between rounded-xl border border-slate-200 p-3.5">
            <div>
              <div className="text-xs font-semibold text-slate-800">Display Units</div>
              <div className="text-[11px] text-slate-500">Meters (m) or Feet (ft)</div>
            </div>
            <div className="flex rounded-lg border border-slate-200 p-0.5 text-xs">
              {(['metric', 'imperial'] as const).map((u) => (
                <button
                  key={u}
                  type="button"
                  onClick={() => setUnits(u)}
                  className={`rounded-md px-3 py-1 font-medium capitalize ${
                    units === u ? 'bg-teal-700 text-white' : 'text-slate-600'
                  }`}
                >
                  {u}
                </button>
              ))}
            </div>
          </div>

          {/* JSON Export / Import */}
          <div className="space-y-3 rounded-xl border border-slate-200 p-3.5">
            <div className="text-xs font-semibold text-slate-800">
              Private Browser Data (IndexedDB Backup)
            </div>
            <label className="flex items-center gap-2 text-xs text-slate-600">
              <input
                type="checkbox"
                checked={includePhotos}
                onChange={(e) => setIncludePhotos(e.target.checked)}
                className="accent-teal-700"
              />
              Include full-resolution shore photos in JSON backup
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleExportJson}
                disabled={busy}
                className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-900"
              >
                <Download className="h-3.5 w-3.5" /> Export JSON
              </button>
              <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                <Upload className="h-3.5 w-3.5" /> Import JSON
                <input
                  type="file"
                  accept="application/json"
                  className="hidden"
                  onChange={(e) => handleImportJson(e.target.files?.[0] ?? null)}
                />
              </label>
              <button
                type="button"
                onClick={onResetSeed}
                className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Reset to San Isidro Seed
              </button>
            </div>
          </div>
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
            type="button"
            onClick={handleSave}
            className="rounded-lg bg-teal-700 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-800"
          >
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
};
