import { localDateTimeToMs } from '../../shared/tideParser';
import type { CalibrationSpot, Observation, StoredPhoto, TideEvent } from '../types';
import { getAllSpots, saveObservation, savePhotos, saveSettings, saveSpot } from './db';

function makeEvent(
  localDate: string,
  localTime: string,
  type: 'high' | 'low',
  heightM: number
): TideEvent {
  return {
    id: `${localDate}_${localTime}_${type}`,
    type,
    localDate,
    localTime,
    timestampMs: localDateTimeToMs(localDate, localTime),
    heightM,
  };
}

export const SAN_ISIDRO_SPOT: CalibrationSpot = {
  id: 'spot-san-isidro',
  name: 'San Isidro, Northern Samar',
  latitude: 12.388,
  longitude: 124.331,
  baselineName: 'Allen, Northern Samar (Tide-Forecast)',
  baselineUrl: 'https://www.tide-forecast.com/locations/Allen-2/tides/latest',
  baselineSourceType: 'tide-forecast',
  landmarks: [
    {
      id: 'lm-seawall',
      name: 'Concrete seawall & moored boats',
      description: 'Water height on the seawall; whether outrigger boats are floating or resting on the flat.',
      order: 1,
    },
    {
      id: 'lm-reef-flat',
      name: 'Rocky reef flat',
      description: 'Exposed rocky reef flat directly past the seawall.',
      order: 2,
    },
    {
      id: 'lm-reef-bar',
      name: 'Long exposed reef bar / shoal',
      description: 'Distant reef bar / shoal visible past the single foreground coconut tree.',
      order: 3,
    },
  ],
  events: [
    // Nov 26, 2026 (from Allen baseline + tide_log.md)
    makeEvent('2026-11-26', '00:17', 'low', -0.12),
    makeEvent('2026-11-26', '06:50', 'high', 1.76),
    makeEvent('2026-11-26', '12:19', 'low', 0.65),
    makeEvent('2026-11-26', '18:16', 'high', 1.62),
    // Nov 27, 2026
    makeEvent('2026-11-27', '01:02', 'low', -0.18),
    makeEvent('2026-11-27', '07:38', 'high', 1.81),
    makeEvent('2026-11-27', '13:11', 'low', 0.58),
    makeEvent('2026-11-27', '19:08', 'high', 1.56),
    // Nov 28, 2026
    makeEvent('2026-11-28', '01:49', 'low', -0.2),
    makeEvent('2026-11-28', '08:27', 'high', 1.84),
    makeEvent('2026-11-28', '14:05', 'low', 0.51),
    makeEvent('2026-11-28', '20:03', 'high', 1.51),
  ],
  createdAt: '2026-11-26T06:47:07Z',
};

export const ENTRY_1_OBSERVATION: Observation = {
  id: 'obs-entry-01',
  spotId: 'spot-san-isidro',
  localDate: '2026-11-26',
  localTime: '06:47:07',
  timestampMs: Date.UTC(2026, 10, 26, 6, 47, 7, 0),
  exifVerified: true,
  stage: 'low',
  levelPercent: 5,
  landmarkStates: {
    'lm-seawall': 'exposed',
    'lm-reef-flat': 'exposed',
    'lm-reef-bar': 'exposed',
  },
  photoIds: ['photo-entry-01-a', 'photo-entry-01-b'],
  notes:
    'Entry #1: Chart predicts peak High Tide (6:50 AM) while actual San Isidro shore is at Low Tide — ~5.5–6 hr inversion.',
  createdAt: '2026-11-26T06:47:20Z',
};

export async function ensureSeedData(): Promise<void> {
  const existing = await getAllSpots();
  if (existing.length > 0) return;

  await saveSpot(SAN_ISIDRO_SPOT);
  await saveObservation(ENTRY_1_OBSERVATION);
  await saveSettings({
    id: 'app',
    customProxyUrl: '',
    units: 'metric',
    activeSpotId: SAN_ISIDRO_SPOT.id,
  });

  // Load Entry #1 photos from /seed/ if available
  const seedFiles = [
    { id: 'photo-entry-01-a', filename: '20261126_064707.jpg', exifTimestamp: '2026-11-26 06:47:07' },
    { id: 'photo-entry-01-b', filename: '20261126_064720.jpg', exifTimestamp: '2026-11-26 06:47:20' },
  ];

  const photosToStore: StoredPhoto[] = [];
  for (const item of seedFiles) {
    try {
      const res = await fetch(`/seed/${item.filename}`);
      if (!res.ok) continue;
      const blob = await res.blob();
      photosToStore.push({
        id: item.id,
        spotId: SAN_ISIDRO_SPOT.id,
        observationId: ENTRY_1_OBSERVATION.id,
        filename: item.filename,
        mimeType: blob.type || 'image/jpeg',
        blob,
        exifTimestamp: item.exifTimestamp,
        createdAt: '2026-11-26T06:47:20Z',
      });
    } catch {
      // Ignore if running in an environment without /seed/
    }
  }

  if (photosToStore.length > 0) {
    await savePhotos(photosToStore);
  }
}
