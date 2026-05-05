/** Returns a human-readable relative time string, e.g. "2 min ago". */
export function relativeTime(ms: number | null): string {
  if (!ms) return "—";
  const diff = Date.now() - ms;
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  const days = Math.floor(hrs / 24);
  return `${days} day${days > 1 ? "s" : ""} ago`;
}

/** Returns a full locale date-time string for use in title/tooltip. */
export function fullTime(ms: number | null): string {
  if (!ms) return "";
  return new Date(ms).toLocaleString();
}
