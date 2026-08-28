// Every date in this app is a calendar day in the user's own timezone, so
// keys are built from the local Y/M/D. toISOString() would convert to UTC
// first, which shifts the key by a day for anyone east of UTC (a local
// midnight there is the previous day in UTC).
export function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function todayKey(): string {
  return toDateKey(new Date());
}

export function dateFromKey(key: string): Date {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day);
}
