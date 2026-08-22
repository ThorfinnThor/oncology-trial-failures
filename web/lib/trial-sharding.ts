const SHARD_COUNT = 256;

/**
 * Map an NCT identifier to one of 256 stable shard keys (00..ff).
 *
 * NCT identifiers are numeric after the prefix, so modulo 256 gives a simple,
 * even distribution. The small string hash fallback keeps the helper robust for
 * unexpected identifiers while remaining deterministic in browser and Node.
 */
export function trialShardKey(nctId: string): string {
  const normalized = (nctId || "").trim().toUpperCase();
  const match = normalized.match(/^NCT(\d+)$/);

  let bucket = 0;
  if (match) {
    for (const ch of match[1]) {
      bucket = (bucket * 10 + (ch.charCodeAt(0) - 48)) % SHARD_COUNT;
    }
  } else {
    let hash = 2166136261;
    for (let i = 0; i < normalized.length; i += 1) {
      hash ^= normalized.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    bucket = (hash >>> 0) & 0xff;
  }

  return bucket.toString(16).padStart(2, "0");
}
