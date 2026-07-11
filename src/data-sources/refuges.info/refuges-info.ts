import * as cheerio from 'cheerio';
import { HutInfo } from '../../types';

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
  const res = await fetch(`${BASE_URL}/point/${pointId}`);
  if (res.ok) {
    const text = await res.text();
    const doc =  new DOMParser().parseFromString(text, "application/xml");
    const coord = doc.querySelector("nodes > node > coord");
    const lat = Number(coord?.querySelector("lat")?.textContent.trim());
    const lng = Number(coord?.querySelector("long")?.textContent.trim());
    const alt = Number(coord?.querySelector("alt")?.textContent.trim());
    return {
      location: {
        lat, lng, alt
      },
    } as HutInfo;
  }
  else {
    throw new Error("not found");
  }
}
