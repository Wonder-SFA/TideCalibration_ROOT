import { describe, expect, it } from 'vitest';
import { isAllowedTideUrl, parseTideForecastHtml } from '../shared/tideParser';

describe('isAllowedTideUrl', () => {
  it('accepts valid tide-forecast.com location URLs', () => {
    expect(isAllowedTideUrl('https://www.tide-forecast.com/locations/Allen-2/tides/latest')).toBe(
      true
    );
    expect(isAllowedTideUrl('https://tide-forecast.com/locations/San-Jose/tides/latest')).toBe(true);
  });

  it('rejects non-tide-forecast URLs or non-https schemes', () => {
    expect(isAllowedTideUrl('http://www.tide-forecast.com/locations/Allen-2/tides/latest')).toBe(
      false
    );
    expect(isAllowedTideUrl('https://example.com/locations/Allen-2')).toBe(false);
    expect(isAllowedTideUrl('https://www.tide-forecast.com/countries')).toBe(false);
    expect(isAllowedTideUrl('not-a-url')).toBe(false);
  });
});

describe('parseTideForecastHtml', () => {
  it('parses midnight 00:17 AM, 12:19 PM, negative heights, and Dec->Jan rollover', () => {
    const sampleHtml = `
      <html>
        <head><title>Tide Times and Tide Chart for Allen</title></head>
        <body>
          <h3 class="tide-day__date">Tide Times for Allen (today): Thursday 31 December 2026</h3>
          <table>
            <tr><td>Low Tide</td><td><b>00:17 AM</b><span class="tide-day-tides__secondary">(Thu 31 December)</span></td><td class="js-two-units-length-value"><b class="js-two-units-length-value__primary">-0.12 m</b> <span class="js-two-units-length-value__secondary">(-0.39 ft)</span></td></tr>
            <tr><td>High Tide</td><td><b> 6:50 AM</b><span class="tide-day-tides__secondary">(Thu 31 December)</span></td><td class="js-two-units-length-value"><b class="js-two-units-length-value__primary">1.76 m</b> <span class="js-two-units-length-value__secondary">(5.77 ft)</span></td></tr>
            <tr><td>Low Tide</td><td><b>12:19 PM</b><span class="tide-day-tides__secondary">(Thu 31 December)</span></td><td class="js-two-units-length-value"><b class="js-two-units-length-value__primary">0.65 m</b> <span class="js-two-units-length-value__secondary">(2.13 ft)</span></td></tr>
            <tr><td>High Tide</td><td><b> 1:05 AM</b><span class="tide-day-tides__secondary">(Fri 1 January)</span></td><td class="js-two-units-length-value"><b class="js-two-units-length-value__primary">1.50 m</b> <span class="js-two-units-length-value__secondary">(4.92 ft)</span></td></tr>
          </table>
        </body>
      </html>
    `;

    const res = parseTideForecastHtml(
      sampleHtml,
      'https://www.tide-forecast.com/locations/Allen-2/tides/latest'
    );

    expect(res.locationName).toBe('Allen');
    expect(res.events).toHaveLength(4);
    expect(res.events[0]).toMatchObject({
      type: 'low',
      localDate: '2026-12-31',
      localTime: '00:17',
      heightM: -0.12,
      heightFt: -0.39,
    });
    expect(res.events[1]).toMatchObject({
      type: 'high',
      localDate: '2026-12-31',
      localTime: '06:50',
      heightM: 1.76,
    });
    expect(res.events[2]).toMatchObject({
      type: 'low',
      localDate: '2026-12-31',
      localTime: '12:19',
      heightM: 0.65,
    });
    expect(res.events[3]).toMatchObject({
      type: 'high',
      localDate: '2027-01-01',
      localTime: '01:05',
      heightM: 1.5,
    });
  });
});
