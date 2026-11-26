import { localDateTimeToMs, type ParsedTideResponse } from '../../shared/tideParser';
import type { TideEvent } from '../types';

export async function fetchTideForecast(
  targetUrl: string,
  customProxyUrl?: string
): Promise<ParsedTideResponse> {
  const base = customProxyUrl?.trim() ? customProxyUrl.trim().replace(/\/+$/, '') : '/api/tide';
  const endpoint = `${base}?url=${encodeURIComponent(targetUrl.trim())}`;

  const res = await fetch(endpoint);
  const data = await res.json().catch(() => null);

  if (!res.ok) {
    throw new Error(data?.error || `Tide proxy returned HTTP ${res.status}`);
  }

  if (!data || !Array.isArray(data.events)) {
    throw new Error('Unexpected response format from /api/tide');
  }

  return data as ParsedTideResponse;
}

const MONTHS: Record<string, number> = {
  january: 1,
  jan: 1,
  february: 2,
  feb: 2,
  march: 3,
  mar: 3,
  april: 4,
  apr: 4,
  may: 5,
  june: 6,
  jun: 6,
  july: 7,
  jul: 7,
  august: 8,
  aug: 8,
  september: 9,
  sep: 9,
  sept: 9,
  october: 10,
  oct: 10,
  november: 11,
  nov: 11,
  december: 12,
  dec: 12,
};

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function parseFlexibleTime(raw: string): string | null {
  const m12 = raw.match(/(\d{1,2}):(\d{2})\s*([AP]M)/i);
  if (m12) {
    let h = parseInt(m12[1], 10);
    const min = parseInt(m12[2], 10);
    const ampm = m12[3].toUpperCase();
    if (ampm === 'AM') {
      if (h === 12 || h === 0) h = 0;
    } else if (h !== 12) {
      h += 12;
    }
    return `${pad2(h)}:${pad2(min)}`;
  }

  const m24 = raw.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/);
  if (m24) {
    return `${pad2(parseInt(m24[1], 10))}:${m24[2]}`;
  }
  return null;
}

/**
 * Parses copy-pasted tide tables from Tide-Forecast, Tideschart, NAMRIA, or CSV lines.
 * Supports lines like:
 *   High Tide | 6:50 AM (Thu 26 November) | 1.76 m
 *   2026-11-26, 06:50, High, 1.76
 *   Low Tide 12:19 PM 0.65m
 */
export function parsePastedTideTable(text: string, defaultDate: string): TideEvent[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const events: TideEvent[] = [];
  const seen = new Set<string>();
  let currentDate = defaultDate;
  const defaultYear = parseInt(defaultDate.slice(0, 4), 10) || new Date().getFullYear();

  for (const line of lines) {
    const isoDateMatch = line.match(/\b(20\d{2}-\d{2}-\d{2})\b/);
    if (isoDateMatch) {
      currentDate = isoDateMatch[1];
    } else {
      const textDateMatch = line.match(
        /\b(\d{1,2})\s+(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)(?:\s+(20\d{2}))?\b/i
      );
      if (textDateMatch) {
        const day = parseInt(textDateMatch[1], 10);
        const month = MONTHS[textDateMatch[2].toLowerCase()];
        const year = textDateMatch[3] ? parseInt(textDateMatch[3], 10) : defaultYear;
        if (month && day >= 1 && day <= 31) {
          currentDate = `${year}-${pad2(month)}-${pad2(day)}`;
        }
      }
    }

    const typeMatch = line.match(/\b(high|low)\b/i);
    const localTime = parseFlexibleTime(line);
    if (!typeMatch || !localTime) continue;

    const type = typeMatch[1].toLowerCase() === 'high' ? 'high' : 'low';

    // Look for height in meters (or bare decimal after time/type)
    const meterMatch = line.match(/([+-]?\d+(?:\.\d+)?)\s*m\b/i);
    const ftMatch = line.match(/([+-]?\d+(?:\.\d+)?)\s*ft\b/i);
    let heightM = meterMatch ? parseFloat(meterMatch[1]) : NaN;
    if (Number.isNaN(heightM)) {
      const bareMatches = [...line.matchAll(/(?:^|[\s,|])([+-]?\d+\.\d+)(?:$|[\s,|])/g)];
      if (bareMatches.length > 0) {
        heightM = parseFloat(bareMatches[bareMatches.length - 1][1]);
      } else {
        heightM = type === 'high' ? 1.5 : 0.3;
      }
    }

    const key = `${currentDate}_${localTime}_${type}`;
    if (seen.has(key)) continue;
    seen.add(key);

    events.push({
      id: key,
      type,
      localDate: currentDate,
      localTime,
      timestampMs: localDateTimeToMs(currentDate, localTime),
      heightM,
      heightFt: ftMatch ? parseFloat(ftMatch[1]) : undefined,
    });
  }

  return events.sort((a, b) => a.timestampMs - b.timestampMs);
}
