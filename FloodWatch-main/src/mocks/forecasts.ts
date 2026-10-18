/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Mock seed data for flood forecasts.
 */

import { FloodForecastPoint } from '../types';

export const MOCK_FORECASTS: Record<string, FloodForecastPoint[]> = {
  "Zone 4 - Lower River Road": [
    {
      timeWindow: '6 hours',
      riskLevel: 'low',
      predictedWaterLevel: 0.12,
      confidence: 0.94,
      timestamp: '2026-08-24 16:00',
      location: 'Zone 4 - Lower River Road',
      notes: 'Gutter pooling stable. Storm drains functioning at 80% capacity.'
    },
    {
      timeWindow: '12 hours',
      riskLevel: 'moderate',
      predictedWaterLevel: 0.45,
      confidence: 0.88,
      timestamp: '2026-08-24 22:00',
      location: 'Zone 4 - Lower River Road',
      notes: 'Moderate rising tides. Outlets experiencing partial surge backing.'
    },
    {
      timeWindow: '24 hours',
      riskLevel: 'high',
      predictedWaterLevel: 1.35,
      confidence: 0.82,
      timestamp: '2026-08-25 10:00',
      location: 'Zone 4 - Lower River Road',
      notes: 'Peak precipitation window. Heavy street flooding expected near river margins.'
    },
    {
      timeWindow: '48 hours',
      riskLevel: 'critical',
      predictedWaterLevel: 2.10,
      confidence: 0.76,
      timestamp: '2026-08-26 10:00',
      location: 'Zone 4 - Lower River Road',
      notes: 'Extreme hazard risk. Main river channel is projected to crest, causing widespread inundation.'
    }
  ],
  "Zone 12 - Coastal Underpass": [
    {
      timeWindow: '6 hours',
      riskLevel: 'moderate',
      predictedWaterLevel: 0.38,
      confidence: 0.91,
      timestamp: '2026-08-24 16:00',
      location: 'Zone 12 - Coastal Underpass',
      notes: 'High ocean swells starting to pool in low-lying arterial drainage vents.'
    },
    {
      timeWindow: '12 hours',
      riskLevel: 'high',
      predictedWaterLevel: 0.95,
      confidence: 0.85,
      timestamp: '2026-08-24 22:00',
      location: 'Zone 12 - Coastal Underpass',
      notes: 'Tidal surge peak overlap. Underpasses will become impassable to standard vehicles.'
    },
    {
      timeWindow: '24 hours',
      riskLevel: 'critical',
      predictedWaterLevel: 1.85,
      confidence: 0.80,
      timestamp: '2026-08-25 10:00',
      location: 'Zone 12 - Coastal Underpass',
      notes: 'Structural flooding eminent. Storm surge walls projected to breach temporarily.'
    },
    {
      timeWindow: '48 hours',
      riskLevel: 'moderate',
      predictedWaterLevel: 0.50,
      confidence: 0.72,
      timestamp: '2026-08-26 10:00',
      location: 'Zone 12 - Coastal Underpass',
      notes: 'Water levels dropping slowly as high tide recedes and pumps engage.'
    }
  ],
  "Zone 1 - Civic Center": [
    {
      timeWindow: '6 hours',
      riskLevel: 'low',
      predictedWaterLevel: 0.02,
      confidence: 0.97,
      timestamp: '2026-08-24 16:00',
      location: 'Zone 1 - Civic Center',
      notes: 'Dry pavement conditions. Minor runoff absorbed by landscaped zones.'
    },
    {
      timeWindow: '12 hours',
      riskLevel: 'low',
      predictedWaterLevel: 0.05,
      confidence: 0.95,
      timestamp: '2026-08-24 22:00',
      location: 'Zone 1 - Civic Center',
      notes: 'Slight ponding near southern gutters. Clear drainage outflow verified.'
    },
    {
      timeWindow: '24 hours',
      riskLevel: 'low',
      predictedWaterLevel: 0.15,
      confidence: 0.90,
      timestamp: '2026-08-25 10:00',
      location: 'Zone 1 - Civic Center',
      notes: 'Runoff remains within safe municipal engineering conduits.'
    },
    {
      timeWindow: '48 hours',
      riskLevel: 'moderate',
      predictedWaterLevel: 0.40,
      confidence: 0.84,
      timestamp: '2026-08-26 10:00',
      location: 'Zone 1 - Civic Center',
      notes: 'Slight rising accumulation near low-lying parks. Overall risk minimal.'
    }
  ]
};
