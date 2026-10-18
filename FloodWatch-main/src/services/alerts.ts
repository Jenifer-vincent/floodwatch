/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Alert service — broadcast alert management, backed by the FloodWatch API.
 *
 * GET /alerts is public; POST and DELETE are admin-only.
 *
 * Architecture:
 *   Component → alertService → api client → FastAPI backend
 */

import { Alert, ApiError } from '../types';
import { api, toApiError } from './api';

export const alertService = {
  /** List broadcast alerts, newest first (active alerts on top). */
  async getAlerts(): Promise<Alert[]> {
    try {
      return await api.get<Alert[]>('/alerts');
    } catch (err) {
      throw new Error(toApiError(err).message);
    }
  },

  /** Create a new broadcast alert (admin-only). */
  async createAlert(
    message: string,
    severity: Alert['severity'] = 'medium',
    zone?: string
  ): Promise<Alert> {
    try {
      return await api.post<Alert>('/alerts', {
        message,
        severity,
        ...(zone ? { zone } : {}),
      });
    } catch (err) {
      throw new Error(toApiError(err).message);
    }
  },

  /** Delete a broadcast alert by id (admin-only). */
  async deleteAlert(id: string): Promise<void> {
    try {
      await api.del<{ success: boolean }>(`/alerts/${id}`);
    } catch (err) {
      throw new Error(toApiError(err).message);
    }
  },

  /* ------------------------------------------------------------------ *
   * Backward-compatible helpers — present alerts as plain message strings
   * so existing presentational props (string[]) keep working.
   * ------------------------------------------------------------------ */

  /** Return the alert message texts, newest first. */
  toMessages(alerts: Alert[]): string[] {
    return alerts.map(a => a.message);
  },

  /** Fetch alerts and return them as plain message strings. */
  async getBroadcastAlerts(): Promise<string[]> {
    try {
      const alerts = await this.getAlerts();
      return this.toMessages(alerts);
    } catch (err) {
      throw new Error(toApiError(err as ApiError).message);
    }
  },
};
