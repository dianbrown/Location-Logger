export type Building = {
  id: string;
  name: string;
  entrancesMax?: number; // optional
};

export type LogRow = {
  timestamp: string;
  userId: string;
  buildingId: string;
  buildingName: string;
  entrance: number;
  lat: number;
  lng: number;
  accuracy: number;
};

export type ApiPayload = {
  buildings: Building[];
  logs: LogRow[];
};
