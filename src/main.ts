import { CacheEntry } from "./util/cache";
import { deepLog } from "./util/deep_inspect";
import { arraysEqual } from "./util/equal";
import { memoize } from "./util/memoize";
import { FFCAM } from "./data-sources/ffcam.fr/ffcam"
import { HR } from "./data-sources/hut-reservation.org/hr"
import { DataSource } from "./types";
import * as Bun from "bun";

const dataSources: {[key: string]: DataSource} = {
  "ffcam.fr": FFCAM,
  "hut-reservation.org": HR,
}

const mergeHuts = memoize(function(listOfLists: any[][]) {
  console.log('merging lists...');
  return listOfLists.flat(1)
}, arraysEqual);

function computeMaxAge(expiry: number) {
  // how many seconds it takes until a cache entry expires:
  // console.log({expiry});
  return Math.ceil((expiry - Date.now())/1000);
}

function getDataSource(dataSource: string): DataSource {
  const result = dataSources[dataSource];
  if (dataSource === undefined) {
    throw new Error("unknown data source");
  }
  return result;
}

async function respondWithCacheEntry(cacheEntry: CacheEntry<any>) {
  const json = await cacheEntry.result
  return Response.json({
    lastUpdated: new Date(cacheEntry.lastUpdate).toISOString(),
    response: json,
  }, {
    headers: {
      // cache-control header matches expiry of our own cache
      "Cache-Control": `max-age=${computeMaxAge(cacheEntry.validUntil)}`,
      // allow cross-origin requests
      "Access-Control-Allow-Origin": "*",
    }
  });
}

const server = Bun.serve({
  routes: {
    "/api/v1/huts": async () => {
      let validUntil = Infinity;
      let lastUpdate = -Infinity;
      const allHutsPromise = Promise.all(Object.values(dataSources).map(dataSource => {
        const cacheEntry = dataSource.listAll();
        validUntil = Math.min(cacheEntry.validUntil, validUntil);
        lastUpdate = Math.max(cacheEntry.lastUpdate, lastUpdate);
        return cacheEntry.result;
      }));
      return respondWithCacheEntry({
        result: allHutsPromise.then(mergeHuts),
        lastUpdate,
        validUntil,
      });
    },

    "/api/v1/huts/:dataSource/:hutId/info": async req => {
      const dataSource = getDataSource(req.params.dataSource);
      const cacheEntry = dataSource.getHutInfo(req.params.hutId);
      return respondWithCacheEntry(cacheEntry);
    },

    "/api/v1/huts/:dataSource/:hutId/availabilities": async req => {
      const dataSource = getDataSource(req.params.dataSource);
      const cacheEntry = dataSource.getHutAvailabilities.get(req.params.hutId);
      return respondWithCacheEntry(cacheEntry);
    },

    "/api/v1/huts/:dataSource/:hutId/availabilities/forceRefresh": async req => {
      const dataSource = getDataSource(req.params.dataSource);
      const cacheEntry = dataSource.getHutAvailabilities.forceRefresh(req.params.hutId);
      return respondWithCacheEntry(cacheEntry);
    },
  }
});

console.log(`Server running at ${server.url}`);
