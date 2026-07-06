export type CacheEntry<T> = {
  result: Promise<T>,
  lastUpdate: number, // millisecs since Unix epoch
  validUntil: number, // millisecs since Unix epoch
}

export function makeCache<T>(validDuration: number, callback: (key: string) => Promise<T>) {
  const cache = new Map<String, CacheEntry<T>>();

  function get(key: string, now=Date.now()): CacheEntry<T> {
    const entry = cache.get(key);
    if (entry) {
      if (now >= entry.validUntil) {
        return forceRefresh(key, now);
      }
      return entry;
    }
    return forceRefresh(key, now);
  }

  function forceRefresh(key: string, now=Date.now()): CacheEntry<T> {
    const entry = {
      result: callback(key),
      lastUpdate: now,
      validUntil: now + validDuration,
    }
    cache.set(key, entry);
    return entry;
  }

  return { get, forceRefresh };
}
