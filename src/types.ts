import { CacheEntry } from "./util/cache";

export type Hut = {
  dataSource: string, // "hut-reservation.org" | "ffcam.fr",
  id: string, // <-- only unique within its own dataSource
  name: string, // <-- human readable name
  country: string, // "CH" | "IT" | "DE" | "AT" | "FR",
}

export type HutInfo = {
  hutType?: "REFUGE" | "CHALET", // <-- only FFCAM lists hut category
  location: {
    lat: number,
    lng: number,
    alt: number,
  },
  contact: {
    phone: string,
    website: string,
  },
  massive?: string, // <-- mountain massive
  picture?: string,
  sleepingPlaces: {
    totalBeds: number,
    categories: Category[],
  },
}

export type Category = {
  categoryID: string,
  description: CategoryDescription[],
  numBeds?: number,
}

export type CategoryDescription = {
  language: "DE_DE" | "GB_EN" | "FR_FR" | "CA_FR" | "ES_ES" | "IT_IT",
  label: string,
  description: string,
}

export type HutAvailability = {
  date: string,
  hutStatus: "SERVICED" | "CLOSED" | "UNGUARDED" | "UNKNOWN",
  sleepingPlaces: {
    totalFree: number,
    totalBeds: number,
    categories: CategoryAvailability[],
  }
};

export type CategoryAvailability = Category & {
  numFree: number,
  numBeds: number,
}

export type DataSource = {
  listAll: () => CacheEntry<Hut[]>,
  getHutInfo: (hutId: string) => CacheEntry<HutInfo>,
  getHutAvailabilities: {
    get: (hutId: string) => CacheEntry<HutAvailability[]>,
    forceRefresh: (hutId: string) => CacheEntry<HutAvailability[]>,
  },
}
