/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Mock seed data for analytics and historical metrics.
 */

import { AnalyticsDataPoint, AreaStats, SeverityDistributionMetric } from '../types';

export const MOCK_DAILY_SERIES: AnalyticsDataPoint[] = [
  { label: 'Aug 18', totalReports: 4, unresolvedReports: 1, verifiedReports: 3, criticalSeverityCount: 0 },
  { label: 'Aug 19', totalReports: 9, unresolvedReports: 3, verifiedReports: 5, criticalSeverityCount: 1 },
  { label: 'Aug 20', totalReports: 15, unresolvedReports: 4, verifiedReports: 10, criticalSeverityCount: 3 },
  { label: 'Aug 21', totalReports: 28, unresolvedReports: 8, verifiedReports: 18, criticalSeverityCount: 7 },
  { label: 'Aug 22', totalReports: 35, unresolvedReports: 11, verifiedReports: 22, criticalSeverityCount: 11 },
  { label: 'Aug 23', totalReports: 22, unresolvedReports: 5, verifiedReports: 15, criticalSeverityCount: 4 },
  { label: 'Aug 24', totalReports: 14, unresolvedReports: 2, verifiedReports: 11, criticalSeverityCount: 1 }
];

export const MOCK_WEEKLY_SERIES: AnalyticsDataPoint[] = [
  { label: 'Wk 31 (Jul)', totalReports: 25, unresolvedReports: 5, verifiedReports: 18, criticalSeverityCount: 2 },
  { label: 'Wk 32 (Aug)', totalReports: 42, unresolvedReports: 10, verifiedReports: 29, criticalSeverityCount: 5 },
  { label: 'Wk 33 (Aug)', totalReports: 68, unresolvedReports: 19, verifiedReports: 44, criticalSeverityCount: 14 },
  { label: 'Wk 34 (Current)', totalReports: 127, unresolvedReports: 34, verifiedReports: 84, criticalSeverityCount: 27 }
];

export const MOCK_MONTHLY_SERIES: AnalyticsDataPoint[] = [
  { label: 'Mar 2026', totalReports: 12, unresolvedReports: 1, verifiedReports: 11, criticalSeverityCount: 0 },
  { label: 'Apr 2026', totalReports: 34, unresolvedReports: 4, verifiedReports: 28, criticalSeverityCount: 3 },
  { label: 'May 2026', totalReports: 85, unresolvedReports: 12, verifiedReports: 67, criticalSeverityCount: 12 },
  { label: 'Jun 2026', totalReports: 110, unresolvedReports: 18, verifiedReports: 88, criticalSeverityCount: 20 },
  { label: 'Jul 2026', totalReports: 145, unresolvedReports: 25, verifiedReports: 115, criticalSeverityCount: 32 },
  { label: 'Aug 2026', totalReports: 271, unresolvedReports: 34, verifiedReports: 220, criticalSeverityCount: 58 }
];

export const MOCK_AREA_STATS: AreaStats[] = [
  { zoneName: 'All Sectors', total: 6, critical: 1, high: 2, medium: 2, low: 1 },
  { zoneName: 'Sector 4: Lower River Basin', total: 3, critical: 1, high: 1, medium: 1, low: 0 },
  { zoneName: 'Sector 12: East Creek Outlet', total: 1, critical: 0, high: 0, medium: 1, low: 0 },
  { zoneName: 'Sector 9: West Hills Drainage Zone', total: 0, critical: 0, high: 0, medium: 0, low: 0 },
  { zoneName: 'Sector 3: Downtown Plaza Gutterway', total: 1, critical: 0, high: 0, medium: 1, low: 0 }
];

export const MOCK_SEVERITY_DISTRIBUTION: SeverityDistributionMetric[] = [
  { name: 'Critical', value: 1 },
  { name: 'High', value: 2 },
  { name: 'Medium', value: 2 },
  { name: 'Low', value: 1 }
];

export const MOCK_PRIORITY_ZONES = [
  {
    zoneId: "Z-1",
    zoneName: "Sector 4: Lower River Basin",
    factors: {
      floodSeverityWeight: 0.90,
      infrastructureRiskWeight: 0.80,
      populationDensityWeight: 0.70,
      roadAccessWeight: 0.60
    }
  },
  {
    zoneId: "Z-2",
    zoneName: "Sector 12: East Creek Outlet",
    factors: {
      floodSeverityWeight: 0.60,
      infrastructureRiskWeight: 0.50,
      populationDensityWeight: 0.45,
      roadAccessWeight: 0.55
    }
  },
  {
    zoneId: "Z-4",
    zoneName: "Sector 3: Downtown Plaza Gutterway",
    factors: {
      floodSeverityWeight: 0.45,
      infrastructureRiskWeight: 0.65,
      populationDensityWeight: 0.80,
      roadAccessWeight: 0.40
    }
  },
  {
    zoneId: "Z-3",
    zoneName: "Sector 9: West Hills Drainage Zone",
    factors: {
      floodSeverityWeight: 0.15,
      infrastructureRiskWeight: 0.20,
      populationDensityWeight: 0.35,
      roadAccessWeight: 0.30
    }
  }
];
