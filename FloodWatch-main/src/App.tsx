/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { FloodReport, User, Severity, ZoneRisk, Alert } from './types';
import { authService, toUserRole } from './services/auth';
import { reportService } from './services/reports';
import { gisService } from './services/gis';
import { usePolling } from './hooks/usePolling';

// Components
import LoginDashboard from './components/LoginDashboard';
import CitizenHome from './components/CitizenHome';
import ReportForm from './components/ReportForm';
import CitizenMyReports from './components/CitizenMyReports';
import FloodMap from './components/FloodMap';
import AdminOverview from './components/AdminOverview';
import AdminQueue from './components/AdminQueue';
import AdminForecast from './components/AdminForecast';
import AdminFunds from './components/AdminFunds';
import AdminPriority from './components/AdminPriority';
import AdminAnalytics from './components/AdminAnalytics';
import AdminAlerts from './components/AdminAlerts';
import AdminNotifications from './components/AdminNotifications';

// Refactored Components
import AdminSidebar, { AdminPage } from './components/AdminSidebar';
import CitizenHeader from './components/CitizenHeader';
import EocBroadcastDrawer from './components/EocBroadcastDrawer';
import NotificationCenter from './components/NotificationCenter';

// Services
import { alertService } from './services/alerts';
import { fundService } from './services/funds';

// Icons
import { 
  ShieldAlert, Menu, X, Megaphone, Download, AlertTriangle, ShieldCheck, LogOut
} from 'lucide-react';

