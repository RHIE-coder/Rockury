/** Common IANA timezones grouped by region, with display labels */
export interface ITimezoneOption {
  value: string; // IANA timezone e.g. "Asia/Seoul"
  label: string; // Display label e.g. "Asia/Seoul (KST, UTC+9)"
  offset: string; // e.g. "UTC+9"
}

/** Display modes for date columns: utc → local → timestamp → utc ... */
export type TDateDisplayMode = 'utc' | 'local' | 'timestamp';

export const DATE_DISPLAY_CYCLE: TDateDisplayMode[] = ['utc', 'local', 'timestamp'];

export const DATE_DISPLAY_LABELS: Record<TDateDisplayMode, string> = {
  utc: 'UTC',
  local: 'LOCAL',
  timestamp: 'TIMESTAMP',
};

/** Get the browser's current IANA timezone */
export function getLocalTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

/** Build timezone options list from Intl API */
export function getTimezoneOptions(): ITimezoneOption[] {
  const zones = Intl.supportedValuesOf('timeZone');
  const now = new Date();

  return zones.map((tz) => {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      timeZoneName: 'shortOffset',
    });
    const parts = formatter.formatToParts(now);
    const offsetPart = parts.find((p) => p.type === 'timeZoneName');
    const offset = offsetPart?.value ?? '';

    const abbrFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      timeZoneName: 'short',
    });
    const abbrParts = abbrFormatter.formatToParts(now);
    const abbr = abbrParts.find((p) => p.type === 'timeZoneName')?.value ?? '';

    const label = abbr !== offset ? `${tz} (${abbr}, ${offset})` : `${tz} (${offset})`;
    return { value: tz, label, offset };
  });
}

/** Parse a date value (handles Date objects, quoted strings, ISO strings) */
function toDate(value: unknown): Date | null {
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
  if (value === null || value === undefined) return null;
  let str = String(value).trim();
  // Strip surrounding quotes: "2026-03-11T09:16:09.976Z" → 2026-03-11T09:16:09.976Z
  if ((str.startsWith('"') && str.endsWith('"')) || (str.startsWith("'") && str.endsWith("'"))) {
    str = str.slice(1, -1);
  }
  const d = new Date(str.replace(' ', 'T'));
  return isNaN(d.getTime()) ? null : d;
}

/** Format a date value for a given display mode, compact format */
export function formatDateForDisplay(
  value: unknown,
  mode: TDateDisplayMode,
  timezone: string,
): string {
  if (value === null || value === undefined) return '';

  const d = toDate(value);
  if (!d) return String(value);

  const pad = (n: number, w = 2) => String(n).padStart(w, '0');

  if (mode === 'utc') {
    const ms = d.getUTCMilliseconds();
    const base = `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
    return ms > 0 ? `${base}.${pad(ms, 3)}` : base;
  }

  if (mode === 'timestamp') {
    return String(d.getTime());
  }

  // local: use selected timezone, compact format via sv-SE locale
  const opts: Intl.DateTimeFormatOptions = {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  };

  const formatted = d.toLocaleString('sv-SE', opts);
  const ms = d.getMilliseconds();
  return ms > 0 ? `${formatted}.${pad(ms, 3)}` : formatted;
}
