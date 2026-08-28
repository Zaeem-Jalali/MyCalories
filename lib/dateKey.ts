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

// Screens showed the raw storage key ("2026-08-28"). People read their own
// day, not an ISO string, so headings use this and the key stays internal.
export function formatDateLabel(key: string): string {
  const today = todayKey();
  if (key === today) return "Today";

  const yesterday = new Date(dateFromKey(today));
  yesterday.setDate(yesterday.getDate() - 1);
  if (key === toDateKey(yesterday)) return "Yesterday";

  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(dateFromKey(key));
}
