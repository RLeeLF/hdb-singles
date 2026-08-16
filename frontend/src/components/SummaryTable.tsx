import React from "react";
import { SimulationResultRow } from "../types";
import { formatDollar } from "../lib/formatters";

interface SummaryTableProps {
  rows: SimulationResultRow[];
}

export const SummaryTable: React.FC<SummaryTableProps> = ({ rows }) => {
  return (
    <div className="bg-white rounded-2xl border border-[#d8dadc] overflow-hidden shadow-xs flex flex-col">
      <div className="p-4 sm:px-6 sm:py-4 border-b border-[#d8dadc] flex items-center justify-between bg-white">
        <div>
          <h3 className="text-sm sm:text-base font-bold text-[#1a1c1e] font-heading">
            Cross-Comparison Financial Breakdown
          </h3>
          <p className="text-[11px] text-[#1a1c1e]/60">
            Evaluating monthly instalments, asset valuation, projected 5-year equity, and MAS stress tests
          </p>
        </div>
        <span className="text-[10px] font-bold uppercase tracking-wider text-[#005fa6] bg-blue-50 px-2.5 py-1 rounded-md border border-blue-200 font-mono">
          {rows.length} Pathway{rows.length !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-[#f8f9fb] border-b border-[#d8dadc]">
              <th className="p-3.5 sm:p-4 font-bold uppercase tracking-wider text-[#1a1c1e]/50 text-[10px] font-mono">
                Configuration
              </th>
              <th className="p-3.5 sm:p-4 font-bold uppercase tracking-wider text-[#1a1c1e]/50 text-[10px] font-mono">
                Pathway
              </th>
              <th className="p-3.5 sm:p-4 font-bold uppercase tracking-wider text-[#1a1c1e]/50 text-[10px] font-mono text-right">
                Monthly
              </th>
              <th className="p-3.5 sm:p-4 font-bold uppercase tracking-wider text-[#1a1c1e]/50 text-[10px] font-mono text-right">
                Initial Price
              </th>
              <th className="p-3.5 sm:p-4 font-bold uppercase tracking-wider text-[#1a1c1e]/50 text-[10px] font-mono text-right">
                5Y Net Worth
              </th>
              <th className="p-3.5 sm:p-4 font-bold uppercase tracking-wider text-[#1a1c1e]/50 text-[10px] font-mono text-center">
                Lending (MSR/TDSR)
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#d8dadc]">
            {rows.map((row, idx) => {
              const unavailable = row.scheme_ineligible || row.bto_data_unavailable;
              const isBto = row.path === "BTO Purchase";
              const isRenting = row.path === "Renting";
              const isRegulatoryFail = row.regulatory_fail;
              const isBudgetViolator = row.budget_violator;

              let rowBg = "hover:bg-[#f8f9fb]/80";
              if (isBto && !unavailable && !isRegulatoryFail) {
                rowBg = "bg-emerald-50/40 hover:bg-emerald-50/70";
              } else if (isRegulatoryFail || isBudgetViolator) {
                rowBg = "bg-rose-50/30 hover:bg-rose-50/60";
              }

              let lendingEligibilityText = "YES";
              let lendingBadgeClass = "bg-emerald-100 text-emerald-800";

              if (row.scheme_ineligible) {
                lendingEligibilityText = "N/A (2-ROOM ONLY)";
                lendingBadgeClass = "bg-slate-100 text-slate-500";
              } else if (row.bto_data_unavailable) {
                lendingEligibilityText = "N/A (NO LAUNCH)";
                lendingBadgeClass = "bg-slate-100 text-slate-500";
              } else if (isRenting) {
                lendingEligibilityText = "N/A";
                lendingBadgeClass = "text-[#1a1c1e]/40 bg-transparent";
              } else if (isRegulatoryFail) {
                lendingEligibilityText = "NO (MSR/TDSR)";
                lendingBadgeClass = "bg-rose-100 text-rose-800";
              }

              const isNegativeNetWorth = row.net_worth_5y !== null && row.net_worth_5y < 0;

              return (
                <tr
                  key={`${row.town}-${row.flat_type}-${row.path}-${idx}`}
                  className={`transition-colors ${rowBg}`}
                >
                  {/* Configuration */}
                  <td className="p-3.5 sm:p-4 font-semibold text-[#1a1c1e]">
                    <div className="flex flex-col">
                      <span className="font-semibold text-xs text-[#1a1c1e]">
                        {row.town} ({row.flat_type.replace("_ROOM", "-Room")})
                      </span>
                      <span className="text-[10px] text-[#1a1c1e]/50 font-mono">
                        {row.cluster_label}
                      </span>
                    </div>
                  </td>

                  {/* Pathway */}
                  <td className="p-3.5 sm:p-4">
                    <span
                      className={`font-bold text-xs ${
                        isBto
                          ? "text-emerald-700"
                          : isRenting
                          ? "text-rose-600"
                          : "text-[#005fa6]"
                      }`}
                    >
                      {row.path}
                    </span>
                  </td>

                  {/* Monthly Payment */}
                  <td className="p-3.5 sm:p-4 text-right font-medium">
                    {unavailable ? (
                      <span className="text-[#1a1c1e]/40 font-mono">—</span>
                    ) : (
                      <div className="flex flex-col items-end">
                        <span
                          className={`font-bold font-mono ${
                            isBudgetViolator ? "text-rose-600 underline" : "text-[#1a1c1e]"
                          }`}
                        >
                          {formatDollar(row.monthly_housing)}
                        </span>
                        {isBudgetViolator && (
                          <span className="text-[9px] text-rose-600 font-mono uppercase">
                            Over Budget
                          </span>
                        )}
                      </div>
                    )}
                  </td>

                  {/* Initial Asset Price */}
                  <td className="p-3.5 sm:p-4 text-right font-medium text-[#1a1c1e] font-mono">
                    {unavailable || row.initial_price === null ? (
                      <span className="text-[#1a1c1e]/40">—</span>
                    ) : (
                      formatDollar(row.initial_price)
                    )}
                  </td>

                  {/* Projected 5Y Net Worth */}
                  <td className="p-3.5 sm:p-4 text-right font-bold whitespace-nowrap font-mono">
                    {unavailable ? (
                      <span className="text-[#1a1c1e]/40 font-normal">—</span>
                    ) : (
                      <span
                        className={
                          isNegativeNetWorth
                            ? "text-rose-600 font-bold"
                            : "text-emerald-700 font-bold"
                        }
                      >
                        {formatDollar(row.net_worth_5y)}
                      </span>
                    )}
                  </td>

                  {/* Lending (MSR/TDSR) */}
                  <td className="p-3.5 sm:p-4 text-center">
                    <span
                      className={`px-2 py-1 rounded-md text-[10px] font-bold font-mono tracking-wide ${lendingBadgeClass}`}
                    >
                      {lendingEligibilityText}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

