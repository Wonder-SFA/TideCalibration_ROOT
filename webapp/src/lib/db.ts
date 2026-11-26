import type {
  AppSettings,
  CalibrationSpot,
  Observation,
  StoredPhoto,
  TideEvent,
} from '../types';

const DB_NAME = 'tide-calibration-db';
const DB_VERSION = 1;

let dbPromise: Promise<IDBDatabase> | null = null;

export function openDatabase(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('spots')) {
        db.createObjectStore('spots', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('observations')) {
        const obs = db.createObjectStore('observations', { keyPath: 'id' });
        obs.createIndex('by_spot', 'spotId', { unique: false });
      }
      if (!db.objectStoreNames.contains('photos')) {
        const photos = db.createObjectStore('photos', { keyPath: 'id' });
        photos.createIndex('by_spot', 'spotId', { unique: false });
        photos.createIndex('by_observation', 'observationId', { unique: false });
      }
      if (!db.objectStoreNames.contains('tideCache')) {
        db.createObjectStore('tideCache', { keyPath: 'url' });
      }
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  return dbPromise;
}

function reqToPromise<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function txDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

export async function getAllSpots(): Promise<CalibrationSpot[]> {
  const db = await openDatabase();
  const tx = db.transaction('spots', 'readonly');
  const spots = await reqToPromise(tx.objectStore('spots').getAll());
  return (spots as CalibrationSpot[]).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function saveSpot(spot: CalibrationSpot): Promise<void> {
  const db = await openDatabase();
  const tx = db.transaction('spots', 'readwrite');
  tx.objectStore('spots').put(spot);
  await txDone(tx);
}

export async function deleteSpot(spotId: string): Promise<void> {
  const db = await openDatabase();
  const tx = db.transaction(['spots', 'observations', 'photos'], 'readwrite');
  tx.objectStore('spots').delete(spotId);

  const obsStore = tx.objectStore('observations');
  const obsList = (await reqToPromise(obsStore.index('by_spot').getAll(spotId))) as Observation[];
  for (const o of obsList) {
    obsStore.delete(o.id);
  }

  const photoStore = tx.objectStore('photos');
  const photoList = (await reqToPromise(photoStore.index('by_spot').getAll(spotId))) as StoredPhoto[];
  for (const p of photoList) {
    photoStore.delete(p.id);
  }

  await txDone(tx);
}

export async function getObservationsForSpot(spotId: string): Promise<Observation[]> {
  const db = await openDatabase();
  const tx = db.transaction('observations', 'readonly');
  const list = (await reqToPromise(
    tx.objectStore('observations').index('by_spot').getAll(spotId)
  )) as Observation[];
  return list.sort((a, b) => a.timestampMs - b.timestampMs);
}

export async function saveObservation(obs: Observation): Promise<void> {
  const db = await openDatabase();
  const tx = db.transaction('observations', 'readwrite');
  tx.objectStore('observations').put(obs);
  await txDone(tx);
}

export async function deleteObservation(obsId: string): Promise<void> {
  const db = await openDatabase();
  const tx = db.transaction(['observations', 'photos'], 'readwrite');
  tx.objectStore('observations').delete(obsId);

  const photoStore = tx.objectStore('photos');
  const photos = (await reqToPromise(
    photoStore.index('by_observation').getAll(obsId)
  )) as StoredPhoto[];
  for (const p of photos) {
    photoStore.delete(p.id);
  }

  await txDone(tx);
}

export async function savePhotos(photos: StoredPhoto[]): Promise<void> {
  if (photos.length === 0) return;
  const db = await openDatabase();
  const tx = db.transaction('photos', 'readwrite');
  const store = tx.objectStore('photos');
  for (const p of photos) {
    store.put(p);
  }
  await txDone(tx);
}

export async function getPhotosForSpot(spotId: string): Promise<StoredPhoto[]> {
  const db = await openDatabase();
  const tx = db.transaction('photos', 'readonly');
  return (await reqToPromise(
    tx.objectStore('photos').index('by_spot').getAll(spotId)
  )) as StoredPhoto[];
}

export async function getSettings(): Promise<AppSettings> {
  const db = await openDatabase();
  const tx = db.transaction('settings', 'readonly');
  const found = (await reqToPromise(tx.objectStore('settings').get('app'))) as AppSettings | undefined;
  return (
    found ?? {
      id: 'app',
      customProxyUrl: '',
      units: 'metric',
      activeSpotId: 'spot-san-isidro',
    }
  );
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  const db = await openDatabase();
  const tx = db.transaction('settings', 'readwrite');
  tx.objectStore('settings').put(settings);
  await txDone(tx);
}

export async function cacheTideEvents(
  url: string,
  locationName: string,
  events: TideEvent[]
): Promise<void> {
  const db = await openDatabase();
  const tx = db.transaction('tideCache', 'readwrite');
  tx.objectStore('tideCache').put({
    url,
    locationName,
    events,
    fetchedAt: new Date().toISOString(),
  });
  await txDone(tx);
}

export interface ExportBundle {
  version: 1;
  exportedAt: string;
  settings: AppSettings;
  spots: CalibrationSpot[];
  observations: Observation[];
  photos?: Array<{
    id: string;
    spotId: string;
    observationId: string;
    filename: string;
    mimeType: string;
    dataUrl: string;
    exifTimestamp?: string;
    createdAt: string;
  }>;
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

function dataUrlToBlob(dataUrl: string): Blob {
  const [header, b64] = dataUrl.split(',');
  const mime = header.match(/data:([^;]+)/)?.[1] ?? 'image/jpeg';
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) {
    bytes[i] = bin.charCodeAt(i);
  }
  return new Blob([bytes], { type: mime });
}

export async function exportAllData(includePhotos: boolean): Promise<ExportBundle> {
  const db = await openDatabase();
  const settings = await getSettings();
  const spots = await getAllSpots();

  const obsTx = db.transaction('observations', 'readonly');
  const observations = (await reqToPromise(obsTx.objectStore('observations').getAll())) as Observation[];

  const bundle: ExportBundle = {
    version: 1,
    exportedAt: new Date().toISOString(),
    settings,
    spots,
    observations,
  };

  if (includePhotos) {
    const pTx = db.transaction('photos', 'readonly');
    const rawPhotos = (await reqToPromise(pTx.objectStore('photos').getAll())) as StoredPhoto[];
    bundle.photos = await Promise.all(
      rawPhotos.map(async (p) => ({
        id: p.id,
        spotId: p.spotId,
        observationId: p.observationId,
        filename: p.filename,
        mimeType: p.mimeType,
        dataUrl: await blobToDataUrl(p.blob),
        exifTimestamp: p.exifTimestamp,
        createdAt: p.createdAt,
      }))
    );
  }

  return bundle;
}

export async function importAllData(bundle: ExportBundle): Promise<void> {
  if (!bundle || bundle.version !== 1 || !Array.isArray(bundle.spots)) {
    throw new Error('Invalid Tide Calibration backup file.');
  }
  const db = await openDatabase();
  const tx = db.transaction(['spots', 'observations', 'photos', 'settings'], 'readwrite');
  tx.objectStore('spots').clear();
  tx.objectStore('observations').clear();
  tx.objectStore('photos').clear();

  for (const s of bundle.spots) {
    tx.objectStore('spots').put(s);
  }
  for (const o of bundle.observations ?? []) {
    tx.objectStore('observations').put(o);
  }
  for (const p of bundle.photos ?? []) {
    tx.objectStore('photos').put({
      id: p.id,
      spotId: p.spotId,
      observationId: p.observationId,
      filename: p.filename,
      mimeType: p.mimeType,
      blob: dataUrlToBlob(p.dataUrl),
      exifTimestamp: p.exifTimestamp,
      createdAt: p.createdAt,
    } satisfies StoredPhoto);
  }
  if (bundle.settings) {
    tx.objectStore('settings').put(bundle.settings);
  }
  await txDone(tx);
}

export async function clearAllData(): Promise<void> {
  const db = await openDatabase();
  const tx = db.transaction(['spots', 'observations', 'photos', 'tideCache', 'settings'], 'readwrite');
  tx.objectStore('spots').clear();
  tx.objectStore('observations').clear();
  tx.objectStore('photos').clear();
  tx.objectStore('tideCache').clear();
  tx.objectStore('settings').clear();
  await txDone(tx);
}
