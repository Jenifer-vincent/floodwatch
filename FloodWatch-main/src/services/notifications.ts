/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Notification service — backed by the FloodWatch API.
 *
 * The backend returns notifications wrapped in an object
 * ({ notifications, unreadCount }); this service unwraps them into a plain
 * Notification[] so the existing components (which compute the unread count
 * client-side) keep working unchanged.
 *
 * Architecture:
 *   Component → notificationService → api client → FastAPI backend
 */

import { Notification, NotificationListResponse } from '../types';
import { api, toApiError } from './api';

export const notificationService = {
  async getNotifications(_userId?: string): Promise<Notification[]> {
    try {
      const data = await api.get<NotificationListResponse>('/notifications');
      return data.notifications;
    } catch (err) {
      throw new Error(toApiError(err).message);
    }
  },

  async markAsRead(id: string, _userId?: string): Promise<Notification[]> {
    try {
      const data = await api.patch<NotificationListResponse>(`/notifications/${id}/read`);
      return data.notifications;
    } catch (err) {
      throw new Error(toApiError(err).message);
    }
  },

  async markAllAsRead(_userId?: string): Promise<Notification[]> {
    try {
      const data = await api.patch<NotificationListResponse>('/notifications/read-all');
      return data.notifications;
    } catch (err) {
      throw new Error(toApiError(err).message);
    }
  },

  async addNotification(
    title: string,
    message: string,
    severity: Notification['severity'],
    _userId?: string
  ): Promise<Notification[]> {
    // Notifications are created server-side (e.g. admin alerts). No direct
    // client-side creation endpoint exists, so refresh the list instead.
    try {
      return await this.getNotifications();
    } catch (err) {
      throw new Error(toApiError(err).message);
    }
  },

  saveNotifications(_notifs: Notification[]): void {
    // Notifications live on the backend; no local persistence is required.
  },
};
