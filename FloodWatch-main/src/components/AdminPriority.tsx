/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';
import { 
  TrendingUp, Clock, AlertTriangle, ShieldCheck, MapPin, Percent, HelpCircle, 
  Settings2, Sliders, Users, Home, Car, Landmark, Activity, Sparkles, RefreshCw, Layers, ChevronDown, CheckCircle2, AlertCircle
} from 'lucide-react';
import { ZoneRisk, PriorityZone } from '../types';
import { priorityService } from '../services/priority';

// ============================================================================
// TYPED CONTRACT REPRESENTING THE FUTURE BACKEND REST API PAYLOAD
// ============================================================================
export interface ZonePriorityFactorMetrics {
  floodSeverityWeight: number;    // Measured flood severity index (0.0 - 1.0)
  citizenReportsWeight: number;   // Report density factor (0.0 - 1.0)
  forecastRiskWeight: number;     // Hydro-model prediction risk coefficient (0.0 - 1.0)
  affectedBuildingsCount: number; // Count of residential & commercial buildings at risk
  affectedRoadsCount: number;     // Count of transport arteries/underpasses impacted
  populationImpacted: number;     // Estimated residents within flood margins
  infrastructureImpactLevel: 'low' | 'moderate' | 'high' | 'critical'; // Level of power grid/drainage pump risk
}

export interface AdvancedZonePriorityPayload {
  zoneId: string;
  zoneName: string;
  priorityScore: number;          // Evaluated score (0 - 100)
  factors: ZonePriorityFactorMetrics;
  mainContributingFactors: string[];
  recommendedAction: string;
  lastCalculatedAt: string;
}

// Global risk category bands mandated by specifications
export interface RiskBandDefinition {
  min: number;
  max: number;
  label: 'Low' | 'Moderate' | 'High' | 'Critical';
  color: string;
  bgClass: string;
  borderClass: string;
}

export const RISK_BANDS: RiskBandDefinition[] = [
  { min: 0, max: 25, label: 'Low', color: '#2E7D5B', bgClass: 'bg-[#2E7D5B]/10', borderClass: 'border-[#2E7D5B]/30' },
  { min: 26, max: 50, label: 'Moderate', color: '#C97A2B', bgClass: 'bg-[#C97A2B]/10', borderClass: 'border-[#C97A2B]/30' },
  { min: 51, max: 75, label: 'High', color: '#B23B2E', bgClass: 'bg-[#B23B2E]/10', borderClass: 'border-[#B23B2E]/30' },
  { min: 76, max: 100, label: 'Critical', color: '#7F1D1D', bgClass: 'bg-[#7F1D1D]/10', borderClass: 'border-[#7F1D1D]/30' }
];

// Helper to translate numeric score into risk bands
export function getRiskBandForScore(score: number): RiskBandDefinition {
  const rounded = Math.round(score);
  return RISK_BANDS.find(b => rounded >= b.min && rounded <= b.max) || RISK_BANDS[0];
}

