/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Forecast service — retrieve flood forecast data.
 *
 * Preferred source is the FloodWatch API (/forecast). When the backend is
 * unreachable or returns no forecast rows, the service falls back to the
 * bundled mock data (the ML forecasting system is a future phase).
 *
 * Architecture:
 *   Component → forecastService → api client / mock fallback
 */

import { FloodForecastPoint, ForecastTimeWindow, ForecastResponse } from '../types';
import { MOCK_FORECASTS } from '../mocks/forecasts';
import { api } from './api';

interface ForecastItem {
  locationId: string;
  location: string;
  timestamp: string;
  horizon: string;
  riskLevel: FloodForecastPoint['riskLevel'];
  predictedWaterLevel?: number | null;
  confidence: number;
}

async function fetchForecastItems(): Promise<ForecastItem[] | null> {
  try {
    const data = await api.get<{ locations: string[]; forecasts: ForecastItem[] }>('/forecast', { allowPublic: true });
    if (data && Array.isArray(data.forecasts) && data.forecasts.length > 0) {
      return data.forecasts;
    }
    return null;
  } catch {
    return null;
  }
}

function itemToPoint(item: ForecastItem): FloodForecastPoint {
  return {
    timeWindow: (item.horizon as ForecastTimeWindow) || ('6 hours' as ForecastTimeWindow),
    riskLevel: item.riskLevel || 'low',
    predictedWaterLevel: item.predictedWaterLevel ?? undefined,
    confidence: item.confidence,
    timestamp: item.timestamp,
    location: item.location,
    notes: '',
  };
}

function normalizeTimeWindow(horizon: string): ForecastTimeWindow {
  switch (horizon) {
    case '12 hours': return '12 hours';
    case '24 hours': return '24 hours';
    case '48 hours': return '48 hours';
    default: return '6 hours';
  }
}

export const forecastService = {
  async getLocations(): Promise<string[]> {
    try {
      const data = await api.get<{ locations: string[] }>('/forecast', { allowPublic: true });
      if (data && Array.isArray(data.locations) && data.locations.length > 0) {
        return data.locations;
      }
    } catch {
      // fall through to mock
    }
    return Object.keys(MOCK_FORECASTS);
  },

  async getForecastForLocation(location: string): Promise<FloodForecastPoint[]> {
    try {
      const data = await api.get<{ forecasts: ForecastItem[] }>('/forecast', { allowPublic: true });
      if (data && Array.isArray(data.forecasts)) {
        const items = data.forecasts.filter(
          f => f.location === location || f.locationId === location
        );
        if (items.length > 0) {
          return items.map(itemToPoint).map(p => ({
            ...p,
            timeWindow: normalizeTimeWindow(p.timeWindow),
            location,
          }));
        }
      }
    } catch {
      // fall through to mock
    }
    return MOCK_FORECASTS[location] || MOCK_FORECASTS["Zone 4 - Lower River Road"] || [];
  },

  async getForecastFromBackend(locationId: string): Promise<ForecastResponse | null> {
    try {
      const data = await api.get<{
        location: string;
        forecasts: FloodForecastPoint[];
        generatedAt: string;
      }>(`/forecast/${locationId}`, { allowPublic: true });
      if (data && data.location && Array.isArray(data.forecasts)) {
        return {
          location: data.location,
          forecasts: data.forecasts,
          generatedAt: data.generatedAt,
        };
      }
      return null;
    } catch {
      return null;
    }
  },

  async getForecastForTimeWindow(
    location: string,
    timeWindow: ForecastTimeWindow
  ): Promise<FloodForecastPoint | null> {
    const forecasts = await this.getForecastForLocation(location);
    return forecasts.find(f => f.timeWindow === timeWindow) || null;
  },
};
