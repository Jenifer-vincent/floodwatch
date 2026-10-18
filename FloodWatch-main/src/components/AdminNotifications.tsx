/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Admin Civic Notifications view.
 *
 * Full-page list of civic notifications fed by notificationService (→ FastAPI
 * /notifications), with read / mark-all-read actions. Responsive for mobile
 * EOC use.
 */

import React, { useState, useEffect } from 'react';
import {
  Bell, ShieldAlert, Check, CheckCheck, RefreshCw, Inbox
} from 'lucide-react';
import { notificationService } from '../services/notifications';
import { Notification } from '../types';

function severityClasses(severity: Notification['severity']): string {
  switch (severity) {
    case 'critical': return 'bg-[#7F1D1D]/10 text-[#7F1D1D] border-[#7F1D1D]/25';
    case 'high': return 'bg-[#B23B2E]/10 text-[#B23B2E] border-[#B23B2E]/25';
    case 'medium': return 'bg-[#C97A2B]/10 text-[#C97A2B] border-[#C97A2B]/25';
    default: return 'bg-[#2E7D5B]/10 text-[#2E7D5B] border-[#2E7D5B]/25';
  }
}

export default function AdminNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await notificationService.getNotifications();
      setNotifications(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load notifications.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const unread = notifications.filter(n => !n.read).length;

  const handleMarkAsRead = async (id: string) => {
    try {
      const updated = await notificationService.markAsRead(id);
      setNotifications(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update notification.');
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const updated = await notificationService.markAllAsRead();
      setNotifications(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update notifications.');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in" id="admin-notifications-workspace">
      {/* Header */}
      <div className="bg-[#1B4B66] text-white p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 border border-[#E2E4E1]">
        <div>
          <span className="text-[10px] font-mono font-semibold text-white/70 uppercase tracking-widest block">
            Civil Communications Feed
          </span>
          <h2 className="text-xl font-bold tracking-tight mt-1 font-sans">Notifications</h2>
          <p className="text-xs text-white/80 mt-1 max-w-xl">
            System advisories, citizen alerts and operational updates routed to the Emergency Operations Center.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {unread > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              className="px-2.5 py-1.5 bg-white/10 border border-white/20 text-white text-[10px] font-bold uppercase tracking-wider hover:bg-white/20 flex items-center gap-1.5 cursor-pointer"
            >
              <CheckCheck size={12} />
              Mark all read
            </button>
          )}
          <button
            onClick={load}
            className="px-2.5 py-1.5 bg-white text-[#1B4B66] text-[10px] font-bold uppercase tracking-wider hover:bg-white/90 flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-[#B23B2E]/10 border border-[#B23B2E]/30 p-3 text-xs text-[#B23B2E]">
          {error}
        </div>
      )}

      <div className="bg-white border border-[#E2E4E1] p-5">
        <div className="flex items-center justify-between border-b border-[#E2E4E1] pb-3">
          <h3 className="text-xs font-extrabold text-[#1A2226] uppercase tracking-wider flex items-center gap-2">
            <Bell size={15} className="text-[#1B4B66]" />
            <span>Inbox ({unread} unread / {notifications.length} total)</span>
          </h3>
        </div>

        {loading ? (
          <div className="h-40 border border-[#E2E4E1] bg-gray-50 flex items-center justify-center animate-pulse">
            <span className="text-xs font-bold text-[#1A2226] uppercase">Loading Feed...</span>
          </div>
        ) : notifications.length === 0 ? (
          <div className="h-40 border border-dashed border-[#E2E4E1] flex flex-col items-center justify-center text-center p-6">
            <Inbox size={28} className="text-[#C9CFCC]" />
            <p className="text-xs font-bold text-[#1A2226] mt-2 uppercase">No notifications yet</p>
            <p className="text-[10px] text-[#5B6B72] mt-1">Alerts and system advisories will appear here.</p>
          </div>
        ) : (
          <div className="divide-y divide-[#E2E4E1]/80">
            {notifications.map(notif => (
              <div key={notif.id} className={`p-3.5 flex flex-col sm:flex-row sm:items-start gap-3 ${notif.read ? 'bg-white opacity-70' : 'bg-[#1B4B66]/5'}`}>
                <div className={`w-1 shrink-0 ${notif.read ? 'bg-gray-200' : 'bg-[#1B4B66]'}`}></div>
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-[#1A2226] leading-tight">{notif.title}</span>
                    <span className={`text-[8px] font-bold uppercase px-1.5 py-0.2 border ${severityClasses(notif.severity)}`}>
                      {notif.severity}
                    </span>
                    {notif.type && (
                      <span className="text-[8px] font-mono font-bold text-[#5B6B72] uppercase border border-[#E2E4E1] px-1.5 py-0.2">
                        {notif.type}
                      </span>
                    )}
                  </div>
                  <p className="text-[#5B6B72] leading-relaxed text-[11px]">{notif.message}</p>
                  <div className="flex flex-wrap items-center justify-between gap-2 text-[9px] text-[#5B6B72] font-mono pt-1">
                    <span className="flex items-center gap-1">
                      <ShieldAlert size={10} />
                      {notif.timestamp}
                    </span>
                    {!notif.read && (
                      <button
                        onClick={() => handleMarkAsRead(notif.id)}
                        className="text-[#1B4B66] hover:underline font-bold flex items-center gap-0.5 cursor-pointer"
                      >
                        <Check size={10} />
                        Mark read
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
