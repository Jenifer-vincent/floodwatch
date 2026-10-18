import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Bell, Check, X, AlertCircle, Info, Volume2, ShieldAlert } from 'lucide-react';
import { notificationService } from '../services/notifications';
import { Notification } from '../types';
import { usePolling } from '../hooks/usePolling';

interface NotificationCenterProps {
  triggerToast: (msg: string) => void;
}

export default function NotificationCenter({ triggerToast }: NotificationCenterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Load notifications from service
    notificationService.getNotifications().then(setNotifications);

    // Listen for custom event to refresh notifications list
    const handleRefresh = () => {
      notificationService.getNotifications().then(setNotifications);
    };
    window.addEventListener('refresh-notifications', handleRefresh);

    return () => {
      window.removeEventListener('refresh-notifications', handleRefresh);
    };
  }, []);

  // Handle click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Refresh notifications every 15s so new alerts appear without a reload.
  const pollNotifications = useCallback(() => {
    notificationService.getNotifications().then(setNotifications).catch(() => undefined);
  }, []);
  usePolling(pollNotifications, 15000);

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleMarkAsRead = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = await notificationService.markAsRead(id);
    setNotifications(updated);
    triggerToast("Notification marked as read.");
  };

  const handleMarkAllAsRead = async () => {
    const updated = await notificationService.markAllAsRead();
    setNotifications(updated);
    triggerToast("All notifications marked as read.");
  };

  const getSeverityStyle = (severity: Notification['severity']) => {
    switch (severity) {
      case 'critical': return 'bg-[#7F1D1D]/10 text-[#7F1D1D] border-[#7F1D1D]/25 animate-pulse';
      case 'high': return 'bg-[#B23B2E]/10 text-[#B23B2E] border-[#B23B2E]/25';
      case 'medium': return 'bg-[#C97A2B]/10 text-[#C97A2B] border-[#C97A2B]/25';
      case 'low': default: return 'bg-[#2E7D5B]/10 text-[#2E7D5B] border-[#2E7D5B]/25';
    }
  };

  return (
    <div className="relative" ref={dropdownRef} id="notification-center-trigger">
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 border border-[#E2E4E1] hover:bg-[#F5F6F4] relative transition-colors cursor-pointer text-[#1B4B66]"
        title="View notifications"
        aria-label="View notifications"
        aria-expanded={isOpen}
      >
        <Bell size={16} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 h-4 w-4 bg-[#B23B2E] text-white text-[9px] font-bold flex items-center justify-center rounded-full animate-bounce">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 sm:right-0 mt-2 w-[calc(100vw-1rem)] sm:w-96 max-w-[384px] bg-white border border-[#E2E4E1] shadow-2xl z-[9999] animate-fade-in" id="notification-dropdown">
          {/* Header */}
          <div className="border-b border-[#E2E4E1] p-3.5 bg-[#F5F6F4] flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#1A2226] flex items-center gap-1.5">
              <ShieldAlert size={12} className="text-[#1B4B66]" />
              Civic Notification Feed ({unreadCount} unread)
            </span>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="text-[9px] font-bold text-[#1B4B66] hover:underline uppercase tracking-wide cursor-pointer"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* List Content */}
          <div className="max-h-80 overflow-y-auto divide-y divide-[#E2E4E1]/80">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#5B6B72] space-y-2">
                <Bell size={24} className="mx-auto text-gray-300" />
                <p>No new notifications at this time.</p>
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  className={`p-3.5 flex gap-3 transition-colors ${notif.read ? 'bg-white opacity-70' : 'bg-[#1B4B66]/5'}`}
                >
                  {/* Status Indicator Bar */}
                  <div className={`w-1 shrink-0 ${notif.read ? 'bg-gray-200' : 'bg-[#1B4B66]'}`}></div>

                  <div className="flex-1 space-y-1 text-xs">
                    <div className="flex items-center justify-between gap-1.5">
                      <span className="font-bold text-[#1A2226] leading-tight block pr-2">
                        {notif.title}
                      </span>
                      <span className={`text-[8px] font-bold uppercase px-1.5 py-0.2 border shrink-0 ${getSeverityStyle(notif.severity)}`}>
                        {notif.severity}
                      </span>
                    </div>
                    <p className="text-[#5B6B72] leading-relaxed text-[11px]">
                      {notif.message}
                    </p>
                    <div className="flex items-center justify-between text-[9px] text-[#5B6B72] font-mono pt-1">
                      <span>{notif.timestamp}</span>
                      {!notif.read && (
                        <button
                          onClick={(e) => handleMarkAsRead(notif.id, e)}
                          className="text-[#1B4B66] hover:underline font-bold flex items-center gap-0.5 cursor-pointer"
                        >
                          <Check size={10} />
                          Mark read
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer warning */}
          <div className="p-2 border-t border-[#E2E4E1] bg-gray-50 text-[9px] text-[#5B6B72] text-center font-mono">
            OPERATIONAL FEED V1 // LOCAL SANDBOX NODE
          </div>
        </div>
      )}
    </div>
  );
}
