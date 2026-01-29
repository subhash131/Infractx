export function generateRank(prev: string | null, next: string | null): string {
  // Simple simulator for demo purposes so you don't need npm install
  const p = prev ? parseInt(prev.split("|")[1] || "0") : 0;
  const n = next
    ? parseInt(next.split("|")[1] || (p + 2000).toString())
    : p + 2000;
  const mid = Math.floor((p + n) / 2);
  return `0|${mid.toString().padStart(6, "0")}`;
}
