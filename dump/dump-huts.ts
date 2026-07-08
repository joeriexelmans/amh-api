// Outputs all huts (as JSON) to stdout

import { listHutsFromAllSources } from "../src/data-sources/list-all-huts";

const cacheEntry = listHutsFromAllSources();

const result = await cacheEntry.result;

console.log(JSON.stringify(result, null, 2));
// Bun.write(Bun.stdout, );

process.exit(0);
