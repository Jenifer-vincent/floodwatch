import React, { useEffect } from 'react';
import { Megaphone, Download, X } from 'lucide-react';

interface EocBroadcastDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  broadcastAlerts: string[];
  newAlertText: string;
  setNewAlertText: (text: string) => void;
  onSendAlert: () => void;
  onRemoveAlert: (index: number) => void;
  onExport: () => void;
}

export default function EocBroadcastDrawer({
  isOpen,
  onClose,
  broadcastAlerts,
  newAlertText,
  setNewAlertText,
  onSendAlert,
  onRemoveAlert,
  onExport
}: EocBroadcastDrawerProps) {
  // Close the drawer with the Escape key for keyboard accessibility
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  const drawerContent = (
    <div className="flex flex-col h-full bg-white w-full lg:w-80 text-xs">
      {/* Drawer Header */}
      <div className="p-4 border-b border-[#E2E4E1] bg-[#F5F6F4] flex items-center justify-between">
        <div>
          <h2 className="font-bold text-xs uppercase text-[#1B4B66] tracking-wider">EOC Alert Controls</h2>
          <p className="text-[10px] text-[#5B6B72]">Emergency operations broadcast manager</p>
        </div>
        <button 
          onClick={onClose}
          className="lg:hidden p-2 hover:bg-gray-200 text-[#5B6B72] cursor-pointer"
          title="Close drawer"
          aria-label="Close drawer"
        >
          <X size={18} />
        </button>
      </div>

      <div className="flex-1 p-5 flex flex-col justify-start space-y-5 overflow-y-auto">
        {/* EOC Action Controls box */}
        <div className="bg-[#1B4B66]/5 p-4 border border-[#E2E4E1] space-y-3 leading-normal">
          <div>
            <h4 className="text-[10px] font-bold text-[#1B4B66] uppercase tracking-widest">EOC Action Controls</h4>
            <p className="text-[9px] text-[#5B6B72] mt-0.5">Send alerts instantly to citizen screens</p>
          </div>
          
          <div className="space-y-1.5 border-t border-[#E2E4E1] pt-3">
            <label htmlFor="command-alert-text" className="text-[10px] font-bold text-[#1A2226] block uppercase tracking-wider">Broadcaster Feed</label>
            <div className="flex gap-1.5">
              <input 
                id="command-alert-text"
                type="text"
                value={newAlertText}
                onChange={(e) => setNewAlertText(e.target.value)}
                placeholder="Add active notice memo..."
                className="flex-1 text-[10px] border border-[#E2E4E1] px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#1B4B66] bg-white text-[#1A2226]"
              />
              <button
                onClick={onSendAlert}
                className="bg-[#1B4B66] hover:bg-[#153a4f] text-white px-3.5 py-2 shrink-0 flex items-center justify-center cursor-pointer font-bold"
                title="Dispatch Notice"
                aria-label="Dispatch notice"
              >
                <Megaphone size={12} />
              </button>
            </div>
          </div>

          {/* Active Alerts List with Delete Control */}
          {broadcastAlerts.length > 0 && (
            <div className="space-y-1 border-t border-[#E2E4E1] pt-3">
              <span className="text-[9px] font-bold text-[#5B6B72] uppercase block tracking-wider mb-1">Active Notices ({broadcastAlerts.length})</span>
              <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                {broadcastAlerts.map((alert, index) => (
                  <div key={index} className="bg-white border border-[#E2E4E1] p-1.5 flex justify-between items-start gap-1">
                    <p className="text-[9px] text-[#1A2226] leading-tight flex-1 break-words">{alert}</p>
                    <button 
                      onClick={() => onRemoveAlert(index)}
                      className="text-red-600 hover:text-red-800 p-1 cursor-pointer font-bold font-mono text-[10px]"
                      title="Recall Alert"
                      aria-label={`Recall alert ${index + 1}`}
                    >
                      X
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="pt-2 border-t border-[#E2E4E1]">
            <button
              onClick={onExport}
              className="w-full bg-white border border-[#E2E4E1] hover:bg-gray-50 py-2.5 text-[10px] font-bold text-[#1B4B66] flex items-center justify-center gap-1.5 shadow-sm transition-colors uppercase tracking-wider rounded-none cursor-pointer"
            >
              <Download size={12} />
              Export Transmittals (.JSON)
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar Layout */}
      <aside className="hidden lg:flex w-80 bg-white border border-[#E2E4E1] flex-col shrink-0" id="admin-right-sidebar">
        {drawerContent}
      </aside>

      {/* Mobile Drawer Slide-out Layout overlay */}
      {isOpen && (
        <div className="fixed inset-0 bg-[#1A2226]/80 backdrop-blur-xs z-[3000] flex justify-end lg:hidden" id="mobile-broadcast-drawer-overlay">
          <div className="h-full w-full bg-white shadow-2xl relative animate-fade-in-right" role="dialog" aria-modal="true" aria-label="EOC alert controls">
            {drawerContent}
          </div>
        </div>
      )}
    </>
  );
}
