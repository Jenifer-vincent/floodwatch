/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Analytics service — dashboard metrics.
 *
 * All metrics are backed by the FloodWatch API (admin-only).
 *
 * Architecture:
 *   Component → analyticsService → api client → FastAPI backend
 */

import {
  AnalyticsOverview, AnalyticsIncidentsResponse, AnalyticsSeverityResponse,
  AnalyticsAreasResponse, AnalyticsFundsResponse, AnalyticsDetailsResponse
} from '../types';
import { api, toApiError } from './api';

export const analyticsService = {
  async getOverview(): Promise<AnalyticsOverview> {
    try {
      return await api.get<AnalyticsOverview>('/analytics/overview');
    } catch (err) {
      throw new Error(toApiError(err).message);
    }
  },

  async getIncidents(): Promise<AnalyticsIncidentsResponse> {
    try {
      return await api.get<AnalyticsIncidentsResponse>('/analytics/incidents');
    } catch (err) {
      throw new Error(toApiError(err).message);
    }
  },

  async getSeverity(): Promise<AnalyticsSeverityResponse> {
    try {
      return await api.get<AnalyticsSeverityResponse>('/analytics/severity');
    } catch (err) {
      throw new Error(toApiError(err).message);
    }
  },

  async getAreas(): Promise<AnalyticsAreasResponse> {
    try {
      return await api.get<AnalyticsAreasResponse>('/analytics/areas');
    } catch (err) {
      throw new Error(toApiError(err).message);
    }
  },

  async getFunds(): Promise<AnalyticsFundsResponse> {
    try {
      return await api.get<AnalyticsFundsResponse>('/analytics/funds');
    } catch (err) {
      throw new Error(toApiError(err).message);
    }
  },

  async getDetails(): Promise<AnalyticsDetailsResponse> {
    try {
      return await api.get<AnalyticsDetailsResponse>('/analytics/details');
    } catch (err) {
      throw new Error(toApiError(err).message);
    }
  },
};
