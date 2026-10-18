/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Admin Alert Command & Broadcasting workspace.
 *
 * Create, review and recall public broadcast alerts (emergency notices shown
 * to citizen screens). Backed by alertService (→ FastAPI /alerts). POST/DELETE
 * are admin-only; GET is public. The page is fully responsive for mobile EOC
 * use.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Megaphone, Plus, Trash2, AlertTriangle, CheckCircle2, Clock, MapPin, RefreshCw
} from 'lucide-react';
import { alertService } from '../services/alerts';
import { Alert, Severity } from '../types';
import { usePolling } from '../hooks/usePolling';

const FALLBACK_ZONES = [
  'Sector 4: Lower River Basin',
  'Sector 12: East Creek Outlet',
  'Sector 3: Downtown Plaza Gutterway',
  'Sector 9: West Hills Drainage Zone',
];

export const ALERT_SEVERITY_OPTIONS: { value: Severity; label: string; color: string; badge: string }[] = [
  { value: 'low', label: 'Low', color: '#2E7D5B', badge: 'bg-[#2E7D5B]/10 text-[#2E7D5B] border-[#2E7D5B]/30' },
  { value: 'medium', label: 'Medium', color: '#C97A2B', badge: 'bg-[#C97A2B]/10 text-[#C97A2B] border-[#C97A2B]/30' },
  { value: 'high', label: 'High', color: '#B23B2E', badge: 'bg-[#B23B2E]/10 text-[#B23B2E] border-[#B23B2E]/30' },
  { value: 'critical', label: 'Critical', color: '#7F1D1D', badge: 'bg-[#7F1D1D]/10 text-[#7F1D1D] border-[#7F1D1D]/30' },
];

function severityMeta(severity: Severity) {
  return ALERT_SEVERITY_OPTIONS.find(s => s.value === severity) || ALERT_SEVERITY_OPTIONS[1];
}

interface AdminAlertsProps {
  zones?: string[];
}

