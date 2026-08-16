import React, { useState, useEffect } from "react";
import { UserInputs, SimulationResultRow } from "./types";
import { getAllTowns } from "./supabase-lookup";
import { runSimulation } from "./lib/simulation";
import { Header } from "./components/Header";
import { SidebarInputs } from "./components/SidebarInputs";
import { ProjectionsChart } from "./components/ProjectionsChart";
import { SummaryTable } from "./components/SummaryTable";
import { Recommendations } from "./components/Recommendations";
import { formatDollar, formatFlatType } from "./lib/formatters";
import {
  TrendingUp,
  Sparkles,
  AlertCircle,
  RefreshCw,
  Key,
} from "lucide-react";

export default function App() {
  const [inputs, setInputs] = useState<UserInputs>({
    selectedTowns: ["PUNGGOL"],
    selectedRoomTypes: ["4_ROOM"],
    remainingLease: 75,
    monthlyBudget: 3500,
    cashInjection: 100000,
    interestRate: 3.5,
    baseRent: 2200,
    grossMonthlyIncome: 6000,
    existingMonthlyDebt: 0,
  });

  const [availableTowns, setAvailableTowns] = useState<string[]>([]);
  const [isTownsLoading, setIsTownsLoading] = useState<boolean>(true);
  const [townsError, setTownsError] = useState<string | null>(null);

  const [results, setResults] = useState<SimulationResultRow[]>([]);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [simError, setSimError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<"matrix" | "recommendations">("matrix");

  // Fetch towns on mount from live Supabase table or empirical baseline
  const fetchTowns = async () => {
    setIsTownsLoading(true);
    setTownsError(null);
    try {
      const towns = await getAllTowns();
      setAvailableTowns(towns);
      if (towns.length > 0) {
        // Ensure default town is in the list
        setInputs((prev) => ({
          ...prev,
          selectedTowns: prev.selectedTowns.some((t) => towns.includes(t))
            ? prev.selectedTowns.filter((t) => towns.includes(t))
            : [towns[0]],
        }));
      }
    } catch (err: any) {
      console.error("Error loading towns:", err);
      setTownsError(err.message || "Failed to load towns matrix.");
    } finally {
      setIsTownsLoading(false);
    }
  };

  useEffect(() => {
    fetchTowns();
  }, []);

  // Run simulation whenever inputs change and towns are loaded
  useEffect(() => {
    let isCancelled = false;

    const executeSimulation = async () => {
      if (inputs.selectedTowns.length === 0 || inputs.selectedRoomTypes.length === 0) {
        setResults([]);
        return;
      }

      setIsSimulating(true);
      setSimError(null);

      try {
        const simResults = await runSimulation(inputs);
        if (!isCancelled) {
          setResults(simResults);
        }
      } catch (err: any) {
        if (!isCancelled) {
          console.error("Simulation run error:", err);
          setSimError(err.message || "Error running financial simulation");
        }
      } finally {
        if (!isCancelled) {
          setIsSimulating(false);
        }
      }
    };

    if (availableTowns.length > 0) {
      executeSimulation();
    }

    return () => {
      isCancelled = true;
    };
  }, [inputs, availableTowns]);

  // Derived winner for Prime Strategy Card & Recommendation banner
  const qualifiedRows = results.filter(
    (r) =>
      !r.budget_violator &&
      !r.regulatory_fail &&
      !r.scheme_ineligible &&
      !r.bto_data_unavailable &&
      r.net_worth_5y !== null
  );
  const topWinner =
    qualifiedRows.length > 0
      ? [...qualifiedRows].sort((a, b) => (b.net_worth_5y ?? 0) - (a.net_worth_5y ?? 0))[0]
      : null;

  return (
    <div className="min-h-screen bg-[#f8f9fb] text-[#1a1c1e] flex flex-col font-sans">
      {/* Top Navbar */}
      <Header
        isLoading={isTownsLoading || isSimulating}
        isError={Boolean(townsError || simError)}
      />

      {/* Main Content Layout */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Connection or Simulation Error Notice if any occurs */}
        {(townsError || simError) && (
          <div className="p-4 sm:p-5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-950 space-y-2 shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-amber-900 font-mono">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Simulation Notice</span>
              </div>
              <button
                type="button"
                onClick={fetchTowns}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold bg-white border border-amber-300 text-amber-900 hover:bg-amber-100 transition-colors shadow-2xs font-mono text-[11px]"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Retry</span>
              </button>
            </div>
            <p className="text-xs text-amber-900 leading-relaxed">
              {townsError || simError}
            </p>
          </div>
        )}

        {/* Two-column layout: Sidebar (Inputs) & Main Panel (Results & Recommendations) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Sidebar Inputs (col-span-4) */}
          <div className="lg:col-span-4 xl:col-span-4">
            <SidebarInputs
              inputs={inputs}
              onChange={setInputs}
              availableTowns={availableTowns}
              isTownsLoading={isTownsLoading}
            />
          </div>

          {/* Right Column: Main Analysis Panel (col-span-8) */}
          <section className="lg:col-span-8 xl:col-span-8 flex flex-col gap-6">
            {/* Editorial Section Header with View Toggle Tabs */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 border-b border-[#d8dadc] pb-4">
              <div className="space-y-1">
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[#1a1c1e] font-heading">
                  Cross-Comparison Simulation Grid
                </h2>
                <p className="text-xs sm:text-sm text-[#1a1c1e]/60 italic">
                  Visualizing 5-year net worth accumulation across selected pathways.
                </p>
              </div>

              {/* Editorial View Tabs */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab("matrix")}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold font-mono transition-all ${
                    activeTab === "matrix"
                      ? "bg-[#005fa6] text-white shadow-xs"
                      : "bg-white text-[#1a1c1e]/70 border border-[#d8dadc] hover:bg-[#f8f9fb]"
                  }`}
                >
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>Simulation Grid</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("recommendations")}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold font-mono transition-all ${
                    activeTab === "recommendations"
                      ? "bg-[#005fa6] text-white shadow-xs"
                      : "bg-white text-[#1a1c1e]/70 border border-[#d8dadc] hover:bg-[#f8f9fb]"
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Recommendations</span>
                </button>
              </div>
            </div>

            {/* Tab 1: Simulation Grid */}
            {activeTab === "matrix" && (
              <div className="flex flex-col gap-6">
                {/* Top Grid: Wealth Growth Chart (2 cols) & Prime Strategy Card (1 col) */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
                  <div className="lg:col-span-2">
                    <ProjectionsChart data={results} />
                  </div>

                  {/* Prime Strategy Hero Card matching Design HTML */}
                  <div className="bg-[#005fa6] text-white rounded-2xl p-6 flex flex-col justify-between shadow-xs">
                    <div className="text-[10px] font-bold uppercase tracking-widest opacity-70 font-mono">
                      Prime Strategy
                    </div>
                    <div className="my-4">
                      <div className="text-3xl sm:text-4xl font-extrabold font-mono mb-1">
                        {topWinner ? formatDollar(topWinner.net_worth_5y) : "—"}
                      </div>
                      <div className="text-xs opacity-85">Projected 5Y Capital Growth</div>
                    </div>
                    <div className="text-xs pt-4 border-t border-white/20 leading-relaxed">
                      {topWinner ? (
                        <>
                          <span className="font-bold">
                            {topWinner.town} ({topWinner.path})
                          </span>{" "}
                          is your strongest pathway passing all regulatory gates.
                        </>
                      ) : (
                        <span>No eligible pathway passing both budget & MSR gates.</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Granular Financial Breakdown Table */}
                <SummaryTable rows={results} />

                {/* Editorial Recommendation Callout Banner */}
                {topWinner && (
                  <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex gap-4 items-center shadow-2xs">
                    <div className="w-10 h-10 rounded-full bg-[#005fa6] flex items-center justify-center text-white flex-none font-bold text-lg">
                      ★
                    </div>
                    <div className="text-xs leading-relaxed text-[#1a1c1e]/80">
                      <strong className="text-[#005fa6] uppercase tracking-wider block mb-0.5 font-mono text-[10px]">
                        Recommendation:
                      </strong>
                      Within your {formatDollar(inputs.monthlyBudget)} budget and passing MAS lending eligibility, the{" "}
                      <span className="font-bold text-[#005fa6]">
                        {topWinner.path} ({formatFlatType(topWinner.flat_type)}) in {topWinner.town}
                      </span>{" "}
                      maximizes wealth with a projected outcome of{" "}
                      <span className="font-bold text-[#1a1c1e]">{formatDollar(topWinner.net_worth_5y)}</span>. Other configurations were flagged for high monthly payments or MSR failure.
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Tab 2: Detailed Strategic Recommendations */}
            {activeTab === "recommendations" && (
              <div className="flex flex-col gap-6">
                <Recommendations rows={results} inputs={inputs} />
                <SummaryTable rows={results} />
              </div>
            )}
          </section>
        </div>
      </main>

      {/* Footer */}
    <footer className="border-t border-[#d8dadc] bg-white py-6 mt-12 text-center text-xs text-[#1a1c1e]/60 font-mono">
    <div className="max-w-7xl mx-auto px-4 space-y-2">
    <p className="font-bold text-[#1a1c1e] text-[11px] uppercase tracking-wider">
      HDB Options Calculator for Singles in Singapore
    </p>
    <p className="text-[10px] text-[#1a1c1e]/50 max-w-2xl mx-auto leading-relaxed normal-case tracking-normal">
      All figures are indicative 5-year projections based on historical HDB resale and BTO
      transaction data, modelled town clusters, and current MAS lending rules. They are
      provided for planning and educational purposes only, do not constitute financial
      advice, and are not a guarantee of actual pricing, loan approval, or HDB/CPF
      eligibility. Always verify your specific eligibility and financing terms directly
      with HDB, CPF Board, and your bank before making a purchase decision.
    </p>
  </div>
</footer>
    </div>
  );
}

