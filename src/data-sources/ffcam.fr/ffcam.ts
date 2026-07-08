import { makeCache } from "../../util/cache";
import * as cheerio from 'cheerio';
import {distance} from "fastest-levenshtein";
import { deepLog } from "../../util/log";
import { Category, CategoryAvailability, CategoryDescription, DataSource, HutAvailability, HutInfo } from "../../types";
import { BOOKING_INFO_TIMEOUT, STATIC_INFO_TIMEOUT } from "../../config";

// FFCAM does not have a public API, so we crawl their HTML ...

// Booking URL contains list of all huts, with a unique ID per hut.
// The URL can also be parameterized with a specific hut ID to get the availabilities of that hut for the current month, and the next one.
const BOOKING_URL = "https://centrale.ffcam.fr/index.php";

// Additional information about *all* the huts is published on this page, such as: coordinates, altitude, total number of sleeping places.
const HUTINFO_URL = "https://www.ffcam.fr/rechercher_refuge_chalet.html";

const langMap = {
  "FR": "FR_FR",
  "CA": "CA_FR",
  "IT": "IT_IT",
  "SP": "ES_ES",
  "GB": "GB_EN",
};

const listHutsInternal = makeCache(
  STATIC_INFO_TIMEOUT,
  async _ => {
    deepLog('requesting FFCAM hut list ...');
    const headers = new Headers();
    const res = await fetch(BOOKING_URL, {
      headers,
    });
    if (res.ok) {
      const text = await res.text();
      const structuresList = findJSON(text, /BK\.structuresList = (.*);\n/); // only FFCAM huts
      // @ts-ignore
      const categoryLabels = Object.entries(Object.values(findJSON(text, /BK\.categoryLabels = (.*);\n/))[0].productCategory);
      const result = Object.entries(structuresList).map(([id, hi]) => {
        const hutInfo = hi as any;
        return {
          dataSource: "ffcam.fr",
          id,
          name: hutInfo.name,
          country: "FR",
          // @ts-ignore
          hutType: {
            "BK_STRUCTURECATEGORY:REFUGE": "REFUGE",
            "BK_STRUCTURECATEGORY:CHALET": "CHALET",
          }[hutInfo.structureType],
          sleepingPlaces: {
            categories: (hutInfo.productsCategories || []).map((cat: any) => {
              return {
                categoryID: cat.oid,
                description: categoryLabels.map(([language, labels]) => {
                  return {
                    // @ts-ignore
                    language: langMap[language],
                    label: cat.title,
                    // @ts-ignore
                    description: labels[cat.oid],
                  } as CategoryDescription;
                })
              } as Category;
            }) as Category[],
          }
        }
      });
      deepLog(`got ${result.length} FFCAM huts`);
      return result;
    }
    else {
      throw new Error("error!");
    }
  },
)

const listHutsFFCAM = () => listHutsInternal.get("");

const getHutInfoFFCAM = makeCache(
  STATIC_INFO_TIMEOUT,
  async hutId => {
    const allHuts = listHutsFFCAM();
    const hut = (await allHuts.result).find(x => x.id === hutId);
    deepLog(`getting FFCAM hut ${hutId} info`);
    const res = await fetch(HUTINFO_URL);
    if (res.ok) {
      const text = await res.text();
      const doc = cheerio.load(text);

      // We have no option but to match the huts by name. We'll use Levenshtein distance so we are tolerant for slight spelling differences, just in case.
      let closest = Infinity;
      let hutInfoElement;
      doc("div.seolanMap-item").each((_, element) => {
        const matchName = doc(element).find("h3").first().text().trim();
        const N = hut!.name.toUpperCase().substring(0, hut!.name.length-9);
        const M = matchName.toUpperCase().substring(0, matchName.length-8);
        const dist = distance(N, M);
        if (dist < closest) {
          closest = dist;
          hutInfoElement = element;
        }
      });

      if (closest < 3) {
        const [massive, alt, numPlaces] = doc(hutInfoElement).find("div.infos").first().text().trim().split(' - ');
        const phone = doc(hutInfoElement).find("div.phone").first().text().trim();
        const website = doc(hutInfoElement).find("div.minisite a").first().attr('href');
        return {
          hutType: hut!.hutType,
          location: {
            lat: Number(doc(hutInfoElement).attr("data-lat")),
            lng: Number(doc(hutInfoElement).attr("data-lng")),
            alt: Number(alt.slice(0, -2)),
          },
          contact: {
            phone,
            website,
          },
          massive,
          sleepingPlaces: {
            totalBeds: parseInt(numPlaces),
            categories: hut!.sleepingPlaces.categories,
          }
        } as HutInfo;
      }
      else {
        throw new Error("couldn't match huts on different pages by name!")
      }
    }
    else {
      throw new Error("error fetching hut");
    }
  },
).get;