export default function AdminAlerts({ zones }: AdminAlertsProps) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [sending, setSending] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [message, setMessage] = useState<string>('');
  const [severity, setSeverity] = useState<Severity>('medium');
  const [zone, setZone] = useState<string>('All Sectors');

  const zoneOptions = zones && zones.length > 0 ? zones : FALLBACK_ZONES;

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await alertService.getAlerts();
      setAlerts(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load alerts.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // Background refresh: keep the active-notice list live without toggling the
  // full-screen loading spinner.
  const pollAlerts = useCallback(() => {
    alertService.getAlerts().then(list => {
      setAlerts(list);
      setError(null);
    }).catch(() => undefined);
  }, []);
  usePolling(pollAlerts, 15000);

  const handleSend = async () => {
    if (message.trim().length < 3) {
      setError('Alert message must be at least 3 characters long.');
      setSuccess(null);
      return;
    }
    setSending(true);
    setError(null);
    setSuccess(null);
    try {
      await alertService.createAlert(message.trim(), severity, zone === 'All Sectors' ? undefined : zone);
      setSuccess(`Alert broadcast to ${zone === 'All Sectors' ? 'all sectors' : zone}.`);
      setMessage('');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to broadcast alert.');
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async (id: string) => {
    setError(null);
    setSuccess(null);
    try {
      await alertService.deleteAlert(id);
      setAlerts(prev => prev.filter(a => a.id !== id));
      setSuccess('Alert recalled successfully.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to recall alert.');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in" id="admin-alerts-workspace">
      {/* Header */}
      <div className="bg-[#8A1E1E] text-white p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 border border-[#E2E4E1]">
        <div>
          <span className="text-[10px] font-mono font-semibold text-white/70 uppercase tracking-widest block">
            Emergency Broadcast Authority
          </span>
          <h2 className="text-xl font-bold tracking-tight mt-1 font-sans">Alert Command Center</h2>
          <p className="text-xs text-white/80 mt-1 max-w-xl">
            Authorize and dispatch public flood notices to citizen screens. Recall superseded advisories at any time.
          </p>
        </div>
        <button
          onClick={load}
          className="px-2.5 py-1.5 bg-white text-[#8A1E1E] text-[10px] font-bold uppercase tracking-wider hover:bg-white/90 flex items-center gap-1.5 cursor-pointer"
        >
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {error && (
        <div className="bg-[#B23B2E]/10 border border-[#B23B2E]/30 p-3 text-xs text-[#B23B2E] flex items-center gap-2">
          <AlertTriangle size={14} />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="bg-[#2E7D5B]/10 border border-[#2E7D5B]/30 p-3 text-xs text-[#2E7D5B] flex items-center gap-2">
          <CheckCircle2 size={14} />
          <span>{success}</span>
        </div>
      )}

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-12">
        {/* Compose panel */}
        <div className="lg:col-span-5 bg-white border border-[#E2E4E1] p-5 space-y-4">
          <h3 className="text-xs font-extrabold text-[#1A2226] uppercase tracking-wider flex items-center gap-2 border-b border-[#E2E4E1] pb-2">
            <Megaphone size={15} className="text-[#1B4B66]" />
            <span>Compose Broadcast Notice</span>
          </h3>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-[#1A2226] uppercase tracking-wider block">Message</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              placeholder="Describe the active hazard, affected movement, and advised citizen action..."
              className="w-full text-xs border border-[#E2E4E1] px-2.5 py-2 focus:outline-none focus:ring-1 focus:ring-[#1B4B66] bg-white text-[#1A2226]"
            />
            <div className="text-right text-[9px] font-mono text-[#5B6B72]">{message.length} chars</div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-[#1A2226] uppercase tracking-wider block">Severity</label>
              <div className="flex gap-1.5">
                {ALERT_SEVERITY_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setSeverity(opt.value)}
                    className={`flex-1 py-1.5 text-[9px] font-bold uppercase border cursor-pointer ${
                      severity === opt.value
                        ? 'text-white'
                        : 'bg-white text-gray-600 hover:bg-gray-50'
                    }`}
                    style={severity === opt.value ? { backgroundColor: opt.color, borderColor: opt.color } : {}}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-[#1A2226] uppercase tracking-wider block">Target Zone</label>
              <select
                value={zone}
                onChange={(e) => setZone(e.target.value)}
                className="w-full text-xs border border-[#E2E4E1] px-2.5 py-2 bg-white text-[#1A2226] focus:outline-none focus:ring-1 focus:ring-[#1B4B66]"
              >
                <option value="All Sectors">All Sectors (Broadcast)</option>
                {zoneOptions.map(z => (
                  <option key={z} value={z}>{z}</option>
                ))}
              </select>
            </div>
          </div>

          <button
            onClick={handleSend}
            disabled={sending}
            className="w-full bg-[#1B4B66] hover:bg-[#153a4f] text-white py-2.5 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            <Plus size={14} />
            {sending ? 'Broadcasting...' : 'Dispatch Notice'}
          </button>
        </div>

        {/* Active alerts list */}
        <div className="lg:col-span-7 bg-white border border-[#E2E4E1] p-5 space-y-3">
          <h3 className="text-xs font-extrabold text-[#1A2226] uppercase tracking-wider flex items-center gap-2 border-b border-[#E2E4E1] pb-2">
            <AlertTriangle size={15} className="text-[#C97A2B]" />
            <span>Active Public Notices ({alerts.filter(a => a.active).length})</span>
          </h3>

          {loading ? (
            <div className="h-40 border border-[#E2E4E1] bg-gray-50 flex items-center justify-center animate-pulse">
              <span className="text-xs font-bold text-[#1A2226] uppercase">Loading Alerts...</span>
            </div>
          ) : alerts.length === 0 ? (
            <div className="h-40 border border-dashed border-[#E2E4E1] flex flex-col items-center justify-center text-center p-6">
              <Megaphone size={28} className="text-[#C9CFCC]" />
              <p className="text-xs font-bold text-[#1A2226] mt-2 uppercase">No active notices</p>
              <p className="text-[10px] text-[#5B6B72] mt-1">Dispatch an advisory using the compose panel.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {alerts.map(alert => {
                const meta = severityMeta(alert.severity);
                return (
                  <div key={alert.id} className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 border border-[#E2E4E1] p-3 bg-white">
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 border ${meta.badge}`} style={{ color: meta.color }}>
                          {meta.label}
                        </span>
                        {alert.active && (
                          <span className="text-[8px] font-mono font-bold text-[#2E7D5B] uppercase flex items-center gap-1">
                            <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#2E7D5B] animate-pulse" />
                            Active
                          </span>
                        )}
                        {alert.zone && (
                          <span className="text-[9px] font-mono text-[#5B6B72] flex items-center gap-1">
                            <MapPin size={10} /> {alert.zone}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[#1A2226] leading-relaxed break-words">{alert.message}</p>
                      <div className="flex flex-wrap items-center gap-3 text-[9px] font-mono text-[#5B6B72]">
                        <span className="flex items-center gap-1"><Clock size={10} /> {new Date(alert.createdAt).toLocaleString()}</span>
                        {alert.createdBy && <span>By: {alert.createdBy}</span>}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDelete(alert.id)}
                      className="self-start shrink-0 text-[#B23B2E] hover:text-[#7F1D1D] border border-[#B23B2E]/30 hover:bg-[#B23B2E]/5 p-2 cursor-pointer"
                      title="Recall alert"
                      aria-label={`Recall alert ${alert.id}`}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
