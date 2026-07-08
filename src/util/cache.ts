export type CacheEntry<T> = {
  result: Promise<T>,

  // when was the entry requested?
  lastUpdate: number, // millisecs since Unix epoch

  // until when before the entry will be refreshed?
  validUntil: number, // millisecs since Unix epoch
}

// Given a 'cache duration' and a callback that makes an asynchronous request parameterized by some key, return two functions:
//  get: performs the request (caching the result) or returns the cached result if not stale.
//  forceRefresh: like get, but always performs the request (and caches the result).
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