function findJSON(text: string, regex: RegExp) {
  const match = text.match(regex);
  return JSON.parse(match![1]);
}

const getHutAvailabilityFFCAM = makeCache(
  BOOKING_INFO_TIMEOUT,
  async hutId => {
    const hutInfo = (await getHutInfoFFCAM(hutId).result) as HutInfo;
    if (hutInfo === undefined) {
      throw new Error("no such hut!!");
    }

    const today = new Date().toISOString().substring(0, 10);
    const todayDate = new Date(today);
    const inTwoMonthsDate = new Date(todayDate);
    inTwoMonthsDate.setUTCMonth(todayDate.getUTCMonth() + 2);
    const future = inTwoMonthsDate.toISOString().substring(0, 10);

    async function lookup(date: string) {
      const availabilityPerCategory = await Promise.all(hutInfo.sleepingPlaces.categories.map(async cat => {
        const res = await fetch(`${BOOKING_URL}?structure=${hutId}&date=${date}&productCategory=${cat.categoryID}`);
        const text = await res.text();
        const numFree = findJSON(text, /BK\.availability = (.*);\n/) || {};
        const numBeds = findJSON(text, /BK\.globalStock = (.*);\n/) || {};
        return {numFree, numBeds};
      }));
      const res = await fetch(`${BOOKING_URL}?structure=${hutId}&date=${date}`);
      const text = await res.text();
      const availability = findJSON(text, /BK\.availability = (.*);\n/);
      const openingCalendar = findJSON(text, /BK\.openingCalendar = (.*);\n/);
      const data = await Promise.all(
        Object.entries(availability)
        .map(([dateStr, num]) => [new Date(dateStr), num] as [Date, number])
        .sort(([dateA], [dateB]) => Number(dateA) - Number(dateB))
        .map(async ([date, num]) => {
          // skip entries that are in the past:
          if (Number(date) >= Number(todayDate)) {
            const shortDate = date.toISOString().substring(0,10);
            return {
              date: date.toISOString(),
              // @ts-ignore
              hutStatus: {
                "OPEN": "SERVICED",
                "CLOSE": "CLOSED",
                "UNGUARDED": "UNGUARDED",
                "UNKNOW": "UNKNOWN",
              }[openingCalendar[shortDate]],
              sleepingPlaces: {
                totalFree: num,
                totalBeds: hutInfo!.sleepingPlaces.totalBeds,
                categories: await Promise.all(hutInfo.sleepingPlaces.categories.map((cat, i) => {
                  const {numFree, numBeds} = availabilityPerCategory[i];
                  return {
                    ...cat,
                    numFree: numFree[shortDate] || 0,
                    numBeds: numBeds[shortDate] || 0,
                  } as CategoryAvailability;
                })),
              }
            };
          }
        }));
      return data.filter(x => x !== undefined);
    }

    return (await Promise.all([
      lookup(today),
      lookup(future),
    ])).flatMap(x => x) as HutAvailability[];
  }
);

export const FFCAM: DataSource = {
  listAll: listHutsFFCAM,
  getHutInfo: getHutInfoFFCAM,
  getHutAvailabilities: getHutAvailabilityFFCAM,
}
