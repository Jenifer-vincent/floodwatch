/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Priority service — zone priority scoring.
 *
 * Preferred source is the FloodWatch API (GET /priority/zones). When the
 * backend is unreachable, the service falls back to computing scores from the
 * bundled mock priority data (ML priority scoring is a future phase).
 *
 * API Endpoints:
 *   GET /priority/zones → PriorityZonesResponse
 */

import { PriorityZonesResponse, PriorityZone, PriorityFactorsConfig } from '../types';
import { MOCK_PRIORITY_ZONES } from '../mocks/analytics';
import { api } from './api';

function computeScore(factors: Record<string, number>, config: PriorityFactorsConfig): number {
  return Math.round(
    factors.floodSeverityWeight * config.floodSeverityWeight * 100 +
    factors.infrastructureRiskWeight * config.infrastructureRiskWeight * 100 +
    factors.populationDensityWeight * config.populationDensityWeight * 100 +
    factors.roadAccessWeight * config.roadAccessWeight * 100
  ) / 100;
}

function getRiskLevel(score: number): PriorityZone['riskLevel'] {
  if (score >= 75) return 'critical';
  if (score >= 50) return 'high';
  if (score >= 25) return 'medium';
  return 'low';
}

function getRecommendedAction(riskLevel: PriorityZone['riskLevel'], factors: Record<string, number>): string {
  if (riskLevel === 'critical') return "Immediate emergency response deployment. Evacuate affected zones.";
  if (riskLevel === 'high') return "Elevated monitoring. Pre-position emergency response units.";
  if (riskLevel === 'medium') return "Active monitoring. Prepare contingency resources.";
  return "Standard monitoring. No immediate action required.";
}

const DEFAULT_CONFIG: PriorityFactorsConfig = {
  floodSeverityWeight: 1.2,
  infrastructureRiskWeight: 1.0,
  populationDensityWeight: 0.8,
  roadAccessWeight: 0.6,
};

function fallbackZones(config: Partial<PriorityFactorsConfig>): PriorityZonesResponse {
  const effectiveConfig = { ...DEFAULT_CONFIG, ...config };

  const zones: PriorityZone[] = MOCK_PRIORITY_ZONES.map(mockZone => {
    const factors = [
      { name: 'Flood Severity', value: Math.round(mockZone.factors.floodSeverityWeight * 100) },
      { name: 'Infrastructure Risk', value: Math.round(mockZone.factors.infrastructureRiskWeight * 100) },
      { name: 'Population Density', value: Math.round(mockZone.factors.populationDensityWeight * 100) },
      { name: 'Road Access', value: Math.round(mockZone.factors.roadAccessWeight * 100) }
    ];

    const score = computeScore(mockZone.factors, effectiveConfig);
    const riskLevel = getRiskLevel(score);

    return {
      zoneId: mockZone.zoneId,
      zoneName: mockZone.zoneName,
      score,
      riskLevel,
      reportCount: 0,
      factors,
      recommendedAction: getRecommendedAction(riskLevel, mockZone.factors)
    };
  });

  zones.sort((a, b) => b.score - a.score);

  return {
    zones,
    config: effectiveConfig,
    calculatedAt: new Date().toISOString()
  };
}

export const priorityService = {
  async getPriorityZones(config?: Partial<PriorityFactorsConfig>): Promise<PriorityZonesResponse> {
    try {
      const data = await api.get<PriorityZonesResponse>('/priority/zones', { allowPublic: true });
      if (data && Array.isArray(data.zones) && data.zones.length > 0) {
        return {
          zones: data.zones,
          config: data.config || DEFAULT_CONFIG,
          calculatedAt: data.calculatedAt || new Date().toISOString(),
        };
      }
    } catch {
      // fall through to mock-based scoring
    }
    return fallbackZones(config || {});
  }
};
