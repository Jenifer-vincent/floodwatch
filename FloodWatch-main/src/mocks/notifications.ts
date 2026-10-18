/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Mock seed data for notifications.
 */

import { Notification } from '../types';

export const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: "notif-1",
    title: "Critical Storm Tide Alert",
    message: "High ocean swell overlay matches critical thresholds. Evacuate underpass sectors near Zone 12 immediately.",
    timestamp: "2026-08-24 07:45",
    read: false,
    severity: "critical",
    type: "alert"
  },
  {
    id: "notif-2",
    title: "Sandbag Distribution Active",
    message: "Municipal crews are distributing free sandbags at the Sector 4 community depot until 18:00.",
    timestamp: "2026-08-24 06:30",
    read: false,
    severity: "high",
    type: "update"
  },
  {
    id: "notif-3",
    title: "Civic Center Status: Safe",
    message: "Drainage grates fully cleared in Sector 1. Runoff levels have returned to normal baseline indices.",
    timestamp: "2026-08-24 05:15",
    read: true,
    severity: "low",
    type: "system"
  }
];
