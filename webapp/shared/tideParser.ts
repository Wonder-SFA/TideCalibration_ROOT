export interface ParsedTideEvent {
  id: string;
  type: 'high' | 'low';
  localDate: string; // YYYY-MM-DD
  localTime: string; // HH:mm (24h)
  timestampMs: number;
  heightM: number;
  heightFt?: number;
}

export interface ParsedTideResponse {
  source: 'tide-forecast';
  url: string;
  locationName: string;
  fetchedAt: string;
  events: ParsedTideEvent[];
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

export function isAllowedTideUrl(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl.trim());
    if (parsed.protocol !== 'https:') return false;
    const host = parsed.hostname.toLowerCase();
    if (host !== 'www.tide-forecast.com' && host !== 'tide-forecast.com') {
      return false;
    }
    return parsed.pathname.startsWith('/locations/');
  } catch {
    return false;
  }
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function parse12HourTime(timeStr: string): { hour: number; minute: number } | null {
  const m = timeStr.trim().match(/^(\d{1,2}):(\d{2})\s*([AP]M)$/i);
  if (!m) return null;
  let hour = parseInt(m[1], 10);
  const minute = parseInt(m[2], 10);
  const ampm = m[3].toUpperCase();
  if (minute < 0 || minute > 59 || hour < 0 || hour > 12) return null;

  // Tide-Forecast formats midnight-hour times as "00:17 AM" (and sometimes "12:17 AM")
  if (ampm === 'AM') {
    if (hour === 12 || hour === 0) hour = 0;
  } else {
    if (hour !== 12) hour += 12;
  }
  return { hour, minute };
}

function parseSecondaryDate(
  dateStr: string,
  currentYear: number,
  prevMonth: number | null
): { year: number; month: number; day: number } | null {
  // Expected formats: "Thu 26 November" or "26 November" or "Thu 26 Nov 2026"
  const m = dateStr.trim().match(/(?:[A-Za-z]{3,9}\s+)?(\d{1,2})\s+([A-Za-z]+)(?:\s+(\d{4}))?/);
  if (!m) return null;
  const day = parseInt(m[1], 10);
  const month = MONTHS[m[2].toLowerCase()];
  if (!month || day < 1 || day > 31) return null;
  let year = m[3] ? parseInt(m[3], 10) : currentYear;
  if (!m[3] && prevMonth !== null && month < prevMonth && prevMonth === 12 && month === 1) {
    year += 1;
  }
  return { year, month, day };
}

export function localDateTimeToMs(localDate: string, localTime: string): number {
  const [y, mo, d] = localDate.split('-').map(Number);
  const [h, mi] = localTime.split(':').map(Number);
  // Use UTC-aligned wall-clock epoch so chart math is immune to browser TZ differences
  // and matches camera EXIF DateTimeOriginal (which has no TZ offset).
  return Date.UTC(y, mo - 1, d, h, mi, 0, 0);
}

export function parseTideForecastHtml(
  html: string,
  sourceUrl: string,
  referenceYear?: number
): ParsedTideResponse {
  const titleMatch = html.match(/<title>([\s\S]*?)<\/title>/i);
  let locationName = 'Tide-Forecast Location';
  if (titleMatch) {
    locationName = titleMatch[1]
      .replace(/\s+/g, ' ')
      .replace(/^Tide Times and Tide Chart for\s*/i, '')
      .replace(/\s*[-|].*$/, '')
      .trim() || locationName;
  }

  let baseYear = referenceYear ?? new Date().getFullYear();
  const dateHeaderMatch = html.match(/tide-day__date[^>]*>[^<]*?\b(20\d{2})\b/i);
  if (dateHeaderMatch) {
    baseYear = parseInt(dateHeaderMatch[1], 10);
  }

  const rowRegex =
    /<tr[^>]*>\s*<td[^>]*>\s*(High|Low)\s+Tide\s*<\/td>\s*<td[^>]*>\s*<b[^>]*>\s*(\d{1,2}:\d{2}\s*[AP]M)\s*<\/b>\s*<span[^>]*>\(([^)]+)\)<\/span>\s*<\/td>[\s\S]*?<b[^>]*>\s*([+-]?\d+(?:\.\d+)?)\s*m\s*<\/b>(?:\s*<span[^>]*>\(([+-]?\d+(?:\.\d+)?)\s*ft\)<\/span>)?/gi;

  const events: ParsedTideEvent[] = [];
  const seen = new Set<string>();
  let currentYear = baseYear;
  let prevMonth: number | null = null;

  let match: RegExpExecArray | null;
  while ((match = rowRegex.exec(html)) !== null) {
    const type = match[1].toLowerCase() === 'high' ? 'high' : 'low';
    const parsedTime = parse12HourTime(match[2]);
    const parsedDate = parseSecondaryDate(match[3], currentYear, prevMonth);
    const heightM = parseFloat(match[4]);
    const heightFt = match[5] !== undefined ? parseFloat(match[5]) : undefined;

    if (!parsedTime || !parsedDate || Number.isNaN(heightM)) continue;

    currentYear = parsedDate.year;
    prevMonth = parsedDate.month;

    const localDate = `${parsedDate.year}-${pad2(parsedDate.month)}-${pad2(parsedDate.day)}`;
    const localTime = `${pad2(parsedTime.hour)}:${pad2(parsedTime.minute)}`;
    const dedupKey = `${localDate}_${localTime}_${type}`;
    if (seen.has(dedupKey)) continue;
    seen.add(dedupKey);

    events.push({
      id: dedupKey,
      type,
      localDate,
      localTime,
      timestampMs: localDateTimeToMs(localDate, localTime),
      heightM,
      heightFt: heightFt !== undefined && !Number.isNaN(heightFt) ? heightFt : undefined,
    });
  }

  events.sort((a, b) => a.timestampMs - b.timestampMs);

  return {
    source: 'tide-forecast',
    url: sourceUrl,
    locationName,
    fetchedAt: new Date().toISOString(),
    events,
  };
}

export async function handleTideProxyRequest(urlParam: string | null): Promise<{
  status: number;
  body: unknown;
  headers: Record<string, string>;
}> {
  const baseHeaders: Record<string, string> = {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
  };

  if (!urlParam || !isAllowedTideUrl(urlParam)) {
    return {
      status: 400,
      headers: baseHeaders,
      body: {
        error: 'Invalid or unsupported URL. Only https://www.tide-forecast.com/locations/... URLs are allowed.',
      },
    };
  }

  try {
    const res = await fetch(urlParam, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });

    if (!res.ok) {
      return {
        status: 502,
        headers: baseHeaders,
        body: { error: `Upstream returned HTTP ${res.status}` },
      };
    }

    const html = await res.text();
    const parsed = parseTideForecastHtml(html, urlParam);

    if (parsed.events.length === 0) {
      return {
        status: 502,
        headers: baseHeaders,
        body: {
          error: 'Could not find tide turning-point rows in the fetched page.',
          locationName: parsed.locationName,
        },
      };
    }

    return {
      status: 200,
      headers: {
        ...baseHeaders,
        'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      },
      body: parsed,
    };
  } catch (err) {
    return {
      status: 502,
      headers: baseHeaders,
      body: {
        error: err instanceof Error ? err.message : 'Failed to fetch upstream tide page',
      },
    };
  }
}
