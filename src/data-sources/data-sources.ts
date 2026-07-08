import { DataSource } from "../types";
import { FFCAM } from "./ffcam.fr/ffcam";
import { HR } from "./hut-reservation.org/hr";

export const dataSources: { [key: string]: DataSource; } = {
  "ffcam.fr": FFCAM,
  "hut-reservation.org": HR,
};

export function getDataSource(dataSource: string): DataSource {
  const result = dataSources[dataSource];
  if (dataSource === undefined) {
    throw new Error("unknown data source");
  }
  return result;
}
