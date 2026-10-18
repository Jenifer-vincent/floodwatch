/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Mock seed data for fund allocations and treasury.
 */

import { FundAllocation } from '../types';

export const MOCK_TREASURY_BALANCE = 1420000;

export const MOCK_ALLOCATIONS: FundAllocation[] = [
  {
    id: "TX-9012",
    zoneName: "Sector 4: Lower River Basin",
    category: "Drainage",
    amount: 450000,
    date: "2026-08-22",
    reason: "Reinforcement of catch basin sluice gates and storm backup systems ahead of heavy tidal crests."
  },
  {
    id: "TX-9023",
    zoneName: "Sector 12: East Creek Outlet",
    category: "Emergency Relief",
    amount: 120000,
    date: "2026-08-23",
    reason: "Pre-positioning civilian response packs, inflatable skiffs, and dry blankets at secondary logistics depots."
  },
  {
    id: "TX-9034",
    zoneName: "Sector 3: Downtown Plaza Gutterway",
    category: "Drainage",
    amount: 850000,
    date: "2026-08-24",
    reason: "Gutter vacuum clearing dispatch across central commercial thoroughfares following severe blockages."
  }
];
