import { BOOKING_INFO_TIMEOUT, STATIC_INFO_TIMEOUT } from "../../config";
import { DataSource, Hut, HutAvailability } from "../../types";
import { makeCache } from "../../util/cache";
import { getHutInfo, lookupHutByName } from "../refuges.info/refuges-info";
import { etapeRestHutListVanoise } from "./hut-list";

const BASE_URL = "https://etape-rest.for-system.com/index.aspx/index.aspx";

async function listHutsEtapeRest() {
  return etapeRestHutListVanoise.map(hut => {
    return {
      dataSource: "etape-rest.for-system.com",
      id: hut.id,
      name: hut.name,
      country: "FR",
    }
  }) as Hut[];
}

async function getHutInfoEtapeRest(hutId: string) {
  const hutName = (await listHutsEtapeRest()).find(hut => hut.id === hutId)?.name
  if (hutName) {
    // lookup hut info on refuges.info data source
    const info = await lookupHutByName(hutName);
    if (info.length === 1) {
      const hutInfo = await getHutInfo(info[0].pointId);
      if (hutInfo) {
        return hutInfo;
      }
    }    
  }
  throw new Error("couldn't find hut info");
}

async function getHutAvailabilityEtapeRest(hutId: string): Promise<HutAvailability[]> {
  const requestDate = new Date();
  const until = new Date(requestDate);
  until.setMonth(until.getMonth() + 2);
  let results = [] as HutAvailability[];
  while (!results.some(r => r.date === until.toISOString())) {
    const res = await fetch(`${BASE_URL}?ref=json-planning-refuge&q=${hutId},${requestDate.toISOString().substring(0, 10)}`);
    if (res.ok) {
      const jsonString = (await res.text()).slice(1, -1);
      const json = JSON.parse(jsonString);
      // it seems the API returns 30 days total: from 15 days in the past to 14 days in the future...
      results = [
        ...results,
        ...json[0].planning.map(({s: numFree, f: closed, d: deltaDays}: {s: number, f: number, d: number}) => {
          // for some reason, deltaDays is NEGATIVE ...
          if (deltaDays <= 0) {
            const date = new Date(requestDate); // copy before modifying
            date.setDate(date.getDate() - deltaDays);
            return {
              date: date.toISOString(),
              hutStatus: closed ? "CLOSED" : "SERVICED",
              sleepingPlaces: {
                totalFree: numFree,
              }
            } as HutAvailability;
          }
        })
        .filter((x: HutAvailability | undefined) => x !== undefined)
      ];
      requestDate.setDate(requestDate.getDate() + 15);
    }
    else {
      throw new Error("couldn't get hut availabilities");
    }
  }
  return results;
}

const cachedHutList = makeCache(STATIC_INFO_TIMEOUT, (_) => listHutsEtapeRest());


export const EtapeRest: DataSource = {
  listAll: () => cachedHutList.get(""),
  getHutInfo: makeCache(STATIC_INFO_TIMEOUT, getHutInfoEtapeRest).get,
  getHutAvailabilities: makeCache(BOOKING_INFO_TIMEOUT, getHutAvailabilityEtapeRest),
};
