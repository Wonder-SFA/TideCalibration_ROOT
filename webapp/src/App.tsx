import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Anchor, Camera, Compass, ListChecks, Plus, Settings, Sliders } from 'lucide-react';
import { NewSpotModal } from './components/NewSpotModal';
import { ObservationsTab } from './components/ObservationsTab';
import { OverviewTab } from './components/OverviewTab';
import { QuickLogTab } from './components/QuickLogTab';
import { SettingsModal } from './components/SettingsModal';
import { SetupTab } from './components/SetupTab';
import { solveCalibration } from './lib/calibration';
import {
  clearAllData,
  deleteObservation,
  deleteSpot,
  getAllSpots,
  getObservationsForSpot,
  getPhotosForSpot,
  getSettings,
  saveObservation,
  savePhotos,
  saveSettings,
  saveSpot,
} from './lib/db';
import { ensureSeedData } from './lib/seedData';
import type { AppSettings, CalibrationSpot, Observation, StoredPhoto } from './types';

type TabId = 'overview' | 'quick-log' | 'observations' | 'setup';

export function App() {
  const [loading, setLoading] = useState(true);
  const [spots, setSpots] = useState<CalibrationSpot[]>([]);
  const [settings, setSettings] = useState<AppSettings>({
    id: 'app',
    customProxyUrl: '',
    units: 'metric',
    activeSpotId: 'spot-san-isidro',
  });
  const [observations, setObservations] = useState<Observation[]>([]);
  const [photos, setPhotos] = useState<StoredPhoto[]>([]);
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [prefillTs, setPrefillTs] = useState<number | null>(null);
  const [highlightedObsId, setHighlightedObsId] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showNewSpot, setShowNewSpot] = useState(false);

  const loadAll = useCallback(async () => {
    setLoading(true);
    await ensureSeedData();
    const [loadedSpots, loadedSettings] = await Promise.all([getAllSpots(), getSettings()]);
    const activeId =
      loadedSpots.find((s) => s.id === loadedSettings.activeSpotId)?.id ?? loadedSpots[0]?.id ?? '';
    setSpots(loadedSpots);
    setSettings({ ...loadedSettings, activeSpotId: activeId });

    if (activeId) {
      const [obs, ph] = await Promise.all([
        getObservationsForSpot(activeId),
        getPhotosForSpot(activeId),
      ]);
      setObservations(obs);
      setPhotos(ph);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const activeSpot = useMemo(
    () => spots.find((s) => s.id === settings.activeSpotId) ?? spots[0],
    [spots, settings.activeSpotId]
  );

  // Align wall-clock "Now" to browser local wall-clock in UTC epoch (matching EXIF/chart)
  const nowMs = useMemo(() => {
    const d = new Date();
    return Date.UTC(
      d.getFullYear(),
      d.getMonth(),
      d.getDate(),
      d.getHours(),
      d.getMinutes(),
      d.getSeconds()
    );
  }, []);

  const calibration = useMemo(() => {
    if (!activeSpot) {
      return {
        observationCount: 0,
        bestOffsetMinutes: null,
        altInversionMinutes: null,
        ambiguousInversion: false,
        confidence: 'none' as const,
        rmsErrorPct: null,
        perObservationResiduals: {},
        landmarkThresholds: [],
        summaryFormula: '',
      };
    }
    return solveCalibration(activeSpot, observations);
  }, [activeSpot, observations]);

  const handleSelectSpot = async (spotId: string) => {
    const nextSettings = { ...settings, activeSpotId: spotId };
    setSettings(nextSettings);
    await saveSettings(nextSettings);
    const [obs, ph] = await Promise.all([getObservationsForSpot(spotId), getPhotosForSpot(spotId)]);
    setObservations(obs);
    setPhotos(ph);
  };

  const handleSaveObservation = async (obs: Observation, newPhotos: StoredPhoto[]) => {
    await saveObservation(obs);
    await savePhotos(newPhotos);
    const [obsList, phList] = await Promise.all([
      getObservationsForSpot(obs.spotId),
      getPhotosForSpot(obs.spotId),
    ]);
    setObservations(obsList);
    setPhotos(phList);
    setPrefillTs(null);
  };

  const handleDeleteObservation = async (obsId: string) => {
    if (!activeSpot) return;
    await deleteObservation(obsId);
    const [obsList, phList] = await Promise.all([
      getObservationsForSpot(activeSpot.id),
      getPhotosForSpot(activeSpot.id),
    ]);
    setObservations(obsList);
    setPhotos(phList);
  };

  const handleUpdateSpot = async (updated: CalibrationSpot) => {
    await saveSpot(updated);
    setSpots((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
  };

  const handleCreateSpot = async (spot: CalibrationSpot) => {
    await saveSpot(spot);
    const nextSettings = { ...settings, activeSpotId: spot.id };
    await saveSettings(nextSettings);
    setSpots((prev) => [...prev, spot]);
    setSettings(nextSettings);
    setObservations([]);
    setPhotos([]);
    setActiveTab('setup');
  };

  const handleDeleteSpot = async (spotId: string) => {
    if (spots.length <= 1) return;
    await deleteSpot(spotId);
    await loadAll();
    setActiveTab('overview');
  };

  const handleResetSeed = async () => {
    await clearAllData();
    await loadAll();
    setShowSettings(false);
  };

  if (loading || !activeSpot) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-sm text-slate-600">
        Loading Tide Calibration workspace...
      </div>
    );
  }

  const tabs: Array<{ id: TabId; label: string; icon: React.ReactNode }> = [
    { id: 'overview', label: 'Overview & Curve', icon: <Compass className="h-4 w-4" /> },
    { id: 'quick-log', label: 'Quick Log', icon: <Camera className="h-4 w-4" /> },
    {
      id: 'observations',
      label: `Observations (${observations.length})`,
      icon: <ListChecks className="h-4 w-4" />,
    },
    { id: 'setup', label: 'Spot Setup', icon: <Sliders className="h-4 w-4" /> },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-700 text-white shadow-sm">
              <Anchor className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-slate-900 sm:text-base">Tide Calibration</h1>
              <p className="text-[11px] text-slate-500">
                Empirical chart-to-shoreline offset calibrator
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={activeSpot.id}
              onChange={(e) => handleSelectSpot(e.target.value)}
              className="max-w-[220px] rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800"
            >
              {spots.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setShowNewSpot(true)}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
              title="Add new shoreline spot"
            >
              <Plus className="h-3.5 w-3.5" /> Spot
            </button>
            <button
              type="button"
              onClick={() => setShowSettings(true)}
              className="rounded-lg border border-slate-300 bg-white p-1.5 text-slate-600 hover:bg-slate-50"
              title="Settings & Backup"
            >
              <Settings className="h-4 w-4" />
            </button>
          </div>
        </div>

        <nav className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4">
          {tabs.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2.5 text-xs font-semibold transition ${
                  active
                    ? 'border-teal-700 text-teal-800'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            );
          })}
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        {activeTab === 'overview' && (
          <OverviewTab
            spot={activeSpot}
            observations={observations}
            calibration={calibration}
            nowMs={nowMs}
            units={settings.units}
            onGoToQuickLog={(ts) => {
              setPrefillTs(ts ?? null);
              setActiveTab('quick-log');
            }}
            onSelectObservation={(obs) => {
              setHighlightedObsId(obs.id);
              setActiveTab('observations');
            }}
          />
        )}

        {activeTab === 'quick-log' && (
          <QuickLogTab
            spot={activeSpot}
            existingObservations={observations}
            existingPhotos={photos}
            prefillTimestampMs={prefillTs}
            onSaveObservation={handleSaveObservation}
          />
        )}

        {activeTab === 'observations' && (
          <ObservationsTab
            spot={activeSpot}
            observations={observations}
            photos={photos}
            calibration={calibration}
            highlightedObsId={highlightedObsId}
            onDeleteObservation={handleDeleteObservation}
          />
        )}

        {activeTab === 'setup' && (
          <SetupTab
            key={activeSpot.id}
            spot={activeSpot}
            customProxyUrl={settings.customProxyUrl}
            onUpdateSpot={handleUpdateSpot}
            onDeleteSpot={handleDeleteSpot}
            canDeleteSpot={spots.length > 1}
          />
        )}
      </main>

      {showSettings && (
        <SettingsModal
          settings={settings}
          onSaveSettings={async (next) => {
            await saveSettings(next);
            setSettings(next);
          }}
          onResetSeed={handleResetSeed}
          onReloadAll={loadAll}
          onClose={() => setShowSettings(false)}
        />
      )}

      {showNewSpot && (
        <NewSpotModal
          customProxyUrl={settings.customProxyUrl}
          onCreateSpot={handleCreateSpot}
          onClose={() => setShowNewSpot(false)}
        />
      )}
    </div>
  );
}

export default App;