export default function App() {
  // Auth State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Global States (synchronized with the backend via Services)
  const [reports, setReports] = useState<FloodReport[]>([]);
  const [zones, setZones] = useState<ZoneRisk[]>([]);

  // Load authoritative GIS zones from the backend on mount.
  useEffect(() => {
    gisService.loadZones().then(setZones).catch(() => undefined);
  }, []);

  // Treasury balance — single source of truth is the backend (/funds)
  const [fundBalance, setFundBalance] = useState<number | null>(null);

  // Load reports on mount
  useEffect(() => {
    reportService.getReports().then(setReports);
  }, []);

  // Load authoritative treasury balance from the backend on mount
  useEffect(() => {
    fundService.getAvailableFunds().then(setFundBalance).catch(() => setFundBalance(null));
  }, []);

  // Load broadcast alerts from the backend on mount
  useEffect(() => {
    alertService.getAlerts().then(setAlerts).catch(() => setAlerts([]));
  }, []);

  // Portal Roles: 'login' | 'citizen' | 'admin'
  const [portal, setPortal] = useState<'login' | 'citizen' | 'admin'>('login');

  // Real-time refresh: while logged in, periodically re-pull reports and
  // broadcast alerts so statuses and notices stay current without a reload.
  const pollLiveData = useCallback(() => {
    if (!currentUser || portal === 'login') return;
    reportService.getReports().then(fresh => {
      setReports(prev => (JSON.stringify(fresh) === JSON.stringify(prev) ? prev : fresh));
    }).catch(() => undefined);
    alertService.getAlerts().then(fresh => {
      setAlerts(prev => (JSON.stringify(fresh) === JSON.stringify(prev) ? prev : fresh));
    }).catch(() => undefined);
  }, [currentUser, portal]);
  usePolling(pollLiveData, 15000);

  // Check for existing session on mount
  useEffect(() => {
    authService.getCurrentUser().then(user => {
      setCurrentUser(user);
      setAuthLoading(false);
      if (user) {
        setPortal(toUserRole(user.role));
        // Load fresh reports from the backend
        reportService.getReports().then(freshReports => {
          setReports(freshReports);
        });
      }
    });
  }, []);

  // Subpages for Citizen Portal
  const [citizenPage, setCitizenPage] = useState<'home' | 'report' | 'my-reports' | 'map' | 'forecast'>('home');

  // Subpages for Admin Dashboard
  const [adminPage, setAdminPage] = useState<AdminPage>('overview');

  // Mobile navigation drawers
  const [adminMenuOpen, setAdminMenuOpen] = useState(false);
  const [broadcastDrawerOpen, setBroadcastDrawerOpen] = useState(false);
  const [citizenMenuOpen, setCitizenMenuOpen] = useState(false);

  // Broadcast alert state (synced with the backend via alertService)
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const broadcastAlerts = useMemo(() => alertService.toMessages(alerts), [alerts]);

  // Command input states
  const [newAlertText, setNewAlertText] = useState('');
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Compute dynamic flood risk level from reports
  const currentRiskLevel = useMemo(() => {
    const activeReports = reports.filter(r => r.status !== 'resolved');
    if (activeReports.some(r => r.severity === 'critical')) return 'CRITICAL';
    if (activeReports.some(r => r.severity === 'high')) return 'HIGH';
    if (activeReports.some(r => r.severity === 'medium')) return 'MODERATE';
    return 'LOW';
  }, [reports]);

  const riskBadgeColor = {
    CRITICAL: 'bg-[#7F1D1D] animate-pulse',
    HIGH: 'bg-[#B23B2E]',
    MODERATE: 'bg-[#C97A2B]',
    LOW: 'bg-[#2E7D5B]'
  }[currentRiskLevel];

  // Citizen page loading state simulation
  const [citizenLoading, setCitizenLoading] = useState(false);
  useEffect(() => {
    if (portal === 'citizen') {
      setCitizenLoading(true);
      const timer = setTimeout(() => setCitizenLoading(false), 300);
      return () => clearTimeout(timer);
    }
  }, [citizenPage, portal]);

  const renderCitizenSkeleton = () => (
    <div className="space-y-6 animate-pulse" aria-hidden="true" id="citizen-skeleton-loader">
      <div className="bg-white border border-[#E2E4E1] p-6 space-y-4">
        <div className="h-4 bg-gray-200 rounded w-1/4"></div>
        <div className="space-y-2">
          <div className="h-3 bg-gray-200 rounded w-full"></div>
          <div className="h-3 bg-gray-200 rounded w-5/6"></div>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-white border border-[#E2E4E1] p-6 h-36 flex flex-col justify-between">
            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          </div>
        ))}
      </div>
      <div className="bg-white border border-[#E2E4E1] p-6 h-64 space-y-4">
        <div className="h-4 bg-gray-200 rounded w-1/3"></div>
        <div className="h-32 bg-gray-100 rounded"></div>
      </div>
    </div>
  );

  // Toast notifier helper
  const triggerToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => {
      setSuccessToast(null);
    }, 4000);
  };

  // Handler: citizen logs a new flood hazard report
  const handleAddReport = async (
    newReportData: Omit<FloodReport, 'id' | 'date' | 'status'>,
    photoFile?: File | null
  ): Promise<string | undefined> => {
    const now = new Date();

    let created: FloodReport;
    try {
      created = await reportService.createReport(newReportData);
    } catch (err) {
      triggerToast(err instanceof Error ? err.message : "Failed to submit report.");
      return;
    }

    // Upload photographic evidence (if any) to the backend for this report.
    let finalCreated = created;
    if (photoFile) {
      try {
        const imageUrl = await reportService.uploadImage(created.id, photoFile);
        if (imageUrl) {
          finalCreated = {
            ...created,
            photoUrl: imageUrl,
          };
        }
      } catch (err) {
        triggerToast(err instanceof Error ? err.message : "Photo could not be attached; report was submitted.");
      }
    }

    // Update state
    setReports(prev => [finalCreated, ...prev]);

    // Update active zones count dynamically
    const updatedZones = zones.map(z => {
      const match = newReportData.location.toLowerCase().includes(z.name.split(':')[0].toLowerCase());
      if (match) {
        return { 
          ...z, 
          activeReportsCount: z.activeReportsCount + 1,
          lastUpdated: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
        };
      }
      return z;
    });
    setZones(updatedZones);

    triggerToast("Emergency Report submitted successfully. Verifications initiated.");
    return finalCreated.id;
  };

  // Handler: dispatcher verifies report
  const handleVerifyReport = async (id: string) => {
    let updated: FloodReport | null;
    try {
      updated = await reportService.verifyReport(id);
    } catch (err) {
      triggerToast(err instanceof Error ? err.message : "Failed to verify report.");
      return;
    }
    if (!updated) {
      triggerToast("Failed to verify report.");
      return;
    }

    setReports(prev => prev.map(r => r.id === id ? updated : r));

    triggerToast(`Report ${id} status elevated to VERIFIED active.`);
  };

  // Handler: dispatcher resolves report
  const handleResolveReport = async (id: string, notes: string) => {
    let updated: FloodReport | null;
    try {
      updated = await reportService.resolveReport(id, notes);
    } catch (err) {
      triggerToast(err instanceof Error ? err.message : "Failed to resolve report.");
      return;
    }
    if (!updated) {
      triggerToast("Failed to resolve report.");
      return;
    }

    setReports(prev => prev.map(r => r.id === id ? updated : r));

    // Decrease active report counts on matching zones
    if (updated.location) {
      const updatedZones = zones.map(z => {
        if (updated.location.toLowerCase().includes(z.name.split(':')[0].toLowerCase())) {
          return { ...z, activeReportsCount: Math.max(0, z.activeReportsCount - 1) };
        }
        return z;
      });
      setZones(updatedZones);
    }

    triggerToast(`Report ${id} successfully resolved & archived.`);
  };

  // Handler: dispatcher deletes/archives report
  const handleDeleteReport = async (id: string) => {
    const reportToDelete = reports.find(r => r.id === id);

    let ok: boolean;
    try {
      ok = await reportService.deleteReport(id);
    } catch (err) {
      triggerToast(err instanceof Error ? err.message : "Failed to delete report.");
      return;
    }
    if (!ok) {
      triggerToast("Failed to delete report.");
      return;
    }

    setReports(prev => prev.filter(r => r.id !== id));

    if (reportToDelete && reportToDelete.status !== 'resolved') {
      const updatedZones = zones.map(z => {
        if (reportToDelete.location.toLowerCase().includes(z.name.split(':')[0].toLowerCase())) {
          return { ...z, activeReportsCount: Math.max(0, z.activeReportsCount - 1) };
        }
        return z;
      });
      setZones(updatedZones);
    }

    triggerToast(`Report ${id} discarded from active database.`);
  };

  // Handler: allocate emergency funds
  const handleSubtractFunds = (amount: number, newBalance?: number) => {
    // The backend (/funds/allocate) is the source of truth. Use the authoritative
    // remaining balance returned by the backend, otherwise refresh it.
    if (typeof newBalance === 'number') {
      setFundBalance(newBalance);
    } else {
      fundService.getAvailableFunds().then(setFundBalance).catch(() => undefined);
    }
  };

  // Handler: Export reports database as clean formatted JSON file
  const handleExportAuditLog = () => {
    try {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(reports, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `floodwatch_incident_audit_${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      
      triggerToast("System audit logs exported as JSON file.");
    } catch (err) {
      triggerToast("Failed to initiate audit log export.");
    }
  };

  // Send broadcast alert notice
  const handleSendBroadcastAlert = async () => {
    if (newAlertText.trim()) {
      try {
        const created = await alertService.createAlert(newAlertText.trim());
        setAlerts(prev => [created, ...prev]);
        setNewAlertText('');
        triggerToast("Civic alert broadcast live on citizen home screen.");
      } catch (err) {
        triggerToast(err instanceof Error ? err.message : "Failed to broadcast alert.");
      }
    } else {
      triggerToast("Please input custom alert text.");
    }
  };

  // Remove broadcast alert notice
  const handleRemoveBroadcastAlert = async (index: number) => {
    const target = alerts[index];
    if (!target) return;
    try {
      await alertService.deleteAlert(target.id);
      setAlerts(prev => prev.filter(a => a.id !== target.id));
      triggerToast("Broadcast alert notice recalled.");
    } catch (err) {
      triggerToast(err instanceof Error ? err.message : "Failed to recall alert.");
    }
  };

  // Handler: user logs out
  const handleLogout = useCallback(async () => {
    await authService.logout();
    setCurrentUser(null);
    setPortal('login');
    triggerToast("Logged out successfully.");
  }, [triggerToast]);

  if (portal === 'login') {
    return (
      <div className="min-h-screen bg-[#112b3c] flex flex-col justify-center items-center font-sans select-none text-white relative w-full overflow-y-auto" id="floodwatch-app-root">
        {authLoading ? (
          <div className="text-white/80 text-xs font-mono tracking-wider uppercase animate-pulse">
            Initializing system...
          </div>
        ) : (
          <LoginDashboard 
            onLogin={async (role: 'citizen' | 'admin') => {
              // Demo login: the selected role (Citizen or Admin) determines
              // which portal opens. The demo session was persisted locally by
              // LoginDashboard, so reload it here as the source of truth.
              const user = await authService.getCurrentUser();
              setCurrentUser(user);
              setPortal(toUserRole(role));
              const freshReports = await reportService.getReports();
              setReports(freshReports);
            }} 
            currentUser={currentUser}
            triggerToast={triggerToast} 
          />
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F6F4] flex flex-col font-sans select-none text-[#1A2226]" id="floodwatch-app-root">
      
      {/* 1. Official Government Header Top Banner Ribbons */}
      <div className="bg-[#1A2226] text-white text-[11px] py-1.5 px-4 sm:px-6 flex items-center justify-between border-b border-white/10 font-sans tracking-wide shrink-0" role="banner">
        <div className="flex items-center gap-1.5">
          <span className="inline-block bg-[#B23B2E] w-3.5 h-2.5 relative border border-white/20" aria-hidden="true"></span>
          <span>OFFICIAL CIVIC RESPONSE PORTAL</span>
        </div>
        <div className="hidden md:flex items-center gap-4 text-white/80">
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-[#2E7D5B] rounded-full"></span>
            System Online
          </span>
          <span>Support: <span className="font-mono">1-800-CIVIC-HQ</span></span>
        </div>
      </div>

      {/* 2. Primary Navigation Bar */}
      <header className="bg-white border-b border-[#E2E4E1] sticky top-0 z-[2000] shrink-0 shadow-sm" role="navigation" aria-label="Primary navigation">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 md:h-16 flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-4">
          
          <div className="flex items-center justify-between w-full md:w-auto">
            {/* Logo & Civic Crest */}
            <div className="flex items-center gap-2.5 shrink-0">
              <div className="bg-[#1B4B66] text-white p-2 flex items-center justify-center rounded-none shadow-sm md:p-2.5">
                <ShieldAlert size={16} className="md:size-[18px]" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-base md:text-lg text-[#1A2226] tracking-tight uppercase">FloodWatch</span>
                  <span className={`text-[8px] md:text-[9px] font-mono text-white px-1.5 py-0.5 uppercase font-bold tracking-wider ${riskBadgeColor}`} aria-label={`Current threat level: ${currentRiskLevel}`}>LEVEL {currentRiskLevel}</span>
                </div>
                <span className="text-[10px] md:text-[11px] text-[#5B6B72] block uppercase tracking-widest font-semibold leading-none mt-0.5">Municipal Coordination Authority</span>
              </div>
            </div>

            {/* Mobile Controls (Notification + Logout) */}
            <div className="flex md:hidden items-center gap-2">
              {portal === 'admin' && (
                <button
                  onClick={() => setBroadcastDrawerOpen(true)}
                  className="p-1.5 border border-[#E2E4E1] hover:bg-[#F5F6F4] text-[#1B4B66] flex items-center justify-center cursor-pointer"
                  title="Alert Broadcaster"
                >
                  <Megaphone size={14} />
                </button>
              )}
              {portal === 'citizen' ? (
                <div className="flex items-center gap-1.5 relative">
                  <NotificationCenter triggerToast={triggerToast} />
                  <button
                    onClick={() => setCitizenMenuOpen(!citizenMenuOpen)}
                    className="p-1.5 border border-[#E2E4E1] hover:bg-[#F5F6F4] text-[#1B4B66] flex items-center justify-center cursor-pointer"
                    title="Menu"
                    aria-expanded={citizenMenuOpen}
                  >
                    <Menu size={14} />
                  </button>
                  {citizenMenuOpen && (
                    <div className="absolute right-0 top-9 w-32 bg-white border border-[#E2E4E1] shadow-xl z-[3000] py-1 text-xs">
                      <button
                        onClick={() => {
                          setCitizenMenuOpen(false);
                          handleLogout();
                        }}
                        className="w-full text-left px-4 py-2.5 hover:bg-red-50 text-[#B23B2E] font-bold uppercase tracking-wider flex items-center gap-1.5"
                      >
                        <LogOut size={12} className="text-[#B23B2E]" />
                        <span>Logout</span>
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <NotificationCenter triggerToast={triggerToast} />
                  <button
                    onClick={handleLogout}
                    title="Logout"
                    className="p-1.5 border border-[#B23B2E]/30 text-[#B23B2E] bg-white hover:bg-red-50 flex items-center justify-center cursor-pointer"
                  >
                    <LogOut size={14} />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Desktop Navigation / Headers */}
          <div className="hidden md:flex flex-1 items-center justify-end gap-4">
            {portal === 'citizen' && (
              <CitizenHeader 
                citizenPage={citizenPage} 
                setCitizenPage={setCitizenPage} 
                onLogout={handleLogout} 
                triggerToast={triggerToast}
              />
            )}

            {portal === 'admin' && (
              <div className="flex items-center gap-2">
                <NotificationCenter triggerToast={triggerToast} />
                <button
                  onClick={handleLogout}
                  id="portal-toggle-btn"
                  className="bg-white hover:bg-red-50 border border-[#B23B2E]/30 text-[#B23B2E] font-bold text-xs px-3.5 py-2.5 flex items-center gap-2 transition-colors duration-150 uppercase tracking-wider rounded-none cursor-pointer"
                >
                  <LogOut size={13} className="text-[#B23B2E]" />
                  <span>Logout</span>
                </button>
              </div>
            )}
          </div>

        </div>
      </header>

      {/* 3. Main Workspace Layout */}
      <div className="flex-1 flex flex-col md:flex-row max-w-7xl w-full mx-auto p-4 sm:p-6 gap-6 relative pb-20 md:pb-6">
        
        {/* ================= ADMIN PERSISTENT LEFT SIDEBAR ================= */}
        {portal === 'admin' && (
          <div className="hidden md:block">
            <AdminSidebar 
              adminPage={adminPage}
              setAdminPage={setAdminPage}
              adminMenuOpen={adminMenuOpen}
              setAdminMenuOpen={setAdminMenuOpen}
              pendingReportsCount={reports.filter(r => r.status === 'pending').length}
            />
          </div>
        )}

        {/* ================= PRIMARY DISPLAY ROUTER AREA ================= */}
        <main className="flex-1 min-w-0">
          {portal === 'citizen' ? (
            /* CITIZEN PORTAL COMPONENT RENDERING */
            citizenLoading ? renderCitizenSkeleton() : (
              <div className="space-y-6">
                {citizenPage === 'home' && (
                  <CitizenHome 
                    reports={reports} 
                    onNavigateToReport={() => setCitizenPage('report')} 
                    onNavigateToMap={() => setCitizenPage('map')} 
                    broadcastAlerts={broadcastAlerts}
                  />
                )}

                {citizenPage === 'report' && (
                  <ReportForm 
                    onSubmitReport={handleAddReport} 
                    onNavigateToMyReports={() => setCitizenPage('my-reports')} 
                  />
                )}

                {citizenPage === 'my-reports' && (
                  <CitizenMyReports reports={reports} />
                )}

                {citizenPage === 'map' && (
                  <FloodMap reports={reports} />
                )}

                {citizenPage === 'forecast' && (
                  <AdminForecast isAdmin={false} />
                )}
              </div>
            )
          ) : (
            /* ADMIN COMMAND DASHBOARD RENDERING */
            <div className="space-y-6">
              {adminPage === 'overview' && (
                <AdminOverview 
                  fundBalance={fundBalance}
                  reports={reports} 
                  zones={zones} 
                  onNavigateToQueue={() => setAdminPage('queue')}
                  onNavigateToMap={() => setAdminPage('map')}
                  onNavigateToForecast={() => setAdminPage('forecast')}
                  onNavigateToPriority={() => setAdminPage('priority')}
                  onNavigateToFunds={() => setAdminPage('funds')}
                  onNavigateToAnalytics={() => setAdminPage('analytics')}
                  onNavigateToAlerts={() => setAdminPage('alerts')}
                />
              )}

              {adminPage === 'queue' && (
                <AdminQueue 
                  reports={reports} 
                  onVerifyReport={handleVerifyReport} 
                  onResolveReport={handleResolveReport} 
                  onDeleteReport={handleDeleteReport} 
                />
              )}

              {adminPage === 'map' && (
                <FloodMap reports={reports} adminMode={true} zones={zones} />
              )}

              {adminPage === 'forecast' && (
                <AdminForecast />
              )}

              {adminPage === 'funds' && (
                <AdminFunds 
                  zones={zones} 
                  availableFunds={fundBalance ?? 0} 
                  onAllocate={handleSubtractFunds} 
                  triggerToast={triggerToast} 
                />
              )}

              {adminPage === 'priority' && (
                <AdminPriority />
              )}

              {adminPage === 'analytics' && (
                <AdminAnalytics />
              )}

              {adminPage === 'alerts' && (
                <AdminAlerts zones={zones.map(z => z.name)} />
              )}

              {adminPage === 'notifications' && (
                <AdminNotifications />
              )}
            </div>
          )}
        </main>

        {/* ================= ADMIN ALERT BROADCAST SIDEBAR / DRAWER ================= */}
        {portal === 'admin' && (
          <EocBroadcastDrawer 
            isOpen={broadcastDrawerOpen}
            onClose={() => setBroadcastDrawerOpen(false)}
            broadcastAlerts={broadcastAlerts}
            newAlertText={newAlertText}
            setNewAlertText={setNewAlertText}
            onSendAlert={handleSendBroadcastAlert}
            onRemoveAlert={handleRemoveBroadcastAlert}
            onExport={handleExportAuditLog}
          />
        )}

      </div>

      {/* 4. Citizen MOBILE BOTTOM TAB BAR */}
      {portal === 'citizen' && (
        <nav className="md:hidden border-t border-[#E2E4E1] bg-white fixed bottom-0 left-0 right-0 z-30 flex justify-around py-2.5 shrink-0 shadow-md">
          <button
            onClick={() => setCitizenPage('home')}
            className={`flex flex-col items-center gap-0.5 text-[9px] font-bold uppercase tracking-wider cursor-pointer ${
              citizenPage === 'home' ? 'text-[#1B4B66]' : 'text-[#5B6B72]'
            }`}
          >
            <span className="p-0.5"><svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg></span>
            <span>Home</span>
          </button>
          <button
            onClick={() => setCitizenPage('report')}
            className={`flex flex-col items-center gap-0.5 text-[9px] font-bold uppercase tracking-wider cursor-pointer ${
              citizenPage === 'report' ? 'text-[#1B4B66]' : 'text-[#5B6B72]'
            }`}
          >
            <span className="p-0.5"><svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"/></svg></span>
            <span>Report</span>
          </button>
          <button
            onClick={() => setCitizenPage('map')}
            className={`flex flex-col items-center gap-0.5 text-[9px] font-bold uppercase tracking-wider cursor-pointer ${
              citizenPage === 'map' ? 'text-[#1B4B66]' : 'text-[#5B6B72]'
            }`}
          >
            <span className="p-0.5"><svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"/></svg></span>
            <span>Map</span>
          </button>
          <button
            onClick={() => setCitizenPage('my-reports')}
            className={`flex flex-col items-center gap-0.5 text-[9px] font-bold uppercase tracking-wider cursor-pointer ${
              citizenPage === 'my-reports' ? 'text-[#1B4B66]' : 'text-[#5B6B72]'
            }`}
          >
            <span className="p-0.5"><svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg></span>
            <span>My Reports</span>
          </button>
          <button
            onClick={() => setCitizenPage('forecast')}
            className={`flex flex-col items-center gap-0.5 text-[9px] font-bold uppercase tracking-wider cursor-pointer ${
              citizenPage === 'forecast' ? 'text-[#1B4B66]' : 'text-[#5B6B72]'
            }`}
          >
            <span className="p-0.5"><svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/></svg></span>
            <span>Forecast</span>
          </button>
        </nav>
      )}

      {/* Admin MOBILE BOTTOM TAB BAR */}
      {portal === 'admin' && (
        <nav className="md:hidden border-t border-[#E2E4E1] bg-white fixed bottom-0 left-0 right-0 z-30 flex justify-around py-2.5 shrink-0 shadow-md">
          <button
            onClick={() => setAdminPage('overview')}
            className={`flex flex-col items-center gap-0.5 text-[9px] font-bold uppercase tracking-wider cursor-pointer ${
              adminPage === 'overview' ? 'text-[#1B4B66]' : 'text-[#5B6B72]'
            }`}
          >
            <span className="p-0.5"><svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/></svg></span>
            <span>Command</span>
          </button>
          <button
            onClick={() => setAdminPage('queue')}
            className={`flex flex-col items-center gap-0.5 text-[9px] font-bold uppercase tracking-wider cursor-pointer ${
              adminPage === 'queue' ? 'text-[#1B4B66]' : 'text-[#5B6B72]'
            }`}
          >
            <span className="p-0.5"><svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/></svg></span>
            <span>Reports</span>
          </button>
          <button
            onClick={() => setAdminPage('map')}
            className={`flex flex-col items-center gap-0.5 text-[9px] font-bold uppercase tracking-wider cursor-pointer ${
              adminPage === 'map' ? 'text-[#1B4B66]' : 'text-[#5B6B72]'
            }`}
          >
            <span className="p-0.5"><svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"/></svg></span>
            <span>Map</span>
          </button>
          <button
            onClick={() => setAdminPage('alerts')}
            className={`flex flex-col items-center gap-0.5 text-[9px] font-bold uppercase tracking-wider cursor-pointer ${
              adminPage === 'alerts' ? 'text-[#1B4B66]' : 'text-[#5B6B72]'
            }`}
          >
            <span className="p-0.5"><svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z"/></svg></span>
            <span>Alerts</span>
          </button>
          <button
            onClick={() => setAdminMenuOpen(!adminMenuOpen)}
            aria-expanded={adminMenuOpen}
            className={`flex flex-col items-center gap-0.5 text-[9px] font-bold uppercase tracking-wider cursor-pointer ${
              adminMenuOpen || ['forecast', 'funds', 'priority', 'analytics', 'notifications'].includes(adminPage) ? 'text-[#1B4B66]' : 'text-[#5B6B72]'
            }`}
          >
            <span className="p-0.5"><svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16"/></svg></span>
            <span>More</span>
          </button>
        </nav>
      )}

      {/* 5. Live Notifications Success Toast */}
      {successToast && (
        <div className="fixed bottom-6 right-6 bg-[#1A2226] text-white py-3 px-5 border border-white/10 z-50 shadow-xl flex items-center gap-2.5 max-w-sm text-xs font-medium tracking-wide">
          <span className="w-1.5 h-1.5 bg-[#2E7D5B] rounded-full animate-ping shrink-0"></span>
          <span>{successToast}</span>
        </div>
      )}

      {/* 6. Footer */}
      <footer className="bg-[#1A2226] text-white/50 border-t border-white/10 py-6 mt-12 text-xs shrink-0 font-sans">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="space-y-1 text-center md:text-left">
            <div className="font-bold text-white tracking-wide uppercase text-[10px]">FloodWatch — Civil Engineering Protection Service</div>
            <div className="text-[10px]">© 2026 Municipal Coordination Authority.</div>
          </div>
          <div className="flex flex-wrap gap-4 text-[10px] uppercase tracking-wider">
            <span className="hover:text-white cursor-pointer transition-colors">Privacy Policy</span>
            <span className="hover:text-white cursor-pointer transition-colors">Accessibility Code</span>
            <span className="hover:text-white cursor-pointer transition-colors">API Endpoint Access</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
