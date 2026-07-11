import { CacheEntry, makeCache } from "../../util/cache";
import { BOOKING_INFO_TIMEOUT, STATIC_INFO_TIMEOUT } from "../../config";
import { Category, DataSource, Hut } from "../../types";
import { credentials } from "./config";
import { deepLog } from "../../util/log";

const BASE_URL = "https://www.hut-reservation.org/api/v1";

const loginFormData = new FormData();
loginFormData.append("username", credentials.username);
loginFormData.append("password", credentials.password);

async function login() {
  deepLog('hut-reservation.org attempt login...');

  const csrf = await fetch(BASE_URL + "/csrf", {
    credentials: 'include',
  });
  const token = csrf.headers.get("set-cookie")!.slice(11, 36);

  const headers = new Headers();
  headers.append("X-XSRF-TOKEN", token);
  headers.append("Cookie", "XSRF-TOKEN="+token);

  const req = new Request(BASE_URL + "/users/login", {
    method: 'POST',
    body: loginFormData,
    credentials: 'include',
    headers,
  });

  return fetch(req).then(result => {
    const headers = new Headers();
    headers.append("X-XSRF-TOKEN", token);
    result.headers.getSetCookie().forEach(cookie => {
      headers.set("Cookie", cookie);
    });

    if (result.status >= 400) {
      throw new Error("login failed")
    }
    deepLog('hut-reservation.org login successful');
    return headers;
  });
}

let session = login();

async function assureLoggedIn(callback: (h: Headers) => Promise<Response>) {
  const headers = await session;
  const result = await callback(headers);
  if (result.ok) {
    return result.json();
  }
  else if (result.status === 401) {
    session = login(); // session expired - log in again
    return assureLoggedIn(callback); // try again
  }
  else {
    deepLog('unknown error');
    throw new Error("unknown error");
  }
}

const listHutsInternal = makeCache(
  STATIC_INFO_TIMEOUT, // <-- list of huts is unlikely to change frequently, so we cache it for one hour
  async _ => {
    const json = await assureLoggedIn(headers => {
      deepLog('requesting OEAV/DAV/AVS/SAC hut list ...');
      return fetch(BASE_URL + "/manage/hutsList", {
        credentials: 'include',
        headers,
      });
    });
    const result = json.map((hut: any) => {
      return {
        dataSource: "hut-reservation.org",
        id: hut.hutId.toString(),
        name: hut.hutName,
        country: hut.hutCountry,
      };
    });
    deepLog(`got ${result.filter((x: Hut) => x.country === "IT").length} AVS huts`);
    deepLog(`got ${result.filter((x: Hut) => x.country === "DE").length} DAV huts`);
    deepLog(`got ${result.filter((x: Hut) => x.country === "CH").length} SAC huts`);
    deepLog(`got ${result.filter((x: Hut) => x.country === "AT").length} OEAV huts`);

    return result;

  }).get;

const listHutsHR: () => CacheEntry<any> = () => listHutsInternal("");

const getHutInfoHR = makeCache(
  STATIC_INFO_TIMEOUT,
  async hutId => {
    const json = await assureLoggedIn(headers => {
      deepLog(`getting OEAV/DAV/AVS/SAC hut ${hutId} info`);
      return fetch(BASE_URL + "/reservation/hutInfo/" + hutId, {
        credentials: 'include',
        headers,
      });
    });
    const [lat, lng] = json.coordinates.split(', ').map((str: string) => Number(str));
    // deepLog(json, false, null, true);

    return {
      location: {
        lat,
        lng,
        alt: Number(json.altitude.substring(0, json.altitude.length-2)),
      },
      contact: {
        phone: json.phone,
        website: json.hutWebsite,
      },
      picture: json.picture.blobPath,
      sleepingPlaces: {
        totalBeds: Number(json.totalBedsInfo),
        categories: json.hutBedCategories.map((cat: any) => {
          return {
            categoryID: cat.categoryID.toString(),
            description: cat.hutBedCategoryLanguageData,
            numBeds: cat.totalSleepingPlaces,
          } as Category;
        })
      }
    };
  }).get;


const getHutAvailabilityHR = makeCache(
  BOOKING_INFO_TIMEOUT, // 5 minutes
  async hutId => {
    const hutInfo = await getHutInfoHR(hutId).result;

    const json = await assureLoggedIn(headers => {
      deepLog("fetching HR hut availability " + hutId);
      return fetch(BASE_URL + "/reservation/getHutAvailability?hutId=" + hutId, {
        credentials: 'include',
        headers,
      });
    });
    const sorted = json.sort((a: any, b: any) => a.date.localeCompare(b.date));
    
    return sorted.map((entry: any) => {
      return {
        date: entry.date,
        hutStatus: entry.hutStatus,
        sleepingPlaces: {
          totalFree: entry.freeBeds,
          totalBeds: entry.totalSleepingPlaces,
          categories: Object.entries(entry.freeBedsPerCategory).map(([catID, numFree]) => {
            const category = hutInfo.sleepingPlaces.categories.find((c: any) => c.categoryID === catID);
            return {
              ...(category || {}),
              numFree,
              numBeds: category?.numBeds,
            } as Category;
          })
        }
      };
    });
  }
);

export const HR: DataSource = {
  listAll: listHutsHR,
  getHutInfo: getHutInfoHR,
  getHutAvailabilities: getHutAvailabilityHR,
}