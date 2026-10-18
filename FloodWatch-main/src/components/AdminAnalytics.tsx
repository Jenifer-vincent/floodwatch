/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Admin Analytics & Reporting workspace.
 *
 * Data is sourced through analyticsService (→ FastAPI /analytics/*). When the
 * backend returns no records yet (empty dataset), the workspace renders a
 * proper "No data available" state instead of fabricating sample charts.
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import {
  BarChart3, RefreshCw, ShieldCheck, Landmark,
  Activity, TrendingUp, PieChart as PieIcon, MapPin, Layers, FileText
} from 'lucide-react';
import { analyticsService } from '../services/analytics';
import {
  AnalyticsDataPoint, SeverityDistributionMetric, AreaStats,
  AnalyticsFundsResponse, AnalyticsDetailsResponse
} from '../types';

type Interval = 'daily' | 'weekly' | 'monthly';

const SEVERITY_COLORS: Record<string, string> = {
  Critical: '#7F1D1D',
  High: '#B23B2E',
  Moderate: '#C97A2B',
  Low: '#2E7D5B',
};

export default function AdminAnalytics() {
  const [loading, setLoading] = useState<boolean>(true);
  const [hasLiveData, setHasLiveData] = useState<boolean>(false);
  const [interval, setInterval] = useState<Interval>('daily');
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const [overview, setOverview] = useState<{
    totalReports: number;
    resolvedReports: number;
    activeZones: number;
    treasuryBalance: number;
  }>({ totalReports: 0, resolvedReports: 0, activeZones: 0, treasuryBalance: 0 });
  const [series, setSeries] = useState<Record<Interval, AnalyticsDataPoint[]>>({
    dailySeries: [],
    weeklySeries: [],
    monthlySeries: [],
  });
  const [severity, setSeverity] = useState<SeverityDistributionMetric[]>([]);
  const [areas, setAreas] = useState<AreaStats[]>([]);
  const [funds, setFunds] = useState<AnalyticsFundsResponse>({
    totalBudget: 0,
    allocated: 0,
    remaining: 0,
    transactions: [],
  });
  const [details, setDetails] = useState<AnalyticsDetailsResponse | null>(null);
  const [detailsError, setDetailsError] = useState<boolean>(false);

  const load = async (isRefresh: boolean) => {
    isRefresh ? setRefreshing(true) : setLoading(true);
    try {
      const [ov, inc, sev, ar, fu] = await Promise.all([
        analyticsService.getOverview(),
        analyticsService.getIncidents(),
        analyticsService.getSeverity(),
        analyticsService.getAreas(),
        analyticsService.getFunds(),
      ]);

      setOverview({
        totalReports: ov.totalReports,
        resolvedReports: ov.resolvedReports,
        activeZones: ov.activeZones,
        treasuryBalance: ov.treasuryBalance,
      });

      const liveSeries = {
        dailySeries: inc.dailySeries || [],
        weeklySeries: inc.weeklySeries || [],
        monthlySeries: inc.monthlySeries || [],
      };
      const liveSeverity = sev.distribution || [];
      const liveAreas = ar.areas || [];
      const liveFunds = fu;

      const hasData =
        liveSeries.dailySeries.length > 0 ||
        liveSeverity.length > 0 ||
        liveAreas.length > 0 ||
        (fu && fu.transactions && fu.transactions.length > 0) ||
        ov.totalReports > 0;

      setHasLiveData(hasData);
      setSeries(liveSeries);
      setSeverity(liveSeverity);
      setAreas(liveAreas);
      setFunds(liveFunds);

      // Details (response stats + forecast-vs-actual) load independently so a
      // transient failure there never blanks the main charts.
      try {
        const det = await analyticsService.getDetails();
        setDetails(det);
        setDetailsError(false);
      } catch {
        setDetails(null);
        setDetailsError(true);
      }
    } catch {
      setHasLiveData(false);
      setSeries({ dailySeries: [], weeklySeries: [], monthlySeries: [] });
      setSeverity([]);
      setAreas([]);
      setFunds({ totalBudget: 0, allocated: 0, remaining: 0, transactions: [] });
      setDetails(null);
      setDetailsError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load(false);
  }, []);

  const activeSeries = useMemo(
    () => (interval === 'weekly' ? series.weeklySeries : interval === 'monthly' ? series.monthlySeries : series.dailySeries),
    [interval, series]
  );

  const severityPie = useMemo(
    () => severity.map(s => ({ ...s, color: SEVERITY_COLORS[s.name] || '#1B4B66' })),
    [severity]
  );

  return (
    <div className="space-y-6 animate-fade-in" id="admin-analytics-workspace">
      {/* Header */}
      <div className="bg-[#1B4B66] text-white p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 border border-[#E2E4E1]">
        <div>
          <span className="text-[10px] font-mono font-semibold text-white/70 uppercase tracking-widest block">
            EOC Intelligence & Reporting Unit
          </span>
          <h2 className="text-xl font-bold tracking-tight mt-1 font-sans">
            Analytics & Reporting
          </h2>
          <p className="text-xs text-white/80 mt-1 max-w-xl">
            Operational telemetry, incident trends, severity composition and fund utilisation aggregated from the live backend service.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {hasLiveData ? (
            <span className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 border border-white/20 text-xs font-mono">
              <Activity size={13} className="animate-pulse text-[#2E7D5B]" />
              <span>LIVE BACKEND FEED</span>
            </span>
          ) : (
            <span className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 border border-white/20 text-xs font-mono">
              <FileText size={13} className="text-[#C97A2B]" />
              <span>NO DATA AVAILABLE</span>
            </span>
          )}
          <button
            onClick={() => load(true)}
            className="px-2.5 py-1.5 bg-white text-[#1B4B66] text-[10px] font-bold uppercase tracking-wider hover:bg-white/90 flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="h-96 border border-[#E2E4E1] bg-gray-50 flex items-center justify-center animate-pulse">
          <span className="text-xs font-bold text-[#1A2226] uppercase">Compiling Analytics Telemetry...</span>
        </div>
      ) : (
        <>
          {hasLiveData ? (
          <>
          {/* Stat Cards */}
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
            <div className="bg-white border border-[#E2E4E1] p-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-[#5B6B72] uppercase tracking-wider">Total Reports</span>
                <FileText size={15} className="text-[#1B4B66]" />
              </div>
              <div className="mt-3 text-2xl font-bold text-[#1A2226] font-mono">{overview.totalReports}</div>
            </div>
            <div className="bg-white border border-[#E2E4E1] p-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-[#5B6B72] uppercase tracking-wider">Resolved</span>
                <ShieldCheck size={15} className="text-[#2E7D5B]" />
              </div>
              <div className="mt-3 text-2xl font-bold text-[#1A2226] font-mono">{overview.resolvedReports}</div>
            </div>
            <div className="bg-white border border-[#E2E4E1] p-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-[#5B6B72] uppercase tracking-wider">Active Zones</span>
                <MapPin size={15} className="text-[#C97A2B]" />
              </div>
              <div className="mt-3 text-2xl font-bold text-[#1A2226] font-mono">{overview.activeZones}</div>
            </div>
            <div className="bg-white border border-[#E2E4E1] p-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-[#5B6B72] uppercase tracking-wider">Treasury Balance</span>
                <Landmark size={15} className="text-[#2E7D5B]" />
              </div>
              <div className="mt-3 text-2xl font-bold text-[#1A2226] font-mono">
                {`$${overview.treasuryBalance.toLocaleString()}`}
              </div>
            </div>
          </div>

          {/* Trend + Severity */}
          <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
            {/* Incident trends */}
            <div className="bg-white border border-[#E2E4E1] p-4 lg:col-span-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-2 mb-4">
                <div>
                  <span className="text-[10px] font-extrabold text-[#1A2226] uppercase tracking-wider flex items-center gap-1.5">
                    <TrendingUp size={13} className="text-[#1B4B66]" />
                    <span>Incident Trend Analysis</span>
                  </span>
                  <span className="text-[9px] text-[#5B6B72]">Total received vs verified vs unresolved</span>
                </div>
                <div className="flex items-center gap-1 border border-[#E2E4E1] bg-gray-50 p-1">
                  {(['daily', 'weekly', 'monthly'] as Interval[]).map(iv => (
                    <button
                      key={iv}
                      onClick={() => setInterval(iv)}
                      className={`px-2 py-1 text-[9px] font-mono font-bold uppercase transition-all ${
                        interval === iv ? 'bg-[#1B4B66] text-white' : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      {iv}
                    </button>
                  ))}
                </div>
              </div>
              <div className="h-60 overflow-hidden">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={activeSeries} margin={{ top: 10, right: 5, left: -25, bottom: 0 }}>
                    <defs>
                      <linearGradient id="anTotal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#1B4B66" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#1B4B66" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="anUnresolved" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#B23B2E" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#B23B2E" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E4E1" />
                    <XAxis dataKey="label" stroke="#5B6B72" fontSize={9} fontFamily="monospace" tickLine={false} />
                    <YAxis stroke="#5B6B72" fontSize={9} fontFamily="monospace" tickLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: '#1A2226', border: '1px solid rgba(255,255,255,0.1)', fontSize: '11px', color: '#fff' }} />
                    <Legend wrapperStyle={{ fontSize: '9px', textTransform: 'uppercase' }} />
                    <Area type="monotone" name="Total Reports" dataKey="totalReports" stroke="#1B4B66" strokeWidth={2} fill="url(#anTotal)" />
                    <Area type="monotone" name="Unresolved" dataKey="unresolvedReports" stroke="#B23B2E" strokeWidth={2} fill="url(#anUnresolved)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Severity donut */}
            <div className="bg-white border border-[#E2E4E1] p-4">
              <span className="text-[10px] font-extrabold text-[#1A2226] uppercase tracking-wider flex items-center gap-1.5 border-b border-gray-100 pb-2 mb-3">
                <PieIcon size={13} className="text-[#B23B2E]" />
                <span>Severity Composition</span>
              </span>
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={severityPie}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={68}
                      paddingAngle={2}
                    >
                      {severityPie.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#1A2226', border: '1px solid rgba(255,255,255,0.1)', fontSize: '11px', color: '#fff' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-1.5 pt-2">
                {severityPie.map(item => (
                  <div key={item.name} className="flex items-center justify-between text-[10px]">
                    <span className="flex items-center gap-1.5 font-bold text-gray-700">
                      <span className="inline-block w-2 h-2" style={{ backgroundColor: item.color }} />
                      {item.name}
                    </span>
                    <span className="font-mono">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Area breakdown + Funds */}
          <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
            {/* Area-wise severity bars */}
            <div className="bg-white border border-[#E2E4E1] p-4 lg:col-span-2">
              <span className="text-[10px] font-extrabold text-[#1A2226] uppercase tracking-wider flex items-center gap-1.5 border-b border-gray-100 pb-2 mb-3">
                <BarChart3 size={13} className="text-[#1B4B66]" />
                <span>Regional Sector Severity Load</span>
              </span>
              <div className="h-64 overflow-hidden">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={areas} margin={{ top: 10, right: 5, left: -25, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E4E1" />
                    <XAxis dataKey="zoneName" stroke="#5B6B72" fontSize={8} tickLine={false} tickFormatter={(v) => String(v).split(' - ')[0]} />
                    <YAxis stroke="#5B6B72" fontSize={9} fontFamily="monospace" tickLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: '#1A2226', border: '1px solid rgba(255,255,255,0.1)', fontSize: '11px', color: '#fff' }} />
                    <Legend wrapperStyle={{ fontSize: '9px', textTransform: 'uppercase' }} />
                    <Bar name="Low" dataKey="low" fill="#2E7D5B" stackId="a" />
                    <Bar name="Moderate" dataKey="medium" fill="#C97A2B" stackId="a" />
                    <Bar name="High" dataKey="high" fill="#B23B2E" stackId="a" />
                    <Bar name="Critical" dataKey="critical" fill="#7F1D1D" stackId="a" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Funds summary */}
            <div className="bg-[#F5F6F4] border border-[#E2E4E1] p-4 space-y-4">
              <span className="text-[10px] font-extrabold text-[#1A2226] uppercase tracking-wider flex items-center gap-1.5 border-b border-[#E2E4E1] pb-2">
                <Layers size={13} className="text-[#2E7D5B]" />
                <span>Relief Fund Utilisation</span>
              </span>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-white border border-[#E2E4E1] p-2">
                  <span className="block text-[9px] font-mono text-[#5B6B72] uppercase">Total</span>
                  <span className="block text-sm font-mono font-bold text-[#1A2226]">${funds.totalBudget.toLocaleString()}</span>
                </div>
                <div className="bg-white border border-[#E2E4E1] p-2">
                  <span className="block text-[9px] font-mono text-[#5B6B72] uppercase">Allocated</span>
                  <span className="block text-sm font-mono font-bold text-[#C97A2B]">${funds.allocated.toLocaleString()}</span>
                </div>
                <div className="bg-white border border-[#E2E4E1] p-2">
                  <span className="block text-[9px] font-mono text-[#5B6B72] uppercase">Remaining</span>
                  <span className="block text-sm font-mono font-bold text-[#2E7D5B]">${funds.remaining.toLocaleString()}</span>
                </div>
              </div>
              <div className="h-2 w-full bg-gray-200">
                <div
                  className="h-full bg-[#1B4B66]"
                  style={{ width: `${funds.totalBudget > 0 ? (funds.allocated / funds.totalBudget) * 100 : 0}%` }}
                />
              </div>
              <div className="text-[10px] text-[#5B6B72]">
                <span className="font-bold text-[#1A2226]">{funds.transactions.length}</span> allocation transactions on record.
              </div>
            </div>
          </div>

          {/* Response statistics + Forecast vs Actual */}
          {detailsError && (
            <div className="border border-[#E2E4E1] bg-[#F5F6F4] p-6 text-center">
              <span className="text-xs font-bold text-[#5B6B72] uppercase tracking-wider">Response & forecast analytics unavailable</span>
            </div>
          )}
          {!detailsError && details && (
            <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
              {/* Response time statistics */}
              <div className="bg-white border border-[#E2E4E1] p-4 space-y-4">
                <span className="text-[10px] font-extrabold text-[#1A2226] uppercase tracking-wider flex items-center gap-1.5 border-b border-gray-100 pb-2">
                  <ShieldCheck size={13} className="text-[#2E7D5B]" />
                  <span>Response & Resolution Statistics</span>
                </span>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-gray-50 border border-gray-100 p-2">
                    <span className="block text-[9px] font-mono text-[#5B6B72] uppercase">Total</span>
                    <span className="block text-lg font-mono font-bold text-[#1A2226]">{details.responseStats.totalReports}</span>
                  </div>
                  <div className="bg-gray-50 border border-gray-100 p-2">
                    <span className="block text-[9px] font-mono text-[#5B6B72] uppercase">Resolved</span>
                    <span className="block text-lg font-mono font-bold text-[#2E7D5B]">{details.responseStats.resolvedReports}</span>
                  </div>
                  <div className="bg-gray-50 border border-gray-100 p-2">
                    <span className="block text-[9px] font-mono text-[#5B6B72] uppercase">Verified</span>
                    <span className="block text-lg font-mono font-bold text-[#1B4B66]">{details.responseStats.verifiedReports}</span>
                  </div>
                </div>
                {details.responseStats.insufficientData ? (
                  <div className="border border-[#C97A2B]/30 bg-[#C97A2B]/5 p-3 text-center text-[10.5px] text-[#5B6B72]">
                    Insufficient response history to compute average resolution / verification times.
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-white border border-[#E2E4E1] p-2">
                      <span className="block text-[8.5px] font-mono text-[#5B6B72] uppercase">Resolution Rate</span>
                      <span className="block text-base font-mono font-bold text-[#2E7D5B]">{(details.responseStats.resolutionRate * 100).toFixed(0)}%</span>
                    </div>
                    <div className="bg-white border border-[#E2E4E1] p-2">
                      <span className="block text-[8.5px] font-mono text-[#5B6B72] uppercase">Avg Resolve</span>
                      <span className="block text-base font-mono font-bold text-[#1A2226]">{details.responseStats.avgResolutionMinutes}m</span>
                    </div>
                    <div className="bg-white border border-[#E2E4E1] p-2">
                      <span className="block text-[8.5px] font-mono text-[#5B6B72] uppercase">Avg Verify</span>
                      <span className="block text-base font-mono font-bold text-[#1A2226]">{details.responseStats.avgVerificationMinutes}m</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Forecast vs Actual water level */}
              <div className="bg-white border border-[#E2E4E1] p-4 space-y-4">
                <span className="text-[10px] font-extrabold text-[#1A2226] uppercase tracking-wider flex items-center gap-1.5 border-b border-gray-100 pb-2">
                  <TrendingUp size={13} className="text-[#1B4B66]" />
                  <span>Forecast vs Actual Water Level</span>
                </span>
                {details.forecastVsActual.length === 0 ? (
                  <div className="border border-[#C97A2B]/30 bg-[#C97A2B]/5 p-3 text-center text-[10.5px] text-[#5B6B72]">
                    Insufficient forecast data to compare against reported readings.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {details.forecastVsActual.map(row => (
                      <div key={row.zoneId} className="border border-gray-100 bg-gray-50/50 p-2.5 text-[10.5px]">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-[#1A2226]">{row.zoneName}</span>
                          {row.hasActual ? (
                            <span
                              className={`px-1.5 py-0.5 font-mono font-bold uppercase text-[8.5px] ${
                                row.waterLevelStatus === 'exceeded'
                                  ? 'bg-[#B23B2E]/10 text-[#B23B2E]'
                                  : row.waterLevelStatus === 'under'
                                    ? 'bg-[#2E7D5B]/10 text-[#2E7D5B]'
                                    : 'bg-gray-200 text-gray-700'
                              }`}
                            >
                              {row.waterLevelStatus}
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 bg-[#C97A2B]/10 text-[#C97A2B] font-mono font-bold uppercase text-[8.5px]">Insufficient data</span>
                          )}
                        </div>
                        <div className="mt-1 flex items-center gap-3 text-[#5B6B72]">
                          <span>Forecast: <strong className="text-[#1A2226]">{row.predictedWaterLevel}m</strong></span>
                          <span>Actual: <strong className="text-[#1A2226]">{row.hasActual ? `${row.actualDepth}m` : '—'}</strong></span>
                          {row.hasActual && row.waterLevelStatus !== 'within' && (
                            <span>({row.waterLevelDelta}m {row.waterLevelStatus === 'exceeded' ? 'over' : 'under'} forecast)</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
          </>
          ) : (
            <div id="admin-analytics-empty" className="border border-[#E2E4E1] bg-white p-10 text-center">
              <FileText size={28} className="mx-auto text-[#C97A2B] mb-3" />
              <h3 className="text-base font-bold text-[#1A2226]">No data available</h3>
              <p className="text-xs text-[#5B6B72] mt-1 max-w-md mx-auto leading-relaxed">
                The live backend currently has no reports, incident trends, severity distribution or fund transactions to
                display. Charts and metrics will appear here automatically once real data is recorded.
              </p>
              <button
                onClick={() => load(true)}
                className="mt-4 px-3 py-1.5 bg-[#1B4B66] text-white text-[10px] font-bold uppercase tracking-wider hover:bg-[#163a52] flex items-center gap-1.5 mx-auto cursor-pointer"
              >
                <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} />
                <span>Refresh</span>
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
