import exifr from 'exifr';

export interface ExtractedExif {
  localDate?: string; // YYYY-MM-DD
  localTime?: string; // HH:mm:ss
  timestampMs?: number;
  latitude?: number;
  longitude?: number;
  exifVerified: boolean;
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

export async function extractPhotoExif(file: File): Promise<ExtractedExif> {
  try {
    const data = await exifr.parse(file, {
      tiff: true,
      exif: true,
      gps: true,
      pick: ['DateTimeOriginal', 'CreateDate', 'latitude', 'longitude'],
    });

    if (!data) {
      return { exifVerified: false };
    }

    const dt: Date | undefined =
      data.DateTimeOriginal instanceof Date
        ? data.DateTimeOriginal
        : data.CreateDate instanceof Date
          ? data.CreateDate
          : undefined;

    let localDate: string | undefined;
    let localTime: string | undefined;
    let timestampMs: number | undefined;

    if (dt && !Number.isNaN(dt.getTime())) {
      const y = dt.getFullYear();
      const mo = dt.getMonth() + 1;
      const d = dt.getDate();
      const h = dt.getHours();
      const mi = dt.getMinutes();
      const s = dt.getSeconds();
      localDate = `${y}-${pad2(mo)}-${pad2(d)}`;
      localTime = `${pad2(h)}:${pad2(mi)}:${pad2(s)}`;
      timestampMs = Date.UTC(y, mo - 1, d, h, mi, s, 0);
    }

    return {
      localDate,
      localTime,
      timestampMs,
      latitude: typeof data.latitude === 'number' ? Number(data.latitude.toFixed(5)) : undefined,
      longitude: typeof data.longitude === 'number' ? Number(data.longitude.toFixed(5)) : undefined,
      exifVerified: Boolean(localDate && localTime),
    };
  } catch {
    return { exifVerified: false };
  }
}
