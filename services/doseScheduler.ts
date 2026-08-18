/** Hour-of-day for the first dose (e.g. 8 = 08:00, 24 = 24:00). */
export function timeStringToShift(hhmm: string): number {
  const trimmed = hhmm.trim();
  if (!trimmed) return 8;

  const match = /^(\d{1,2})(?::(\d{2}))?$/.exec(trimmed);
  if (!match) return 8;

  const hour = Number.parseInt(match[1], 10);
  const minute = match[2] != null ? Number.parseInt(match[2], 10) : 0;
  if (!Number.isFinite(hour) || hour < 0) return 8;
  if (hour === 24) return minute === 0 ? 24 : 8;
  if (hour > 23 || minute !== 0) return 8;
  return hour;
}

export function shiftToTimeString(shift: number): string {
  const safe = Math.max(0, Math.min(24, Math.trunc(shift)));
  return `${String(safe).padStart(2, "0")}:00`;
}

/** True after the user sets first-dose time on the prescription (post-create). */
export function hasConfiguredTimeShift(rx: Prescription): boolean {
  return rx.timeShift != null && rx.timeShift > 0;
}
