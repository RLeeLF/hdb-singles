import React from 'react';
import { ScenarioResult } from '../types';
import {
  Award,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  DollarSign,
  ShieldAlert,
  ArrowRight,
  Home,
  Clock,
  Sparkles
} from 'lucide-react';

interface StrategicRecommendationsProps {
  scenarios: ScenarioResult[];
  monthlyBudget: number;
  cashInjection: number;
}

export const StrategicRecommendations: React.FC<StrategicRecommendationsProps> = ({
  scenarios,
  monthlyBudget,
  cashInjection
}) => {
  const affordableScenarios = scenarios.filter((s) => !s.budgetViolator);
  const sortedAffordable = [...affordableScenarios].sort((a, b) => b.netWorth5Y - a.netWorth5Y);

  const topWinner = sortedAffordable.length > 0 ? sortedAffordable[0] : null;

  // Group top by pathway
  const bestBto = affordableScenarios
    .filter((s) => s.path === 'BTO Purchase')
    .sort((a, b) => b.netWorth5Y - a.netWorth5Y)[0];

  const bestResale = affordableScenarios
    .filter((s) => s.path === 'Resale Purchase')
    .sort((a, b) => b.netWorth5Y - a.netWorth5Y)[0];

  const rentingOption = scenarios.find((s) => s.path === 'Renting');

  return (
    <div className="space-y-6 text-[#1a1a1a]">
      {/* Primary Gateway Advisory Box */}
      {topWinner ? (
        <div className="bg-[#ff4b00] text-white border-4 border-[#1a1a1a] p-6 shadow-[6px_6px_0px_0px_#1a1a1a] space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-[#1a1a1a] text-white border-2 border-[#1a1a1a]">
              <Award className="w-8 h-8 text-[#ff4b00]" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/90">
                RECOMMENDED STRATEGIC PATHWAY
              </span>
              <h3 className="text-2xl font-[900] uppercase tracking-tighter text-white">
                5-YEAR CAPITAL MAXIMIZATION WINNER
              </h3>
            </div>
          </div>

          <p className="text-sm font-bold leading-relaxed text-white">
            Within your monthly budget allocation of{' '}
            <u className="decoration-2 underline-offset-4 font-black">${monthlyBudget.toLocaleString()}/mo</u>, the single strategy
            maximizing net equity over 5 years is the{' '}
            <span className="bg-[#1a1a1a] text-white px-2 py-0.5 font-black uppercase tracking-wider">{topWinner.path}</span> pathway tracking a{' '}
            <strong className="underline decoration-white font-black">{topWinner.flatType.replace('_', '-')}</strong> configuration in{' '}
            <strong className="underline decoration-white font-black">{topWinner.town}</strong>.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            <div className="bg-white text-[#1a1a1a] border-4 border-[#1a1a1a] p-4 shadow-[3px_3px_0px_0px_#1a1a1a]">
              <div className="text-[10px] font-black uppercase text-gray-500">Projected 5Y Equity Footprint</div>
              <div className="text-2xl font-[900] text-[#ff4b00] mt-1 font-mono">
                ${topWinner.netWorth5Y.toLocaleString()}
              </div>
              <div className="text-[9px] font-bold text-[#1a1a1a] uppercase mt-0.5">Asset Appreciation minus Debt</div>
            </div>

            <div className="bg-white text-[#1a1a1a] border-4 border-[#1a1a1a] p-4 shadow-[3px_3px_0px_0px_#1a1a1a]">
              <div className="text-[10px] font-black uppercase text-gray-500">Required Monthly Payment</div>
              <div className="text-2xl font-[900] text-[#1a1a1a] mt-1 font-mono">
                ${topWinner.monthlyHousing.toLocaleString()}
                <span className="text-xs font-bold text-gray-500">/mo</span>
              </div>
              <div className="text-[9px] font-black text-emerald-600 uppercase mt-0.5">
                ${(monthlyBudget - topWinner.monthlyHousing).toLocaleString()}/mo under budget ceiling
              </div>
            </div>

            <div className="bg-white text-[#1a1a1a] border-4 border-[#1a1a1a] p-4 shadow-[3px_3px_0px_0px_#1a1a1a]">
              <div className="text-[10px] font-black uppercase text-gray-500">Estimated Entry Price</div>
              <div className="text-2xl font-[900] text-[#1a1a1a] mt-1 font-mono">
                {topWinner.initialPrice ? `$${topWinner.initialPrice.toLocaleString()}` : 'N/A'}
              </div>
              <div className="text-[9px] font-bold text-gray-500 uppercase mt-0.5">
                PSF: ${topWinner.psf}/sqft ({topWinner.floorAreaSqf} sqft)
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-[#1a1a1a] text-white border-4 border-[#1a1a1a] p-6 shadow-[6px_6px_0px_0px_#1a1a1a] space-y-3">
          <div className="flex items-center gap-3">
            <ShieldAlert className="w-8 h-8 text-[#ff4b00] flex-shrink-0" />
            <div>
              <h3 className="text-lg font-black uppercase text-[#ff4b00]">
                BUDGET THRESHOLD EXCEEDED
              </h3>
              <p className="text-xs font-bold uppercase tracking-wide text-gray-300">
                All housing configurations exceed your active monthly payment target slider (${monthlyBudget.toLocaleString()}/mo). Expand your budget ceiling or select smaller flat types.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Pathway Comparative Breakdown Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* BTO Option */}
        <div className="bg-white border-4 border-[#1a1a1a] p-5 shadow-[5px_5px_0px_0px_#1a1a1a] space-y-4 flex flex-col justify-between text-[#1a1a1a]">
          <div>
            <div className="flex items-center justify-between pb-3 border-b-4 border-[#1a1a1a]">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-[#ff4b00]" />
                <h4 className="font-black uppercase text-base text-[#1a1a1a]">BTO Purchase Path</h4>
              </div>
              <span className="text-[9px] font-black uppercase bg-[#1a1a1a] text-white px-2 py-0.5 border border-[#1a1a1a]">
                Single Scheme
              </span>
            </div>

            <p className="text-xs font-bold text-gray-600 mt-3 leading-relaxed uppercase">
              Singles age 35+ are eligible for 2-Room Flexi BTO flats across all location classifications (Standard, Plus, Prime).
            </p>

            {bestBto ? (
              <div className="mt-4 space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b-2 border-[#1a1a1a]">
                  <span className="font-bold text-gray-600 uppercase">Best Config:</span>
                  <span className="font-black text-[#1a1a1a] uppercase">{bestBto.label}</span>
                </div>
                <div className="flex justify-between py-1 border-b-2 border-[#1a1a1a]">
                  <span className="font-bold text-gray-600 uppercase">Est. Entry Price:</span>
                  <span className="font-mono font-black text-[#ff4b00]">${bestBto.initialPrice?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-1 border-b-2 border-[#1a1a1a]">
                  <span className="font-bold text-gray-600 uppercase">Monthly Payment:</span>
                  <span className="font-mono font-bold text-[#1a1a1a]">${bestBto.monthlyHousing.toLocaleString()}/mo</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="font-bold text-gray-600 uppercase">5Y Net Equity:</span>
                  <span className="font-mono font-black text-[#ff4b00] text-sm">${bestBto.netWorth5Y.toLocaleString()}</span>
                </div>
              </div>
            ) : (
              <div className="mt-4 text-xs font-black uppercase text-[#ff4b00] bg-gray-100 p-3 border-2 border-[#1a1a1a]">
                No BTO option within budget threshold.
              </div>
            )}
          </div>

          <div className="pt-3 border-t-4 border-[#1a1a1a] text-[10px] font-bold text-gray-700 space-y-1 uppercase">
            <div className="text-[#1a1a1a] font-black">Key Advantages:</div>
            <div>• Subsidized entry price + EHG Single Grants up to $40,000.</div>
            <div>• Full 99-year lease freshness.</div>
          </div>
        </div>

        {/* Resale Option */}
        <div className="bg-white border-4 border-[#1a1a1a] p-5 shadow-[5px_5px_0px_0px_#1a1a1a] space-y-4 flex flex-col justify-between text-[#1a1a1a]">
          <div>
            <div className="flex items-center justify-between pb-3 border-b-4 border-[#1a1a1a]">
              <div className="flex items-center gap-2">
                <Home className="w-5 h-5 text-[#ff4b00]" />
                <h4 className="font-black uppercase text-base text-[#1a1a1a]">Resale Purchase Path</h4>
              </div>
              <span className="text-[9px] font-black uppercase bg-[#ff4b00] text-white px-2 py-0.5 border border-[#1a1a1a]">
                Immediate Entry
              </span>
            </div>

            <p className="text-xs font-bold text-gray-600 mt-3 leading-relaxed uppercase">
              Buy any flat size (2-Room to 5-Room / Exec) in any open market town immediately with zero construction wait time.
            </p>

            {bestResale ? (
              <div className="mt-4 space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b-2 border-[#1a1a1a]">
                  <span className="font-bold text-gray-600 uppercase">Best Config:</span>
                  <span className="font-black text-[#1a1a1a] uppercase">{bestResale.label}</span>
                </div>
                <div className="flex justify-between py-1 border-b-2 border-[#1a1a1a]">
                  <span className="font-bold text-gray-600 uppercase">Market Price:</span>
                  <span className="font-mono font-black text-[#ff4b00]">${bestResale.initialPrice?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-1 border-b-2 border-[#1a1a1a]">
                  <span className="font-bold text-gray-600 uppercase">Monthly Payment:</span>
                  <span className="font-mono font-bold text-[#1a1a1a]">${bestResale.monthlyHousing.toLocaleString()}/mo</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="font-bold text-gray-600 uppercase">5Y Net Equity:</span>
                  <span className="font-mono font-black text-[#ff4b00] text-sm">${bestResale.netWorth5Y.toLocaleString()}</span>
                </div>
              </div>
            ) : (
              <div className="mt-4 text-xs font-black uppercase text-[#ff4b00] bg-gray-100 p-3 border-2 border-[#1a1a1a]">
                No Resale option within current budget.
              </div>
            )}
          </div>

          <div className="pt-3 border-t-4 border-[#1a1a1a] text-[10px] font-bold text-gray-700 space-y-1 uppercase">
            <div className="text-[#1a1a1a] font-black">Key Advantages:</div>
            <div>• Zero construction wait time.</div>
            <div>• Eligible for CPF Housing Grant ($40k) + PHG ($15k) + EHG ($40k).</div>
          </div>
        </div>

        {/* Renting Option */}
        <div className="bg-white border-4 border-[#1a1a1a] p-5 shadow-[5px_5px_0px_0px_#1a1a1a] space-y-4 flex flex-col justify-between text-[#1a1a1a]">
          <div>
            <div className="flex items-center justify-between pb-3 border-b-4 border-[#1a1a1a]">
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-gray-500" />
                <h4 className="font-black uppercase text-base text-[#1a1a1a]">Renting Path</h4>
              </div>
              <span className="text-[9px] font-black uppercase bg-gray-200 text-[#1a1a1a] px-2 py-0.5 border border-[#1a1a1a]">
                Capital Expense
              </span>
            </div>

            <p className="text-xs font-bold text-gray-600 mt-3 leading-relaxed uppercase">
              Renting private room or whole HDB flat while preserving full liquid cash flexibility.
            </p>

            {rentingOption && (
              <div className="mt-4 space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b-2 border-[#1a1a1a]">
                  <span className="font-bold text-gray-600 uppercase">Monthly Rent:</span>
                  <span className="font-mono font-bold text-[#1a1a1a]">${rentingOption.monthlyHousing.toLocaleString()}/mo</span>
                </div>
                <div className="flex justify-between py-1 border-b-2 border-[#1a1a1a]">
                  <span className="font-bold text-gray-600 uppercase">Annual Inflation:</span>
                  <span className="font-mono font-bold text-[#1a1a1a]">3.5% p.a.</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="font-bold text-gray-600 uppercase">5Y Capital Drain:</span>
                  <span className="font-mono font-black text-gray-500 text-sm">${rentingOption.netWorth5Y.toLocaleString()}</span>
                </div>
              </div>
            )}
          </div>

          <div className="pt-3 border-t-4 border-[#1a1a1a] text-[10px] font-bold text-gray-700 space-y-1 uppercase">
            <div className="text-[#1a1a1a] font-black">Key Considerations:</div>
            <div>• 100% sunk cost without equity accumulation.</div>
            <div>• Total flexibility if job mobility or relocation is required.</div>
          </div>
        </div>
      </div>
    </div>
  );
};

