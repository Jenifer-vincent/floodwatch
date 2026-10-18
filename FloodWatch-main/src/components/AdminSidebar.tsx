import React from 'react';
import { LayoutDashboard, ListTodo, Map as MapIcon, TrendingUp, Landmark, Sliders, Building, BarChart3, Megaphone, Bell, X } from 'lucide-react';

export type AdminPage = 'overview' | 'queue' | 'map' | 'forecast' | 'funds' | 'priority' | 'analytics' | 'alerts' | 'notifications';

interface AdminSidebarProps {
  adminPage: AdminPage;
  setAdminPage: (page: AdminPage) => void;
  adminMenuOpen: boolean;
  setAdminMenuOpen: (open: boolean) => void;
  pendingReportsCount: number;
}

export default function AdminSidebar({
  adminPage,
  setAdminPage,
  adminMenuOpen,
  setAdminMenuOpen,
  pendingReportsCount
}: AdminSidebarProps) {
  return (
    <aside className={`
      md:block md:w-64 shrink-0 
      ${adminMenuOpen ? 'block absolute left-4 right-4 top-4 z-40 bg-white border border-[#E2E4E1] p-4 shadow-lg md:relative md:p-0 md:border-0 md:shadow-none' : 'hidden'}
    `} id="admin-sidebar">
      <div className="space-y-4 md:sticky md:top-24">
        <div className="bg-[#1A2226] text-white p-4 rounded-none relative">
          <div className="flex items-center gap-1.5 text-[9px] font-mono font-bold text-[#C97A2B] uppercase tracking-widest">
            <Building size={12} />
            <span>Operations Dashboard</span>
          </div>
          <h3 className="text-sm font-extrabold mt-1 uppercase tracking-tight">Admin Panel</h3>
          <span className="text-[10px] text-white/60 block mt-0.5 font-medium">EOC Dispatcher Access</span>
          {adminMenuOpen && (
            <button
              onClick={() => setAdminMenuOpen(false)}
              className="absolute top-3 right-3 p-1.5 bg-white/10 hover:bg-white/20 text-white text-xs cursor-pointer border border-white/20"
              title="Close menu"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <nav className="flex flex-col gap-1.5">
          <span className="text-[10px] font-bold text-[#5B6B72] uppercase tracking-widest px-3 pb-1.5 border-b border-[#E2E4E1]">
            Navigation
          </span>
          
          <button
            onClick={() => {
              setAdminPage('overview');
              setAdminMenuOpen(false);
            }}
            id="nav-admin-overview"
            className={`flex items-center gap-2.5 px-3 py-2.5 text-xs font-bold text-left transition-colors uppercase tracking-wider cursor-pointer ${
              adminPage === 'overview' 
                ? 'bg-[#1B4B66]/10 text-[#1B4B66] border-l-4 border-[#1B4B66]' 
                : 'text-[#5B6B72] hover:bg-[#F5F6F4] hover:text-[#1A2226]'
            }`}
          >
            <LayoutDashboard size={14} />
            Overview
          </button>

          <button
            onClick={() => {
              setAdminPage('queue');
              setAdminMenuOpen(false);
            }}
            id="nav-admin-queue"
            className={`flex items-center gap-2.5 px-3 py-2.5 text-xs font-bold text-left justify-between transition-colors uppercase tracking-wider cursor-pointer ${
              adminPage === 'queue' 
                ? 'bg-[#1B4B66]/10 text-[#1B4B66] border-l-4 border-[#1B4B66]' 
                : 'text-[#5B6B72] hover:bg-[#F5F6F4] hover:text-[#1A2226]'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <ListTodo size={14} />
              <span>Reports</span>
            </div>
            {pendingReportsCount > 0 && (
              <span className="font-mono text-[9px] font-bold px-2 py-0.5 bg-[#B23B2E] text-white">
                {pendingReportsCount}
              </span>
            )}
          </button>

          <button
            onClick={() => {
              setAdminPage('map');
              setAdminMenuOpen(false);
            }}
            id="nav-admin-map"
            className={`flex items-center gap-2.5 px-3 py-2.5 text-xs font-bold text-left transition-colors uppercase tracking-wider cursor-pointer ${
              adminPage === 'map' 
                ? 'bg-[#1B4B66]/10 text-[#1B4B66] border-l-4 border-[#1B4B66]' 
                : 'text-[#5B6B72] hover:bg-[#F5F6F4] hover:text-[#1A2226]'
            }`}
          >
            <MapIcon size={14} />
            Map & Zones
          </button>

          <button
            onClick={() => {
              setAdminPage('forecast');
              setAdminMenuOpen(false);
            }}
            id="nav-admin-forecast"
            className={`flex items-center gap-2.5 px-3 py-2.5 text-xs font-bold text-left transition-colors uppercase tracking-wider cursor-pointer ${
              adminPage === 'forecast' 
                ? 'bg-[#1B4B66]/10 text-[#1B4B66] border-l-4 border-[#1B4B66]' 
                : 'text-[#5B6B72] hover:bg-[#F5F6F4] hover:text-[#1A2226]'
            }`}
          >
            <TrendingUp size={14} />
            Forecast
          </button>

          <button
            onClick={() => {
              setAdminPage('funds');
              setAdminMenuOpen(false);
            }}
            id="nav-admin-funds"
            className={`flex items-center gap-2.5 px-3 py-2.5 text-xs font-bold text-left transition-colors uppercase tracking-wider cursor-pointer ${
              adminPage === 'funds' 
                ? 'bg-[#1B4B66]/10 text-[#1B4B66] border-l-4 border-[#1B4B66]' 
                : 'text-[#5B6B72] hover:bg-[#F5F6F4] hover:text-[#1A2226]'
            }`}
          >
            <Landmark size={14} />
            Funds
          </button>

          <button
            onClick={() => {
              setAdminPage('priority');
              setAdminMenuOpen(false);
            }}
            id="nav-admin-priority"
            className={`flex items-center gap-2.5 px-3 py-2.5 text-xs font-bold text-left transition-colors uppercase tracking-wider cursor-pointer ${
              adminPage === 'priority' 
                ? 'bg-[#1B4B66]/10 text-[#1B4B66] border-l-4 border-[#1B4B66]' 
                : 'text-[#5B6B72] hover:bg-[#F5F6F4] hover:text-[#1A2226]'
            }`}
          >
            <Sliders size={14} />
            Priority Analysis
          </button>

          <button
            onClick={() => {
              setAdminPage('analytics');
              setAdminMenuOpen(false);
            }}
            id="nav-admin-analytics"
            className={`flex items-center gap-2.5 px-3 py-2.5 text-xs font-bold text-left transition-colors uppercase tracking-wider cursor-pointer ${
              adminPage === 'analytics' 
                ? 'bg-[#1B4B66]/10 text-[#1B4B66] border-l-4 border-[#1B4B66]' 
                : 'text-[#5B6B72] hover:bg-[#F5F6F4] hover:text-[#1A2226]'
            }`}
          >
            <BarChart3 size={14} />
            Analytics
          </button>

          <button
            onClick={() => {
              setAdminPage('alerts');
              setAdminMenuOpen(false);
            }}
            id="nav-admin-alerts"
            className={`flex items-center gap-2.5 px-3 py-2.5 text-xs font-bold text-left transition-colors uppercase tracking-wider cursor-pointer ${
              adminPage === 'alerts' 
                ? 'bg-[#1B4B66]/10 text-[#1B4B66] border-l-4 border-[#1B4B66]' 
                : 'text-[#5B6B72] hover:bg-[#F5F6F4] hover:text-[#1A2226]'
            }`}
          >
            <Megaphone size={14} />
            Alerts
          </button>

          <button
            onClick={() => {
              setAdminPage('notifications');
              setAdminMenuOpen(false);
            }}
            id="nav-admin-notifications"
            className={`flex items-center gap-2.5 px-3 py-2.5 text-xs font-bold text-left transition-colors uppercase tracking-wider cursor-pointer ${
              adminPage === 'notifications' 
                ? 'bg-[#1B4B66]/10 text-[#1B4B66] border-l-4 border-[#1B4B66]' 
                : 'text-[#5B6B72] hover:bg-[#F5F6F4] hover:text-[#1A2226]'
            }`}
          >
            <Bell size={14} />
            Notifications
          </button>
        </nav>

        {/* System status widget at bottom of sidebar */}
        <div className="p-3 bg-[#F5F6F4] border border-[#E2E4E1] text-[10px] text-[#5B6B72] space-y-1.5 leading-normal">
          <span className="font-bold text-[#1A2226] block uppercase tracking-wider">Operational Dispatch</span>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#2E7D5B] animate-pulse"></div>
            <span className="font-semibold text-[#2E7D5B]">ALL SENSORS ONLINE</span>
          </div>
          <div className="space-y-0.5 text-[9px] mt-2 text-[#5B6B72]">
            <div>• CH-1: Drainage & Sluice</div>
            <div>• CH-2: Barricades & Detours</div>
            <div>• CH-3: Sandbag Logistics</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
