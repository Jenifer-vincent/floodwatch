import React from 'react';
import { Home, PlusCircle, History, Map as MapIcon, TrendingUp, LogOut, ShieldAlert } from 'lucide-react';
import NotificationCenter from './NotificationCenter';

interface CitizenHeaderProps {
  citizenPage: 'home' | 'report' | 'my-reports' | 'map' | 'forecast';
  setCitizenPage: (page: 'home' | 'report' | 'my-reports' | 'map' | 'forecast') => void;
  onLogout: () => void;
  triggerToast: (msg: string) => void;
}

export default function CitizenHeader({
  citizenPage,
  setCitizenPage,
  onLogout,
  triggerToast
}: CitizenHeaderProps) {
  return (
    <div className="flex-1 flex flex-col md:flex-row md:items-center justify-between gap-4">
      {/* Citizen DESKTOP Nav Links */}
      <nav className="hidden md:flex items-center gap-1.5 h-full">
        {[
          { key: 'home', label: 'Home', icon: Home },
          { key: 'report', label: 'Report', icon: PlusCircle },
          { key: 'map', label: 'Map', icon: MapIcon },
          { key: 'my-reports', label: 'My Reports', icon: History },
          { key: 'forecast', label: 'Forecast', icon: TrendingUp }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = citizenPage === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setCitizenPage(tab.key as any)}
              className={`px-3.5 py-1.5 text-xs font-bold transition-all uppercase tracking-wider flex items-center gap-1.5 cursor-pointer ${
                isActive 
                  ? 'text-[#1B4B66] border-b-2 border-[#1B4B66]' 
                  : 'text-[#5B6B72] hover:text-[#1A2226]'
              }`}
            >
              <Icon size={12} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Right control buttons */}
      <div className="flex items-center justify-between md:justify-end gap-3 w-full md:w-auto">
        {/* Dynamic Notification Bell Center */}
        <NotificationCenter triggerToast={triggerToast} />

        {/* Logout Button */}
        <button
          onClick={onLogout}
          id="portal-toggle-btn"
          className="bg-white hover:bg-red-50 border border-[#B23B2E]/30 text-[#B23B2E] font-bold text-xs px-3.5 py-2.5 flex items-center gap-2 transition-colors duration-150 uppercase tracking-wider rounded-none cursor-pointer"
        >
          <LogOut size={13} className="text-[#B23B2E]" />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
}
