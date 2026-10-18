import React, { useState, useEffect } from 'react';
import { FloodReport } from '../types';
import { Clock, MapPin, AlertTriangle, CheckCircle, HelpCircle, Eye, ClipboardList, X } from 'lucide-react';

interface CitizenMyReportsProps {
  reports: FloodReport[];
}

export default function CitizenMyReports({ reports }: CitizenMyReportsProps) {
  const [selectedReport, setSelectedReport] = useState<FloodReport | null>(null);

  // Close the detail modal with the Escape key for keyboard accessibility
  useEffect(() => {
    if (!selectedReport) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedReport(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedReport]);

  // Map our internal DB statuses to the specific labels requested:
  // pending -> Submitted, verified -> Verified, resolved -> Resolved
  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return 'Submitted';
      case 'verified': return 'Verified';
      case 'resolved': return 'Resolved';
      default: return 'Submitted';
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'resolved':
        return 'bg-[#2E7D5B]/10 border-[#2E7D5B]/30 text-[#2E7D5B]';
      case 'verified':
        return 'bg-[#1B4B66]/10 border-[#1B4B66]/30 text-[#1B4B66]';
      case 'pending':
      default:
        return 'bg-[#C97A2B]/10 border-[#C97A2B]/30 text-[#C97A2B]';
    }
  };

  return (
    <div className="space-y-6 animate-fade-in" id="citizen-my-reports">
      {/* Institutional Section Header */}
      <div className="border-b border-[#E2E4E1] pb-3.5">
        <h2 className="text-sm font-extrabold text-[#1A2226] uppercase tracking-wider flex items-center gap-2">
          <ClipboardList size={16} className="text-[#1B4B66]" />
          <span>Active Incident Audit Log</span>
        </h2>
        <p className="text-xs text-[#5B6B72] mt-1 leading-normal">
          Official status tracker for flood hazard logs submitted in your operational zone. Local response agencies cross-reference this registry for dispatch queuing.
        </p>
      </div>

      {reports.length === 0 ? (
        <div className="bg-white border border-[#E2E4E1] p-12 text-center text-[#5B6B72] space-y-3" id="my-reports-empty">
          <AlertTriangle className="mx-auto text-[#E2E4E1]" size={36} />
          <p className="text-xs font-bold text-[#1A2226] uppercase tracking-wider">No active logs registered</p>
          <p className="text-xs max-w-md mx-auto text-[#5B6B72]/80 leading-relaxed">
            There are currently no localized flood reports logged from this terminal. Use the "Report Flood" form to lodge an active environmental hazard entry.
          </p>
        </div>
      ) : (
        <div className="bg-white border border-[#E2E4E1] overflow-hidden" id="my-reports-list">
          {/* Desktop Table Header */}
          <div className="hidden md:grid grid-cols-12 gap-4 px-5 py-3.5 bg-[#F5F6F4] border-b border-[#E2E4E1] text-[10px] font-bold text-[#5B6B72] uppercase tracking-wider">
            <div className="col-span-2">Evidence</div>
            <div className="col-span-2">Date / Code</div>
            <div className="col-span-4">Location & Description</div>
            <div className="col-span-2 text-center">Severity</div>
            <div className="col-span-2 text-right">Verification Status</div>
          </div>

          <div className="divide-y divide-[#E2E4E1]">
            {reports.map((report) => (
              <div 
                key={report.id} 
                className="grid grid-cols-1 md:grid-cols-12 gap-4 p-5 hover:bg-[#F5F6F4]/40 items-center transition-colors duration-150 text-xs cursor-pointer"
                id={`my-report-row-${report.id}`}
                onClick={() => setSelectedReport(report)}
              >
                {/* 1. Evidence Thumbnail */}
                <div className="md:col-span-2" onClick={(e) => e.stopPropagation()}>
                  {report.photoUrl ? (
                    <div className="border border-[#E2E4E1] p-0.5 bg-white w-20 h-14 shrink-0 overflow-hidden">
                      <img 
                        src={report.photoUrl} 
                        alt={`Flood evidence photo for report ${report.id}`} 
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                        loading="lazy"
                      />
                    </div>
                  ) : (
                    <div className="border border-dashed border-[#E2E4E1] bg-[#F5F6F4] w-20 h-14 flex flex-col items-center justify-center text-[10px] text-[#5B6B72] select-none">
                      <span>No Photo</span>
                    </div>
                  )}
                </div>

                {/* 2. Date / ID */}
                <div className="md:col-span-2 space-y-1">
                  <div className="font-mono font-bold text-[#1B4B66] tracking-tight">{report.id}</div>
                  <div className="text-[10px] text-[#5B6B72] flex items-center gap-1">
                    <Clock size={11} className="shrink-0 text-[#1B4B66]" />
                    <span>{report.date}</span>
                  </div>
                </div>

                {/* 3. Location and Details */}
                <div className="md:col-span-4 space-y-1">
                  <div className="font-bold text-[#1A2226] flex items-start gap-1">
                    <MapPin size={12} className="text-[#1B4B66] shrink-0 mt-0.5" />
                    <span>{report.location}</span>
                  </div>
                  <p className="text-[11px] text-[#5B6B72] leading-relaxed line-clamp-2">
                    {report.description}
                  </p>
                  {report.waterLevelDepth && (
                    <div className="text-[10px] font-mono text-[#1B4B66]">
                      Water Depth: <span className="font-bold">{report.waterLevelDepth}</span>
                    </div>
                  )}
                </div>

                {/* 4. Severity Badge */}
                <div className="md:col-span-2 flex justify-start md:justify-center">
                  <span className={`text-[10px] font-bold px-2 py-0.5 border uppercase tracking-wider ${
                    report.severity === 'critical'
                      ? 'bg-[#7F1D1D]/20 border-[#7F1D1D]/50 text-[#7F1D1D] font-black animate-pulse'
                      : report.severity === 'high' 
                        ? 'bg-[#B23B2E]/10 border-[#B23B2E]/30 text-[#B23B2E]' 
                        : report.severity === 'medium' 
                          ? 'bg-[#C97A2B]/10 border-[#C97A2B]/30 text-[#C97A2B]' 
                          : 'bg-[#2E7D5B]/10 border-[#2E7D5B]/30 text-[#2E7D5B]'
                  }`}>
                    {report.severity}
                  </span>
                </div>

                {/* 5. Status Badge */}
                <div className="md:col-span-2 flex justify-between md:justify-end items-center gap-2">
                  <span className="md:hidden text-[10px] font-bold text-[#5B6B72] uppercase">Status</span>
                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <span className={`text-[10px] font-bold px-2.5 py-0.5 border uppercase tracking-wider ${getStatusStyle(report.status)}`}>
                      {getStatusLabel(report.status)}
                    </span>
                    <button
                      onClick={() => setSelectedReport(report)}
                      className="p-1.5 border border-[#E2E4E1] bg-white hover:bg-[#F5F6F4] text-[#5B6B72] hover:text-[#1B4B66] cursor-pointer"
                      title="Inspect Report Log"
                      aria-label={`Inspect report log ${report.id}`}
                    >
                      <Eye size={13} />
                    </button>
                  </div>
                </div>

                {/* Optional Admin Notes Inline Row */}
                {report.adminNotes && (
                  <div className="col-span-1 md:col-span-12 mt-2 p-2.5 bg-[#1B4B66]/5 border-l-2 border-[#1B4B66] text-[11px] text-[#5B6B72]">
                    <span className="font-bold text-[#1A2226]">Official Response Team Action Note:</span> "{report.adminNotes}"
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Citizen Report Detail Modal */}
      {selectedReport && (
        <div className="fixed inset-0 bg-[#1A2226]/80 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto" id="citizen-report-detail-modal">
          <div className="bg-white border border-[#E2E4E1] max-w-lg w-full flex flex-col shadow-2xl relative animate-fade-in" role="dialog" aria-modal="true" aria-label={`Public record log ${selectedReport.id}`}>
            {/* Modal Header */}
            <div className="bg-[#1B4B66] text-white p-4 flex items-center justify-between border-b border-[#E2E4E1]">
              <div className="space-y-0.5">
                <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-white/75 block">
                  Official Public Record Log
                </span>
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-black font-mono tracking-tight">
                    INCIDENT ID: {selectedReport.id}
                  </h3>
                  <span className={`text-[9px] font-bold px-2 py-0.5 border uppercase tracking-wider ${getStatusStyle(selectedReport.status)} bg-white/15 text-white border-white/20`}>
                    {getStatusLabel(selectedReport.status)}
                  </span>
                </div>
              </div>
              <button 
                onClick={() => setSelectedReport(null)}
                className="text-white/75 hover:text-white hover:bg-white/10 p-1 cursor-pointer transition-colors"
                aria-label="Close report log"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto text-xs">
              {/* Photo Evidence */}
              {selectedReport.photoUrl && (
                <div className="border border-[#E2E4E1] p-1 bg-[#F5F6F4]">
                  <img 
                    src={selectedReport.photoUrl} 
                    alt={`Flood hazard evidence at ${selectedReport.location}`} 
                    className="w-full h-40 object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
              )}

              {/* Grid Metrics */}
              <div className="grid grid-cols-2 gap-3 pb-3 border-b border-[#E2E4E1]/80">
                <div>
                  <span className="text-[9px] text-[#5B6B72] font-mono block uppercase">Severity Level</span>
                  <span className={`inline-block mt-1 text-[10px] font-bold px-2 py-0.5 border uppercase tracking-wider ${
                    selectedReport.severity === 'critical' ? 'bg-[#7F1D1D]/10 border-[#7F1D1D]/30 text-[#7F1D1D] font-black animate-pulse' :
                    selectedReport.severity === 'high' ? 'bg-[#B23B2E]/10 border-[#B23B2E]/30 text-[#B23B2E]' :
                    selectedReport.severity === 'medium' ? 'bg-[#C97A2B]/10 border-[#C97A2B]/30 text-[#C97A2B]' :
                    'bg-[#2E7D5B]/10 border-[#2E7D5B]/30 text-[#2E7D5B]'
                  }`}>
                    {selectedReport.severity}
                  </span>
                </div>
                <div>
                  <span className="text-[9px] text-[#5B6B72] font-mono block uppercase">Water Depth Gauge</span>
                  <span className="font-mono font-bold text-[#1A2226] block mt-1">{selectedReport.waterLevelDepth || "Not Gauged"}</span>
                </div>
                <div className="pt-2">
                  <span className="text-[9px] text-[#5B6B72] font-mono block uppercase">Latitude</span>
                  <span className="font-mono text-[#1A2226] block mt-0.5">{selectedReport.latitude?.toFixed(5) || "N/A"}</span>
                </div>
                <div className="pt-2">
                  <span className="text-[9px] text-[#5B6B72] font-mono block uppercase">Longitude</span>
                  <span className="font-mono text-[#1A2226] block mt-0.5">{selectedReport.longitude?.toFixed(5) || "N/A"}</span>
                </div>
              </div>

              {/* Location details */}
              <div className="space-y-1">
                <span className="text-[9px] text-[#5B6B72] font-mono block uppercase">Filing Address / Landmark</span>
                <div className="font-bold text-[#1A2226] flex items-center gap-1.5">
                  <MapPin size={12} className="text-[#1B4B66]" />
                  <span>{selectedReport.location}</span>
                </div>
              </div>

              {/* Timestamp */}
              <div className="space-y-1">
                <span className="text-[9px] text-[#5B6B72] font-mono block uppercase">Lodgement Timestamp</span>
                <div className="text-[#1A2226] flex items-center gap-1.5 font-mono">
                  <Clock size={12} className="text-[#1B4B66]" />
                  <span>{selectedReport.date}</span>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1 bg-[#F5F6F4] p-3 border border-[#E2E4E1]">
                <span className="text-[9px] text-[#5B6B72] font-mono block uppercase mb-1">Citizen Observation Statement</span>
                <p className="text-[#5B6B72] leading-relaxed font-medium italic">
                  "{selectedReport.description}"
                </p>
              </div>

              {/* EOC Notes */}
              {selectedReport.adminNotes && (
                <div className="space-y-1 bg-[#1B4B66]/5 border-l-2 border-[#1B4B66] p-3">
                  <span className="text-[9px] text-[#1B4B66] font-mono block uppercase font-bold">EOC Dispatch Action Memo</span>
                  <p className="text-[#5B6B72] leading-relaxed">
                    {selectedReport.adminNotes}
                  </p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="border-t border-[#E2E4E1] p-3.5 bg-gray-50 flex justify-end">
              <button 
                onClick={() => setSelectedReport(null)}
                className="px-4 py-2 bg-[#1B4B66] hover:bg-[#153a4f] text-white text-xs font-bold uppercase tracking-wider cursor-pointer"
              >
                Close File
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
