/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * GIS service — map layer data served by the FastAPI backend (/gis/*).
 *
 * All GIS layers (roads, hospitals, shelters, rivers, evacuation routes,
 * zones, reports) come from the backend. This service holds an in-memory
 * cache populated exclusively from the API. If the backend is unreachable
 * the cache stays empty and the status is reported as "error" so the UI can
 * surface a GIS unavailable state instead of silently substituting mock data.
 *
 * Architecture:
 *   Component → gisService → api client → FastAPI backend
 */

import {
  GISPoint,
  GISLine,
  GISDataResponse,
  ZoneRisk,
  ChennaiFeatureCollection,
} from '../types';
import { api } from './api';

export type GISStatus = 'loading' | 'ready' | 'error';

interface BackendZone {
  id: string;
  name: string;
  center: [number, number];
  radius: number;
  riskLevel: ZoneRisk['riskLevel'];
  priorityScore: number;
  activeReportsCount: number;
  lastUpdated: string;
}

let zonesStatus: GISStatus = 'loading';
let gisDataStatus: GISStatus = 'loading';

let zoneCache: ZoneRisk[] = [];
let gisDataCache: GISDataResponse = {
  roads: [],
  hospitals: [],
  shelters: [],
  rivers: [],
  evacuationRoutes: [],
};

function mapZone(z: BackendZone): ZoneRisk {
  return {
    id: z.id,
    name: z.name,
    center: z.center,
    radius: z.radius,
    riskLevel: z.riskLevel,
    priorityScore: z.priorityScore,
    activeReportsCount: z.activeReportsCount,
    lastUpdated: z.lastUpdated,
  };
}

async function refreshZones(): Promise<void> {
  try {
    const zones = await api.get<BackendZone[]>('/gis/zones');
    if (Array.isArray(zones)) {
      zoneCache = zones.map(mapZone);
    }
    zonesStatus = 'ready';
  } catch {
    zonesStatus = 'error';
  }
}

async function refreshGISData(): Promise<void> {
  try {
    const data = await api.get<GISDataResponse>('/gis/data');
    if (data) {
      gisDataCache = {
        roads: data.roads ?? [],
        hospitals: data.hospitals ?? [],
        shelters: data.shelters ?? [],
        rivers: data.rivers ?? [],
        evacuationRoutes: data.evacuationRoutes ?? [],
      };
    }
    gisDataStatus = 'ready';
  } catch {
    gisDataStatus = 'error';
  }
}

// ------------------------------------------------------------
// Chennai flood layers: loaded on first use, cached in memory,
// one request per layer. Layers that are never shown are never fetched.
// ------------------------------------------------------------

export type ChennaiLayerKey = 'hazard-categories' | 'density-cells' | 'event-records' | 'survey-depths';
export type ChennaiLayerStatus = 'idle' | GISStatus;

const chennaiCache: Partial<Record<ChennaiLayerKey, ChennaiFeatureCollection<unknown>>> = {};
const chennaiInFlight: Partial<Record<ChennaiLayerKey, Promise<ChennaiFeatureCollection<unknown> | null>>> = {};
const chennaiStatus: Record<ChennaiLayerKey, ChennaiLayerStatus> = {
  'hazard-categories': 'idle',
  'density-cells': 'idle',
  'event-records': 'idle',
  'survey-depths': 'idle',
};

function loadChennaiLayer(key: ChennaiLayerKey): Promise<ChennaiFeatureCollection<unknown> | null> {
  const cached = chennaiCache[key];
  if (cached) return Promise.resolve(cached);

  const pending = chennaiInFlight[key];
  if (pending) return pending;

  chennaiStatus[key] = 'loading';
  const request = api
    .get<ChennaiFeatureCollection<unknown>>(`/gis/chennai/${key}`)
    .then((collection) => {
      if (!collection || !Array.isArray(collection.features)) {
        throw new Error('Chennai layer response has no features');
      }
      chennaiCache[key] = collection;
      chennaiStatus[key] = 'ready';
      return collection;
    })
    .catch(() => {
      chennaiStatus[key] = 'error';
      return null;
    })
    .finally(() => {
      delete chennaiInFlight[key];
    });

  chennaiInFlight[key] = request;
  return request;
}

export const gisService = {
  getGISData(): GISDataResponse {
    return gisDataCache;
  },

  getGISRoads(): GISLine[] { return gisDataCache.roads; },
  getGISHospitals(): GISPoint[] { return gisDataCache.hospitals; },
  getGISShelters(): GISPoint[] { return gisDataCache.shelters; },
  getGISRivers(): GISLine[] { return gisDataCache.rivers; },
  getGISEvacuationRoutes(): GISLine[] { return gisDataCache.evacuationRoutes; },

  getZones(): ZoneRisk[] {
    return zoneCache;
  },

  getZonesStatus(): GISStatus {
    return zonesStatus;
  },

  getGISDataStatus(): GISStatus {
    return gisDataStatus;
  },

  async getGISDataAsync(): Promise<GISDataResponse> {
    await refreshGISData();
    return gisDataCache;
  },

  async loadZones(): Promise<ZoneRisk[]> {
    await refreshZones();
    return zoneCache;
  },

  async loadAll(): Promise<void> {
    await Promise.all([refreshGISData(), refreshZones()]);
  },

  loadChennaiLayer,

  getChennaiLayer<P>(key: ChennaiLayerKey): ChennaiFeatureCollection<P> | undefined {
    return chennaiCache[key] as ChennaiFeatureCollection<P> | undefined;
  },

  getChennaiStatus(key: ChennaiLayerKey): ChennaiLayerStatus {
    return chennaiStatus[key];
  },

  saveZones(_zones: ZoneRisk[]): void {
    // Zones are managed server-side; no local persistence is required.
  },
};
