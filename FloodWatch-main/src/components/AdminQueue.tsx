/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { FloodReport, Severity, ReportStatus } from '../types';
import { 
  AlertTriangle, Check, CheckCircle2, Trash2, Eye, Clock, MapPin, Phone, User, 
  Search, SlidersHorizontal, ArrowUpDown, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, X, Map, 
  AlertCircle, ShieldAlert, BadgeInfo, Info, HelpCircle, FileText
} from 'lucide-react';

const ITEMS_PER_PAGE = 10;

/**
 * BACKEND DEVELOPER INTEGRATION CONTRACT:
 * 
 * Props passed to this component from parent (App.tsx):
 * - reports: FloodReport[] (Current reactive list of citizen reports in database)
 * - onVerifyReport: (id: string) => void (API callback to transition report status to 'verified')
 * - onResolveReport: (id: string, notes: string) => void (API callback to transition report status to 'resolved' with administrative notes)
 * - onDeleteReport: (id: string) => void (API callback to delete or archive report from database)
 */
interface AdminQueueProps {
  reports: FloodReport[];
  onVerifyReport: (id: string) => void;
  onResolveReport: (id: string, notes: string) => void;
  onDeleteReport: (id: string) => void;
}

type SortField = 'date' | 'severity' | 'status' | 'id';
type SortOrder = 'asc' | 'desc';

