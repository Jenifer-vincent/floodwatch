/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ShieldCheck, Compass, Mail, Lock, Activity, Radio } from 'lucide-react';
import WaterWaveCanvas from './WaterWaveCanvas';
import { authService } from '../services/auth';

interface LoginDashboardProps {
  onLogin: (role: 'citizen' | 'admin') => void;
  currentUser: import('../types').User | null;
  triggerToast: (msg: string) => void;
}

/**
 * Access selection login.
 *
 * A username/email and password are entered, then the access level is
 * selected (Citizen or Admin). The selected access level determines which
 * portal opens. The session / role is persisted locally so a refresh keeps
 * the current role.
 */
export default function LoginDashboard({ onLogin, currentUser, triggerToast }: LoginDashboardProps) {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleContinue = async (role: 'citizen' | 'admin') => {
    setIsSubmitting(true);
    try {
      const user = await authService.loginDemo(identifier, role);
      triggerToast(`Signed in as ${user.name} (${role === 'admin' ? 'Administrator' : 'Citizen'}).`);
      onLogin(role);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col justify-center items-center w-full p-0 sm:p-6 lg:p-8 max-w-5xl mx-auto animate-fade-in" id="login-dashboard-container">

      {/* Split-Panel Card */}
      <div className="w-full bg-white border-0 sm:border border-[#E2E4E1] overflow-hidden grid md:grid-cols-12 sm:rounded-[24px] shadow-lg min-h-screen sm:min-h-[560px]" id="premium-login-card">

        {/* Left Side: Water Wave Canvas & Access Form */}
        <div className="md:col-span-7 relative flex flex-col justify-between p-8 sm:p-10 text-white overflow-hidden min-h-[440px]">

          {/* Three.js Water Simulation Overlay */}
          <div className="absolute inset-0 z-0">
            <WaterWaveCanvas />
            <div className="absolute inset-0 bg-gradient-to-br from-[#112b3c]/85 via-[#1b4b66]/75 to-[#0b1b24]/90 z-10" />
          </div>

          {/* Header branding (Top-Level Overlay) */}
          <div className="relative z-20 flex items-center gap-2">
            <div className="bg-white/10 p-2 rounded-full border border-white/20 backdrop-blur-sm">
              <Compass size={16} className="text-white animate-spin-slow" />
            </div>
            <span className="font-mono font-bold tracking-widest text-[10px] uppercase text-white/90">
              FloodWatch // Municipal Emergency Response
            </span>
          </div>

          {/* Access Form Content Block */}
          <div className="relative z-20 space-y-6 my-auto pt-6">
            <div className="space-y-5">
              <div className="space-y-2">
                <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight font-sans">
                  Welcome Back
                </h2>
                <p className="text-xs text-white/80 max-w-sm leading-relaxed">
                  Access the FloodWatch emergency coordination platform.
                </p>
              </div>

              {/* Access Input Form */}
              <form
                onSubmit={(e) => { e.preventDefault(); }}
                className="space-y-3.5 max-w-sm"
              >
                <div className="relative">
                  <Mail size={14} className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white/55" />
                  <input
                    type="text"
                    placeholder="Email / Username"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    autoComplete="username"
                    className="w-full bg-white/10 hover:bg-white/15 focus:bg-white/20 border border-white/20 text-white placeholder-white/60 pl-10 pr-4 py-2.5 text-xs focus:outline-none transition-all rounded-full font-semibold"
                  />
                </div>
                <div className="relative">
                  <Lock size={14} className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white/55" />
                  <input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    className="w-full bg-white/10 hover:bg-white/15 focus:bg-white/20 border border-white/20 text-white placeholder-white/60 pl-10 pr-4 py-2.5 text-xs focus:outline-none transition-all rounded-full font-mono"
                  />
                </div>

                {/* Access Level Selection Buttons */}
                <div className="grid grid-cols-1 gap-3 pt-1">
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => handleContinue('citizen')}
                    className="w-full bg-[#F2994A] hover:bg-[#e08938] text-white py-3 text-[11px] font-bold uppercase tracking-widest focus:outline-none transition-all rounded-full shadow-md cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Activity size={13} />
                    Continue as Citizen
                  </button>
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => handleContinue('admin')}
                    className="w-full bg-[#1B4B66] hover:bg-[#163c51] text-white py-3 text-[11px] font-bold uppercase tracking-widest focus:outline-none transition-all rounded-full shadow-md cursor-pointer flex items-center justify-center gap-2"
                  >
                    <ShieldCheck size={13} />
                    Admin Login
                  </button>
                </div>
              </form>

              <p className="text-[10px] text-white/60 leading-relaxed max-w-sm">
                Select your access level to continue. Citizen access opens the
                Citizen application. Admin access opens the Command Centre.
              </p>
            </div>
          </div>
        </div>

        {/* Right Side: Professional Information Panel */}
        <div className="md:col-span-5 p-8 sm:p-10 flex flex-col justify-between bg-white space-y-8">
          <div className="space-y-5">
            <h3 className="text-base font-extrabold text-[#1A2226] tracking-tight border-b border-[#E2E4E1] pb-3">
              Municipal Flood Monitoring
            </h3>
            <p className="text-xs text-[#5B6B72] leading-relaxed">
              Real-time flood reporting, emergency alerts, geographic monitoring
              and response coordination across your municipal district.
            </p>

            {/* System Status */}
            <div className="inline-flex items-center gap-1.5 bg-[#1B4B66]/5 border border-[#1B4B66]/15 px-3 py-1 rounded-full text-[9px] font-extrabold tracking-widest uppercase text-[#1B4B66]">
              <Radio size={11} />
              System Status
            </div>

            <ul className="space-y-2 pt-1 text-xs">
              <li className="flex items-center gap-2 text-[#5B6B72]">
                <span className="w-1.5 h-1.5 bg-[#2E7D5B] rounded-full shrink-0" />
                Monitoring systems operational
              </li>
              <li className="flex items-center gap-2 text-[#5B6B72]">
                <span className="w-1.5 h-1.5 bg-[#2E7D5B] rounded-full shrink-0" />
                Flood reporting available
              </li>
              <li className="flex items-center gap-2 text-[#5B6B72]">
                <span className="w-1.5 h-1.5 bg-[#2E7D5B] rounded-full shrink-0" />
                Emergency response network active
              </li>
            </ul>
          </div>

          <p className="text-[10px] text-[#5B6B72] leading-normal border-t border-[#E2E4E1] pt-3">
            Authorized municipal personnel and residents may access the
            appropriate portal for their role.
          </p>
        </div>

      </div>
    </div>
  );
}
