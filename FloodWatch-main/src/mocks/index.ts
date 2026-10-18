/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Mock seed data — barrel export.
 *
 * This file re-exports all mock data from the mocks/ directory.
 * When the backend is connected, individual mock files can be
 * removed one at a time as each service switches to real API calls.
 */

export { MOCK_REPORTS } from './reports';
export { MOCK_STATS } from './stats';
export { MOCK_FORECASTS } from './forecasts';
export { MOCK_NOTIFICATIONS } from './notifications';
export { MOCK_ALERTS } from './alerts';
export { MOCK_TREASURY_BALANCE, MOCK_ALLOCATIONS } from './funds';
export {
  MOCK_DAILY_SERIES,
  MOCK_WEEKLY_SERIES,
  MOCK_MONTHLY_SERIES,
  MOCK_AREA_STATS,
  MOCK_SEVERITY_DISTRIBUTION,
  MOCK_PRIORITY_ZONES
} from './analytics';
