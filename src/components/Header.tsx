import React from 'react';
import { Building2, Calculator, Sparkles, Award, MapPin, ShieldCheck, DollarSign } from 'lucide-react';

interface HeaderProps {
  activeTab: 'matrix' | 'recommendations' | 'grants' | 'towns' | 'aiAdvisor';
  setActiveTab: (tab: 'matrix' | 'recommendations' | 'grants' | 'towns' | 'aiAdvisor') => void;
  monthlyBudget: number;
  cashInjection: number;
  selectedTownsCount: number;
  bestNetWorth?: number;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  monthlyBudget,
  cashInjection,
  selectedTownsCount,
  bestNetWorth
}) => {
  return (
    <header className="bg-[#fcfaf7] text-[#1a1a1a] border-b-8 border-[#1a1a1a] sticky top-0 z-40 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
        {/* Top Editorial Banner Row */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-4 border-b-2 border-[#1a1a1a]">
          <div className="flex flex-col">
            <span className="text-[11px] font-black uppercase tracking-[0.4em] text-[#ff4b00] mb-1 flex items-center gap-2">
              <Building2 className="w-4 h-4 inline" />
              Singapore HDB Housing Strategy Platform
            </span>
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-[900] tracking-tighter uppercase leading-none text-[#1a1a1a]">
              SINGLES AGE 35+ <span className="text-[#ff4b00]">CALCULATOR</span>
            </h1>
          </div>

          {/* Quick Metrics & Status */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <div className="inline-block bg-[#ff4b00] text-white px-3 py-1.5 text-[10px] font-black uppercase tracking-widest shadow-sm">
              Real-Time Engine
            </div>

            <div className="bg-white border-2 border-[#1a1a1a] px-3 py-1.5 flex items-center gap-2 font-bold text-xs uppercase shadow-[2px_2px_0px_0px_#1a1a1a]">
              <DollarSign className="w-4 h-4 text-[#ff4b00]" />
              <div>
                <span className="block text-[9px] font-black opacity-50 tracking-wider">Budget</span>
                <span>${monthlyBudget.toLocaleString()}/mo</span>
              </div>
            </div>

            <div className="bg-white border-2 border-[#1a1a1a] px-3 py-1.5 flex items-center gap-2 font-bold text-xs uppercase shadow-[2px_2px_0px_0px_#1a1a1a]">
              <ShieldCheck className="w-4 h-4 text-[#1a1a1a]" />
              <div>
                <span className="block text-[9px] font-black opacity-50 tracking-wider">Capital</span>
                <span>${cashInjection.toLocaleString()}</span>
              </div>
            </div>

            <div className="bg-white border-2 border-[#1a1a1a] px-3 py-1.5 flex items-center gap-2 font-bold text-xs uppercase shadow-[2px_2px_0px_0px_#1a1a1a]">
              <MapPin className="w-4 h-4 text-[#ff4b00]" />
              <div>
                <span className="block text-[9px] font-black opacity-50 tracking-wider">Towns</span>
                <span>{selectedTownsCount} Selected</span>
              </div>
            </div>

            {bestNetWorth !== undefined && (
              <div className="bg-[#1a1a1a] text-white border-2 border-[#1a1a1a] px-3 py-1.5 flex items-center gap-2 font-bold text-xs uppercase shadow-[2px_2px_0px_0px_#ff4b00]">
                <Award className="w-4 h-4 text-[#ff4b00]" />
                <div>
                  <span className="block text-[9px] font-black text-[#ff4b00] tracking-wider">Top 5Y Equity</span>
                  <span className="text-white">${bestNetWorth.toLocaleString()}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Navigation Tabs - Bold Typographic Buttons */}
        <nav className="flex space-x-2 mt-4 overflow-x-auto custom-scrollbar pb-1">
          <button
            onClick={() => setActiveTab('matrix')}
            className={`px-4 py-2 text-xs font-black uppercase tracking-wider transition-all border-2 border-[#1a1a1a] flex items-center gap-2 whitespace-nowrap shadow-[3px_3px_0px_0px_#1a1a1a] active:translate-x-0.5 active:translate-y-0.5 ${
              activeTab === 'matrix'
                ? 'bg-[#1a1a1a] text-white'
                : 'bg-white text-[#1a1a1a] hover:bg-[#ff4b00] hover:text-white hover:border-[#1a1a1a]'
            }`}
          >
            <Calculator className="w-4 h-4" />
            01. 5-Year Wealth Matrix
          </button>

          <button
            onClick={() => setActiveTab('recommendations')}
            className={`px-4 py-2 text-xs font-black uppercase tracking-wider transition-all border-2 border-[#1a1a1a] flex items-center gap-2 whitespace-nowrap shadow-[3px_3px_0px_0px_#1a1a1a] active:translate-x-0.5 active:translate-y-0.5 ${
              activeTab === 'recommendations'
                ? 'bg-[#1a1a1a] text-white'
                : 'bg-white text-[#1a1a1a] hover:bg-[#ff4b00] hover:text-white hover:border-[#1a1a1a]'
            }`}
          >
            <Award className="w-4 h-4" />
            02. Strategic Recommendations
          </button>

          <button
            onClick={() => setActiveTab('grants')}
            className={`px-4 py-2 text-xs font-black uppercase tracking-wider transition-all border-2 border-[#1a1a1a] flex items-center gap-2 whitespace-nowrap shadow-[3px_3px_0px_0px_#1a1a1a] active:translate-x-0.5 active:translate-y-0.5 ${
              activeTab === 'grants'
                ? 'bg-[#1a1a1a] text-white'
                : 'bg-white text-[#1a1a1a] hover:bg-[#ff4b00] hover:text-white hover:border-[#1a1a1a]'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            03. Grant & Eligibility
          </button>

          <button
            onClick={() => setActiveTab('towns')}
            className={`px-4 py-2 text-xs font-black uppercase tracking-wider transition-all border-2 border-[#1a1a1a] flex items-center gap-2 whitespace-nowrap shadow-[3px_3px_0px_0px_#1a1a1a] active:translate-x-0.5 active:translate-y-0.5 ${
              activeTab === 'towns'
                ? 'bg-[#1a1a1a] text-white'
                : 'bg-white text-[#1a1a1a] hover:bg-[#ff4b00] hover:text-white hover:border-[#1a1a1a]'
            }`}
          >
            <MapPin className="w-4 h-4" />
            04. Town PSF Heatmap
          </button>

          <button
            onClick={() => setActiveTab('aiAdvisor')}
            className={`px-4 py-2 text-xs font-black uppercase tracking-wider transition-all border-2 border-[#1a1a1a] flex items-center gap-2 whitespace-nowrap shadow-[3px_3px_0px_0px_#ff4b00] active:translate-x-0.5 active:translate-y-0.5 ${
              activeTab === 'aiAdvisor'
                ? 'bg-[#ff4b00] text-white'
                : 'bg-white text-[#ff4b00] hover:bg-[#ff4b00] hover:text-white'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            05. AI Copilot
          </button>
        </nav>
      </div>
    </header>
  );
};

