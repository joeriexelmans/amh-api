import { CacheEntry } from "./util/cache";
import { deepLog } from "./util/log";
import { getDataSource } from "./data-sources/data-sources";
import { listHutsFromAllSources, mergeHuts } from "./data-sources/list-all-huts";
import * as Bun from "bun";

function computeMaxAge(expiry: number) {
  // how many seconds it takes until a cache entry expires:
  // console.log({expiry});
  return Math.ceil((expiry - Date.now())/1000);
}

async function respondWithCacheEntry(cacheEntry: CacheEntry<any>) {
  const json = await cacheEntry.result
  return Response.json({
    lastUpdated: new Date(cacheEntry.lastUpdate).toISOString(),
    response: json,
  }, {
    headers: {
      // Cache-Control header matches expiry of our own cache
      // Browsers will follow this directive and cache our response.
      "Cache-Control": `public, max-age=${computeMaxAge(cacheEntry.validUntil)}`,

      // allow cross-origin requests
      "Access-Control-Allow-Origin": "*",
    }
  });
}

const server = Bun.serve({
  routes: {
    "/api/v1/huts": async () => {
      const cacheEntry = listHutsFromAllSources();
      return respondWithCacheEntry(cacheEntry);
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
