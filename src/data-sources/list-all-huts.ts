import { Hut } from "../types";
import { CacheEntry } from "../util/cache";
import { arraysEqual } from "../util/equal";
import { deepLog } from "../util/log";
import { memoize } from "../util/memoize";
import { dataSources } from "./data-sources";

export const mergeHuts = memoize(function (listOfLists: any[][]) {
  deepLog('merging lists...');
  return listOfLists.flat(1);
}, arraysEqual);

export function listHutsFromAllSources(): CacheEntry<Hut[]> {
  let validUntil = Infinity;
  let lastUpdate = -Infinity;
  const allHutsPromise = Promise.all(Object.values(dataSources).map(dataSource => {
    const cacheEntry = dataSource.listAll();
    validUntil = Math.min(cacheEntry.validUntil, validUntil);
    lastUpdate = Math.max(cacheEntry.lastUpdate, lastUpdate);
    return cacheEntry.result;
  }));
  return {
    result: allHutsPromise.then(mergeHuts),
    lastUpdate,
    validUntil,
  };
}
