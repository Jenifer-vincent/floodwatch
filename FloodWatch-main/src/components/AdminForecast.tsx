/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { 
  ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, 
  CartesianGrid, Tooltip, Cell, ReferenceLine, Legend
} from 'recharts';
import { 
  TrendingUp, Clock, AlertTriangle, ShieldCheck, 
  MapPin, Percent, HelpCircle, ArrowRight, UserCheck, CheckCircle2, Database
} from 'lucide-react';
import { FloodForecastPoint, ForecastRiskLevel, ForecastTimeWindow } from '../types';
import { forecastService } from '../services/forecast';
import { usePolling } from '../hooks/usePolling';

// Structured multi-station database representing future REST API outputs
const LOCATION_FORECASTS_DB: Record<string, FloodForecastPoint[]> = {
  "Zone 4 - Lower River Road": [
    {
      timeWindow: '6 hours',
      riskLevel: 'low',
      predictedWaterLevel: 0.12,
      confidence: 0.94,
      timestamp: '2026-08-24 16:00',
      location: 'Zone 4 - Lower River Road',
      notes: 'Gutter pooling stable. Storm drains functioning at 80% capacity.'
    },
    {
      timeWindow: '12 hours',
      riskLevel: 'moderate',
      predictedWaterLevel: 0.45,
      confidence: 0.88,
      timestamp: '2026-08-24 22:00',
      location: 'Zone 4 - Lower River Road',
      notes: 'Moderate rising tides. Outlets experiencing partial surge backing.'
    },
    {
      timeWindow: '24 hours',
      riskLevel: 'high',
      predictedWaterLevel: 1.35,
      confidence: 0.82,
      timestamp: '2026-08-25 10:00',
      location: 'Zone 4 - Lower River Road',
      notes: 'Peak precipitation window. Heavy street flooding expected near river margins.'
    },
    {
      timeWindow: '48 hours',
      riskLevel: 'critical',
      predictedWaterLevel: 2.10,
      confidence: 0.76,
      timestamp: '2026-08-26 10:00',
      location: 'Zone 4 - Lower River Road',
      notes: 'Extreme hazard risk. Main river channel is projected to crest, causing widespread inundation.'
    }
  ],
  "Zone 12 - Coastal Underpass": [
    {
      timeWindow: '6 hours',
      riskLevel: 'moderate',
      predictedWaterLevel: 0.38,
      confidence: 0.91,
      timestamp: '2026-08-24 16:00',
      location: 'Zone 12 - Coastal Underpass',
      notes: 'High ocean swells starting to pool in low-lying arterial drainage vents.'
    },
    {
      timeWindow: '12 hours',
      riskLevel: 'high',
      predictedWaterLevel: 0.95,
      confidence: 0.85,
      timestamp: '2026-08-24 22:00',
      location: 'Zone 12 - Coastal Underpass',
      notes: 'Tidal surge peak overlap. Underpasses will become impassable to standard vehicles.'
    },
    {
      timeWindow: '24 hours',
      riskLevel: 'critical',
      predictedWaterLevel: 1.85,
      confidence: 0.80,
      timestamp: '2026-08-25 10:00',
      location: 'Zone 12 - Coastal Underpass',
      notes: 'Structural flooding eminent. Storm surge walls projected to breach temporarily.'
    },
    {
      timeWindow: '48 hours',
      riskLevel: 'moderate',
      predictedWaterLevel: 0.50,
      confidence: 0.72,
      timestamp: '2026-08-26 10:00',
      location: 'Zone 12 - Coastal Underpass',
      notes: 'Water levels dropping slowly as high tide recedes and pumps engage.'
    }
  ],
  "Zone 1 - Civic Center": [
    {
      timeWindow: '6 hours',
      riskLevel: 'low',
      predictedWaterLevel: 0.02,
      confidence: 0.97,
      timestamp: '2026-08-24 16:00',
      location: 'Zone 1 - Civic Center',
      notes: 'Dry pavement conditions. Minor runoff absorbed by landscaped zones.'
    },
    {
      timeWindow: '12 hours',
      riskLevel: 'low',
      predictedWaterLevel: 0.05,
      confidence: 0.95,
      timestamp: '2026-08-24 22:00',
      location: 'Zone 1 - Civic Center',
      notes: 'Slight ponding near southern gutters. Clear drainage outflow verified.'
    },
    {
      timeWindow: '24 hours',
      riskLevel: 'low',
      predictedWaterLevel: 0.15,
      confidence: 0.90,
      timestamp: '2026-08-25 10:00',
      location: 'Zone 1 - Civic Center',
      notes: 'Runoff remains within safe municipal engineering conduits.'
    },
    {
      timeWindow: '48 hours',
      riskLevel: 'moderate',
      predictedWaterLevel: 0.40,
      confidence: 0.84,
      timestamp: '2026-08-26 10:00',
      location: 'Zone 1 - Civic Center',
      notes: 'Slight rising accumulation near low-lying parks. Overall risk minimal.'
    }
  ]
};

