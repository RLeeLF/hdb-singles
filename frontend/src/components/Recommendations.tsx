import React from "react";
import { SimulationResultRow, UserInputs } from "../types";
import { formatDollar, formatFlatType } from "../lib/formatters";
import {
  AlertTriangle,
  ShieldCheck,
} from "lucide-react";

interface RecommendationsProps {
  rows: SimulationResultRow[];
  inputs: UserInputs;
}

export const Recommendations: React.FC<RecommendationsProps> = ({ rows, inputs }) => {
  // Filter eligible rows:
  // df <- results_data() %>% filter(!budget_violator, !regulatory_fail, !scheme_ineligible, !bto_data_unavailable)
  const qualifiedRows = rows.filter(
    (r) =>
      !r.budget_violator &&
      !r.regulatory_fail &&
      !r.scheme_ineligible &&
      !r.bto_data_unavailable &&
      r.net_worth_5y !== null
  );

  // If no rows qualify
  if (qualifiedRows.length === 0) {
    const anyBudgetOk = rows.filter(
      (r) => !r.budget_violator && !r.scheme_ineligible && !r.bto_data_unavailable
    );

    const isRegulatoryOnlyFailure = anyBudgetOk.length > 0;

    return (
      <div className="space-y-5">
        <div className="p-5 sm:p-6 rounded-2xl bg-rose-50 border border-rose-200 text-rose-950 space-y-3 shadow-xs">
          <div className="flex items-center gap-2 font-heading font-bold text-xs uppercase tracking-wider text-rose-900 font-mono">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>CRITICAL WARNING STRATEGY GATEWAY</span>
          </div>

          <p className="text-xs leading-relaxed text-rose-900 font-medium">
            {isRegulatoryOnlyFailure
              ? "Configurations exist within your monthly budget, but ALL fail the MAS MSR (30%) or TDSR (55%) lending eligibility check at your stated income. A bank or HDB would not approve these loans regardless of cash flow comfort. Consider increasing downpayment, selecting a lower-priced flat, or raising income."
              : "Every selected HDB ownership configuration exceeds your monthly budget limit or has no available pathway data. Please expand your budget or modify town/flat selections."}
          </p>
        </div>

        {/* Diagnosis steps in Editorial grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl border border-[#d8dadc] bg-white space-y-1 shadow-2xs">
            <h4 className="font-bold text-[10px] uppercase tracking-wider text-[#1a1c1e]/60 font-mono">
              1. Monthly Income / MSR
            </h4>
            <p className="text-xs text-[#1a1c1e]/80">
              Current income: <strong className="text-[#1a1c1e]">${inputs.grossMonthlyIncome.toLocaleString()}</strong>.
              MAS caps MSR at 30% (${(inputs.grossMonthlyIncome * 0.3).toLocaleString()}/mo max loan instalment).
            </p>
          </div>
          <div className="p-4 rounded-xl border border-[#d8dadc] bg-white space-y-1 shadow-2xs">
            <h4 className="font-bold text-[10px] uppercase tracking-wider text-[#1a1c1e]/60 font-mono">
              2. Cash / CPF Downpayment
            </h4>
            <p className="text-xs text-[#1a1c1e]/80">
              Current injection: <strong className="text-[#1a1c1e]">${inputs.cashInjection.toLocaleString()}</strong>.
              Increasing downpayment reduces principal loan amount to satisfy MSR/TDSR limits.
            </p>
          </div>
          <div className="p-4 rounded-xl border border-[#d8dadc] bg-white space-y-1 shadow-2xs">
            <h4 className="font-bold text-[10px] uppercase tracking-wider text-[#1a1c1e]/60 font-mono">
              3. Flat Type & Town
            </h4>
            <p className="text-xs text-[#1a1c1e]/80">
              Consider selecting 2-Room or 3-Room options in Non-Mature clusters to reduce initial asset acquisition price.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Sort descending by 5Y net worth
  const sorted = [...qualifiedRows].sort(
    (a, b) => (b.net_worth_5y ?? 0) - (a.net_worth_5y ?? 0)
  );
  const winner = sorted[0];

  const recommendationText = `Within your stated monthly budget envelope of ${formatDollar(
    inputs.monthlyBudget
  )} and passing MAS lending eligibility (MSR/TDSR) at your stated income, the strategy maximizing capital generation over 5 years is the ${winner.path.toUpperCase()} pathway tracking a ${formatFlatType(
    winner.flat_type
  )} configuration inside ${winner.town}. This delivers a 5-year equity footprint outcome of ${formatDollar(
    winner.net_worth_5y
  )}. Configurations that break your comfortable cash flow bounds, fail the MSR/TDSR lending check, or have no available pathway have been automatically flagged with warning markers.`;

  return (
    <div className="space-y-5">
      {/* Editorial Recommendation Callout Banner matching Design HTML */}
      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 sm:p-5 flex gap-4 items-center shadow-2xs">
        <div className="w-10 h-10 rounded-full bg-[#005fa6] flex items-center justify-center text-white flex-none font-bold text-lg">
          ★
        </div>
        <div className="text-xs leading-relaxed text-[#1a1c1e]/80">
          <strong className="text-[#005fa6] uppercase tracking-wider block mb-0.5 font-mono text-[11px]">
            RECOMMENDATION:
          </strong>
          Within your {formatDollar(inputs.monthlyBudget)} budget and passing MAS lending eligibility, the{" "}
          <span className="font-bold text-[#005fa6]">
            {winner.path} ({formatFlatType(winner.flat_type)}) in {winner.town}
          </span>{" "}
          maximizes wealth with a projected outcome of{" "}
          <span className="font-bold text-[#1a1c1e]">{formatDollar(winner.net_worth_5y)}</span>. Other configurations were flagged for high monthly payments or MSR failure.
        </div>
      </div>

      {/* Strategy Highlights Matrix Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#005fa6] text-white rounded-2xl p-5 sm:p-6 flex flex-col justify-between shadow-md">
          <div className="text-[10px] font-bold uppercase tracking-widest opacity-70 font-mono">
            Prime Strategy
          </div>
          <div className="my-3">
            <div className="text-3xl sm:text-4xl font-extrabold font-mono mb-1">
              {formatDollar(winner.net_worth_5y)}
            </div>
            <div className="text-xs opacity-80">Projected 5Y Capital Growth</div>
          </div>
          <div className="text-xs pt-3 border-t border-white/20">
            <span className="font-bold">{winner.town} ({winner.path})</span> is your strongest pathway passing all regulatory gates.
          </div>
        </div>

        <div className="bg-white border border-[#d8dadc] rounded-2xl p-5 sm:p-6 flex flex-col justify-between shadow-xs">
          <div className="text-[10px] font-bold uppercase tracking-widest text-[#1a1c1e]/60 font-mono">
            Monthly Commitment
          </div>
          <div className="my-3">
            <div className="text-3xl sm:text-4xl font-extrabold font-mono text-[#1a1c1e] mb-1">
              {formatDollar(winner.monthly_housing)}
            </div>
            <div className="text-xs text-[#1a1c1e]/60">Monthly Instalment / Outlay</div>
          </div>
          <div className="text-xs pt-3 border-t border-[#d8dadc] text-emerald-700 font-semibold font-mono">
            +{formatDollar(inputs.monthlyBudget - (winner.monthly_housing ?? 0))}/mo Budget Buffer
          </div>
        </div>

        <div className="bg-white border border-[#d8dadc] rounded-2xl p-5 sm:p-6 flex flex-col justify-between shadow-xs">
          <div className="text-[10px] font-bold uppercase tracking-widest text-[#1a1c1e]/60 font-mono">
            MAS Lending Check
          </div>
          <div className="my-3">
            <div className="text-2xl sm:text-3xl font-extrabold font-mono text-emerald-700 mb-1 flex items-center gap-1.5">
              <ShieldCheck className="w-7 h-7" />
              <span>PASSED</span>
            </div>
            <div className="text-xs text-[#1a1c1e]/60">MSR ≤ 30% & TDSR ≤ 55%</div>
          </div>
          <div className="text-xs pt-3 border-t border-[#d8dadc] text-[#1a1c1e]/60 font-mono">
            Stress-tested at 4.00% floor rate
          </div>
        </div>
      </div>
    </div>
  );
};

