/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { FloodReport } from '../types';
import { AlertTriangle, MapPin, Clock, ArrowRight, ShieldCheck, Info } from 'lucide-react';

interface CitizenHomeProps {
  reports: FloodReport[];
  onNavigateToReport: () => void;
  onNavigateToMap?: () => void;
  broadcastAlerts?: string[];
}

export default function CitizenHome({ reports, onNavigateToReport, onNavigateToMap, broadcastAlerts }: CitizenHomeProps) {
  // Get recent verified reports
  const verifiedReports = reports
    .filter(r => r.status === 'verified')
    .slice(0, 3);

  // Calculate dynamic active risk level based on verified/pending reports
  const activeReports = reports.filter(r => r.status !== 'resolved');
  let currentRisk: 'low' | 'medium' | 'high' | 'critical' = 'low';
  if (activeReports.some(r => r.severity === 'critical')) {
    currentRisk = 'critical';
  } else if (activeReports.some(r => r.severity === 'high')) {
    currentRisk = 'high';
  } else if (activeReports.some(r => r.severity === 'medium')) {
    currentRisk = 'medium';
  }

  const getRiskDetails = () => {
    switch (currentRisk) {
      case 'critical':
        return {
          label: "Critical Threat Level",
          colorClass: "bg-[#7F1D1D]/10 border-[#7F1D1D]/30 text-[#7F1D1D]",
          dotClass: "bg-[#7F1D1D] animate-ping",
          explanation: "IMMINENT CIVIL DANGER: Multiple severe or life-threatening flooding incidents have been verified in municipal limits. Active structural hazards and road washouts are reported. Avoid travel completely and prep for emergency directions."
        };
      case 'high':
        return {
          label: "High Watch Level",
          colorClass: "bg-[#B23B2E]/10 border-[#B23B2E]/30 text-[#B23B2E]",
          dotClass: "bg-[#B23B2E] animate-pulse",
          explanation: "HIGH FLOOD HAZARD: Riverbanks or coastal outlets are breaching their safety thresholds. Major underpasses are flooded and impassable. Stay clear of low-lying waterways."
        };
      case 'medium':
        return {
          label: "Elevated Localized Risk",
          colorClass: "bg-[#C97A2B]/10 border-[#C97A2B]/30 text-[#C97A2B]",
          dotClass: "bg-[#C97A2B]",
          explanation: "MODERATE OUTLOOK: Gutter overflow, sidewalk submergence, or clogged stormwater pipes are active in commercial or residential areas. Traffic delays are expected near low-elevation streets."
        };
      case 'low':
      default:
        return {
          label: "Normal Operating Conditions",
          colorClass: "bg-[#2E7D5B]/10 border-[#2E7D5B]/30 text-[#2E7D5B]",
          dotClass: "bg-[#2E7D5B]",
          explanation: "LOW OUTLOOK: All channels and drainage mains are currently functioning normally. Localized runoff remains within safe design baselines. Maintain standard watch protocols."
        };
    }
  };

  const riskDetails = getRiskDetails();

  return (
    <div className="space-y-6" id="citizen-home">
      {/* Official Alert Banner(s) */}
      <div className="space-y-3.5" id="official-alerts-container">
        {(broadcastAlerts && broadcastAlerts.length > 0 ? broadcastAlerts : []).map((alert, idx) => (
          <div 
            key={idx}
            className="bg-white border-l-4 border-[#B23B2E] p-4 flex items-start gap-3.5 shadow-sm rounded-none"
          >
            <AlertTriangle className="text-[#B23B2E] shrink-0 mt-0.5" size={18} />
            <div className="flex-1">
              <span className="font-bold text-[#1A2226] text-xs tracking-wider uppercase block">
                Official Civic Notice #{idx + 1}
              </span>
              <p className="text-xs text-[#5B6B72] mt-1 leading-relaxed">
                {alert}
              </p>
            </div>
          </div>
        ))}
        {!broadcastAlerts || broadcastAlerts.length === 0 ? (
          <div className="bg-white border-l-4 border-[#2E7D5B] p-4 flex items-start gap-3.5 shadow-sm rounded-none">
            <ShieldCheck className="text-[#2E7D5B] shrink-0 mt-0.5" size={18} />
            <div className="flex-1">
              <span className="font-bold text-[#1A2226] text-xs tracking-wider uppercase block">
                No Active Alerts
              </span>
              <p className="text-xs text-[#5B6B72] mt-1 leading-relaxed">
                There are currently no active broadcast alerts. Normal operating status is in effect.
              </p>
            </div>
          </div>
        ) : null}
      </div>

      {/* Main Status Hero */}
      <div className="bg-white border border-[#E2E4E1] p-6 sm:p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-4 max-w-xl">
            <div className={`inline-flex items-center gap-2 border px-3 py-1 text-xs font-semibold tracking-wide uppercase ${riskDetails.colorClass}`}>
              <span className={`h-2 w-2 rounded-full ${riskDetails.dotClass}`}></span>
              Current Status: {riskDetails.label}
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#1A2226] tracking-tight font-sans">
              Municipal Flood Watch & Reporting
            </h1>
            <p className="text-[#5B6B72] leading-relaxed">
              {riskDetails.explanation}
            </p>
            <p className="text-xs text-[#5B6B72] italic leading-normal">
              Active local reports logged on system: <strong>{activeReports.length}</strong> | Pending Verification: <strong>{activeReports.filter(r => r.status === 'pending').length}</strong>
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              <button
                onClick={onNavigateToReport}
                id="btn-report-flood-hero"
                className="bg-[#1B4B66] text-white hover:bg-[#153a4f] px-5 py-2.5 font-semibold text-sm transition-colors duration-150 inline-flex items-center gap-2"
              >
                File an Official Flood Report
                <ArrowRight size={16} />
              </button>
              {onNavigateToMap && (
                <button
                  onClick={onNavigateToMap}
                  id="btn-view-map-hero"
                  className="bg-white border border-[#1B4B66] text-[#1B4B66] hover:bg-[#F5F6F4] px-5 py-2.5 font-semibold text-sm transition-colors duration-150"
                >
                  View Active Flood Map
                </button>
              )}
            </div>
          </div>

          {/* Quick Info Box */}
          <div className="bg-[#F5F6F4] p-5 border border-[#E2E4E1] md:max-w-xs w-full space-y-4">
            <h2 className="text-xs font-bold text-[#1A2226] uppercase tracking-wider border-b border-[#E2E4E1] pb-2">
              Emergency Action Plan
            </h2>
            <div className="space-y-3">
              <div className="flex gap-2.5">
                <ShieldCheck className="text-[#2E7D5B] shrink-0" size={16} />
                <div className="text-xs">
                  <span className="font-bold text-[#1A2226] block">Life Threatening Emergency</span>
                  <p className="text-[#5B6B72]">Immediately call municipal dispatch at <span className="font-mono font-bold">911</span>. Do not use this web app for active rescue requests.</p>
                </div>
              </div>
              <div className="flex gap-2.5">
                <Info className="text-[#1B4B66] shrink-0" size={16} />
                <div className="text-xs">
                  <span className="font-bold text-[#1A2226] block">Property Preservation</span>
                  <p className="text-[#5B6B72]">Pre-stage sandbags if you reside in Zone 4 (River Basin).</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Verified Reports Nearby */}
      <div className="space-y-3">
        <div className="flex items-center justify-between border-b border-[#E2E4E1] pb-2">
          <h2 className="text-sm font-bold text-[#1A2226] uppercase tracking-wider">
            Active Verified Reports Nearby
          </h2>
          <span className="text-xs text-[#5B6B72]">Updated in real-time</span>
        </div>

        {verifiedReports.length === 0 ? (
          <div className="bg-white border border-[#E2E4E1] p-8 text-center text-[#5B6B72]">
            No verified flooding reports currently active. If you notice localized accumulation, please file a report.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {verifiedReports.map((report) => (
              <div key={report.id} className="bg-white border border-[#E2E4E1] flex flex-col justify-between" id={`verified-report-${report.id}`}>
                <div className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono font-semibold bg-[#F5F6F4] px-1.5 py-0.5 border border-[#E2E4E1] text-[#1A2226]">
                      {report.id}
                    </span>
                    <span className={`text-[11px] font-bold px-2 py-0.5 tracking-wider uppercase border ${
                      report.severity === 'high' 
                        ? 'bg-[#B23B2E]/10 border-[#B23B2E]/30 text-[#B23B2E]' 
                        : report.severity === 'medium' 
                          ? 'bg-[#C97A2B]/10 border-[#C97A2B]/30 text-[#C97A2B]' 
                          : 'bg-[#2E7D5B]/10 border-[#2E7D5B]/30 text-[#2E7D5B]'
                    }`}>
                      {report.severity} risk
                    </span>
                  </div>

                  <div className="space-y-1">
                    <h3 className="font-bold text-sm text-[#1A2226] flex items-center gap-1.5">
                      <MapPin size={14} className="text-[#1B4B66] shrink-0" />
                      <span className="truncate">{report.location}</span>
                    </h3>
                    <p className="text-xs text-[#5B6B72] line-clamp-3 leading-relaxed">
                      {report.description}
                    </p>
                  </div>
                </div>

                {report.photoUrl && (
                  <div className="h-32 border-t border-[#E2E4E1] overflow-hidden relative bg-neutral-100">
                    <img 
                      src={report.photoUrl} 
                      alt={`Flood evidence photo at ${report.location}`} 
                      className="w-full h-full object-cover" 
                      referrerPolicy="no-referrer"
                      loading="lazy"
                    />
                  </div>
                )}

                <div className="p-3 bg-[#F5F6F4] border-t border-[#E2E4E1] flex items-center justify-between text-[11px] text-[#5B6B72] font-mono">
                  <span className="flex items-center gap-1">
                    <Clock size={12} />
                    {report.date}
                  </span>
                  <span>Depth: {report.waterLevelDepth || "Unknown"}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Official Guidelines Section */}
      <div className="bg-white border border-[#E2E4E1] p-6 space-y-4">
        <h3 className="text-xs font-bold text-[#1A2226] uppercase tracking-wider border-b border-[#E2E4E1] pb-2">
          Municipal Public Safety Guidelines
        </h3>
        <div className="grid gap-4 md:grid-cols-3 text-xs">
          <div className="space-y-1">
            <span className="font-bold text-[#1A2226]">1. Do Not Walk through Floodwaters</span>
            <p className="text-[#5B6B72]">Just 15cm of fast-moving water can knock you down. Avoid any moving water courses completely.</p>
          </div>
          <div className="space-y-1">
            <span className="font-bold text-[#1A2226]">2. Turn Around, Don't Drown®</span>
            <p className="text-[#5B6B72]">Do not drive through barricaded underpasses or flooded streets. Over half of all flood-related drownings occur in vehicles.</p>
          </div>
          <div className="space-y-1">
            <span className="font-bold text-[#1A2226]">3. Keep Off Drainage Structures</span>
            <p className="text-[#5B6B72]">Active stormwater culverts generate suction capable of trapping individuals. Report blockages from a safe distance.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
