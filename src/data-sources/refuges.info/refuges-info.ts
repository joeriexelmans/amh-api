import * as cheerio from 'cheerio';
import { HutInfo } from '../../types';
import { deepLog } from '../../util/log';

const BASE_URL = "https://www.refuges.info/api";

type RefugesInfoHut = {
  name: string,
  url: string,
  pointId: string,
}

export async function lookupHutByName(name: string) {
  const res = await fetch(`https://www.refuges.info/point_recherche?nom=${encodeURIComponent(name)}`)
  if (res.ok) {
      const text = await res.text();
      const doc = cheerio.load(text);
      const results = [] as RefugesInfoHut[];
      doc("div#scrolable > div.contenu > div.table > div.tr").each((_, element) => {
        const linkToHut = doc(element).find("a").first();
        const name = linkToHut.text().trim();
        const url = linkToHut.attr("href")!;
        const urlParts = url?.split('/').filter(x => x !== "");
        if (urlParts?.[0] === "point") {
          const pointId = urlParts[1]!;
          results.push({
            name,
            url,
            pointId,
          })
        }
      })
      return results;
  }
  else {
    throw new Error("error looking up hut on refuges.info")
  }
}

export async function getHutInfo(pointId: string): Promise<HutInfo> {
  const url = `${BASE_URL}/point?id=${pointId}`;
  const res = await fetch(url);
  // deepLog(url)
  if (res.ok) {
    const json = await res.json();
    // deepLog(json);
    if (json.features.length === 1) {
      const f = json.features[0];
      // deepLog(f.properties.nom);
      const [lat, lng] = f.geometry.coordinates;
      const alt = f.properties.coord.alt;
      return {
        location: {
          lat, lng, alt
        },
        sleepingPlaces: {
          totalBeds: f.properties.places.valeur,
        }
      } as HutInfo;
    }
  }
  throw new Error("not found");
}
