import React from "react";
import { ShieldCheck } from "lucide-react";

interface HeaderProps {
  isLoading: boolean;
  isError: boolean;
}

export const Header: React.FC<HeaderProps> = ({ isLoading, isError }) => {
  return (
    <header className="h-16 bg-white border-b border-[#d8dadc] sticky top-0 z-30 flex items-center px-4 sm:px-8 flex-none shadow-2xs">
      <div className="w-full max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Brand Identity */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-[#005fa6] rounded-lg flex items-center justify-center shrink-0 shadow-xs">
            <div className="w-4 h-4 border-2 border-white rounded-xs"></div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-xl font-bold tracking-tight text-[#005fa6] font-heading">
                BTO, Rent, Resale HDB Housing Choice Calculator for Singles
              </h1>
              <span className="hidden md:inline-flex text-[10px] font-bold uppercase tracking-widest bg-blue-50 text-[#005fa6] px-2 py-0.5 rounded border border-blue-200">
                Age 35+ Scheme
              </span>
            </div>
          </div>
        </div>

        {/* Status indicator (loading/error only — no live/fallback distinction,
            since there is no fallback data source anymore) & regulatory badge */}
        <div className="flex items-center gap-2">
          {isLoading ? (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
              <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
              <span>Simulating...</span>
            </div>
          ) : isError ? (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
              <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />
              <span>Simulation Error</span>
            </div>
          ) : null}
          <div className="hidden sm:inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 border border-slate-200 font-mono">
            <ShieldCheck className="w-3.5 h-3.5 text-slate-500" />
            <span>MAS 4% Stress Test</span>
          </div>
        </div>
      </div>
    </header>
  );
};