export default function AdminQueue({ reports, onVerifyReport, onResolveReport, onDeleteReport }: AdminQueueProps) {
  // Filter and sort states
  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [locationFilter, setLocationFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // Distinct report locations for the location filter dropdown
  const locationOptions = useMemo(() => {
    const seen = new Set<string>();
    const list: string[] = [];
    reports.forEach(r => {
      const loc = (r.location || '').trim();
      if (loc && !seen.has(loc)) {
        seen.add(loc);
        list.push(loc);
      }
    });
    return list.sort((a, b) => a.localeCompare(b));
  }, [reports]);
  
  // Interactive Modal state
  const [selectedReport, setSelectedReport] = useState<FloodReport | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [notesError, setNotesError] = useState<string | null>(null);
  
  // Sub-modals for action confirmations
  const [showResolveConfirmation, setShowResolveConfirmation] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [targetDeleteReportId, setTargetDeleteReportId] = useState<string | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);

  // Column sorting mechanics
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  // Assign weights to severity strings for numeric sorting
  const getSeverityWeight = (sev: Severity) => {
    if (sev === 'critical') return 4;
    if (sev === 'high') return 3;
    if (sev === 'medium') return 2;
    return 1;
  };

  // Filter & Sort core logic
  const filteredReports = reports
    .filter(report => {
      const matchesSearch = 
        report.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
        report.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        report.reporterName.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesSeverity = severityFilter === 'all' || report.severity === severityFilter;
      const matchesStatus = statusFilter === 'all' || report.status === statusFilter;
      const matchesLocation = locationFilter === 'all' || report.location === locationFilter;

      return matchesSearch && matchesSeverity && matchesStatus && matchesLocation;
    })
    .sort((a, b) => {
      let multiplier = sortOrder === 'asc' ? 1 : -1;
      
      if (sortField === 'id') {
        return a.id.localeCompare(b.id) * multiplier;
      }
      if (sortField === 'date') {
        return a.date.localeCompare(b.date) * multiplier;
      }
      if (sortField === 'severity') {
        return (getSeverityWeight(a.severity) - getSeverityWeight(b.severity)) * multiplier;
      }
      if (sortField === 'status') {
        return a.status.localeCompare(b.status) * multiplier;
      }
      return 0;
    });

  // Reset to page 1 whenever filters change
  const activeFilterKey = `${searchTerm}-${severityFilter}-${statusFilter}-${locationFilter}-${sortField}-${sortOrder}`;
  const [lastFilterKey, setLastFilterKey] = useState(activeFilterKey);
  if (activeFilterKey !== lastFilterKey) {
    setLastFilterKey(activeFilterKey);
    if (currentPage !== 1) setCurrentPage(1);
  }

  // Pagination calculations
  const totalPages = Math.max(1, Math.ceil(filteredReports.length / ITEMS_PER_PAGE));
  const paginatedReports = filteredReports.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Close open modals with the Escape key for keyboard accessibility
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (showResolveConfirmation) setShowResolveConfirmation(false);
      else if (showDeleteConfirmation) {
        setShowDeleteConfirmation(false);
        setTargetDeleteReportId(null);
      }
      else if (selectedReport) handleCloseModal();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  // Open rich detail modal
  const handleOpenDetailModal = (report: FloodReport) => {
    setSelectedReport(report);
    setResolutionNotes(report.adminNotes || '');
    setNotesError(null);
    setShowResolveConfirmation(false);
    setShowDeleteConfirmation(false);
  };

  // Close main detail modal
  const handleCloseModal = () => {
    setSelectedReport(null);
    setResolutionNotes('');
    setNotesError(null);
    setShowResolveConfirmation(false);
  };

  // Verify transition handler
  const handleVerifyAction = (id: string) => {
    onVerifyReport(id);
    // Refresh modal display state to represent active updates
    if (selectedReport && selectedReport.id === id) {
      setSelectedReport({ ...selectedReport, status: 'verified' });
    }
  };

  // Open resolution confirmation validation flow
  const handleInitiateResolve = () => {
    if (!resolutionNotes.trim()) {
      setNotesError("Administrative resolution notes are strictly required to sign off and resolve this alert.");
      return;
    }
    setNotesError(null);
    setShowResolveConfirmation(true);
  };

  // Commit resolution to backend callback
  const handleConfirmResolve = () => {
    if (!selectedReport) return;
    onResolveReport(selectedReport.id, resolutionNotes.trim());
    setSelectedReport({ 
      ...selectedReport, 
      status: 'resolved', 
      adminNotes: resolutionNotes.trim() 
    });
    setShowResolveConfirmation(false);
  };

  // Initiate report deletion flow
  const handleInitiateDelete = (id: string) => {
    setTargetDeleteReportId(id);
    setShowDeleteConfirmation(true);
  };

  // Commit deletion to backend callback
  const handleConfirmDelete = () => {
    if (!targetDeleteReportId) return;
    onDeleteReport(targetDeleteReportId);
    if (selectedReport && selectedReport.id === targetDeleteReportId) {
      setSelectedReport(null);
    }
    setTargetDeleteReportId(null);
    setShowDeleteConfirmation(false);
  };


  return (
    <div className="space-y-4" id="admin-queue-workspace">
      
      {/* Search & Filter Toolbar */}
      <div className="bg-white border border-[#E2E4E1] p-4 flex flex-col md:flex-row gap-3 justify-between items-stretch md:items-center shadow-sm">
        
        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-2.5 text-[#5B6B72]" size={14} />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search location, Report ID, or reporter name..."
            className="w-full text-xs border border-[#E2E4E1] pl-9 pr-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-[#1B4B66] bg-gray-50/50"
          />
        </div>

        {/* Dropdown Filters */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 w-full md:w-auto">
          <div className="flex items-center gap-1.5 text-xs text-[#5B6B72] font-semibold">
            <SlidersHorizontal size={12} />
            <span>Telemetry Filters:</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 w-full sm:w-auto">
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="w-full sm:w-auto text-xs border border-[#E2E4E1] px-2.5 py-1.5 bg-white text-[#1A2226] focus:outline-none focus:ring-1 focus:ring-[#1B4B66] cursor-pointer"
            >
              <option value="all">Severity: All Categories</option>
              <option value="critical">🔴 Critical Severity</option>
              <option value="high">🟠 High Severity</option>
              <option value="medium">🟡 Moderate Severity</option>
              <option value="low">🟢 Low Severity</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full sm:w-auto text-xs border border-[#E2E4E1] px-2.5 py-1.5 bg-white text-[#1A2226] focus:outline-none focus:ring-1 focus:ring-[#1B4B66] cursor-pointer"
            >
              <option value="all">Status: All Steps</option>
              <option value="pending">⏳ Submitted (Pending Audit)</option>
              <option value="verified">🛡️ Verified Active</option>
              <option value="resolved">✅ Resolved / Receded</option>
            </select>

            <select
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
              className="w-full sm:w-auto text-xs border border-[#E2E4E1] px-2.5 py-1.5 bg-white text-[#1A2226] focus:outline-none focus:ring-1 focus:ring-[#1B4B66] cursor-pointer"
            >
              <option value="all">Location: All Areas</option>
              {locationOptions.length === 0 && <option value="none" disabled>No locations filed yet</option>}
              {locationOptions.map(loc => (
                <option key={loc} value={loc}>{loc}</option>
              ))}
            </select>
          </div>

          {(searchTerm || severityFilter !== 'all' || statusFilter !== 'all' || locationFilter !== 'all') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setSeverityFilter('all');
                setStatusFilter('all');
                setLocationFilter('all');
              }}
              className="text-xs text-[#B23B2E] hover:underline font-extrabold px-2 cursor-pointer self-start sm:self-auto"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Main Table List */}
      <div className="bg-white border border-[#E2E4E1] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#F5F6F4] border-b border-[#E2E4E1] text-[11px] font-bold text-[#5B6B72] uppercase tracking-wider">
                <th className="p-3 font-mono cursor-pointer hover:bg-[#E2E4E1] transition-colors w-28" onClick={() => handleSort('id')}>
                  <div className="flex items-center gap-1">
                    Report ID
                    <ArrowUpDown size={10} />
                  </div>
                </th>
                <th className="p-3">Incident Location</th>
                <th className="p-3 cursor-pointer hover:bg-[#E2E4E1] transition-colors w-32" onClick={() => handleSort('severity')}>
                  <div className="flex items-center gap-1">
                    Severity Tier
                    <ArrowUpDown size={10} />
                  </div>
                </th>
                <th className="p-3 cursor-pointer hover:bg-[#E2E4E1] transition-colors w-36" onClick={() => handleSort('date')}>
                  <div className="flex items-center gap-1">
                    Logged Time
                    <ArrowUpDown size={10} />
                  </div>
                </th>
                <th className="p-3 cursor-pointer hover:bg-[#E2E4E1] transition-colors w-32" onClick={() => handleSort('status')}>
                  <div className="flex items-center gap-1">
                    Status
                    <ArrowUpDown size={10} />
                  </div>
                </th>
                <th className="p-3 text-right w-28">Actions</th>
              </tr>
            </thead>
            <tbody className="text-xs divide-y divide-[#E2E4E1]">
              {filteredReports.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-[#5B6B72] font-medium">
                    No citizen incident reports match your specified filters in the database.
                  </td>
                </tr>
              ) : (
                paginatedReports.map((report) => {
                  return (
                    <tr 
                      key={report.id}
                      id={`report-row-${report.id}`}
                      className="hover:bg-[#1B4B66]/5 transition-colors cursor-pointer"
                      onClick={() => handleOpenDetailModal(report)}
                    >
                      <td className="p-3 font-mono font-bold text-[#1B4B66]">
                        {report.id}
                      </td>
                      <td className="p-3">
                        <div className="font-bold text-[#1A2226]">{report.location}</div>
                      </td>
                      <td className="p-3">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 border ${
                          report.severity === 'critical'
                            ? 'bg-[#7F1D1D]/20 border-[#7F1D1D]/50 text-[#7F1D1D] font-black animate-pulse'
                            : report.severity === 'high' 
                              ? 'bg-[#B23B2E]/10 border-[#B23B2E]/30 text-[#B23B2E]' 
                              : report.severity === 'medium' 
                                ? 'bg-[#C97A2B]/10 border-[#C97A2B]/30 text-[#C97A2B]' 
                                : 'bg-[#2E7D5B]/10 border-[#2E7D5B]/30 text-[#2E7D5B]'
                        }`}>
                          <span className={`h-1.5 w-1.5 ${
                            report.severity === 'critical' ? 'bg-[#7F1D1D]' : report.severity === 'high' ? 'bg-[#B23B2E]' : report.severity === 'medium' ? 'bg-[#C97A2B]' : 'bg-[#2E7D5B]'
                          }`}></span>
                          {report.severity.toUpperCase()}
                        </span>
                      </td>
                      <td className="p-3 text-[#5B6B72] font-mono whitespace-nowrap">
                        {report.date}
                      </td>
                      <td className="p-3">
                        <span className={`inline-block text-[10px] font-bold px-2 py-0.5 border uppercase ${
                          report.status === 'resolved' 
                            ? 'bg-[#2E7D5B]/10 border-[#2E7D5B]/30 text-[#2E7D5B]' 
                            : report.status === 'verified' 
                              ? 'bg-[#1B4B66]/10 border-[#1B4B66]/30 text-[#1B4B66]' 
                              : 'bg-[#C97A2B]/10 border-[#C97A2B]/30 text-[#C97A2B]'
                        }`}>
                          {report.status === 'pending' ? 'SUBMITTED' : report.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="p-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenDetailModal(report)}
                            title="Audit detailed view"
                            aria-label={`Audit detailed view for ${report.id}`}
                            className="p-1.5 border border-[#E2E4E1] bg-white hover:bg-[#1B4B66]/5 text-[#5B6B72] hover:text-[#1B4B66] cursor-pointer"
                          >
                            <Eye size={13} />
                          </button>
                          <button
                            onClick={() => handleInitiateDelete(report.id)}
                            title="Discard or Archive report"
                            aria-label={`Discard or archive report ${report.id}`}
                            className="p-1.5 border border-[#E2E4E1] bg-white hover:bg-red-50 text-[#5B6B72] hover:text-[#B23B2E] cursor-pointer"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {filteredReports.length > ITEMS_PER_PAGE && (
          <div className="border-t border-[#E2E4E1] px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-2 bg-[#F5F6F4]/50">
            <span className="text-[11px] text-[#5B6B72] font-medium">
              Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, filteredReports.length)} of {filteredReports.length} reports
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                aria-label="Previous page"
                className="p-1.5 border border-[#E2E4E1] bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer text-[#5B6B72]"
              >
                <ChevronLeft size={14} />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  aria-label={`Page ${page}`}
                  aria-current={currentPage === page ? 'page' : undefined}
                  className={`min-w-[30px] py-1 text-[11px] font-bold border cursor-pointer ${
                    currentPage === page
                      ? 'bg-[#1B4B66] text-white border-[#1B4B66]'
                      : 'bg-white text-[#5B6B72] border-[#E2E4E1] hover:bg-gray-50'
                  }`}
                >
                  {page}
                </button>
              ))}
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                aria-label="Next page"
                className="p-1.5 border border-[#E2E4E1] bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer text-[#5B6B72]"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ============================================================================
          NEW: COMPREHENSIVE DETAIL AUDIT OVERLAY/MODAL VIEW (MANDATED IMPLEMENTATION)
          ============================================================================ */}
      {selectedReport && (
        <div className="fixed inset-0 bg-[#1A2226]/85 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto" id="report-detail-modal-overlay">
          <div className="bg-white border border-[#E2E4E1] max-w-4xl w-full flex flex-col h-auto max-h-[92vh] overflow-hidden shadow-2xl relative" role="dialog" aria-modal="true" aria-label={`Incident log ${selectedReport.id}`}>
            
            {/* Modal Header */}
            <div className="bg-[#1B4B66] text-white p-4 flex items-center justify-between border-b border-[#E2E4E1]">
              <div className="space-y-0.5">
                <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-white/75 block">
                  Incident Verification Protocol File
                </span>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-black font-mono tracking-tight text-white">
                    INCIDENT LOG: {selectedReport.id}
                  </h3>
                  <span className={`text-[9px] font-bold font-mono uppercase px-2 py-0.5 border ${
                    selectedReport.status === 'resolved'
                      ? 'bg-[#2E7D5B] border-[#2E7D5B]/50 text-white'
                      : selectedReport.status === 'verified'
                        ? 'bg-[#C97A2B] border-[#C97A2B]/50 text-white'
                        : 'bg-red-700 border-red-500 text-white'
                  }`}>
                    {selectedReport.status === 'pending' ? 'SUBMITTED' : selectedReport.status.toUpperCase()}
                  </span>
                </div>
              </div>
              <button 
                onClick={handleCloseModal}
                className="p-1.5 hover:bg-white/10 text-white transition-colors cursor-pointer"
                aria-label="Close report detail"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Content Scrollable Area */}
            <div className="p-6 overflow-y-auto space-y-6">
              
              {/* STATUS FLOW PROGRESS STEP TRAIL CHART */}
              <div className="border border-gray-100 bg-gray-50/50 p-4">
                <span className="text-[10px] font-black text-[#1A2226] uppercase tracking-wider block mb-3">
                  Report Pipeline Audit Progress Flow
                </span>

                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 relative">
                  
                  {/* Background connector line */}
                  <div className="absolute top-4 left-6 right-6 h-1 bg-gray-200 hidden sm:block -z-10" />

                  {/* Step 1: SUBMITTED */}
                  <div className="flex items-center gap-3 sm:flex-col sm:gap-1.5 text-center relative z-10 w-full sm:w-auto">
                    <div className="h-8 w-8 rounded-none border-2 flex items-center justify-center font-mono font-bold text-xs bg-[#1B4B66] text-white border-[#1B4B66]">
                      1
                    </div>
                    <div>
                      <span className="text-[10.5px] font-bold text-[#1A2226] block uppercase">SUBMITTED</span>
                      <span className="text-[9px] text-[#5B6B72] block font-mono">Logged by Citizen</span>
                    </div>
                  </div>

                  {/* Divider arrow for mobile layout */}
                  <div className="sm:hidden text-gray-300 font-bold">&#x2193;</div>

                  {/* Step 2: VERIFIED */}
                  <div className="flex items-center gap-3 sm:flex-col sm:gap-1.5 text-center relative z-10 w-full sm:w-auto">
                    <div className={`h-8 w-8 rounded-none border-2 flex items-center justify-center font-mono font-bold text-xs ${
                      selectedReport.status === 'verified' || selectedReport.status === 'resolved'
                        ? 'bg-[#1B4B66] text-white border-[#1B4B66]'
                        : 'bg-white text-gray-400 border-gray-300'
                    }`}>
                      2
                    </div>
                    <div>
                      <span className={`text-[10.5px] font-bold block uppercase ${
                        selectedReport.status === 'verified' || selectedReport.status === 'resolved'
                          ? 'text-[#1A2226]' : 'text-gray-400'
                      }`}>
                        VERIFIED
                      </span>
                      <span className="text-[9px] text-[#5B6B72] block font-mono">Operations Audit</span>
                    </div>
                  </div>

                  {/* Divider arrow for mobile layout */}
                  <div className="sm:hidden text-gray-300 font-bold">&#x2193;</div>

                  {/* Step 3: RESOLVED */}
                  <div className="flex items-center gap-3 sm:flex-col sm:gap-1.5 text-center relative z-10 w-full sm:w-auto">
                    <div className={`h-8 w-8 rounded-none border-2 flex items-center justify-center font-mono font-bold text-xs ${
                      selectedReport.status === 'resolved'
                        ? 'bg-[#2E7D5B] text-white border-[#2E7D5B]'
                        : 'bg-white text-gray-400 border-gray-300'
                    }`}>
                      3
                    </div>
                    <div>
                      <span className={`text-[10.5px] font-bold block uppercase ${
                        selectedReport.status === 'resolved'
                          ? 'text-[#2E7D5B]' : 'text-gray-400'
                      }`}>
                        RESOLVED
                      </span>
                      <span className="text-[9px] text-[#5B6B72] block font-mono">Mitigation Complete</span>
                    </div>
                  </div>

                </div>
              </div>

              {/* Bento Grid layout */}
              <div className="grid gap-6 md:grid-cols-12">
                
                {/* Left Column: Visual evidence & coordinates mapping */}
                <div className="md:col-span-5 space-y-5">
                  
                  {/* Photo Evidence Card */}
                  <div className="border border-[#E2E4E1] bg-white p-4 space-y-2">
                    <span className="text-[10px] font-black text-[#1A2226] uppercase tracking-wider block border-b pb-1">
                      Citizen Photographic File
                    </span>
                    {selectedReport.photoUrl ? (
                      <div className="border p-1 bg-gray-50 flex items-center justify-center group overflow-hidden relative">
                        <img 
                          src={selectedReport.photoUrl} 
                          alt={`Citizen-submitted flood evidence at ${selectedReport.location}`} 
                          className="max-h-56 w-full object-cover transition-transform duration-300 group-hover:scale-105"
                          referrerPolicy="no-referrer"
                          loading="lazy"
                        />
                        <div className="absolute bottom-1 right-1 bg-black/70 text-white font-mono text-[8px] px-1.5 py-0.5 uppercase">
                          Photo Evidence Attachment
                        </div>
                      </div>
                    ) : (
                      <div className="p-12 bg-gray-50 border border-dashed border-[#E2E4E1] text-center text-[#5B6B72] space-y-2">
                        <Info size={20} className="mx-auto text-gray-300" />
                        <span className="text-[10.5px] block font-medium">No Image Uploaded</span>
                        <p className="text-[9px] text-gray-400">Citizen submitted coordinates only.</p>
                      </div>
                    )}
                  </div>

                  {/* simulated Topological Contour Map Preview (SPECIFIED REQUIREMENT) */}
                  <div className="border border-[#E2E4E1] bg-white p-4 space-y-2">
                    <span className="text-[10px] font-black text-[#1A2226] uppercase tracking-wider block border-b pb-1">
                      EOC Topological GIS Coordinate Pin
                    </span>

                    <div className="border border-gray-200 bg-[#E2E4E1]/20 p-2.5 relative space-y-2">
                      {/* Grid Lines Pattern Container representing Map Contour Coordinates */}
                      <div className="h-32 w-full bg-slate-900 relative overflow-hidden flex items-center justify-center">
                        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:16px_16px]" />
                        
                        {/* Radar Scanning concentric ripples */}
                        <div className="absolute h-16 w-16 border border-[#1B4B66]/60 rounded-full animate-ping opacity-45" />
                        <div className="absolute h-8 w-8 border border-[#B23B2E]/60 rounded-full animate-pulse opacity-75" />
                        
                        {/* Elevation contour line designs */}
                        <svg className="absolute inset-0 w-full h-full opacity-35" viewBox="0 0 100 100" preserveAspectRatio="none">
                          <path d="M 0,20 Q 30,50 60,20 T 100,20" fill="none" stroke="#2E7D5B" strokeWidth="0.5" />
                          <path d="M 0,50 Q 50,80 80,40 T 100,60" fill="none" stroke="#2E7D5B" strokeWidth="0.5" />
                          <path d="M 0,80 Q 20,40 50,70 T 100,90" fill="none" stroke="#1B4B66" strokeWidth="0.5" strokeDasharray="2,2" />
                        </svg>

                        {/* Blinking Crosshair Pin Marker */}
                        <div className="absolute flex flex-col items-center">
                          <span className="h-2 w-2 rounded-full bg-[#B23B2E] animate-bounce" />
                          <span className="text-[8px] font-mono font-bold bg-[#B23B2E] text-white px-1 mt-0.5 uppercase tracking-tighter">
                            PIN ACTIVE
                          </span>
                        </div>

                        {/* Compass rose card detail */}
                        <div className="absolute top-1 right-1 text-white/50 text-[8px] font-mono">
                          N 34.06° W 118.22°
                        </div>
                      </div>

                      {/* Explicit Latitude/Longitude display values */}
                      <div className="grid grid-cols-2 gap-2 text-[10px] font-mono border-t border-gray-200 pt-2 text-[#5B6B72]">
                        <div>
                          <span className="block font-bold text-gray-400 uppercase text-[8px]">Latitude Coordinate:</span>
                          <span className="text-[#1A2226] font-bold">{selectedReport.latitude || "34.06220"}</span>
                        </div>
                        <div>
                          <span className="block font-bold text-gray-400 uppercase text-[8px]">Longitude Coordinate:</span>
                          <span className="text-[#1A2226] font-bold">{selectedReport.longitude || "-118.22370"}</span>
                        </div>
                      </div>
                    </div>
                  </div>


                </div>

                {/* Right Column: Citizen Metadata & Operations Audit Panel */}
                <div className="md:col-span-7 space-y-5">
                  
                  {/* Metadata and location detail cards */}
                  <div className="border border-[#E2E4E1] bg-white p-5 space-y-4">
                    <span className="text-[10px] font-black text-[#1A2226] uppercase tracking-wider block border-b pb-1">
                      Citizen Contact & Filing Information
                    </span>

                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div className="space-y-1">
                        <span className="text-[9px] font-bold text-[#5B6B72] uppercase font-mono block">Filer Full Name:</span>
                        <div className="flex items-center gap-2 font-bold text-[#1A2226]">
                          <User size={14} className="text-[#1B4B66]" />
                          <span>{selectedReport.reporterName}</span>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <span className="text-[9px] font-bold text-[#5B6B72] uppercase font-mono block">Telephone Contact:</span>
                        <div className="flex items-center gap-2 font-bold text-[#1A2226]">
                          <Phone size={14} className="text-[#1B4B66]" />
                          <span className="font-mono">{selectedReport.phone}</span>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <span className="text-[9px] font-bold text-[#5B6B72] uppercase font-mono block">Filing Timestamp:</span>
                        <div className="flex items-center gap-2 text-[#1A2226] font-mono font-medium">
                          <Clock size={14} className="text-[#1B4B66]" />
                          <span>{selectedReport.date}</span>
                        </div>
                      </div>

                      <div className="space-y-1">
                        {/* Empty spacing block or removed section */}
                      </div>
                    </div>

                    <div className="border-t border-gray-100 pt-3 grid grid-cols-2 gap-4 text-xs">
                      <div className="space-y-1">
                        <span className="text-[9px] font-bold text-[#5B6B72] uppercase font-mono block">Flood Severity Tier:</span>
                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 border ${
                          selectedReport.severity === 'critical'
                            ? 'bg-[#7F1D1D]/20 border-[#7F1D1D]/50 text-[#7F1D1D] font-black'
                            : selectedReport.severity === 'high' 
                              ? 'bg-[#B23B2E]/10 border-[#B23B2E]/30 text-[#B23B2E]' 
                              : selectedReport.severity === 'medium' 
                                ? 'bg-[#C97A2B]/10 border-[#C97A2B]/30 text-[#C97A2B]' 
                                : 'bg-[#2E7D5B]/10 border-[#2E7D5B]/30 text-[#2E7D5B]'
                        }`}>
                          {selectedReport.severity.toUpperCase()}
                        </span>
                      </div>

                      <div className="space-y-1">
                        <span className="text-[9px] font-bold text-[#5B6B72] uppercase font-mono block">Inundation Water Depth:</span>
                        <span className="font-mono text-xs text-[#1A2226] font-extrabold bg-[#F5F6F4] px-2 py-0.5 border border-[#E2E4E1]">
                          {selectedReport.waterLevelDepth || "Unknown"}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1.5 border-t border-gray-100 pt-3">
                      <span className="text-[9px] font-bold text-[#5B6B72] uppercase font-mono block">Exact Street / Landmark Address:</span>
                      <p className="text-xs font-bold text-[#1A2226] bg-[#F5F6F4]/50 p-2.5 border border-[#E2E4E1]">
                        {selectedReport.location}
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <span className="text-[9px] font-bold text-[#5B6B72] uppercase font-mono block">Filer Original Narrative Description:</span>
                      <blockquote className="text-xs text-[#1A2226] leading-relaxed italic border-l-4 border-[#1B4B66] pl-3 py-1 bg-[#F5F6F4]/20">
                        "{selectedReport.description}"
                      </blockquote>
                    </div>

                  </div>

                  {/* Administrative Resolution Audit Section */}
                  <div className="border border-[#E2E4E1] bg-white p-5 space-y-4">
                    <span className="text-[10px] font-black text-[#1A2226] uppercase tracking-wider block border-b pb-1">
                      Administrative Decision Actions
                    </span>

                    {/* Notes text input */}
                    <div className="space-y-1.5">
                      <label className="text-[10.5px] font-bold text-[#1A2226] flex items-center gap-1.5">
                        <FileText size={12} className="text-[#1B4B66]" />
                        <span>Resolution Log Notes:</span>
                        <span className="text-[#B23B2E] font-normal text-[10px]">(Required to Log as Resolved)</span>
                      </label>
                      <textarea
                        value={resolutionNotes}
                        onChange={(e) => {
                          setResolutionNotes(e.target.value);
                          if (e.target.value.trim()) {
                            setNotesError(null);
                          }
                        }}
                        placeholder="Log detailed containment notes (e.g., Regional pump grid initialized, bypass channel activated, highway underpass barriers secured.)"
                        className={`w-full text-xs border p-3 bg-gray-50/50 focus:outline-none focus:ring-1 focus:ring-[#1B4B66] min-h-[70px] ${
                          notesError ? 'border-[#B23B2E] focus:ring-[#B23B2E] bg-[#B23B2E]/5' : 'border-[#E2E4E1]'
                        }`}
                      />
                      {notesError && (
                        <p className="text-[10px] text-[#B23B2E] font-bold flex items-center gap-1">
                          <AlertCircle size={11} />
                          <span>{notesError}</span>
                        </p>
                      )}
                    </div>

                    {/* Action button panel */}
                    <div className="flex flex-wrap gap-2.5 pt-1.5">
                      
                      {/* VERIFY ACTIVE (Transitions Submitted -> Verified) */}
                      {selectedReport.status === 'pending' && (
                        <button
                          onClick={() => handleVerifyAction(selectedReport.id)}
                          className="px-4 py-2.5 bg-[#1B4B66] text-white hover:bg-[#153a4f] text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <CheckCircle2 size={14} />
                          <span>Verify Active Incident</span>
                        </button>
                      )}

                      {/* RESOLVE ACTION */}
                      {selectedReport.status !== 'resolved' ? (
                        <button
                          onClick={handleInitiateResolve}
                          className="px-4 py-2.5 bg-[#2E7D5B] text-white hover:bg-[#235f45] text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Check size={14} />
                          <span>Log Incident as Resolved</span>
                        </button>
                      ) : (
                        <div className="p-3 bg-[#2E7D5B]/10 border border-[#2E7D5B]/30 text-[#2E7D5B] text-xs font-black flex items-center gap-2 w-full">
                          <CheckCircle2 size={16} />
                          <span>INCIDENT REPORT DECLARED RECOVERED & SIGNED OFF</span>
                        </div>
                      )}

                      {/* DELETE ACTION */}
                      <button
                        onClick={() => handleInitiateDelete(selectedReport.id)}
                        className="px-4 py-2.5 border border-[#E2E4E1] hover:bg-red-50 text-[#5B6B72] hover:text-[#B23B2E] text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ml-auto"
                      >
                        <Trash2 size={14} />
                        <span>Archive File</span>
                      </button>

                    </div>

                    {/* Historic notes log output */}
                    {selectedReport.adminNotes && (
                      <div className="text-[10px] bg-slate-50 border-l-4 border-[#2E7D5B] p-2.5 text-[#5B6B72] mt-3 space-y-1">
                        <span className="font-bold text-[#1A2226] block uppercase tracking-wide text-[9px]">
                          Committed Administrative Resolution Note:
                        </span>
                        <p className="leading-relaxed">"{selectedReport.adminNotes}"</p>
                      </div>
                    )}

                  </div>

                </div>

              </div>

            </div>

            {/* Modal Footer */}
            <div className="bg-[#F5F6F4] p-3 flex justify-between items-center border-t border-[#E2E4E1] text-[10px] text-[#5B6B72] font-mono">
              <span>CALLBACK INTERFACES WIRED FOR LIVE DATABASE ATTACHMENTS</span>
              <button 
                onClick={handleCloseModal}
                className="px-4 py-1.5 border border-[#E2E4E1] bg-white hover:bg-gray-100 text-[#1A2226] font-bold text-xs uppercase cursor-pointer"
              >
                Close Audit
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ============================================================================
          NEW: MODAL - RESOLVE ACTION COMMIT CONFIRMATION DIALOG (SPECIFIED REQUIREMENT)
          ============================================================================ */}
      {showResolveConfirmation && selectedReport && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-xs z-[60] flex items-center justify-center p-4">
          <div className="bg-white border-2 border-[#2E7D5B] max-w-md w-full p-6 shadow-2xl relative" role="dialog" aria-modal="true" aria-label="Verify resolution commit">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 bg-[#2E7D5B]/10 flex items-center justify-center text-[#2E7D5B] shrink-0">
                <CheckCircle2 size={24} />
              </div>
              <div className="space-y-2 w-full">
                <h4 className="text-sm font-black text-[#1A2226] uppercase">
                  Verify Resolution Commit?
                </h4>
                
                <p className="text-xs text-[#5B6B72] leading-relaxed">
                  You are about to sign off on citizen file <strong className="font-mono text-[#1B4B66]">{selectedReport.id}</strong>. This status transition will recede flood-watch map overlays and archive the alert level.
                </p>

                <div className="bg-gray-50 border p-3 rounded-none text-[11px] text-gray-700 font-medium">
                  <span className="block font-bold text-[9px] text-gray-400 uppercase mb-1">Proposed Resolution Logs:</span>
                  "{resolutionNotes.trim()}"
                </div>

                <div className="flex gap-2 justify-end pt-2">
                  <button
                    onClick={() => setShowResolveConfirmation(false)}
                    className="px-3 py-2 border border-[#E2E4E1] hover:bg-gray-100 text-xs font-bold uppercase cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirmResolve}
                    className="px-4 py-2 bg-[#2E7D5B] text-white hover:bg-[#235f45] text-xs font-bold uppercase cursor-pointer"
                  >
                    Confirm & Resolve
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================================
          NEW: MODAL - DELETE/ARCHIVE REPORT CONFIRMATION DIALOG
          ============================================================================ */}
      {showDeleteConfirmation && targetDeleteReportId && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-xs z-[60] flex items-center justify-center p-4">
          <div className="bg-white border-2 border-[#B23B2E] max-w-md w-full p-6 shadow-2xl relative" role="dialog" aria-modal="true" aria-label="Confirm file archival and deletion">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 bg-[#B23B2E]/10 flex items-center justify-center text-[#B23B2E] shrink-0">
                <ShieldAlert size={24} />
              </div>
              <div className="space-y-2 w-full">
                <h4 className="text-sm font-black text-[#1A2226] uppercase">
                  Confirm File Archival & Deletion?
                </h4>
                
                <p className="text-xs text-[#5B6B72] leading-relaxed">
                  This action permanently archives citizen incident log <strong className="font-mono text-[#1B4B66]">{targetDeleteReportId}</strong> from the primary EOC dispatcher display console.
                </p>

                <div className="flex gap-2 justify-end pt-3">
                  <button
                    onClick={() => {
                      setShowDeleteConfirmation(false);
                      setTargetDeleteReportId(null);
                    }}
                    className="px-3 py-2 border border-[#E2E4E1] hover:bg-gray-100 text-xs font-bold uppercase cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirmDelete}
                    className="px-4 py-2 bg-[#B23B2E] text-white hover:bg-[#8f2f25] text-xs font-bold uppercase cursor-pointer"
                  >
                    Confirm Archive
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