interface AdminForecastProps {
  forecasts?: FloodForecastPoint[];
  locations?: string[];
  isAdmin?: boolean;
}

const ALL_WINDOWS: ForecastTimeWindow[] = ['6 hours', '12 hours', '24 hours', '48 hours'];

// The internal database is a calibration reference used to fill any gaps the
// backend does not yet report (so all four windows always render). Real rows
// served by the backend (/forecast) take precedence where they exist.
function resolveForecasts(
  location: string,
  servicePoints: FloodForecastPoint[] | undefined,
  propForecasts: FloodForecastPoint[] | undefined
): FloodForecastPoint[] {
  if (propForecasts && propForecasts.length > 0) {
    return propForecasts;
  }
  const byWindow: Record<string, FloodForecastPoint> = {};
  (servicePoints || []).forEach(p => {
    byWindow[p.timeWindow] = p;
  });
  return ALL_WINDOWS.map(w => byWindow[w] || null)
    .filter((p): p is FloodForecastPoint => Boolean(p));
}

// Map a backend location name (e.g. "Sector 4: Lower River Basin") to the
// nearest matching entry in the internal calibration database.
function dbMatchFor(location: string): FloodForecastPoint[] {
  const lower = location.toLowerCase();
  let best: FloodForecastPoint[] | undefined;
  for (const key of Object.keys(LOCATION_FORECASTS_DB)) {
    const tokens = key.toLowerCase().split(/[\s\-:]+/).filter(t => t.length > 2);
    if (tokens.every(t => lower.includes(t))) {
      best = LOCATION_FORECASTS_DB[key];
      break;
    }
  }
  return best || LOCATION_FORECASTS_DB["Zone 4 - Lower River Road"];
}