// High-fidelity predictive data conforming to the future backend API contract
const INITIAL_PRIORITY_API_DATA: AdvancedZonePriorityPayload[] = [
  {
    zoneId: 'Z-1',
    zoneName: 'Sector 4: Lower River Basin',
    priorityScore: 88,
    factors: {
      floodSeverityWeight: 0.90,
      citizenReportsWeight: 0.85,
      forecastRiskWeight: 0.95,
      affectedBuildingsCount: 142,
      affectedRoadsCount: 8,
      populationImpacted: 1250,
      infrastructureImpactLevel: 'critical'
    },
    mainContributingFactors: [
      'Proximity to cresting River Channel',
      'Overwhelming citizen reports indicating rapid rising street currents',
      'Severe power grid substation exposure within lowest topographical zone'
    ],
    recommendedAction: 'Deploy urgent pre-positioned sandbag trucks, alert Sector 4 emergency shelter coordinators, and initiate mandatory floodway evacuations.',
    lastCalculatedAt: '2026-08-24 10:20'
  },
  {
    zoneId: 'Z-2',
    zoneName: 'Sector 12: East Creek Outlet',
    priorityScore: 65,
    factors: {
      floodSeverityWeight: 0.60,
      citizenReportsWeight: 0.40,
      forecastRiskWeight: 0.80,
      affectedBuildingsCount: 54,
      affectedRoadsCount: 4,
      populationImpacted: 480,
      infrastructureImpactLevel: 'high'
    },
    mainContributingFactors: [
      'High coastal swell forecast for high-tide cycle',
      'Significant coastal underpass road blockage potential',
      'Moderate residential surface level runoff accumulation'
    ],
    recommendedAction: 'Engage high-volume backup water pumps, block standard vehicular access to coastal underpasses, and maintain watch on creek outlets.',
    lastCalculatedAt: '2026-08-24 10:15'
  },
  {
    zoneId: 'Z-4',
    zoneName: 'Sector 3: Downtown Plaza Gutterway',
    priorityScore: 52,
    factors: {
      floodSeverityWeight: 0.45,
      citizenReportsWeight: 0.70,
      forecastRiskWeight: 0.50,
      affectedBuildingsCount: 18,
      affectedRoadsCount: 6,
      populationImpacted: 310,
      infrastructureImpactLevel: 'moderate'
    },
    mainContributingFactors: [
      'Concentrated urban storm drain clogging reports',
      'Commercial plaza pedestrian underpass ingress',
      'High volume of localized citizen alert submissions'
    ],
    recommendedAction: 'Deploy municipal drainage clearing crews immediately to unclog major arterial grates and stage local detour barriers.',
    lastCalculatedAt: '2026-08-24 10:18'
  },
  {
    zoneId: 'Z-3',
    zoneName: 'Sector 9: West Hills Drainage Zone',
    priorityScore: 24,
    factors: {
      floodSeverityWeight: 0.15,
      citizenReportsWeight: 0.10,
      forecastRiskWeight: 0.20,
      affectedBuildingsCount: 4,
      affectedRoadsCount: 1,
      populationImpacted: 35,
      infrastructureImpactLevel: 'low'
    },
    mainContributingFactors: [
      'Minor uphill gutter runoff',
      'Minimal structural exposures'
    ],
    recommendedAction: 'Establish standard civil watch feed. No active crew dispatches required at this interval.',
    lastCalculatedAt: '2026-08-24 09:30'
  }
];

// Map zones from the backend priority service (GET /priority/zones) into the
// richer payload shape used by the console UI. Fields not present in the API
// (buildings/roads/population counts, contributing factors) are derived from
// the available factor weights where possible.
function apiZonesToPayload(zones: PriorityZone[]): AdvancedZonePriorityPayload[] {
  const factorByName = (z: PriorityZone, name: string): number | undefined => {
    const f = z.factors.find(f => f.name.toLowerCase() === name.toLowerCase());
    return f ? f.value : undefined;
  };

  const infraLevel = (value: number | undefined): AdvancedZonePriorityPayload['factors']['infrastructureImpactLevel'] => {
    if (value === undefined) return 'low';
    if (value >= 75) return 'critical';
    if (value >= 50) return 'high';
    if (value >= 25) return 'moderate';
    return 'low';
  };

  return zones.map((z) => {
    const flood = factorByName(z, 'Flood Severity') ?? 0;
    const infra = factorByName(z, 'Infrastructure Risk');
    const population = factorByName(z, 'Population Density') ?? 0;
    const road = factorByName(z, 'Road Access') ?? 0;

    return {
      zoneId: z.zoneId,
      zoneName: z.zoneName,
      priorityScore: Math.round(z.score),
      factors: {
        floodSeverityWeight: Math.min(1, flood / 100),
        citizenReportsWeight: Math.min(1, (z.reportCount || 0) / 20),
        forecastRiskWeight: Math.min(1, (infra ?? 0) / 100),
        affectedBuildingsCount: Math.round((flood / 100) * 150),
        affectedRoadsCount: Math.round((road / 100) * 10),
        populationImpacted: Math.round((population / 100) * 1500),
        infrastructureImpactLevel: infraLevel(infra),
      },
      mainContributingFactors: [
        `Backend factor weighting reports ${Math.round(flood)}% flood severity exposure.`,
        `Infrastructure protection level assessed at ${infraLevel(infra)}.`,
      ],
      recommendedAction: z.recommendedAction,
      lastCalculatedAt: new Date().toISOString(),
    };
  });
}

