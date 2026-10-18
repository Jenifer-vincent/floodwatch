/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { 
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { 
  Shield, AlertTriangle, Landmark, Activity, Compass, 
  TrendingUp, BarChart3, RefreshCw, AlertCircle,
  ListTodo, MapPin, Megaphone, Sliders, CheckCircle2
} from 'lucide-react';
import { 
  FloodReport, ZoneRisk, Severity, FundAllocation, FundTransaction,
  Alert, FloodForecastPoint, PriorityZone, PriorityZonesResponse,
  AnalyticsOverview, AnalyticsIncidentsResponse, AnalyticsSeverityResponse,
  AnalyticsAreasResponse, AnalyticsFundsResponse
} from '../types';
import { forecastService } from '../services/forecast';
import { priorityService } from '../services/priority';
import { fundService } from '../services/funds';
import { alertService } from '../services/alerts';
import { analyticsService } from '../services/analytics';

// ============================================================================
// The analytics section is driven entirely by the real backend via
// analyticsService (/analytics/*).
// ============================================================================

interface AdminOverviewProps {
  fundBalance?: number;
  reports: FloodReport[];
  zones: ZoneRisk[];
  onNavigateToQueue: () => void;
  onNavigateToMap?: () => void;
  onNavigateToForecast?: () => void;
  onNavigateToPriority?: () => void;
  onNavigateToFunds?: () => void;
  onNavigateToAnalytics?: () => void;
  onNavigateToAlerts?: () => void;
  allocations?: FundAllocation[];
  transactions?: FundTransaction[];
  alerts?: Alert[];
}

export default function AdminOverview({
  fundBalance,
  reports,
  zones,
  onNavigateToQueue,
  onNavigateToMap,
  onNavigateToForecast,
  onNavigateToPriority,
  onNavigateToFunds,
  onNavigateToAnalytics,
  onNavigateToAlerts,
  allocations: propAllocations,
  transactions: propTransactions,
  alerts: propAlerts,
}: AdminOverviewProps) {
  // Backend /funds balance (single source of truth from the live backend).
  const treasuryBalance = fundBalance ?? 0;

  // Live preview data sourced from the backend services.
  const [previewAllocations, setPreviewAllocations] = useState<FundAllocation[]>(propAllocations || []);
  const [previewTransactions, setPreviewTransactions] = useState<FundTransaction[]>(propTransactions || []);
  const [previewAlerts, setPreviewAlerts] = useState<Alert[]>(propAlerts || []);
  const [previewForecast, setPreviewForecast] = useState<FloodForecastPoint[]>([]);
  const [previewPriority, setPreviewPriority] = useState<PriorityZonesResponse | null>(null);

  useEffect(() => {
    if (propAllocations) setPreviewAllocations(propAllocations);
    if (propTransactions) setPreviewTransactions(propTransactions);
    if (propAlerts) setPreviewAlerts(propAlerts);
  }, [propAllocations, propTransactions, propAlerts]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const locs = await forecastService.getLocations();
        let points: FloodForecastPoint[] = [];
        if (locs.length > 0) {
          const first = locs[0];
          points = await forecastService.getForecastForLocation(first);
        }
        if (!cancelled) setPreviewForecast(points);
      } catch { /* ignore */ }
      try {
        const zones = await priorityService.getPriorityZones();
        if (!cancelled) setPreviewPriority(zones);
      } catch { /* ignore */ }
      try {
        const allocs = await fundService.getAllocations();
        if (!cancelled) setPreviewAllocations(e => { const base = propAllocations || e; return propAllocations ? base : allocs; });
      } catch { /* ignore */ }
      try {
        const txns = await fundService.getTransactions();
        if (!cancelled) setPreviewTransactions(t => { const base = propTransactions || t; return propTransactions ? base : txns; });
      } catch { /* ignore */ }
      try {
        const alerts = await alertService.getAlerts();
        if (!cancelled) setPreviewAlerts(a => { const base = propAlerts || a; return propAlerts ? base : alerts; });
      } catch { /* ignore */ }
    })();
    return () => { cancelled = true; };
  }, []);
  // Live local metrics
  const liveActiveCount = reports.filter(r => r.status !== 'resolved').length;
  const livePendingCount = reports.filter(r => r.status === 'pending').length;
  const liveVerifiedCount = reports.filter(r => r.status === 'verified').length;

  // Real backend analytics data (/analytics/*)
  const [analyticsLoading, setAnalyticsLoading] = useState<boolean>(true);
  const [analyticsError, setAnalyticsError] = useState<boolean>(false);
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [incidents, setIncidents] = useState<AnalyticsIncidentsResponse | null>(null);
  const [severity, setSeverity] = useState<AnalyticsSeverityResponse | null>(null);
  const [areas, setAreas] = useState<AnalyticsAreasResponse | null>(null);
  const [funds, setFunds] = useState<AnalyticsFundsResponse | null>(null);

  // Trend interval switch
  const [timePeriodFilter, setTimePeriodFilter] = useState<'daily' | 'weekly' | 'monthly'>('daily');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [ov, inc, sev, ar, fu] = await Promise.all([
          analyticsService.getOverview(),
          analyticsService.getIncidents(),
          analyticsService.getSeverity(),
          analyticsService.getAreas(),
          analyticsService.getFunds(),
        ]);
        if (!cancelled) {
          setOverview(ov || null);
          setIncidents(inc || null);
          setSeverity(sev || null);
          setAreas(ar || null);
          setFunds(fu || null);
        }
      } catch {
        if (!cancelled) setAnalyticsError(true);
      } finally {
        if (!cancelled) setAnalyticsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const trendSeries = useMemo(() => {
    if (!incidents) return [];
    const source = timePeriodFilter === 'weekly' ? incidents.weeklySeries : timePeriodFilter === 'monthly' ? incidents.monthlySeries : incidents.dailySeries;
    return Array.isArray(source) ? source : [];
  }, [incidents, timePeriodFilter]);

  const areaStats = useMemo(() => (areas && Array.isArray(areas.areas) ? areas.areas : []), [areas]);

  const severityMix = useMemo(() => {
    if (!severity || !Array.isArray(severity.distribution)) return [];
    const colors: Record<string, string> = { critical: '#7F1D1D', high: '#B23B2E', medium: '#C97A2B', low: '#2E7D5B' };
    return severity.distribution.map(d => ({
      name: d.name,
      value: d.value,
      color: colors[d.name.toLowerCase()] || '#1B4B66',
    }));
  }, [severity]);

  // Audit resolution status derived from real report lifecycle statuses
  const verificationRatio = useMemo(() => {
    const verified = reports.filter(r => r.status === 'verified').length;
    const resolved = reports.filter(r => r.status === 'resolved').length;
    const pending = reports.filter(r => r.status === 'pending').length;
    return [
      { name: 'Verified Logs', value: verified, color: '#1B4B66' },
      { name: 'Awaiting Actions', value: pending, color: '#C97A2B' },
      { name: 'Resolved / Archived', value: resolved, color: '#2E7D5B' },
    ];
  }, [reports]);

  return (
    <div className="space-y-6 animate-fade-in" id="admin-comprehensive-overview">
      
      {/* Overview Header Banner */}
      <div className="bg-[#1B4B66] text-white p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 border border-[#E2E4E1]">
        <div>
          <span className="text-[10px] font-mono font-semibold text-white/70 uppercase tracking-widest block">
            FLOODWATCH // MUNICIPAL EMERGENCY OPERATIONS
          </span>
          <h2 className="text-xl font-extrabold tracking-tight mt-1 uppercase">Admin Command Centre</h2>
          <p className="text-xs text-white/80 mt-1 max-w-xl">
            Municipal Emergency Operations / Government Response
          </p>
        </div>
        <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 border border-white/20 text-xs font-mono">
          <Activity size={14} className="animate-pulse text-[#2E7D5B]" />
          <span>LIVE OPERATIONAL FEED</span>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-[#1A2226] text-white p-4 border border-[#E2E4E1]">
        <span className="text-[10px] font-extrabold uppercase tracking-widest text-white/60 block mb-3">Admin Quick Actions</span>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {[
            { label: 'Review Reports', icon: <ListTodo size={15} />, onClick: onNavigateToQueue },
            { label: 'Open Flood Map', icon: <MapPin size={15} />, onClick: onNavigateToMap },
            { label: 'View Forecast', icon: <TrendingUp size={15} />, onClick: onNavigateToForecast },
            { label: 'Priority Zones', icon: <Sliders size={15} />, onClick: onNavigateToPriority },
            { label: 'Allocate Funds', icon: <Landmark size={15} />, onClick: onNavigateToFunds },
            { label: 'Broadcast Alert', icon: <Megaphone size={15} />, onClick: onNavigateToAlerts },
          ].map(action => (
            <button
              key={action.label}
              onClick={action.onClick}
              className="flex items-center gap-2 px-3 py-2.5 bg-white/5 hover:bg-white/15 border border-white/10 text-[10px] font-bold uppercase tracking-wide text-left cursor-pointer transition-colors"
            >
              <span className="text-[#C9CFCC]">{action.icon}</span>
              <span>{action.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Grid of Stat Cards */}
      <div className="grid gap-3 sm:gap-4 grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
        {/* Active Flood Reports */}
        <div className="bg-white border border-[#E2E4E1] p-4 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <span className="text-[10px] font-bold text-[#5B6B72] uppercase tracking-wider block flex-1 min-w-0 leading-snug">
              Active Flood Reports
            </span>
            <AlertTriangle className="text-[#C97A2B] shrink-0" size={15} />
          </div>
          <div className="mt-3 text-2xl font-bold text-[#1A2226] font-mono tracking-tight min-w-0">{liveActiveCount}</div>
        </div>

        {/* Critical Sectors */}
        <div className="bg-white border border-[#E2E4E1] p-4 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <span className="text-[10px] font-bold text-[#5B6B72] uppercase tracking-wider block flex-1 min-w-0 leading-snug">
              Critical Sectors
            </span>
            <Compass className="text-[#B23B2E] shrink-0" size={15} />
          </div>
          <div className="mt-3 text-2xl font-bold text-[#1A2226] font-mono tracking-tight min-w-0">
            {zones.filter(z => z.riskLevel === 'high' || z.riskLevel === 'critical').length}
          </div>
          <div className="mt-1 text-[9px] text-[#5B6B72] min-w-0">of {zones.length} sectors</div>
        </div>

        {/* Pending Verification */}
        <div className="bg-white border border-[#E2E4E1] p-4 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <span className="text-[10px] font-bold text-[#5B6B72] uppercase tracking-wider block flex-1 min-w-0 leading-snug">
              Pending Verification
            </span>
            <Shield className="text-[#1B4B66] shrink-0" size={15} />
          </div>
          <div className="mt-3 text-2xl font-bold text-[#1A2226] font-mono tracking-tight min-w-0">{livePendingCount}</div>
        </div>

        {/* Verified Reports */}
        <div className="bg-white border border-[#E2E4E1] p-4 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <span className="text-[10px] font-bold text-[#5B6B72] uppercase tracking-wider block flex-1 min-w-0 leading-snug">
              Verified Reports
            </span>
            <CheckCircle2 className="text-[#1B4B66] shrink-0" size={15} />
          </div>
          <div className="mt-3 text-2xl font-bold text-[#1A2226] font-mono tracking-tight min-w-0">{liveVerifiedCount}</div>
        </div>

        {/* Unresolved Reports */}
        <div className="bg-white border border-[#E2E4E1] p-4 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <span className="text-[10px] font-bold text-[#5B6B72] uppercase tracking-wider block flex-1 min-w-0 leading-snug">
              Unresolved Reports
            </span>
            <AlertCircle className="text-[#B23B2E] shrink-0" size={15} />
          </div>
          <div className="mt-3 text-2xl font-bold text-[#1A2226] font-mono tracking-tight min-w-0">
            {reports.filter(r => r.status !== 'resolved').length}
          </div>
        </div>

        {/* Emergency Fund Balance */}
        <div className="bg-white border border-[#E2E4E1] p-4 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <span className="text-[10px] font-bold text-[#5B6B72] uppercase tracking-wider block flex-1 min-w-0 leading-snug">
              Emergency Fund Balance
            </span>
            <Landmark className="text-[#2E7D5B] shrink-0" size={15} />
          </div>
          <div className="mt-3 text-lg sm:text-xl font-bold text-[#1A2226] font-mono tracking-tight min-w-0 break-words">
            {`$${treasuryBalance.toLocaleString()}`}
          </div>
        </div>
      </div>

      {/* Report Overview Summary */}
      <div className="bg-white border border-[#E2E4E1] p-5">
        <div className="flex items-center justify-between border-b border-[#E2E4E1] pb-2 mb-4">
          <h3 className="text-xs font-extrabold text-[#1A2226] uppercase tracking-wider flex items-center gap-2">
            <BarChart3 size={15} className="text-[#1B4B66]" />
            <span>Citizen Report Overview</span>
          </h3>
          <button onClick={onNavigateToQueue} className="text-[10px] font-bold text-[#1B4B66] hover:underline uppercase cursor-pointer">
            VIEW ALL &rarr;
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 mb-5">
          {[
            { label: 'Total', value: reports.length, color: '#1B4B66' },
            { label: 'Submitted', value: reports.filter(r => r.status === 'pending').length, color: '#5B6B72' },
            { label: 'Verified', value: reports.filter(r => r.status === 'verified').length, color: '#1B4B66' },
            { label: 'Resolved', value: reports.filter(r => r.status === 'resolved').length, color: '#2E7D5B' },
            { label: 'Critical', value: reports.filter(r => r.severity === 'critical').length, color: '#7F1D1D' },
            { label: 'High', value: reports.filter(r => r.severity === 'high').length, color: '#B23B2E' },
            { label: 'Medium', value: reports.filter(r => r.severity === 'medium').length, color: '#C97A2B' },
            { label: 'Low', value: reports.filter(r => r.severity === 'low').length, color: '#2E7D5B' },
          ].map(item => (
            <div key={item.label} className="bg-[#F5F6F4] border border-[#E2E4E1] p-3 text-center">
              <span className="block text-xl font-mono font-bold" style={{ color: item.color }}>{item.value}</span>
              <span className="block text-[9px] font-bold text-[#5B6B72] uppercase mt-1 tracking-wider">{item.label}</span>
            </div>
          ))}
        </div>

        {/* Recent reports table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#E2E4E1] text-[9px] font-bold text-[#5B6B72] uppercase tracking-wider">
                <th className="py-2 pr-3">Report ID</th>
                <th className="py-2 pr-3">Location</th>
                <th className="py-2 pr-3">Severity</th>
                <th className="py-2 pr-3">Status</th>
                <th className="py-2 pr-3">Submitted</th>
                <th className="py-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {reports.slice(0, 6).map(report => {
                const sevColor = { critical: '#7F1D1D', high: '#B23B2E', medium: '#C97A2B', low: '#2E7D5B' }[report.severity];
                const statusLabel = report.status === 'verified' ? 'Verified' : report.status === 'resolved' ? 'Resolved' : 'Submitted';
                const statusColor = report.status === 'resolved' ? '#2E7D5B' : report.status === 'verified' ? '#1B4B66' : '#C97A2B';
                return (
                  <tr key={report.id} className="border-b border-[#E2E4E1]/60 hover:bg-[#F5F6F4]">
                    <td className="py-2.5 pr-3 font-mono font-bold">{report.id}</td>
                    <td className="py-2.5 pr-3 text-[#1A2226]">{report.location}</td>
                    <td className="py-2.5 pr-3">
                      <span className="font-bold uppercase" style={{ color: sevColor }}>{report.severity}</span>
                    </td>
                    <td className="py-2.5 pr-3">
                      <span className="font-bold uppercase" style={{ color: statusColor }}>{statusLabel}</span>
                    </td>
                    <td className="py-2.5 pr-3 font-mono text-[#5B6B72]">{new Date(report.date).toLocaleString()}</td>
                    <td className="py-2.5">
                      <button
                        onClick={onNavigateToQueue}
                        className="text-[#1B4B66] border border-[#1B4B66]/30 hover:bg-[#1B4B66]/5 px-2 py-1 text-[10px] font-bold uppercase cursor-pointer"
                      >
                        View / Verify / Resolve
                      </button>
                    </td>
                  </tr>
                );
              })}
              {reports.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-[#5B6B72]">
                    No citizen reports submitted yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Operational Previews */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
        {/* Flood Map Preview */}
        <div className="bg-white border border-[#E2E4E1] p-5 space-y-3 lg:col-span-1">
          <div className="flex items-center justify-between border-b border-[#E2E4E1] pb-2">
            <h3 className="text-xs font-extrabold text-[#1A2226] uppercase tracking-wider flex items-center gap-2">
              <MapPin size={14} className="text-[#1B4B66]" />
              <span>Operational Map</span>
            </h3>
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-[#5B6B72]">Active flood markers</span>
              <span className="font-mono font-bold text-[#1A2226]">{reports.filter(r => r.status !== 'resolved').length}</span>
            </div>
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-[#5B6B72]">Critical zones</span>
              <span className="font-mono font-bold text-[#B23B2E]">{zones.filter(z => z.riskLevel === 'critical' || z.riskLevel === 'high').length}</span>
            </div>
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-[#5B6B72]">Monitored risk zones</span>
              <span className="font-mono font-bold text-[#1A2226]">{zones.length}</span>
            </div>
          </div>
          <div className="space-y-1 max-h-28 overflow-y-auto">
            {zones.map(zone => (
              <div key={zone.id} className="flex items-center justify-between text-[10px] border border-[#E2E4E1] px-2 py-1">
                <span className="text-[#1A2226] font-semibold">{zone.name}</span>
                <span className={`font-mono font-bold uppercase ${zone.riskLevel === 'high' || zone.riskLevel === 'critical' ? 'text-[#B23B2E]' : zone.riskLevel === 'medium' ? 'text-[#C97A2B]' : 'text-[#2E7D5B]'}`}>
                  {zone.riskLevel}
                </span>
              </div>
            ))}
          </div>
          <button onClick={onNavigateToMap} className="w-full bg-[#1B4B66] hover:bg-[#153a4f] text-white py-2 text-[10px] font-bold uppercase tracking-wider cursor-pointer">
            OPEN FULL FLOOD MAP
          </button>
        </div>

        {/* Forecast Preview */}
        <div className="bg-white border border-[#E2E4E1] p-5 space-y-3 lg:col-span-1">
          <div className="flex items-center justify-between border-b border-[#E2E4E1] pb-2">
            <h3 className="text-xs font-extrabold text-[#1A2226] uppercase tracking-wider flex items-center gap-2">
              <TrendingUp size={14} className="text-[#1B4B66]" />
              <span>Forecast Preview</span>
            </h3>
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            {(['6 hours', '12 hours', '24 hours', '48 hours'] as const).map(window => {
              const point = previewForecast.find(f => f.timeWindow === window);
              const lvl = point?.riskLevel;
              const color = lvl === 'critical' ? '#7F1D1D' : lvl === 'high' ? '#B23B2E' : lvl === 'medium' ? '#C97A2B' : '#2E7D5B';
              return (
                <div key={window} className="bg-[#F5F6F4] border border-[#E2E4E1] p-2 text-center">
                  <span className="block text-[9px] font-mono font-bold text-[#5B6B72] uppercase">{window}</span>
                  <span className="block mt-1 text-lg font-mono font-black" style={{ color }}>{point ? (lvl || '-').charAt(0).toUpperCase() : '-'}</span>
                </div>
              );
            })}
          </div>
          <div className="text-[10px] text-[#5B6B72]">
            {previewForecast.length > 0
              ? `${previewForecast.length} forecast point(s) loaded for the lead station.`
              : 'Forecast data loading from forecast service...'}
          </div>
          <button onClick={onNavigateToForecast} className="w-full bg-[#1B4B66] hover:bg-[#153a4f] text-white py-2 text-[10px] font-bold uppercase tracking-wider cursor-pointer">
            VIEW FULL FORECAST
          </button>
        </div>

        {/* Priority Preview */}
        <div className="bg-white border border-[#E2E4E1] p-5 space-y-3 lg:col-span-1">
          <div className="flex items-center justify-between border-b border-[#E2E4E1] pb-2">
            <h3 className="text-xs font-extrabold text-[#1A2226] uppercase tracking-wider flex items-center gap-2">
              <Sliders size={14} className="text-[#1B4B66]" />
              <span>Priority Zones</span>
            </h3>
          </div>
          <div className="space-y-1.5">
            {Array.isArray(previewPriority?.zones) && previewPriority.zones.length > 0
              ? previewPriority.zones.slice(0, 4).map(zone => {
                  const color = zone.riskLevel === 'critical' ? '#7F1D1D' : zone.riskLevel === 'high' ? '#B23B2E' : zone.riskLevel === 'medium' ? '#C97A2B' : '#2E7D5B';
                  return (
                    <div key={zone.zoneId} className="border border-[#E2E4E1] px-2 py-1.5">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="font-bold text-[#1A2226]">{zone.zoneName}</span>
                        <span className="font-mono font-black" style={{ color }}>{zone.score}</span>
                      </div>
                      <div className="flex items-center justify-between text-[9px] text-[#5B6B72]">
                        <span className="uppercase font-bold" style={{ color }}>Risk: {zone.riskLevel}</span>
                        <span>{zone.recommendedAction}</span>
                      </div>
                    </div>
                  );
                })
              : zones.slice(0, 4).map(zone => (
                  <div key={zone.id} className="border border-[#E2E4E1] px-2 py-1.5">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="font-bold text-[#1A2226]">{zone.name}</span>
                      <span className="font-mono font-black">{zone.priorityScore}</span>
                    </div>
                    <div className="text-[9px] uppercase font-bold text-[#5B6B72]">Risk: {zone.riskLevel}</div>
                  </div>
                ))}
          </div>
          <button onClick={onNavigateToPriority} className="w-full bg-[#1B4B66] hover:bg-[#153a4f] text-white py-2 text-[10px] font-bold uppercase tracking-wider cursor-pointer">
            VIEW PRIORITY ANALYSIS
          </button>
        </div>
      </div>

      {/* Funds + Alerts Previews */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        {/* Funds Preview */}
        <div className="bg-white border border-[#E2E4E1] p-5 space-y-3">
          <div className="flex items-center justify-between border-b border-[#E2E4E1] pb-2">
            <h3 className="text-xs font-extrabold text-[#1A2226] uppercase tracking-wider flex items-center gap-2">
              <Landmark size={14} className="text-[#2E7D5B]" />
              <span>Emergency Funds</span>
            </h3>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-[#F5F6F4] border border-[#E2E4E1] p-3">
              <span className="block text-[9px] font-mono text-[#5B6B72] uppercase">Available</span>
              <span className="block text-base font-mono font-bold text-[#1A2226]">{`${treasuryBalance.toLocaleString()}`}</span>
            </div>
            <div className="bg-[#F5F6F4] border border-[#E2E4E1] p-3">
              <span className="block text-[9px] font-mono text-[#5B6B72] uppercase">Allocated</span>
              <span className="block text-base font-mono font-bold text-[#C97A2B]">
                {`$${previewTransactions.reduce((s, t) => s + (t.amount || 0), 0).toLocaleString()}`}
              </span>
            </div>
            <div className="bg-[#F5F6F4] border border-[#E2E4E1] p-3">
              <span className="block text-[9px] font-mono text-[#5B6B72] uppercase">Remaining</span>
              <span className="block text-base font-mono font-bold text-[#2E7D5B]">{`${treasuryBalance.toLocaleString()}`}</span>
            </div>
          </div>
          <div className="space-y-1 max-h-28 overflow-y-auto">
            {previewAllocations.slice(0, 4).map(a => (
              <div key={a.id} className="flex items-center justify-between text-[10px] border border-[#E2E4E1] px-2 py-1">
                <span className="text-[#1A2226] font-semibold">{a.zoneName}</span>
                <span className="font-mono font-bold text-[#1B4B66]">{`$${a.amount.toLocaleString()}`}</span>
              </div>
            ))}
            {previewAllocations.length === 0 && (
              <div className="text-[10px] text-[#5B6B72]">No allocations recorded yet.</div>
            )}
          </div>
          <button onClick={onNavigateToFunds} className="w-full bg-[#2E7D5B] hover:bg-[#256a4c] text-white py-2 text-[10px] font-bold uppercase tracking-wider cursor-pointer">
            MANAGE FUNDS
          </button>
        </div>

        {/* Alerts Preview */}
        <div className="bg-white border border-[#E2E4E1] p-5 space-y-3">
          <div className="flex items-center justify-between border-b border-[#E2E4E1] pb-2">
            <h3 className="text-xs font-extrabold text-[#1A2226] uppercase tracking-wider flex items-center gap-2">
              <Megaphone size={14} className="text-[#B23B2E]" />
              <span>Alerts & Broadcasts</span>
            </h3>
          </div>
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-[#5B6B72]">Active public alerts</span>
            <span className="font-mono font-bold text-[#1A2226]">{previewAlerts.filter(a => a.active).length}</span>
          </div>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {previewAlerts.slice(0, 4).map(alert => (
              <div key={alert.id} className="border border-[#E2E4E1] px-2 py-1.5">
                <div className="text-[10px] font-bold text-[#1A2226] break-words">{alert.message}</div>
                <div className="text-[9px] font-mono text-[#5B6B72] uppercase">
                  {alert.severity}{alert.zone ? ` â€¢ ${alert.zone}` : ''}
                </div>
              </div>
            ))}
            {previewAlerts.length === 0 && (
              <div className="text-[10px] text-[#5B6B72]">No active alerts at this time.</div>
            )}
          </div>
          <button onClick={onNavigateToAlerts} className="w-full bg-[#B23B2E] hover:bg-[#8A1E1E] text-white py-2 text-[10px] font-bold uppercase tracking-wider cursor-pointer">
            BROADCAST ALERT
          </button>
        </div>
      </div>

      {/* ============================================================================
          LIVE ANALYTICS & TELEMETRY (backed by analyticsService /analytics/*)
          ============================================================================ */}
      <div className="bg-white border border-[#E2E4E1] p-5 space-y-6" id="historical-analytics-suite">
        
        {/* Interactive Controls & Filters Bar */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 border-b border-[#E2E4E1] pb-4">
          <div className="space-y-1">
            <h3 className="text-xs font-extrabold text-[#1A2226] uppercase tracking-wider flex items-center gap-2">
              <BarChart3 size={15} className="text-[#1B4B66]" />
              <span>Historical Flood Analytics &amp; Telemetry</span>
            </h3>
            <p className="text-[10px] text-[#5B6B72]">
              Incident trends, severity distribution, and sector breakdowns sourced from live municipal records.
            </p>
          </div>

          {/* Integrated Filter Controls */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Interval switch */}
            <div className="flex items-center gap-1 border border-[#E2E4E1] bg-gray-50 p-1">
              <button
                onClick={() => setTimePeriodFilter('daily')}
                className={`px-2 py-1 text-[9px] font-mono font-bold uppercase transition-all ${
                  timePeriodFilter === 'daily' ? 'bg-[#1B4B66] text-white' : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                Daily
              </button>
              <button
                onClick={() => setTimePeriodFilter('weekly')}
                className={`px-2 py-1 text-[9px] font-mono font-bold uppercase transition-all ${
                  timePeriodFilter === 'weekly' ? 'bg-[#1B4B66] text-white' : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                Weekly
              </button>
              <button
                onClick={() => setTimePeriodFilter('monthly')}
                className={`px-2 py-1 text-[9px] font-mono font-bold uppercase transition-all ${
                  timePeriodFilter === 'monthly' ? 'bg-[#1B4B66] text-white' : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                Monthly
              </button>
            </div>
          </div>
        </div>

        {/* ----------------- CORE CHART DISPLAY STATES ----------------- */}
        {analyticsLoading ? (
          /* Loading State skeleton */
          <div className="h-96 border border-[#E2E4E1] bg-gray-50 flex flex-col items-center justify-center space-y-3 py-12 animate-pulse">
            <RefreshCw size={28} className="text-[#1B4B66] animate-spin" />
            <div className="text-center space-y-1">
              <span className="text-xs font-bold text-[#1A2226] block uppercase tracking-wider">
                Loading live telemetry...
              </span>
              <p className="text-[10px] text-[#5B6B72] max-w-sm">
                Retrieving incident trends, severity distribution, and sector breakdowns from the backend.
              </p>
            </div>
          </div>
        ) : analyticsError || (overview && trendSeries.length === 0) ? (
          /* Empty / Error State fallback */
          <div className="h-96 border border-[#E2E4E1] bg-[#F5F6F4] flex flex-col items-center justify-center space-y-3 py-12 text-center">
            <AlertCircle size={32} className="text-[#C97A2B]" />
            <div className="space-y-1.5 max-w-md px-4">
              <span className="text-xs font-black text-[#1A2226] block uppercase tracking-wider">
                {analyticsError ? 'Analytics Unavailable' : 'No Telemetry Found'}
              </span>
              <p className="text-[10.5px] text-[#5B6B72] leading-normal">
                {analyticsError
                  ? 'The analytics service could not be reached. Please try again later.'
                  : 'No verified flood incident records have been indexed in the current period.'}
              </p>
            </div>
          </div>
        ) : (
          /* Main Analytical Charts Matrix */
          <div className="space-y-6">
            
            {/* Row 1: Time Series Trend Area & Verification Status */}
            <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
              
              {/* Chart 1: Flood Incidents Over Time */}
              <div className="bg-white border border-[#E2E4E1] p-4 flex flex-col justify-between">
                <div className="border-b border-gray-100 pb-2 mb-4">
                  <span className="text-[10px] font-extrabold text-[#1A2226] uppercase tracking-wider block">
                    1. Flood Incidents Trends ({timePeriodFilter.toUpperCase()})
                  </span>
                  <span className="text-[9px] text-[#5B6B72]">Total incoming citizen logs vs unresolved backlog</span>
                </div>

                <div className="h-52 sm:h-64 overflow-hidden">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={trendSeries}
                      margin={{ top: 10, right: 5, left: -25, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="totalColor" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#1B4B66" stopOpacity={0.2}/>
                          <stop offset="95%" stopColor="#1B4B66" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="unresolvedColor" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#B23B2E" stopOpacity={0.2}/>
                          <stop offset="95%" stopColor="#B23B2E" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E2E4E1" />
                      <XAxis 
                        dataKey="label" 
                        stroke="#5B6B72" 
                        fontSize={9} 
                        fontFamily="monospace"
                        tickLine={false}
                      />
                      <YAxis 
                        stroke="#5B6B72" 
                        fontSize={9} 
                        fontFamily="monospace"
                        tickLine={false}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#1A2226', 
                          border: '1px solid rgba(255,255,255,0.1)', 
                          fontSize: '11px',
                          color: '#fff'
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: '9px', textTransform: 'uppercase', marginTop: '5px' }} />
                      <Area 
                        type="monotone" 
                        name="Total Reports Received" 
                        dataKey="totalReports" 
                        stroke="#1B4B66" 
                        strokeWidth={2}
                        fillOpacity={1} 
                        fill="url(#totalColor)" 
                      />
                      <Area 
                        type="monotone" 
                        name="Unresolved Backlog" 
                        dataKey="unresolvedReports" 
                        stroke="#B23B2E" 
                        strokeWidth={2}
                        fillOpacity={1} 
                        fill="url(#unresolvedColor)" 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Chart 2: Audit Resolution Status (from live report lifecycle) */}
              <div className="bg-white border border-[#E2E4E1] p-4 flex flex-col justify-between">
                <div className="border-b border-gray-100 pb-2 mb-4">
                  <span className="text-[10px] font-extrabold text-[#1A2226] uppercase tracking-wider block">
                    2. Audit Resolution Status
                  </span>
                  <span className="text-[9px] text-[#5B6B72]">Verified, awaiting, and resolved report lifecycle</span>
                </div>
                <div className="flex-1 flex flex-col justify-center space-y-4">
                  {verificationRatio.map(item => {
                    const total = verificationRatio.reduce((s, r) => s + r.value, 0);
                    const pct = total > 0 ? Math.round((item.value / total) * 1000) / 10 : 0;
                    return (
                      <div key={item.name} className="text-[10px] space-y-1">
                        <div className="flex justify-between items-center text-gray-700">
                          <span className="font-bold flex items-center gap-1.5">
                            <span className="inline-block w-2 h-2" style={{ backgroundColor: item.color }}></span>
                            {item.name}
                          </span>
                          <span className="font-mono">{item.value} reports ({pct}%)</span>
                        </div>
                        <div className="h-1.5 w-full bg-gray-200">
                          <div 
                            className="h-full transition-all" 
                            style={{ width: `${pct}%`, backgroundColor: item.color }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>

            {/* Row 2: Sector Comparison & Severity Mix */}
            <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
              
              {/* Chart 3: Area-wise flood reports */}
              <div className="bg-white border border-[#E2E4E1] p-4 lg:col-span-2 flex flex-col justify-between">
                <div className="border-b border-gray-100 pb-2 mb-4">
                  <span className="text-[10px] font-extrabold text-[#1A2226] uppercase tracking-wider block">
                    3. Regional Sector Breakdown &amp; Comparative Severity Load
                  </span>
                  <span className="text-[9px] text-[#5B6B72]">Critical, high, medium, and low reports across sectors</span>
                </div>

                <div className="h-52 sm:h-64 overflow-hidden">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={areaStats}
                      margin={{ top: 10, right: 5, left: -25, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#E2E4E1" />
                      <XAxis 
                        dataKey="zoneName" 
                        stroke="#5B6B72" 
                        fontSize={8} 
                        tickLine={false}
                        tickFormatter={(val: string) => val.split(' - ')[0]}
                      />
                      <YAxis 
                        stroke="#5B6B72" 
                        fontSize={9} 
                        fontFamily="monospace"
                        tickLine={false}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#1A2226', 
                          border: '1px solid rgba(255,255,255,0.1)', 
                          fontSize: '11px',
                          color: '#fff'
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: '9px', textTransform: 'uppercase', marginTop: '5px' }} />
                      <Bar name="Low Priority" dataKey="low" fill="#2E7D5B" stackId="a" />
                      <Bar name="Moderate Watch" dataKey="medium" fill="#C97A2B" stackId="a" />
                      <Bar name="High Alert" dataKey="high" fill="#B23B2E" stackId="a" />
                      <Bar name="Critical Hazard" dataKey="critical" fill="#7F1D1D" stackId="a" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Chart 4: Severity Distribution */}
              <div className="bg-[#F5F6F4] border border-[#E2E4E1] p-4 flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <div className="border-b border-gray-200 pb-1">
                    <span className="text-[9px] font-black text-[#1A2226] uppercase tracking-wider">
                      4. Severity Mix Breakdown
                    </span>
                  </div>
                  
                  <div className="space-y-1.5 pt-1">
                    {severityMix.length === 0 ? (
                      <div className="text-[10px] text-[#5B6B72]">No severity data available.</div>
                    ) : severityMix.map(item => {
                      const total = severityMix.reduce((s, r) => s + r.value, 0);
                      const pct = total > 0 ? Math.round((item.value / total) * 1000) / 10 : 0;
                      return (
                        <div key={item.name} className="text-[10px] space-y-1">
                          <div className="flex justify-between items-center text-gray-700">
                            <span className="font-bold flex items-center gap-1.5">
                              <span className="inline-block w-2 h-2" style={{ backgroundColor: item.color }}></span>
                              {item.name}
                            </span>
                            <span className="font-mono">{item.value} ({pct}%)</span>
                          </div>
                          <div className="h-1.5 w-full bg-gray-200">
                            <div 
                              className="h-full" 
                              style={{ width: `${pct}%`, backgroundColor: item.color }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Funds utilization summary from live treasury */}
                <div className="space-y-2 pt-2 border-t border-gray-200">
                  <div className="border-b border-gray-200 pb-1">
                    <span className="text-[9px] font-black text-[#1A2226] uppercase tracking-wider">
                      5. Emergency Fund Utilisation
                    </span>
                  </div>
                  <div className="space-y-1.5 pt-1">
                    <div className="text-[10px] space-y-1">
                      <div className="flex justify-between items-center text-gray-700">
                        <span className="font-bold">Treasury Total</span>
                        <span className="font-mono">{`$${(funds?.totalBudget ?? treasuryBalance).toLocaleString()}`}</span>
                      </div>
                      <div className="flex justify-between items-center text-gray-700">
                        <span className="font-bold">Allocated</span>
                        <span className="font-mono text-[#C97A2B]">{`$${(funds?.allocated ?? 0).toLocaleString()}`}</span>
                      </div>
                      <div className="flex justify-between items-center text-gray-700">
                        <span className="font-bold">Remaining</span>
                        <span className="font-mono text-[#2E7D5B]">{`$${(funds?.remaining ?? treasuryBalance).toLocaleString()}`}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

            </div>

          </div>
        )}
      </div>
      {/* Existing Sections: Regional Sectors Risk List & Guidelines */}
      <div className="grid gap-6 grid-cols-1 md:grid-cols-3">
        {/* Priority Zones Risk List */}
        <div className="bg-white border border-[#E2E4E1] p-5 md:col-span-2 space-y-4">
          <div className="flex items-center justify-between border-b border-[#E2E4E1] pb-2">
            <h3 className="text-xs font-bold text-[#1A2226] uppercase tracking-wider">
              Regional Hydrological Risk Zones (Sectors)
            </h3>
            <span className="text-[10px] text-[#5B6B72]">Ranked by Engineering Priority</span>
          </div>

          <div className="space-y-4">
            {zones.map((zone) => (
              <div key={zone.id} className="space-y-1" id={`zone-item-${zone.id}`}>
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-[#1A2226]">{zone.name}</span>
                  <span className="font-mono text-[#5B6B72]">
                    Priority Score: <span className="text-[#1A2226]">{zone.priorityScore}</span>/100
                  </span>
                </div>
                
                <div className="h-2 w-full bg-[#E2E4E1] rounded-none overflow-hidden relative">
                  <div 
                    className={`h-full transition-all duration-300 ${
                      zone.riskLevel === 'high' 
                        ? 'bg-[#B23B2E]' 
                        : zone.riskLevel === 'medium' 
                          ? 'bg-[#C97A2B]' 
                          : 'bg-[#2E7D5B]'
                    }`}
                    style={{ width: `${zone.priorityScore}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-[10px] text-[#5B6B72]">
                  <span className="flex items-center gap-1.5">
                    <span className={`inline-block h-1.5 w-1.5 rounded-none ${
                      zone.riskLevel === 'high' 
                        ? 'bg-[#B23B2E]' 
                        : zone.riskLevel === 'medium' 
                          ? 'bg-[#C97A2B]' 
                          : 'bg-[#2E7D5B]'
                    }`}></span>
                    Risk Classification: <span className="font-bold uppercase">{zone.riskLevel}</span>
                  </span>
                  <span>Active incidents in sector: {zone.activeReportsCount}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Rapid Advisory & Contact panel */}
        <div className="bg-[#F5F6F4] border border-[#E2E4E1] p-5 space-y-4">
          <h3 className="text-xs font-bold text-[#1A2226] uppercase tracking-wider border-b border-[#E2E4E1] pb-2">
            Civil Response Protocol
          </h3>
          
          <div className="space-y-3 text-xs leading-relaxed">
            <div className="p-3 bg-white border border-[#E2E4E1] space-y-1">
              <span className="font-bold text-[#1A2226] text-[11px] uppercase tracking-wide block">
                Verification Protocol (OP-102)
              </span>
              <p className="text-[#5B6B72] text-[11px]">
                Prioritize checking reports with photographic files first. Coordinate with dispatch units accordingly.
              </p>
            </div>

            <div className="p-3 bg-white border border-[#E2E4E1] space-y-1">
              <span className="font-bold text-[#1A2226] text-[11px] uppercase tracking-wide block">
                Resource Deployment (RP-3)
              </span>
              <p className="text-[#5B6B72] text-[11px]">
                Upon verified 'High' hazard status, central logistics is authorized to dispatch sandbag transport assets to affected zones immediately.
              </p>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