export default function AdminForecast({ forecasts: propForecasts, locations: propLocations, isAdmin = true }: AdminForecastProps) {
  const [selectedLocation, setSelectedLocation] = useState<string>("Zone 4 - Lower River Road");
  const [selectedPeriod, setSelectedPeriod] = useState<'6 hours' | '12 hours' | '24 hours' | '48 hours'>('24 hours');
  const [simulationCalibrator, setSimulationCalibrator] = useState<number>(1.0);
  const [dispatchConfirmed, setDispatchConfirmed] = useState<boolean>(false);

  // Backend-provided station list and per-station forecasts.
  const [serviceLocations, setServiceLocations] = useState<string[]>([]);
  const [serviceForecasts, setServiceForecasts] = useState<Record<string, FloodForecastPoint[]>>({});
  const [backendLoaded, setBackendLoaded] = useState(false);

  // Load the station list and forecast rows from the backend service.
  useEffect(() => {
    let cancelled = false;
    forecastService.getLocations().then(async (locations) => {
      if (cancelled) return;
      const activeLocations = locations.length > 0 ? locations : Object.keys(LOCATION_FORECASTS_DB);
      setServiceLocations(activeLocations);
      setSelectedLocation(prev => activeLocations.includes(prev) ? prev : activeLocations[0] || prev);
      const perLoc: Record<string, FloodForecastPoint[]> = {};
      await Promise.all(activeLocations.map(async (loc) => {
        try {
          perLoc[loc] = await forecastService.getForecastForLocation(loc);
        } catch {
          perLoc[loc] = [];
        }
      }));
      if (!cancelled) {
        setServiceForecasts(perLoc);
        setBackendLoaded(true);
      }
    });
    return () => { cancelled = true; };
  }, []);

  // Background refresh of backend forecast rows (silent — no spinner toggle).
  const refreshForecasts = useCallback(() => {
    forecastService.getLocations().then(async (locations) => {
      const activeLocations = locations.length > 0 ? locations : Object.keys(LOCATION_FORECASTS_DB);
      const perLoc: Record<string, FloodForecastPoint[]> = {};
      await Promise.all(activeLocations.map(async (loc) => {
        try {
          perLoc[loc] = await forecastService.getForecastForLocation(loc);
        } catch {
          perLoc[loc] = [];
        }
      }));
      setServiceForecasts(perLoc);
    }).catch(() => undefined);
  }, []);
  usePolling(refreshForecasts, 30000);

  // Allow a caller-supplied station list (already resolved by the service).
  const activeLocations = propLocations && propLocations.length > 0
    ? propLocations
    : (serviceLocations.length > 0 ? serviceLocations : Object.keys(LOCATION_FORECASTS_DB));

  useEffect(() => {
    if (propLocations && propLocations.length > 0 && !propLocations.includes(selectedLocation)) {
      setSelectedLocation(propLocations[0]);
    }
  }, [propLocations]);

  // Allow custom props if passed by parent, otherwise fall back to our interactive database
  const rawService = serviceForecasts[selectedLocation];
  const serviceActive = resolveForecasts(selectedLocation, rawService, propForecasts);
  const activeForecasts = serviceActive.length >= 2
    ? serviceActive
    : dbMatchFor(selectedLocation);

  // Helper to retrieve color schemes for our four mandatory risk levels
  const getRiskVisuals = (level: ForecastRiskLevel) => {
    switch (level) {
      case 'critical':
        return {
          bg: 'bg-[#7F1D1D]/10',
          border: 'border-[#7F1D1D]/30',
          text: 'text-[#7F1D1D]',
          hex: '#7F1D1D',
          badge: 'bg-[#7F1D1D] text-white',
          label: 'CRITICAL WARNING'
        };
      case 'high':
        return {
          bg: 'bg-[#B23B2E]/10',
          border: 'border-[#B23B2E]/30',
          text: 'text-[#B23B2E]',
          hex: '#B23B2E',
          badge: 'bg-[#B23B2E] text-white',
          label: 'HIGH ALERT'
        };
      case 'moderate':
        return {
          bg: 'bg-[#C97A2B]/10',
          border: 'border-[#C97A2B]/30',
          text: 'text-[#C97A2B]',
          hex: '#C97A2B',
          badge: 'bg-[#C97A2B] text-white',
          label: 'MODERATE WATCH'
        };
      case 'low':
      default:
        return {
          bg: 'bg-[#2E7D5B]/10',
          border: 'border-[#2E7D5B]/30',
          text: 'text-[#2E7D5B]',
          hex: '#2E7D5B',
          badge: 'bg-[#2E7D5B] text-white',
          label: 'LOW WATCH'
        };
    }
  };

  const selectedPeriodData = activeForecasts.find(f => f.timeWindow === selectedPeriod) || activeForecasts[2];
  const activeVisuals = getRiskVisuals(selectedPeriodData.riskLevel);

  // Map the forecasts to a plottable numeric dataset for Recharts
  const chartData = activeForecasts.map(f => {
    // Translate categorical risk to numeric value for standard dual-axis plotting
    let riskNumericValue = 25;
    if (f.riskLevel === 'moderate') riskNumericValue = 50;
    if (f.riskLevel === 'high') riskNumericValue = 75;
    if (f.riskLevel === 'critical') riskNumericValue = 100;

    // Apply the simulation multiplier (Admin utility)
    const rawWaterLevel = f.predictedWaterLevel || 0;
    const calibratedWaterLevel = parseFloat((rawWaterLevel * simulationCalibrator).toFixed(2));

    return {
      ...f,
      calibratedWaterLevel,
      riskNumericValue,
      confidencePct: f.confidence ? Math.round(f.confidence * 100) : 0
    };
  });

  const handleTriggerBroadcast = () => {
    setDispatchConfirmed(true);
    setTimeout(() => {
      setDispatchConfirmed(false);
    }, 4000);
  };

  return (
    <div className="space-y-6 animate-fade-in" id="unified-forecast-view">
      
      {/* 1. Page Header */}
      <div className="border-b border-[#E2E4E1] pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-extrabold text-[#1A2226] uppercase tracking-wider flex items-center gap-2">
            <TrendingUp size={16} className="text-[#1B4B66]" />
            <span>{isAdmin ? "EOC Meteorological Prediction Console" : "Public Hydrological Forecast"}</span>
          </h2>
          <p className="text-xs text-[#5B6B72] mt-1 leading-normal">
            Real-time drainage simulation overlaying municipal telemetry and precipitation model metrics.
          </p>
        </div>

        {/* Forecast Station Switcher (Designed for easy API integration) */}
        <div className="flex items-center gap-2">
          <MapPin size={14} className="text-[#1B4B66]" />
          <span className="text-[10px] font-bold text-[#1A2226] uppercase font-mono">STATION:</span>
          <select
            value={selectedLocation}
            onChange={(e) => setSelectedLocation(e.target.value)}
            className="bg-white border border-[#E2E4E1] text-xs font-bold px-2 py-1 text-[#1A2226] rounded-none outline-none cursor-pointer focus:border-[#1B4B66]"
          >
            {activeLocations.map((loc) => (
              <option key={loc} value={loc}>{loc}</option>
            ))}
          </select>
        </div>
      </div>

      {/* 2. Unified Advisory Status Banner */}
      <div className={`border-l-4 p-4 shadow-sm flex items-start gap-4 rounded-none transition-colors ${activeVisuals.border} ${activeVisuals.bg}`}>
        <AlertTriangle className={`${activeVisuals.text} shrink-0 mt-0.5`} size={18} />
        <div className="space-y-1 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`text-[9px] font-black uppercase px-2 py-0.5 tracking-wider ${activeVisuals.badge}`}>
              {activeVisuals.label}
            </span>
            <span className="text-[10px] font-mono font-bold text-[#1A2226]">
              {selectedPeriod.toUpperCase()} OUTLOOK • {selectedLocation.toUpperCase()}
            </span>
          </div>
          <p className="text-xs text-[#1A2226] leading-relaxed font-semibold">
            {selectedPeriodData.notes}
          </p>
          <div className="flex items-center gap-4 text-[10px] text-[#5B6B72] pt-1">
            <span className="font-mono">Timestamp: {selectedPeriodData.timestamp}</span>
            <span>•</span>
            <span className="font-semibold">Confidence: {selectedPeriodData.confidence ? `${(selectedPeriodData.confidence * 100).toFixed(0)}%` : 'N/A'}</span>
          </div>
        </div>
      </div>

      {/* 3. Interactive Split Dashboard Layout */}
      <div className="grid gap-6 lg:grid-cols-3">
        
        {/* Interactive Dual-Axis Chart Block */}
        <div className="lg:col-span-2 bg-white border border-[#E2E4E1] p-5 flex flex-col justify-between" id="predictive-chart-panel">
          <div>
            <div className="flex items-center justify-between border-b border-[#E2E4E1]/80 pb-3 mb-4">
              <div>
                <span className="text-[10px] font-bold text-[#1A2226] uppercase tracking-wider block">
                  Crest & Confidence Composite Index
                </span>
                <span className="text-[9px] text-[#5B6B72]">Click nodes or bar levels to drill into detailed safety protocols</span>
              </div>
              <span className="text-[9px] font-mono text-gray-400">Station Active: {selectedLocation}</span>
            </div>

            {/* Interactive Recharts Composite Plot */}
            <div className="w-full h-72">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={chartData}
                  margin={{ top: 20, right: -5, left: -25, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E4E1" />
                  <XAxis 
                    dataKey="timeWindow" 
                    stroke="#5B6B72" 
                    fontSize={10} 
                    fontFamily="monospace"
                    tickLine={false}
                  />
                  {/* Left Axis: Water crest in meters */}
                  <YAxis 
                    yAxisId="left"
                    domain={[0, 3.0]} 
                    stroke="#1B4B66" 
                    fontSize={10} 
                    fontFamily="monospace"
                    tickLine={false}
                    label={{ value: 'Water Level (meters)', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fontSize: 9, fill: '#1B4B66', fontWeight: 'bold' }, offset: 10 }}
                  />
                  {/* Right Axis: Confidence percentage */}
                  <YAxis 
                    yAxisId="right"
                    orientation="right"
                    domain={[0, 100]} 
                    stroke="#C97A2B" 
                    fontSize={10} 
                    fontFamily="monospace"
                    tickLine={false}
                    axisLine={false}
                    label={{ value: 'Model Confidence (%)', angle: 90, position: 'insideRight', style: { textAnchor: 'middle', fontSize: 9, fill: '#C97A2B', fontWeight: 'bold' }, offset: 5 }}
                  />
                  <Tooltip
                    cursor={{ fill: 'rgba(27, 75, 102, 0.04)' }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        const levelsVisual = getRiskVisuals(data.riskLevel);
                        return (
                          <div className="bg-[#1A2226] text-white p-3 border border-white/10 text-[11px] font-sans space-y-1 rounded-none shadow-md">
                            <p className="font-bold uppercase tracking-wider border-b border-white/10 pb-1">{data.timeWindow} Outlook</p>
                            <p>Risk State: <span className="font-extrabold uppercase" style={{ color: levelsVisual.hex }}>{data.riskLevel}</span></p>
                            <p className="font-mono">Water Level: <span className="font-bold text-sky-300">{data.calibratedWaterLevel}m</span></p>
                            <p className="font-mono">Model Confidence: <span className="font-bold text-amber-400">{data.confidencePct}%</span></p>
                            <p className="text-white/60 leading-normal text-[10px] italic pt-1 max-w-[200px]">{data.notes}</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend verticalAlign="top" height={36} iconSize={10} wrapperStyle={{ fontSize: '10px', textTransform: 'uppercase' }} />
                  
                  {/* Critical Crest Safety Limit */}
                  <ReferenceLine yAxisId="left" y={1.5} stroke="#B23B2E" strokeDasharray="3 3" label={{ value: 'CRITICAL OVERFLOW (1.5m)', position: 'insideTopLeft', fill: '#B23B2E', fontSize: 8, fontWeight: 'bold' }} />
                  
                  {/* Bar: Water Level Depth */}
                  <Bar 
                    yAxisId="left" 
                    name="Predicted Level (m)" 
                    dataKey="calibratedWaterLevel"
                    onClick={(data) => {
                      if (data) setSelectedPeriod(data.timeWindow);
                    }}
                    className="cursor-pointer"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={getRiskVisuals(entry.riskLevel).hex} />
                    ))}
                  </Bar>

                  {/* Line: Confidence percentage */}
                  <Line 
                    yAxisId="right" 
                    name="Model Confidence (%)" 
                    type="monotone" 
                    dataKey="confidencePct" 
                    stroke="#C97A2B" 
                    strokeWidth={2}
                    dot={{ r: 4, stroke: '#C97A2B', strokeWidth: 1, fill: '#fff' }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Calibrator Controller (For Admin / EOC simulation testing) */}
          {isAdmin ? (
            <div className="border-t border-[#E2E4E1] pt-3.5 mt-4 space-y-2 bg-gray-50 p-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-[#1A2226] uppercase tracking-wider flex items-center gap-1.5">
                  <TrendingUp className="text-[#1B4B66]" size={12} />
                  <span>Forecast Sensitivity Adjustment</span>
                </span>
                <span className="font-mono text-[10px] font-bold text-[#1B4B66]">{Math.round(simulationCalibrator * 100)}% Load</span>
              </div>
              <p className="text-[10px] text-[#5B6B72] leading-tight">
                Simulate peak storm surges by sliding the precipitation load coefficient below. All predicted levels will scale programmatically.
              </p>
              <div className="flex items-center gap-3">
                <input 
                  type="range" 
                  min="0.5" 
                  max="2.0" 
                  step="0.1" 
                  value={simulationCalibrator}
                  onChange={(e) => setSimulationCalibrator(parseFloat(e.target.value))}
                  className="flex-1 accent-[#1B4B66] h-1 bg-gray-200 cursor-pointer"
                />
                <button
                  type="button"
                  onClick={() => setSimulationCalibrator(1.0)}
                  className="px-2 py-0.5 border border-[#E2E4E1] bg-white text-[9px] font-mono uppercase text-gray-700 hover:bg-gray-50"
                >
                  Reset
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between border-t border-[#E2E4E1] pt-3 mt-4 text-[10px] text-[#5B6B72]">
              <span className="flex items-center gap-1.5 font-semibold">
                <Clock size={12} className="text-[#2E7D5B]" />
                TELEMETRY REFRESHED: {new Date().toLocaleTimeString()}
              </span>
              <span className="font-mono text-right">Forecast Engine: Composite Model</span>
            </div>
          )}
        </div>

        {/* 4. Forecast Period Timeline Grid */}
        <div className="space-y-4" id="forecast-grid-breakdown">
          <div className="border-b border-[#E2E4E1] pb-2">
            <span className="text-[10px] font-bold text-[#1A2226] uppercase tracking-wider block">
              Predicted Forecast Windows
            </span>
          </div>

          <div className="space-y-3">
            {activeForecasts.map((forecast) => {
              const visuals = getRiskVisuals(forecast.riskLevel);
              const isFocused = selectedPeriod === forecast.timeWindow;
              const calibratedWaterLevel = forecast.predictedWaterLevel 
                ? parseFloat((forecast.predictedWaterLevel * simulationCalibrator).toFixed(2))
                : undefined;

              return (
                <div 
                  key={forecast.timeWindow}
                  onClick={() => setSelectedPeriod(forecast.timeWindow)}
                  className={`border p-3.5 space-y-2 cursor-pointer transition-all ${
                    isFocused 
                      ? 'bg-white border-[#1B4B66] shadow-md ring-1 ring-[#1B4B66]' 
                      : 'bg-white border-[#E2E4E1] hover:bg-[#F5F6F4]/50'
                  }`}
                  id={`forecast-card-${forecast.timeWindow.replace(' ', '-')}`}
                >
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-1.5">
                      <Clock size={12} className="text-[#1B4B66]" />
                      <span className="font-extrabold text-[#1A2226] text-xs tracking-tight uppercase">
                        {forecast.timeWindow}
                      </span>
                    </div>
                    <span className={`text-[9px] font-black px-1.5 py-0.5 border uppercase ${
                      forecast.riskLevel === 'critical' 
                        ? 'bg-[#7F1D1D]/10 border-[#7F1D1D]/30 text-[#7F1D1D]' 
                        : forecast.riskLevel === 'high' 
                          ? 'bg-[#B23B2E]/10 border-[#B23B2E]/30 text-[#B23B2E]' 
                          : forecast.riskLevel === 'moderate' 
                            ? 'bg-[#C97A2B]/10 border-[#C97A2B]/30 text-[#C97A2B]' 
                            : 'bg-[#2E7D5B]/10 border-[#2E7D5B]/30 text-[#2E7D5B]'
                    }`}>
                      {forecast.riskLevel}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 border-y border-[#E2E4E1]/50 py-2 text-[11px]">
                    <div>
                      <span className="text-[9px] text-[#5B6B72] block font-mono uppercase leading-none">Predicted Crest:</span>
                      <span className="font-extrabold text-[#1A2226]">
                        {calibratedWaterLevel !== undefined ? `${calibratedWaterLevel} meters` : 'N/A'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] text-[#5B6B72] block font-mono uppercase leading-none">Confidence:</span>
                      <span className="font-extrabold text-[#1A2226] font-mono">
                        {forecast.confidence ? `${(forecast.confidence * 100).toFixed(0)}%` : 'N/A'}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[9px] text-[#5B6B72] block font-mono uppercase leading-none">Target sector:</span>
                    <span className="text-[10px] font-bold text-[#1A2226]">{forecast.location}</span>
                  </div>

                  <p className="text-[10.5px] text-[#5B6B72] leading-normal italic line-clamp-2">
                    "{forecast.notes}"
                  </p>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* 5. Role-Based Insights Panel */}
      <div className="bg-white border border-[#E2E4E1] p-5">
        {isAdmin ? (
          /* EOC Command Center Panel */
          <div className="space-y-4">
            <h3 className="text-xs font-extrabold text-[#1A2226] uppercase tracking-wider border-b border-[#E2E4E1] pb-2 flex items-center gap-1.5">
              <UserCheck size={14} className="text-[#1B4B66]" />
              <span>EOC Civil Defense Action Panel</span>
            </h3>
            
            <div className="grid gap-4 md:grid-cols-3 text-xs leading-relaxed">
              <div className="p-3 bg-gray-50 border border-gray-100">
                <span className="font-bold text-[#1A2226] block uppercase tracking-wider text-[10px] mb-1">Pre-Positioning Logistics</span>
                <p className="text-[#5B6B72]">
                  Based on the 24h high alert projection ({selectedLocation}), dispatch civil utility crews to secure temporary barrier blockades across eastern road outlets.
                </p>
              </div>
              <div className="p-3 bg-gray-50 border border-gray-100">
                <span className="font-bold text-[#1A2226] block uppercase tracking-wider text-[10px] mb-1">Emergency Shelter Prep</span>
                <p className="text-[#5B6B72]">
                  Alert evacuation site operators within Sector 4 to stage emergency bedding kits. Total potential crest depth exceeds 1.5 meters.
                </p>
              </div>
              <div className="p-3 bg-gray-50 border border-gray-100 flex flex-col justify-between">
                <div>
                  <span className="font-bold text-[#1A2226] block uppercase tracking-wider text-[10px] mb-1">Civic Broadcast Dispatch</span>
                  <p className="text-[#5B6B72] text-[11px]">
                    Issue targeted SMS warnings and hazard zone updates to citizens residing near the forecast margins.
                  </p>
                </div>
                
                <button
                  type="button"
                  onClick={handleTriggerBroadcast}
                  className="mt-2 w-full py-1.5 bg-[#B23B2E] text-white hover:bg-[#8F2E24] text-[10px] font-black uppercase tracking-wider text-center cursor-pointer transition-colors"
                >
                  {dispatchConfirmed ? "Alert Dispatched ✓" : "Queue Broadcast Alert"}
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Citizen Safety & Action Panel */
          <div className="space-y-4">
            <h3 className="text-xs font-extrabold text-[#1A2226] uppercase tracking-wider border-b border-[#E2E4E1] pb-2 flex items-center gap-1.5">
              <ShieldCheck size={14} className="text-[#2E7D5B]" />
              <span>Your Action Plan (Based on Selected Forecast Level)</span>
            </h3>

            <div className="grid gap-4 md:grid-cols-3 text-xs">
              <div className="space-y-1.5 p-3 bg-gray-50 border border-gray-100">
                <span className="font-bold text-[#1A2226] uppercase text-[10px] block text-[#1B4B66]">1. Safety Precautions</span>
                {selectedPeriodData.riskLevel === 'critical' || selectedPeriodData.riskLevel === 'high' ? (
                  <p className="text-[#7F1D1D] font-medium leading-relaxed">
                    Evacuation recommended. Secure important home documentation upstairs and clear low garages. Prepare food/water kits for immediate transit.
                  </p>
                ) : (
                  <p className="text-[#5B6B72] leading-relaxed">
                    Elevated watch. Keep gutters free of dry leaves and monitor water level reports frequently. Do not block emergency service routes.
                  </p>
                )}
              </div>
              <div className="space-y-1.5 p-3 bg-gray-50 border border-gray-100">
                <span className="font-bold text-[#1A2226] uppercase text-[10px] block text-[#1B4B66]">2. Transit Boundaries</span>
                <p className="text-[#5B6B72] leading-relaxed">
                  Never drive or walk through flooded pavement depths. Even 15cm of rapid movement possesses kinetic power to trap human limbs. Turn Around, Don't Drown!
                </p>
              </div>
              <div className="space-y-1.5 p-3 bg-gray-50 border border-gray-100">
                <span className="font-bold text-[#1A2226] uppercase text-[10px] block text-[#1B4B66]">3. Community Resilience</span>
                <p className="text-[#5B6B72] leading-relaxed">
                  Help elder neighbors pre-stage sandbags if their residence borders lower street culverts. Report any storm drain blockages via our <strong>Report</strong> tab.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
