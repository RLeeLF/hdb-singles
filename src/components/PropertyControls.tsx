import React, { useState } from 'react';
import { TOWN_CLUSTER_LOOKUP } from '../data/hdbData';
import { FlatType } from '../types';
import {
  Building,
  Sliders,
  DollarSign,
  Percent,
  Home,
  Check,
  RotateCcw,
  Info,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface PropertyControlsProps {
  selectedTowns: string[];
  setSelectedTowns: (towns: string[]) => void;
  selectedFlatTypes: FlatType[];
  setSelectedFlatTypes: (types: FlatType[]) => void;
  monthlyBudget: number;
  setMonthlyBudget: (val: number) => void;
  cashInjection: number;
  setCashInjection: (val: number) => void;
  interestRate: number;
  setInterestRate: (val: number) => void;
  baseRent: number;
  setBaseRent: (val: number) => void;
  onReset: () => void;
}

export const PropertyControls: React.FC<PropertyControlsProps> = ({
  selectedTowns,
  setSelectedTowns,
  selectedFlatTypes,
  setSelectedFlatTypes,
  monthlyBudget,
  setMonthlyBudget,
  cashInjection,
  setCashInjection,
  interestRate,
  setInterestRate,
  baseRent,
  setBaseRent,
  onReset
}) => {
  const [townSearch, setTownSearch] = useState('');
  const [selectedRegion, setSelectedRegion] = useState<string>('ALL');
  const [isExpanded, setIsExpanded] = useState<boolean>(true);

  const regions = ['ALL', 'North', 'South', 'East', 'West', 'Central', 'North-East'];

  const filteredTowns = TOWN_CLUSTER_LOOKUP.filter((t) => {
    const matchesSearch = t.town.toLowerCase().includes(townSearch.toLowerCase());
    const matchesRegion = selectedRegion === 'ALL' || t.region === selectedRegion;
    return matchesSearch && matchesRegion;
  });

  const toggleTown = (townName: string) => {
    if (selectedTowns.includes(townName)) {
      if (selectedTowns.length > 1) {
        setSelectedTowns(selectedTowns.filter((t) => t !== townName));
      }
    } else {
      setSelectedTowns([...selectedTowns, townName]);
    }
  };

  const selectAllFiltered = () => {
    const townNames = filteredTowns.map((t) => t.town);
    const combined = Array.from(new Set([...selectedTowns, ...townNames]));
    setSelectedTowns(combined);
  };

  const selectPopularSingles = () => {
    // Popular towns for singles age 35
    const popular = ['PUNGGOL', 'SENGKANG', 'YISHUN', 'WOODLANDS', 'TAMPINES', 'ANG MO KIO', 'BUKIT MERAH'];
    setSelectedTowns(popular);
  };

  const toggleFlatType = (ft: FlatType) => {
    if (selectedFlatTypes.includes(ft)) {
      if (selectedFlatTypes.length > 1) {
        setSelectedFlatTypes(selectedFlatTypes.filter((t) => t !== ft));
      }
    } else {
      setSelectedFlatTypes([...selectedFlatTypes, ft]);
    }
  };

  return (
    <div className="bg-white border-4 border-[#1a1a1a] p-5 shadow-[5px_5px_0px_0px_#1a1a1a] space-y-6 text-[#1a1a1a]">
      {/* Header with collapse toggle */}
      <div className="flex items-center justify-between pb-3 border-b-4 border-[#1a1a1a]">
        <div className="flex items-center gap-2">
          <Sliders className="w-5 h-5 text-[#ff4b00]" />
          <h2 className="text-sm font-black text-[#1a1a1a] uppercase tracking-widest">
            SIMULATION PARAMETERS
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onReset}
            className="text-[10px] bg-[#1a1a1a] text-white font-black uppercase px-2.5 py-1 transition-all hover:bg-[#ff4b00] border-2 border-[#1a1a1a] shadow-[1px_1px_0px_0px_#1a1a1a] flex items-center gap-1"
            title="Reset to default baseline parameters"
          >
            <RotateCcw className="w-3 h-3" />
            Reset Defaults
          </button>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-[#1a1a1a] p-1 border-2 border-[#1a1a1a] md:hidden"
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main Controls Content */}
      <div className={`space-y-6 ${isExpanded ? 'block' : 'hidden md:block'}`}>
        {/* Step 1: Property Configurations */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-[10px] font-black text-[#ff4b00] uppercase tracking-[0.2em]">
            <Building className="w-4 h-4" />
            STEP 01: TARGET TOWNS & FLAT TYPES
          </div>

          {/* Region Quick Filters */}
          <div className="flex flex-wrap gap-1 text-xs">
            {regions.map((reg) => (
              <button
                key={reg}
                onClick={() => setSelectedRegion(reg)}
                className={`px-2 py-1 text-[10px] font-black uppercase tracking-wider border-2 border-[#1a1a1a] transition-all ${
                  selectedRegion === reg
                    ? 'bg-[#1a1a1a] text-white'
                    : 'bg-white text-[#1a1a1a] hover:bg-[#ff4b00] hover:text-white'
                }`}
              >
                {reg}
              </button>
            ))}
          </div>

          {/* Search + Quick Select */}
          <div className="flex flex-col sm:flex-row items-stretch gap-2">
            <input
              type="text"
              placeholder="Filter towns..."
              value={townSearch}
              onChange={(e) => setTownSearch(e.target.value)}
              className="w-full text-xs bg-[#fcfaf7] border-2 border-[#1a1a1a] px-3 py-1.5 text-[#1a1a1a] font-bold placeholder-gray-500 focus:outline-none focus:border-[#ff4b00]"
            />
            <div className="flex gap-1">
              <button
                onClick={selectAllFiltered}
                className="text-[10px] font-black uppercase bg-white text-[#1a1a1a] border-2 border-[#1a1a1a] hover:bg-[#1a1a1a] hover:text-white px-2 py-1.5 whitespace-nowrap"
              >
                All
              </button>
              <button
                onClick={selectPopularSingles}
                className="text-[10px] font-black uppercase bg-[#ff4b00] text-white border-2 border-[#1a1a1a] px-2 py-1.5 whitespace-nowrap"
              >
                Popular
              </button>
            </div>
          </div>

          {/* Towns Grid / Chips */}
          <div className="max-h-48 overflow-y-auto pr-1 space-y-1.5 custom-scrollbar bg-[#fcfaf7] p-2 border-2 border-[#1a1a1a]">
            <div className="flex flex-wrap gap-1.5">
              {filteredTowns.map((item) => {
                const isSelected = selectedTowns.includes(item.town);
                return (
                  <button
                    key={item.town}
                    onClick={() => toggleTown(item.town)}
                    className={`text-[10px] font-black uppercase px-2 py-1 border-2 transition-all flex items-center gap-1 ${
                      isSelected
                        ? 'bg-[#1a1a1a] text-white border-[#1a1a1a]'
                        : 'bg-white text-[#1a1a1a] border-[#1a1a1a] hover:bg-[#ff4b00] hover:text-white'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3 text-[#ff4b00]" />}
                    <span>{item.town}</span>
                    <span className="opacity-50">G{item.townGroup}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Flat Type Checkboxes */}
          <div className="pt-2">
            <label className="text-[10px] font-black uppercase text-[#1a1a1a] tracking-wider block mb-2">
              SELECT FLAT TYPES TO COMPARE:
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: '2_ROOM' as FlatType, label: '2-ROOM FLEXI', desc: 'BTO & Resale' },
                { id: '3_ROOM' as FlatType, label: '3-ROOM', desc: 'Resale Scheme' },
                { id: '4_ROOM' as FlatType, label: '4-ROOM', desc: 'Resale Scheme' },
                { id: '5_ROOM' as FlatType, label: '5-ROOM', desc: 'Resale Scheme' }
              ].map((ft) => {
                const isChecked = selectedFlatTypes.includes(ft.id);
                return (
                  <button
                    key={ft.id}
                    onClick={() => toggleFlatType(ft.id)}
                    className={`p-2.5 border-2 border-[#1a1a1a] text-left transition-all flex items-center justify-between ${
                      isChecked
                        ? 'bg-[#1a1a1a] text-white'
                        : 'bg-white text-[#1a1a1a] hover:bg-gray-100'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-black uppercase">{ft.label}</div>
                      <div className="text-[9px] uppercase font-bold opacity-60">{ft.desc}</div>
                    </div>
                    <div
                      className={`w-4 h-4 border-2 border-[#1a1a1a] flex items-center justify-center font-bold ${
                        isChecked ? 'bg-[#ff4b00] text-white' : 'bg-white'
                      }`}
                    >
                      {isChecked && <Check className="w-3 h-3" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <hr className="border-2 border-[#1a1a1a]" />

        {/* Step 2: Financial & Budget Bounds */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-[10px] font-black text-[#ff4b00] uppercase tracking-[0.2em]">
            <DollarSign className="w-4 h-4" />
            STEP 02: FINANCIAL & BUDGET BOUNDS
          </div>

          {/* Monthly Budget Input */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs font-bold uppercase">
              <span className="text-[#1a1a1a]">Monthly Housing Budget:</span>
              <span className="text-[#ff4b00] text-sm font-black">${monthlyBudget.toLocaleString()}/mo</span>
            </div>
            <input
              type="range"
              min="1000"
              max="10000"
              step="100"
              value={monthlyBudget}
              onChange={(e) => setMonthlyBudget(Number(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-none appearance-none cursor-pointer accent-[#ff4b00]"
            />
            <div className="flex justify-between text-[9px] font-black uppercase text-gray-500">
              <span>$1,000/mo</span>
              <span>$5,000/mo</span>
              <span>$10,000/mo</span>
            </div>
          </div>

          {/* Cash / CPF Downpayment Input */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs font-bold uppercase">
              <span className="text-[#1a1a1a]">Cash / CPF Downpayment:</span>
              <span className="text-[#ff4b00] text-sm font-black">${cashInjection.toLocaleString()}</span>
            </div>
            <input
              type="range"
              min="0"
              max="500000"
              step="5000"
              value={cashInjection}
              onChange={(e) => setCashInjection(Number(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-none appearance-none cursor-pointer accent-[#ff4b00]"
            />
            <div className="flex justify-between text-[9px] font-black uppercase text-gray-500">
              <span>$0</span>
              <span>$250,000</span>
              <span>$500,000</span>
            </div>
          </div>
        </div>

        <hr className="border-2 border-[#1a1a1a]" />

        {/* Step 3: Interest Rate and Rental */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-[10px] font-black text-[#ff4b00] uppercase tracking-[0.2em]">
            <Percent className="w-4 h-4" />
            STEP 03: MORTGAGE & RENTAL BASELINE
          </div>

          {/* Interest Rate */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs font-bold uppercase">
              <span className="text-[#1a1a1a]">Mortgage Interest Rate:</span>
              <span className="text-[#ff4b00] text-sm font-black">{interestRate.toFixed(1)}% APR</span>
            </div>
            <input
              type="range"
              min="1.0"
              max="10.0"
              step="0.1"
              value={interestRate}
              onChange={(e) => setInterestRate(Number(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-none appearance-none cursor-pointer accent-[#ff4b00]"
            />

            {/* Benchmark Shortcuts */}
            <div className="flex flex-wrap gap-1 pt-1">
              {[
                { label: 'HDB ~2.6%', rate: 2.6 },
                { label: 'Bank Low ~3.25%', rate: 3.25 },
                { label: 'Default 3.5%', rate: 3.5 },
                { label: 'High ~4.5%', rate: 4.5 }
              ].map((bench) => (
                <button
                  key={bench.label}
                  onClick={() => setInterestRate(bench.rate)}
                  className={`text-[9px] font-black uppercase px-2 py-0.5 border-2 transition-all ${
                    Math.abs(interestRate - bench.rate) < 0.05
                      ? 'bg-[#1a1a1a] text-white border-[#1a1a1a]'
                      : 'bg-white text-[#1a1a1a] border-[#1a1a1a] hover:bg-[#ff4b00] hover:text-white'
                  }`}
                >
                  {bench.label}
                </button>
              ))}
            </div>
          </div>

          {/* Monthly Rental Baseline */}
          <div className="space-y-1.5 pt-1">
            <div className="flex justify-between items-center text-xs font-bold uppercase">
              <span className="text-[#1a1a1a]">Current Rent Baseline:</span>
              <span className="text-[#ff4b00] text-sm font-black">${baseRent.toLocaleString()}/mo</span>
            </div>
            <input
              type="range"
              min="1000"
              max="6000"
              step="100"
              value={baseRent}
              onChange={(e) => setBaseRent(Number(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-none appearance-none cursor-pointer accent-[#ff4b00]"
            />
            <div className="text-[10px] font-bold uppercase text-gray-500 flex items-center gap-1 pt-1">
              <Info className="w-3.5 h-3.5 text-[#ff4b00] flex-shrink-0" />
              <span>Assumes 3.5% annual rental inflation benchmark.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

