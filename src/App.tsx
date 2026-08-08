import React, { useState, useMemo } from 'react';
import { Header } from './components/Header';
import { PropertyControls } from './components/PropertyControls';
import { WealthProjectionMatrix } from './components/WealthProjectionMatrix';
import { StrategicRecommendations } from './components/StrategicRecommendations';
import { GrantEligibilityCalculator } from './components/GrantEligibilityCalculator';
import { TownHeatmapExplorer } from './components/TownHeatmapExplorer';
import { AIStrategyCopilot } from './components/AIStrategyCopilot';
import { runHousingSimulation } from './utils/calculator';
import { FlatType } from './types';
import { Building2, ShieldCheck, Sparkles, MapPin, Calculator } from 'lucide-react';

export default function App() {
  // Input State mirroring R Shiny Defaults
  const [selectedTowns, setSelectedTowns] = useState<string[]>([
    'PUNGGOL',
    'SENGKANG',
    'TAMPINES',
    'ANG MO KIO'
  ]);
  const [selectedFlatTypes, setSelectedFlatTypes] = useState<FlatType[]>(['4_ROOM']);
  const [monthlyBudget, setMonthlyBudget] = useState<number>(3500);
  const [cashInjection, setCashInjection] = useState<number>(100000);
  const [interestRate, setInterestRate] = useState<number>(3.5);
  const [baseRent, setBaseRent] = useState<number>(2200);

  const [activeTab, setActiveTab] = useState<'matrix' | 'recommendations' | 'grants' | 'towns' | 'aiAdvisor'>('matrix');

  // Reactive Simulation Calculations
  const scenarios = useMemo(() => {
    return runHousingSimulation({
      selectedTowns,
      selectedFlatTypes,
      monthlyBudget,
      cashInjection,
      interestRate,
      baseRent
    });
  }, [selectedTowns, selectedFlatTypes, monthlyBudget, cashInjection, interestRate, baseRent]);

  // Find best net worth position among affordable options
  const bestNetWorth = useMemo(() => {
    const affordable = scenarios.filter((s) => !s.budgetViolator);
    if (affordable.length === 0) return undefined;
    return Math.max(...affordable.map((s) => s.netWorth5Y));
  }, [scenarios]);

  const handleResetDefaults = () => {
    setSelectedTowns(['PUNGGOL', 'SENGKANG', 'TAMPINES', 'ANG MO KIO']);
    setSelectedFlatTypes(['4_ROOM']);
    setMonthlyBudget(3500);
    setCashInjection(100000);
    setInterestRate(3.5);
    setBaseRent(2200);
  };

  return (
    <div className="min-h-screen bg-[#fcfaf7] text-[#1a1a1a] font-sans antialiased selection:bg-[#ff4b00] selection:text-white">
      {/* Header Bar */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        monthlyBudget={monthlyBudget}
        cashInjection={cashInjection}
        selectedTownsCount={selectedTowns.length}
        bestNetWorth={bestNetWorth}
      />

      {/* Hero Graphic / Banner Section - High-Impact Editorial Layout */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-2">
        <div className="bg-white border-4 border-[#1a1a1a] p-6 sm:p-8 shadow-[6px_6px_0px_0px_#1a1a1a]">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="max-w-3xl space-y-2">
              <div className="inline-block bg-[#1a1a1a] text-white px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em]">
                Empirical Forecasting Engine
              </div>
              <h2 className="text-3xl sm:text-5xl font-[900] tracking-tighter uppercase leading-[0.9] text-[#1a1a1a]">
                5-YEAR WEALTH & EQUITY <span className="text-[#ff4b00]">FORECAST</span>
              </h2>
              <p className="text-xs sm:text-sm font-medium text-gray-700 uppercase tracking-tight pt-1">
                Cash Flow Feasibility, CPF Grant Matching & Capital Growth Trajectories for Singles Age 35+
              </p>
            </div>
            <div className="text-right border-l-0 md:border-l-4 border-[#1a1a1a] md:pl-6 pt-2 md:pt-0">
              <div className="text-[10px] font-black uppercase tracking-widest text-[#ff4b00]">Active Simulation</div>
              <div className="text-2xl font-black uppercase tracking-tighter text-[#1a1a1a]">
                {selectedTowns.length} TOWNS / {selectedFlatTypes.length} FLAT TYPES
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Layout (Sidebar Controls + Tab Panel) */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Sidebar Control Panel */}
          <div className="lg:col-span-4">
            <PropertyControls
              selectedTowns={selectedTowns}
              setSelectedTowns={setSelectedTowns}
              selectedFlatTypes={selectedFlatTypes}
              setSelectedFlatTypes={setSelectedFlatTypes}
              monthlyBudget={monthlyBudget}
              setMonthlyBudget={setMonthlyBudget}
              cashInjection={cashInjection}
              setCashInjection={setCashInjection}
              interestRate={interestRate}
              setInterestRate={setInterestRate}
              baseRent={baseRent}
              setBaseRent={setBaseRent}
              onReset={handleResetDefaults}
            />
          </div>

          {/* Right Main Content Display Panel */}
          <div className="lg:col-span-8 space-y-6">
            {activeTab === 'matrix' && (
              <WealthProjectionMatrix scenarios={scenarios} monthlyBudget={monthlyBudget} />
            )}

            {activeTab === 'recommendations' && (
              <StrategicRecommendations
                scenarios={scenarios}
                monthlyBudget={monthlyBudget}
                cashInjection={cashInjection}
              />
            )}

            {activeTab === 'grants' && <GrantEligibilityCalculator />}

            {activeTab === 'towns' && (
              <TownHeatmapExplorer
                selectedTowns={selectedTowns}
                setSelectedTowns={setSelectedTowns}
              />
            )}

            {activeTab === 'aiAdvisor' && (
              <AIStrategyCopilot
                monthlyBudget={monthlyBudget}
                cashInjection={cashInjection}
                interestRate={interestRate}
                baseRent={baseRent}
                selectedTowns={selectedTowns}
                selectedFlatTypes={selectedFlatTypes}
                scenarios={scenarios}
              />
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t-4 border-[#1a1a1a] bg-white py-8 mt-12">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-4 text-xs font-bold uppercase">
          <p className="text-[10px] tracking-tight opacity-70">
            © {new Date().getFullYear()} SINGAPORE HDB HOUSING STRATEGY CALCULATOR FOR SINGLES AGE 35+.
          </p>
          <div className="flex gap-4 text-[10px] font-black tracking-wider text-[#ff4b00]">
            <span>* Growth Path Vector Active</span>
            <span>* CPF Single Citizen Rules</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