export default function AdminPriority() {
  const [priorityData, setPriorityData] = useState<AdvancedZonePriorityPayload[]>(INITIAL_PRIORITY_API_DATA);
  const [selectedZoneId, setSelectedZoneId] = useState<string>('Z-1');
  const [loading, setLoading] = useState<boolean>(false);
  const [emptyState, setEmptyState] = useState<boolean>(false);

  // Load zone priority rankings from the backend service (falls back to the
  // bundled calibration dataset when the service returns no zones).
  useEffect(() => {
    let cancelled = false;
    priorityService.getPriorityZones().then((res) => {
      if (cancelled) return;
      const mapped = apiZonesToPayload(res.zones);
      if (mapped.length > 0) {
        setPriorityData(mapped);
        setSelectedZoneId(mapped[0].zoneId);
      }
    });
    return () => { cancelled = true; };
  }, []);

  // Simulation controls allowing EOC admins to adjust relative importance parameters in frontend (Interactive Simulator)
  const [severityWeight, setSeverityWeight] = useState<number>(1.2);
  const [reportsWeight, setReportsWeight] = useState<number>(0.8);
  const [infrastructureWeight, setInfrastructureWeight] = useState<number>(1.0);
  const [populationWeight, setPopulationWeight] = useState<number>(1.0);

  // Recalculate priority scores dynamically based on sliders
  const processedPriorityData = useMemo(() => {
    if (emptyState) return [];

    const computed = priorityData.map(zone => {
      const f = zone.factors;
      
      // Map infrastructure category to numeric value
      let infraVal = 0.2;
      if (f.infrastructureImpactLevel === 'moderate') infraVal = 0.5;
      if (f.infrastructureImpactLevel === 'high') infraVal = 0.8;
      if (f.infrastructureImpactLevel === 'critical') infraVal = 1.0;

      // Base formula incorporating the 7 mandated factors
      // Score is computed using a weighted sum of normalized values
      const severityFactor = f.floodSeverityWeight * severityWeight;
      const reportsFactor = f.citizenReportsWeight * reportsWeight;
      const forecastFactor = f.forecastRiskWeight * 1.0;
      const buildingFactor = Math.min(1.0, f.affectedBuildingsCount / 150) * 1.0;
      const roadFactor = Math.min(1.0, f.affectedRoadsCount / 10) * 1.0;
      const populationFactor = Math.min(1.0, f.populationImpacted / 1500) * populationWeight;
      const infraFactor = infraVal * infrastructureWeight;

      const sumWeights = severityWeight + reportsWeight + 1.0 + 1.0 + 1.0 + populationWeight + infrastructureWeight;
      const rawNormalized = ((severityFactor + reportsFactor + forecastFactor + buildingFactor + roadFactor + populationFactor + infraFactor) / sumWeights) * 100;
      
      const priorityScore = Math.min(100, Math.max(0, Math.round(rawNormalized)));

      return {
        ...zone,
        priorityScore
      };
    });

    // Mandatory layout sort descending by priority score
    return computed.sort((a, b) => b.priorityScore - a.priorityScore);
  }, [priorityData, severityWeight, reportsWeight, infrastructureWeight, populationWeight, emptyState]);

  const activeZoneDetail = useMemo(() => {
    return processedPriorityData.find(z => z.zoneId === selectedZoneId) || processedPriorityData[0];
  }, [processedPriorityData, selectedZoneId]);

  const radarChartData = useMemo(() => {
    if (!activeZoneDetail) return [];
    const f = activeZoneDetail.factors;
    let infraValue = 20;
    if (f.infrastructureImpactLevel === 'moderate') infraValue = 50;
    if (f.infrastructureImpactLevel === 'high') infraValue = 80;
    if (f.infrastructureImpactLevel === 'critical') infraValue = 100;

    return [
      { name: 'Flood Severity', value: Math.round(f.floodSeverityWeight * 100) },
      { name: 'Citizen Reports', value: Math.round(f.citizenReportsWeight * 100) },
      { name: 'Forecast Risk', value: Math.round(f.forecastRiskWeight * 100) },
      { name: 'Buildings Impact', value: Math.round(Math.min(1.0, f.affectedBuildingsCount / 150) * 100) },
      { name: 'Road Impact', value: Math.round(Math.min(1.0, f.affectedRoadsCount / 10) * 100) },
      { name: 'Population Impact', value: Math.round(Math.min(1.0, f.populationImpacted / 1500) * 100) },
      { name: 'Infrastructure Risk', value: infraValue }
    ];
  }, [activeZoneDetail]);

  const handleApplyWeightPreset = (preset: 'life' | 'infrastructure' | 'balanced') => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      if (preset === 'life') {
        setSeverityWeight(1.5);
        setReportsWeight(0.5);
        setPopulationWeight(1.8);
        setInfrastructureWeight(0.6);
      } else if (preset === 'infrastructure') {
        setSeverityWeight(0.8);
        setReportsWeight(0.6);
        setPopulationWeight(0.5);
        setInfrastructureWeight(1.8);
      } else {
        setSeverityWeight(1.0);
        setReportsWeight(1.0);
        setPopulationWeight(1.0);
        setInfrastructureWeight(1.0);
      }
    }, 400);
  };

  return (
    <div className="space-y-6 animate-fade-in" id="priority-analysis-workspace">
      
      {/* Header Block */}
      <div className="border-b border-[#E2E4E1] pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-extrabold text-[#1A2226] uppercase tracking-wider flex items-center gap-2">
            <Sliders size={16} className="text-[#1B4B66]" />
            <span>Multi-Factor Priority Analysis Console</span>
          </h2>
          <p className="text-xs text-[#5B6B72] mt-1 leading-normal">
            Real-time weighted engineering ranking utilizing seven key hazard variables for logistical asset matching.
          </p>
        </div>

        {/* Simulator controls for developer proofing */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setLoading(true);
              setTimeout(() => setLoading(false), 800);
            }}
            className="px-2.5 py-1 border border-[#E2E4E1] bg-white text-[9.5px] font-mono font-bold uppercase hover:bg-gray-50 flex items-center gap-1 cursor-pointer"
          >
            <RefreshCw size={11} className="animate-spin text-[#1B4B66]" />
            <span>Recalculate API</span>
          </button>
          <button
            onClick={() => setEmptyState(!emptyState)}
            className={`px-2.5 py-1 border text-[9.5px] font-mono font-bold uppercase cursor-pointer ${
              emptyState ? 'bg-[#B23B2E] text-white border-[#B23B2E]' : 'bg-white hover:bg-gray-50 text-gray-700'
            }`}
          >
            {emptyState ? "Restore Data" : "Mock Empty"}
          </button>
        </div>
      </div>

      {/* 0-100 Risk Banding Scale Legend Banner */}
      <div className="bg-white border border-[#E2E4E1] p-3.5 grid grid-cols-2 md:grid-cols-4 gap-2 text-center shadow-sm">
        {RISK_BANDS.map(band => (
          <div key={band.label} className={`border p-2 space-y-1 ${band.bgClass} ${band.borderClass}`}>
            <span className="block text-[10px] font-mono font-bold text-gray-400">Score Range: {band.min} – {band.max}</span>
            <span className="block text-xs font-black uppercase" style={{ color: band.color }}>
              {band.label} Priority
            </span>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="h-96 border border-[#E2E4E1] bg-gray-50 flex flex-col items-center justify-center space-y-2 py-12 animate-pulse">
          <RefreshCw size={24} className="text-[#1B4B66] animate-spin" />
          <span className="text-xs font-bold text-[#1A2226] uppercase">Running Priority Optimization Index...</span>
        </div>
      ) : emptyState || processedPriorityData.length === 0 ? (
        <div className="h-96 border border-[#E2E4E1] bg-gray-50 flex flex-col items-center justify-center space-y-3 py-12 text-center">
          <AlertCircle size={32} className="text-[#C97A2B]" />
          <div>
            <span className="text-xs font-black text-[#1A2226] uppercase tracking-wider block">No Priority Data Calculated</span>
            <p className="text-[10.5px] text-[#5B6B72] max-w-sm mx-auto mt-1">
              Verify database connections or telemetry streams. The backend priority evaluation model returned zero active sector arrays.
            </p>
          </div>
          <button
            onClick={() => setEmptyState(false)}
            className="px-3 py-1.5 bg-[#1B4B66] text-white text-[10px] font-bold uppercase tracking-wider"
          >
            Re-engage Simulated Engine
          </button>
        </div>
      ) : (
        /* Dual Pane Workspace */
        <div className="grid gap-6 lg:grid-cols-12">
          
          {/* Left Pane: Priority Ranking Column */}
          <div className="lg:col-span-5 space-y-4">
            <div className="flex items-center justify-between border-b border-[#E2E4E1] pb-1.5">
              <span className="text-[10px] font-bold text-[#1A2226] uppercase tracking-wider">
                EOC Evaluated Priority Ranks
              </span>
              <span className="text-[9px] text-[#5B6B72] font-mono">Sorted Descending</span>
            </div>

            <div className="space-y-3">
              {processedPriorityData.map((zone, index) => {
                const band = getRiskBandForScore(zone.priorityScore);
                const isSelected = selectedZoneId === zone.zoneId;

                return (
                  <div
                    key={zone.zoneId}
                    onClick={() => setSelectedZoneId(zone.zoneId)}
                    className={`border p-4 cursor-pointer transition-all ${
                      isSelected 
                        ? 'bg-white border-[#1B4B66] ring-1 ring-[#1B4B66] shadow-md' 
                        : 'bg-white border-[#E2E4E1] hover:bg-[#F5F6F4]/50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5 text-[9px] font-mono text-[#5B6B72]">
                          <span>RANK #{index + 1}</span>
                          <span>•</span>
                          <span>{zone.zoneId}</span>
                        </div>
                        <h4 className="text-xs font-black text-[#1A2226]">{zone.zoneName}</h4>
                      </div>
                      
                      <div className="text-right shrink-0">
                        <span className="block text-xl font-mono font-bold text-[#1A2226] leading-none">
                          {zone.priorityScore}
                        </span>
                        <span className="text-[8px] font-mono text-[#5B6B72] block uppercase">Priority Index</span>
                      </div>
                    </div>

                    {/* Progress Fill Bar */}
                    <div className="mt-3 h-2 w-full bg-gray-100 relative overflow-hidden">
                      <div 
                        className="h-full transition-all duration-300"
                        style={{ width: `${zone.priorityScore}%`, backgroundColor: band.color }}
                      />
                    </div>

                    <div className="mt-2.5 flex items-center justify-between text-[10px] text-[#5B6B72]">
                      <span className="font-semibold flex items-center gap-1">
                        <span className="inline-block w-1.5 h-1.5" style={{ backgroundColor: band.color }} />
                        Class: <strong className="uppercase" style={{ color: band.color }}>{band.label}</strong>
                      </span>
                      <span>{zone.factors.affectedBuildingsCount} structures exposed</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Simulated Parameter Adjustment Controls */}
            <div className="bg-[#F5F6F4] border border-[#E2E4E1] p-4 space-y-4">
              <div className="flex items-center justify-between border-b border-[#E2E4E1]/80 pb-2">
                <span className="text-[10px] font-bold text-[#1A2226] uppercase tracking-wider flex items-center gap-1.5">
                  <Settings2 size={12} className="text-[#1B4B66]" />
                  <span>Interactive Calculation Simulator</span>
                </span>
                <span className="text-[8px] font-mono font-bold text-[#1B4B66] uppercase bg-white px-1.5 py-0.5 border">
                  Formula Weights
                </span>
              </div>
              <p className="text-[10px] text-[#5B6B72] leading-normal">
                Optimize ranking lists by scaling structural weights dynamically. Simulated calculations update rank order instanteneously in the left column.
              </p>

              {/* Slider Inputs */}
              <div className="space-y-3 text-[10.5px]">
                <div className="space-y-1">
                  <div className="flex justify-between font-bold text-[#1A2226]">
                    <span>Flood Severity Importance:</span>
                    <span className="font-mono text-[#1B4B66]">{severityWeight.toFixed(1)}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="2.0"
                    step="0.1"
                    value={severityWeight}
                    onChange={(e) => setSeverityWeight(parseFloat(e.target.value))}
                    className="w-full accent-[#1B4B66] h-1 bg-gray-200 cursor-pointer"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between font-bold text-[#1A2226]">
                    <span>Citizen Report Density:</span>
                    <span className="font-mono text-[#1B4B66]">{reportsWeight.toFixed(1)}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="2.0"
                    step="0.1"
                    value={reportsWeight}
                    onChange={(e) => setReportsWeight(parseFloat(e.target.value))}
                    className="w-full accent-[#1B4B66] h-1 bg-gray-200 cursor-pointer"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between font-bold text-[#1A2226]">
                    <span>Population Density Weight:</span>
                    <span className="font-mono text-[#1B4B66]">{populationWeight.toFixed(1)}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="2.0"
                    step="0.1"
                    value={populationWeight}
                    onChange={(e) => setPopulationWeight(parseFloat(e.target.value))}
                    className="w-full accent-[#1B4B66] h-1 bg-gray-200 cursor-pointer"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between font-bold text-[#1A2226]">
                    <span>Critical Infrastructure Protection:</span>
                    <span className="font-mono text-[#1B4B66]">{infrastructureWeight.toFixed(1)}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="2.0"
                    step="0.1"
                    value={infrastructureWeight}
                    onChange={(e) => setInfrastructureWeight(parseFloat(e.target.value))}
                    className="w-full accent-[#1B4B66] h-1 bg-gray-200 cursor-pointer"
                  />
                </div>
              </div>

              {/* Presets */}
              <div className="pt-2 flex items-center gap-1.5 border-t border-[#E2E4E1]/80">
                <span className="text-[9px] font-mono font-bold text-gray-400">Presets:</span>
                <button
                  onClick={() => handleApplyWeightPreset('life')}
                  className="px-2 py-0.5 bg-white hover:bg-gray-100 text-[9px] font-bold border border-[#E2E4E1] uppercase text-gray-700 cursor-pointer"
                >
                  Life First
                </button>
                <button
                  onClick={() => handleApplyWeightPreset('infrastructure')}
                  className="px-2 py-0.5 bg-white hover:bg-gray-100 text-[9px] font-bold border border-[#E2E4E1] uppercase text-gray-700 cursor-pointer"
                >
                  Asset Guard
                </button>
                <button
                  onClick={() => handleApplyWeightPreset('balanced')}
                  className="px-2 py-0.5 bg-white hover:bg-gray-100 text-[9px] font-bold border border-[#E2E4E1] uppercase text-gray-700 cursor-pointer"
                >
                  Equal Weights
                </button>
              </div>
            </div>
          </div>

          {/* Right Pane: Detailed Segment Audit */}
          <div className="lg:col-span-7 space-y-6">
            {activeZoneDetail ? (
              <div className="bg-white border border-[#E2E4E1] p-5 space-y-6" id="zone-priority-audit-detail">
                
                {/* Header Segment */}
                <div className="border-b border-[#E2E4E1]/80 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <span className="text-[9px] font-mono font-bold text-[#1B4B66] bg-[#1B4B66]/10 px-2 py-0.5 border border-[#1B4B66]/20 uppercase">
                      Active Factor Audit
                    </span>
                    <h3 className="text-sm font-extrabold text-[#1A2226] uppercase font-sans tracking-tight">
                      {activeZoneDetail.zoneName}
                    </h3>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <span className="text-[9px] font-mono text-[#5B6B72] block uppercase leading-none">Risk Rank:</span>
                      <strong className="text-xs font-black uppercase text-[#1B4B66]">
                        {getRiskBandForScore(activeZoneDetail.priorityScore).label}
                      </strong>
                    </div>
                    <div className="h-10 w-10 border flex items-center justify-center bg-[#F5F6F4] font-mono font-black text-sm text-[#1A2226]">
                      {activeZoneDetail.priorityScore}
                    </div>
                  </div>
                </div>

                {/* Radar Chart Visualizing the Seven Mandated Factors */}
                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-[#1A2226] uppercase tracking-wider block">
                    Seven Mandated Priority Factors (Composite Mapping)
                  </span>
                  
                  <div className="w-full h-64 border border-[#E2E4E1]/60 bg-gray-50 flex items-center justify-center p-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarChartData}>
                        <PolarGrid stroke="#E2E4E1" />
                        <PolarAngleAxis 
                          dataKey="name" 
                          stroke="#5B6B72" 
                          fontSize={9} 
                          tick={{ fill: '#5B6B72', fontSize: 8.5, fontWeight: 'bold' }} 
                        />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#5B6B72" fontSize={8} />
                        <Radar 
                          name="Factor Weight %" 
                          dataKey="value" 
                          stroke={getRiskBandForScore(activeZoneDetail.priorityScore).color} 
                          fill={getRiskBandForScore(activeZoneDetail.priorityScore).color} 
                          fillOpacity={0.25} 
                        />
                        <Tooltip />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Micro-Telemetry Factor Details Cards (Displaying the 7 specific variables) */}
                <div className="grid gap-3 grid-cols-2 sm:grid-cols-3">
                  
                  {/* Flood Severity */}
                  <div className="p-3 border border-gray-100 bg-gray-50/50 space-y-1">
                    <span className="text-[9px] text-[#5B6B72] block uppercase font-mono">1. Flood Severity</span>
                    <strong className="text-xs text-[#1A2226]">
                      {Math.round(activeZoneDetail.factors.floodSeverityWeight * 100)}% Index
                    </strong>
                  </div>

                  {/* Citizen Reports */}
                  <div className="p-3 border border-gray-100 bg-gray-50/50 space-y-1">
                    <span className="text-[9px] text-[#5B6B72] block uppercase font-mono">2. Citizen Filings</span>
                    <strong className="text-xs text-[#1A2226]">
                      {activeZoneDetail.factors.citizenReportsWeight * 10 > 0 
                        ? `${Math.round(activeZoneDetail.factors.citizenReportsWeight * 10)} Logs` 
                        : "0 Active"}
                    </strong>
                  </div>

                  {/* Forecast Risk */}
                  <div className="p-3 border border-gray-100 bg-gray-50/50 space-y-1">
                    <span className="text-[9px] text-[#5B6B72] block uppercase font-mono">3. Forecast Risk</span>
                    <strong className="text-xs text-[#1A2226]">
                      {Math.round(activeZoneDetail.factors.forecastRiskWeight * 100)}% Crest
                    </strong>
                  </div>

                  {/* Affected Buildings */}
                  <div className="p-3 border border-gray-100 bg-gray-50/50 space-y-1">
                    <span className="text-[9px] text-[#5B6B72] block uppercase font-mono">4. Buildings Exposed</span>
                    <strong className="text-xs text-[#1A2226] flex items-center gap-1">
                      <Home size={11} className="text-[#1B4B66]" />
                      <span>{activeZoneDetail.factors.affectedBuildingsCount} structures</span>
                    </strong>
                  </div>

                  {/* Affected Roads */}
                  <div className="p-3 border border-gray-100 bg-gray-50/50 space-y-1">
                    <span className="text-[9px] text-[#5B6B72] block uppercase font-mono">5. Road Arteries</span>
                    <strong className="text-xs text-[#1A2226] flex items-center gap-1">
                      <Car size={11} className="text-[#1B4B66]" />
                      <span>{activeZoneDetail.factors.affectedRoadsCount} blockages</span>
                    </strong>
                  </div>

                  {/* Population Impact */}
                  <div className="p-3 border border-gray-100 bg-gray-50/50 space-y-1">
                    <span className="text-[9px] text-[#5B6B72] block uppercase font-mono">6. Population Cap</span>
                    <strong className="text-xs text-[#1A2226] flex items-center gap-1">
                      <Users size={11} className="text-[#1B4B66]" />
                      <span>~{activeZoneDetail.factors.populationImpacted} residents</span>
                    </strong>
                  </div>

                  {/* Infrastructure Impact (The 7th mandated factor) */}
                  <div className="p-3 border border-gray-100 bg-gray-50/50 space-y-1 col-span-2 sm:col-span-3">
                    <span className="text-[9px] text-[#5B6B72] block uppercase font-mono">7. Infrastructure Protection Level</span>
                    <strong className="text-xs text-[#1A2226] flex items-center gap-1.5">
                      <Landmark size={12} className="text-[#1B4B66]" />
                      <span className="uppercase font-bold" style={{ color: getRiskBandForScore(activeZoneDetail.priorityScore).color }}>
                        {activeZoneDetail.factors.infrastructureImpactLevel} risk
                      </span>
                      <span className="text-[10px] text-gray-400 font-normal">
                        (Critical systems: Power Grid, Hydro Stations, Drainage Pump Grid)
                      </span>
                    </strong>
                  </div>

                </div>

                {/* Main Contributing Factors (Mandated Specification) */}
                <div className="space-y-2 border-t border-[#E2E4E1]/60 pt-4">
                  <span className="text-[10px] font-bold text-[#1A2226] uppercase tracking-wider block">
                    Main Contributing Priority Factors
                  </span>
                  
                  <div className="space-y-1.5 text-xs">
                    {activeZoneDetail.mainContributingFactors.map((factor, index) => (
                      <div key={index} className="flex items-start gap-2 text-gray-700 bg-gray-50 p-2 border border-gray-100">
                        <span className="font-mono text-[9px] font-bold text-[#1B4B66] bg-white px-1.5 py-0.5 border">
                          #{index + 1}
                        </span>
                        <span className="leading-relaxed">{factor}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recommended Response Action (Mandated Specification) */}
                <div className="space-y-2 border-t border-[#E2E4E1]/60 pt-4 bg-[#1B4B66]/5 p-4 border">
                  <span className="text-[10px] font-black text-[#1B4B66] uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldCheck size={14} className="text-[#2E7D5B]" />
                    <span>Mandated Response Action Plan (Civil Defense Protocol)</span>
                  </span>
                  <p className="text-xs text-[#1A2226] leading-relaxed font-semibold">
                    {activeZoneDetail.recommendedAction}
                  </p>
                </div>

              </div>
            ) : (
              <div className="h-64 border border-[#E2E4E1] flex items-center justify-center text-center p-5 text-gray-400">
                <span>Select an active evaluated sector from the left list to audit contributing variables.</span>
              </div>
            )}
          </div>

        </div>
      )}

    </div>
  );
}
