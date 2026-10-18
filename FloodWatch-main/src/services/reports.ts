/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Report service — CRUD operations for flood reports, backed by the
 * FloodWatch API.
 *
 * Architecture:
 *   Component → reportService → api client → FastAPI backend
 *
 * Backend records use canonical statuses submitted|verified|resolved|archived
 * and expose phase2 compatibility aliases (phase2Status, date, photoUrl,
 * waterLevelDepth, adminNotes). The service maps those into the FloodReport
 * shape consumed by the existing components.
 */

import { FloodReport, UpdateReportRequest } from '../types';
import { api, toApiError } from './api';

interface BackendReport {
  id: string;
  userId: string;
  imageUrl?: string | null;
  latitude: number;
  longitude: number;
  location: string;
  severity: FloodReport['severity'];
  waterDepth?: number | null;
  description: string;
  status: string;
  submittedAt: string;
  verifiedAt?: string | null;
  resolvedAt?: string | null;
  resolutionNotes?: string | null;
  reporterName: string;
  phone?: string | null;
  // Phase 2 compatibility aliases
  phase2Status?: string;
  date?: string;
  photoUrl?: string | null;
  waterLevelDepth?: string | null;
  adminNotes?: string | null;
}

function mapReport(r: BackendReport): FloodReport {
  const status = (r.phase2Status || r.status) as FloodReport['status'];
  return {
    id: r.id,
    userId: r.userId,
    location: r.location,
    severity: r.severity,
    description: r.description,
    date: r.date ?? r.submittedAt,
    status,
    reporterName: r.reporterName,
    phone: r.phone ?? '',
    photoUrl: r.photoUrl ?? r.imageUrl ?? undefined,
    waterLevelDepth: r.waterLevelDepth ?? undefined,
    adminNotes: r.adminNotes ?? r.resolutionNotes ?? undefined,
    latitude: r.latitude,
    longitude: r.longitude,
    verifiedAt: r.verifiedAt ?? undefined,
    resolvedAt: r.resolvedAt ?? undefined,
  };
}

function toErrorMessage(err: unknown): string {
  const e = toApiError(err);
  return e.message;
}

// "15cm" | "1.2m" | "0.5 m" etc. → meters (float) for the backend.
function parseWaterDepthToMeters(depth: string | undefined): number | undefined {
  if (!depth) return undefined;
  const match = depth.trim().match(/^([\d.]+)\s*(m|cm|mm)?$/i);
  if (!match) return undefined;
  const value = parseFloat(match[1]);
  if (Number.isNaN(value)) return undefined;
  const unit = (match[2] || 'm').toLowerCase();
  if (unit === 'cm') return value / 100;
  if (unit === 'mm') return value / 1000;
  return value;
}

export const reportService = {
  async getReports(): Promise<FloodReport[]> {
    try {
      const data = await api.get<BackendReport[]>('/reports');
      return data.map(mapReport);
    } catch (err) {
      return [];
    }
  },

  async getMyReports(userId: string): Promise<FloodReport[]> {
    try {
      const data = await api.get<BackendReport[]>('/reports/my');
      return data.map(mapReport).filter(r => !userId || r.userId === userId);
    } catch {
      return [];
    }
  },

  async getReportById(id: string): Promise<FloodReport | null> {
    try {
      const data = await api.get<BackendReport>(`/reports/${id}`);
      return mapReport(data);
    } catch {
      return null;
    }
  },

  async createReport(request: Omit<FloodReport, 'id' | 'date' | 'status'>, _userId?: string): Promise<FloodReport> {
    try {
      const data = await api.post<BackendReport>('/reports', {
        location: request.location,
        latitude: request.latitude ?? 0,
        longitude: request.longitude ?? 0,
        severity: request.severity,
        description: request.description,
        waterDepth: parseWaterDepthToMeters(request.waterLevelDepth),
        imageUrl: request.photoUrl,
        reporterName: request.reporterName,
        phone: request.phone,
      });
      return mapReport(data);
    } catch (err) {
      throw new Error(toErrorMessage(err));
    }
  },

  async updateReport(id: string, updates: UpdateReportRequest): Promise<FloodReport | null> {
    try {
      const body: Record<string, unknown> = {};
      if (updates.status) {
        const normalized = updates.status === 'pending' ? 'submitted' : updates.status;
        body.status = normalized;
      }
      if (updates.severity) body.severity = updates.severity;
      if (updates.adminNotes !== undefined) body.resolutionNotes = updates.adminNotes;
      const data = await api.patch<BackendReport>(`/reports/${id}`, body);
      return mapReport(data);
    } catch {
      return null;
    }
  },

  async verifyReport(id: string): Promise<FloodReport | null> {
    try {
      const data = await api.patch<BackendReport>(`/reports/${id}/verify`, {});
      return mapReport(data);
    } catch (err) {
      throw new Error(toErrorMessage(err));
    }
  },

  async resolveReport(id: string, notes: string): Promise<FloodReport | null> {
    try {
      const data = await api.patch<BackendReport>(`/reports/${id}/resolve`, {
        resolutionNotes: notes,
      });
      return mapReport(data);
    } catch (err) {
      throw new Error(toErrorMessage(err));
    }
  },

  async deleteReport(id: string): Promise<boolean> {
    try {
      await api.del<{ success: boolean }>(`/reports/${id}`);
      return true;
    } catch {
      return false;
    }
  },

  // Upload a photographic evidence file for an existing report.
  // Returns the served image URL for the stored photo.
  async uploadImage(id: string, file: File): Promise<string | null> {
    try {
      const formData = new FormData();
      formData.append('image', file);
      const data = await api.post<{ imageUrl?: string }>(
        `/reports/${id}/image`,
        formData,
        { isFormData: true }
      );
      return data?.imageUrl ?? null;
    } catch (err) {
      throw new Error(toErrorMessage(err));
    }
  },

  // Kept for API compatibility. Report data now lives on the backend, so this
  // is a no-op for persistence.
  saveReports(_reports: FloodReport[]): void {
    // Reports are stored server-side; no local persistence is required.
  },
};
