import React, { useState } from "react";
import { UserInputs, FlatType } from "../types";
import { Check } from "lucide-react";

interface SidebarInputsProps {
  inputs: UserInputs;
  onChange: (newInputs: UserInputs) => void;
  availableTowns: string[];
  isTownsLoading: boolean;
}

const FLAT_TYPE_OPTIONS: { id: FlatType; label: string }[] = [
  { id: "2_ROOM", label: "2-Room" },
  { id: "3_ROOM", label: "3-Room" },
  { id: "4_ROOM", label: "4-Room" },
  { id: "5_ROOM", label: "5-Room" },
];

export const SidebarInputs: React.FC<SidebarInputsProps> = ({
  inputs,
  onChange,
  availableTowns,
  isTownsLoading,
}) => {
  const [townSearch, setTownSearch] = useState("");
  const [isTownDropdownOpen, setIsTownDropdownOpen] = useState(false);

  const toggleTown = (town: string) => {
    const exists = inputs.selectedTowns.includes(town);
    let updatedTowns: string[];
    if (exists) {
      if (inputs.selectedTowns.length === 1) {
        // Keep at least one selected
        return;
      }
      updatedTowns = inputs.selectedTowns.filter((t) => t !== town);
    } else {
      updatedTowns = [...inputs.selectedTowns, town];
    }
    onChange({ ...inputs, selectedTowns: updatedTowns });
  };

  const selectAllTowns = () => {
    onChange({ ...inputs, selectedTowns: availableTowns });
  };

  const resetToDefaultTown = () => {
    const defaultTown = availableTowns.includes("PUNGGOL")
      ? ["PUNGGOL"]
      : availableTowns.slice(0, 1);
    onChange({ ...inputs, selectedTowns: defaultTown });
  };

  const toggleFlatType = (type: FlatType) => {
    const exists = inputs.selectedRoomTypes.includes(type);
    let updatedTypes: FlatType[];
    if (exists) {
      if (inputs.selectedRoomTypes.length === 1) {
        // Keep at least one
        return;
      }
      updatedTypes = inputs.selectedRoomTypes.filter((t) => t !== type);
    } else {
      updatedTypes = [...inputs.selectedRoomTypes, type];
    }
    onChange({ ...inputs, selectedRoomTypes: updatedTypes });
  };

  const filteredTowns = availableTowns.filter((t) =>
    t.toLowerCase().includes(townSearch.toLowerCase())
  );

  return (
    <aside className="w-full bg-white rounded-2xl border border-[#d8dadc] p-5 sm:p-6 shadow-xs space-y-5">
      {/* SECTION 1: TARGET TOWNS & FLATS */}
      <div className="space-y-4">
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-[10px] font-bold uppercase tracking-wider text-[#1a1c1e]/60 block font-mono">
              Target Towns ({inputs.selectedTowns.length})
            </label>
            <div className="flex items-center gap-2 text-[10px] font-bold">
              <button
                type="button"
                onClick={selectAllTowns}
                className="text-[#005fa6] hover:underline"
              >
                SELECT ALL
              </button>
              <span className="text-[#d8dadc]">|</span>
              <button
                type="button"
                onClick={resetToDefaultTown}
                className="text-[#1a1c1e]/60 hover:underline"
              >
                PUNGGOL
              </button>
            </div>
          </div>

          {isTownsLoading ? (
            <div className="h-10 bg-[#f8f9fb] animate-pulse rounded-xl border border-[#d8dadc] flex items-center px-3 text-xs text-[#1a1c1e]/50">
              Loading towns from live matrix...
            </div>
          ) : (
            <div className="space-y-2">
              {/* Selected Towns Badges */}
              <div className="p-2 border border-[#d8dadc] rounded-xl bg-[#f8f9fb] text-sm flex flex-wrap gap-1.5 min-h-[42px] max-h-28 overflow-y-auto">
                {inputs.selectedTowns.map((town) => (
                  <span
                    key={town}
                    className="bg-[#005fa6] text-white px-2.5 py-1 rounded text-xs font-semibold inline-flex items-center gap-1 shadow-2xs"
                  >
                    {town}
                    {inputs.selectedTowns.length > 1 && (
                      <button
                        type="button"
                        onClick={() => toggleTown(town)}
                        className="hover:text-rose-200 ml-0.5"
                        title="Remove town"
                      >
                        ×
                      </button>
                    )}
                  </span>
                ))}
                <button
                  type="button"
                  onClick={() => setIsTownDropdownOpen(true)}
                  className="text-[#1a1c1e]/50 hover:text-[#005fa6] px-2 py-1 text-xs font-semibold rounded hover:bg-slate-200/60 transition-colors"
                >
                  + Add Town
                </button>
              </div>

              {/* Town Multi-select Dropdown */}
              {isTownDropdownOpen && (
                <div className="relative">
                  <div className="bg-white border border-[#d8dadc] rounded-xl shadow-lg z-20 max-h-52 overflow-y-auto p-2 space-y-1.5">
                    <div className="flex justify-between items-center px-1 pb-1 text-[11px] font-bold text-[#1a1c1e]/60 border-b border-[#d8dadc]/60 font-mono">
                      <span>SEARCH & SELECT TOWNS</span>
                      <button
                        type="button"
                        onClick={() => setIsTownDropdownOpen(false)}
                        className="text-[#005fa6] hover:underline"
                      >
                        DONE
                      </button>
                    </div>
                    <input
                      type="text"
                      placeholder="Type town name..."
                      value={townSearch}
                      onChange={(e) => setTownSearch(e.target.value)}
                      className="w-full text-xs px-2.5 py-1.5 border border-[#d8dadc] rounded-lg bg-[#f8f9fb] focus:bg-white focus:ring-1 focus:ring-[#005fa6] outline-none"
                    />
                    <div className="grid grid-cols-1 gap-0.5 pt-1">
                      {filteredTowns.map((town) => {
                        const selected = inputs.selectedTowns.includes(town);
                        return (
                          <button
                            key={town}
                            type="button"
                            onClick={() => toggleTown(town)}
                            className={`w-full text-left px-2 py-1 rounded text-xs flex items-center justify-between transition-colors ${
                              selected
                                ? "bg-[#005fa6] text-white font-semibold"
                                : "hover:bg-[#f8f9fb] text-[#1a1c1e]"
                            }`}
                          >
                            <span>{town}</span>
                            {selected && <Check className="w-3.5 h-3.5 text-white" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Flat Type Selector */}
        <div>
          <label className="text-[10px] font-bold uppercase tracking-wider text-[#1a1c1e]/60 mb-2 block font-mono">
            Flat Type Comparison
          </label>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {FLAT_TYPE_OPTIONS.map((opt) => {
              const isChecked = inputs.selectedRoomTypes.includes(opt.id);
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => toggleFlatType(opt.id)}
                  className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-semibold transition-all ${
                    isChecked
                      ? "border-[#005fa6] bg-[#005fa6]/5 text-[#005fa6] shadow-2xs"
                      : "border-[#d8dadc] bg-white text-[#1a1c1e]/70 hover:bg-[#f8f9fb]"
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                      isChecked
                        ? "bg-[#005fa6] border-[#005fa6] text-white"
                        : "border-[#d8dadc] bg-white"
                    }`}
                  >
                    {isChecked && <Check className="w-3 h-3" />}
                  </div>
                  <span>{opt.label}</span>
                </button>
              );
            })}
          </div>
          <p className="text-[10px] text-[#1a1c1e]/50 mt-1.5 leading-tight">
            Single Citizen Scheme: BTO is 2-Room only. Resale is unrestricted.
          </p>
        </div>

        {/* Remaining Lease Slider */}
        <div className="space-y-1 pt-1">
          <div className="flex justify-between text-xs font-bold">
            <label className="text-[10px] font-bold uppercase tracking-wider text-[#1a1c1e]/60 font-mono">
              Remaining Lease
            </label>
            <span className="text-[#005fa6] font-mono">{inputs.remainingLease} Years</span>
          </div>
          <input
            type="range"
            min={40}
            max={95}
            step={5}
            value={inputs.remainingLease}
            onChange={(e) =>
              onChange({ ...inputs, remainingLease: Number(e.target.value) })
            }
            className="w-full custom-slider cursor-pointer"
          />
          <div className="flex justify-between text-[9px] text-[#1a1c1e]/40 font-mono">
            <span>40y</span>
            <span>60y</span>
            <span>75y (Default)</span>
            <span>95y</span>
          </div>
        </div>

        {/* Monthly Budget Slider */}
        <div className="space-y-1 pt-1">
          <div className="flex justify-between text-xs font-bold">
            <label className="text-[10px] font-bold uppercase tracking-wider text-[#1a1c1e]/60 font-mono">
              Monthly Budget
            </label>
            <span className="text-[#005fa6] font-mono">${inputs.monthlyBudget.toLocaleString()}</span>
          </div>
          <input
            type="range"
            min={1000}
            max={10000}
            step={100}
            value={inputs.monthlyBudget}
            onChange={(e) =>
              onChange({ ...inputs, monthlyBudget: Number(e.target.value) })
            }
            className="w-full custom-slider cursor-pointer"
          />
          <div className="flex justify-between text-[9px] text-[#1a1c1e]/40 font-mono">
            <span>$1,000</span>
            <span>$3,500</span>
            <span>$10,000</span>
          </div>
        </div>

        {/* Grid Inputs: Downpayment & Interest */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-[#1a1c1e]/60 block font-mono">
              Downpayment ($)
            </label>
            <input
              type="number"
              min={0}
              step={5000}
              value={inputs.cashInjection}
              onChange={(e) =>
                onChange({ ...inputs, cashInjection: Math.max(0, Number(e.target.value) || 0) })
              }
              className="w-full p-2 border border-[#d8dadc] rounded-lg bg-[#f8f9fb] focus:bg-white focus:ring-1 focus:ring-[#005fa6] outline-none text-xs font-semibold text-[#1a1c1e]"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-[#1a1c1e]/60 block font-mono">
              Interest %
            </label>
            <input
              type="number"
              min={1.0}
              max={10.0}
              step={0.1}
              value={inputs.interestRate}
              onChange={(e) =>
                onChange({ ...inputs, interestRate: Math.max(1.0, Math.min(10.0, Number(e.target.value) || 3.5)) })
              }
              className="w-full p-2 border border-[#d8dadc] rounded-lg bg-[#f8f9fb] focus:bg-white focus:ring-1 focus:ring-[#005fa6] outline-none text-xs font-semibold text-[#1a1c1e]"
            />
          </div>
        </div>

        {/* Grid Inputs: Income & Rental Baseline */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-[#1a1c1e]/60 block font-mono">
              Monthly Income ($)
            </label>
            <input
              type="number"
              min={0}
              step={100}
              value={inputs.grossMonthlyIncome}
              onChange={(e) =>
                onChange({ ...inputs, grossMonthlyIncome: Math.max(0, Number(e.target.value) || 0) })
              }
              className="w-full p-2 border border-[#d8dadc] rounded-lg bg-[#f8f9fb] focus:bg-white focus:ring-1 focus:ring-[#005fa6] outline-none text-xs font-semibold text-[#1a1c1e]"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-[#1a1c1e]/60 block font-mono">
              Monthly Rent ($)
            </label>
            <input
              type="number"
              min={0}
              step={100}
              value={inputs.baseRent}
              onChange={(e) =>
                onChange({ ...inputs, baseRent: Math.max(0, Number(e.target.value) || 0) })
              }
              className="w-full p-2 border border-[#d8dadc] rounded-lg bg-[#f8f9fb] focus:bg-white focus:ring-1 focus:ring-[#005fa6] outline-none text-xs font-semibold text-[#1a1c1e]"
            />
          </div>
        </div>

        {/* Existing Debt & MAS Stress Test Note */}
        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-wider text-[#1a1c1e]/60 block font-mono">
            Existing Monthly Debt ($)
          </label>
          <input
            type="number"
            min={0}
            step={50}
            value={inputs.existingMonthlyDebt}
            onChange={(e) =>
              onChange({ ...inputs, existingMonthlyDebt: Math.max(0, Number(e.target.value) || 0) })
            }
            className="w-full p-2 border border-[#d8dadc] rounded-lg bg-[#f8f9fb] focus:bg-white focus:ring-1 focus:ring-[#005fa6] outline-none text-xs font-semibold text-[#1a1c1e]"
          />
          <p className="text-[9px] text-[#1a1c1e]/50 leading-tight pt-0.5">
            Checked at MAS mandatory 4% stress-test rate (30% MSR / 55% TDSR).
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={() => onChange({ ...inputs })}
        className="w-full py-3 bg-[#005fa6] hover:bg-[#004d88] active:scale-[0.99] text-white font-bold rounded-2xl text-sm shadow-lg shadow-[#005fa6]/20 transition-all cursor-pointer font-heading"
      >
        Calculate Projections
      </button>
    </aside>
  );
};
