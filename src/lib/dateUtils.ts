/**
 * Timezone-safe local calendar date utilities.
 * Never uses toISOString() for calendar day keys to avoid UTC day-shift bugs.
 */

export function getLocalDateKey(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function isValidDateKey(dateKey: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return false;
  const [y, m, d] = dateKey.split('-').map(Number);
  const parsed = new Date(y, m - 1, d, 12, 0, 0);
  return (
    parsed.getFullYear() === y &&
    parsed.getMonth() === m - 1 &&
    parsed.getDate() === d
  );
}

/**
 * Parses YYYY-MM-DD at local noon (12:00) so DST transitions never shift the day.
 */
export function parseLocalDateKey(dateKey: string): Date {
  const [y, m, d] = dateKey.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1, 12, 0, 0);
}

export function shiftDateKey(dateKey: string, deltaDays: number): string {
  const d = parseLocalDateKey(dateKey);
  d.setDate(d.getDate() + deltaDays);
  return getLocalDateKey(d);
}

export function formatFullDate(dateKey: string): string {
  const d = parseLocalDateKey(dateKey);
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(d);
}

export function formatCompactDate(dateKey: string): string {
  const d = parseLocalDateKey(dateKey);
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  }).format(d);
}

export function formatTooltipDate(dateKey: string): string {
  const d = parseLocalDateKey(dateKey);
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(d);
}

export function getTimeAwareGreeting(now: Date = new Date()): string {
  const hour = now.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export function getDeterministicDayNumber(dateKey: string): number {
  const [y, m, d] = dateKey.split('-').map(Number);
  // Deterministic hash from local calendar YYYY, MM, DD
  return y * 372 + m * 31 + d;
}

export function getMonthGrid(year: number, monthIndex: number): (string | null)[] {
  const firstDay = new Date(year, monthIndex, 1, 12, 0, 0);
  const startWeekday = firstDay.getDay(); // 0 (Sun) - 6 (Sat)
  const daysInMonth = new Date(year, monthIndex + 1, 0, 12, 0, 0).getDate();

  const cells: (string | null)[] = [];
  for (let i = 0; i < startWeekday; i++) {
    cells.push(null);
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const m = String(monthIndex + 1).padStart(2, '0');
    const d = String(day).padStart(2, '0');
    cells.push(`${year}-${m}-${d}`);
  }
  return cells;
}
