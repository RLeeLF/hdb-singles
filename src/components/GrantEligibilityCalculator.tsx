import React, { useState, useMemo } from 'react';
import { checkGrantEligibility } from '../utils/calculator';
import { FlatType, Pathway } from '../types';
import {
  ShieldCheck,
  DollarSign,
  Info,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Award
} from 'lucide-react';

export const GrantEligibilityCalculator: React.FC = () => {
  const [monthlyIncome, setMonthlyIncome] = useState<number>(3800);
  const [flatType, setFlatType] = useState<FlatType>('3_ROOM');
  const [pathway, setPathway] = useState<Pathway>('Resale Purchase');
  const [nearParents, setNearParents] = useState<boolean>(true);

  const grantResult = useMemo(() => {
    return checkGrantEligibility(monthlyIncome, flatType, pathway, nearParents);
  }, [monthlyIncome, flatType, pathway, nearParents]);

  return (
    <div className="bg-white border-4 border-[#1a1a1a] p-6 shadow-[5px_5px_0px_0px_#1a1a1a] space-y-6 text-[#1a1a1a]">
      <div className="flex items-center gap-3 pb-4 border-b-4 border-[#1a1a1a]">
        <div className="p-3 bg-[#1a1a1a] text-white border-2 border-[#1a1a1a]">
          <ShieldCheck className="w-8 h-8 text-[#ff4b00]" />
        </div>
        <div>
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[#ff4b00]">CPF POLICY MATRIX</span>
          <h3 className="text-xl sm:text-2xl font-[900] uppercase tracking-tight text-[#1a1a1a]">SINGLES AGE 35+ GRANT & ELIGIBILITY CALCULATOR</h3>
          <p className="text-xs font-bold text-gray-600 uppercase tracking-wide mt-0.5">
            Estimate total Singapore HDB housing grants (CPF Housing Grant, EHG, and PHG).
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Input Parameters Form */}
        <div className="space-y-4 bg-[#fcfaf7] p-5 border-4 border-[#1a1a1a] shadow-[3px_3px_0px_0px_#1a1a1a]">
          <h4 className="text-xs font-black text-[#1a1a1a] uppercase tracking-widest flex items-center gap-2">
            <span className="bg-[#ff4b00] text-white px-2 py-0.5">STEP 01</span>
            PERSONAL & PROPERTY CONTEXT
          </h4>

          {/* Monthly Income */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase text-[#1a1a1a] flex justify-between">
              <span>Average Gross Monthly Income:</span>
              <span className="text-[#ff4b00] font-black">${monthlyIncome.toLocaleString()}/mo</span>
            </label>
            <input
              type="range"
              min="1000"
              max="15000"
              step="250"
              value={monthlyIncome}
              onChange={(e) => setMonthlyIncome(Number(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-none appearance-none cursor-pointer accent-[#ff4b00]"
            />
            <div className="flex justify-between text-[9px] font-black uppercase text-gray-500">
              <span>$1,000</span>
              <span>$4,500 (EHG Cap)</span>
              <span>$14,000 (Resale Cap)</span>
            </div>
          </div>

          {/* Pathway Selection */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase text-[#1a1a1a]">Target Strategy Pathway:</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setPathway('Resale Purchase')}
                className={`py-2 px-3 border-2 border-[#1a1a1a] text-xs font-black uppercase transition-all ${
                  pathway === 'Resale Purchase'
                    ? 'bg-[#1a1a1a] text-white'
                    : 'bg-white text-[#1a1a1a] hover:bg-[#ff4b00] hover:text-white'
                }`}
              >
                Resale Purchase
              </button>
              <button
                onClick={() => setPathway('BTO Purchase')}
                className={`py-2 px-3 border-2 border-[#1a1a1a] text-xs font-black uppercase transition-all ${
                  pathway === 'BTO Purchase'
                    ? 'bg-[#1a1a1a] text-white'
                    : 'bg-white text-[#1a1a1a] hover:bg-[#ff4b00] hover:text-white'
                }`}
              >
                BTO Purchase
              </button>
            </div>
          </div>

          {/* Flat Type Selection */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase text-[#1a1a1a]">Target Flat Size:</label>
            <div className="grid grid-cols-4 gap-1.5">
              {(['2_ROOM', '3_ROOM', '4_ROOM', '5_ROOM'] as FlatType[]).map((ft) => (
                <button
                  key={ft}
                  onClick={() => setFlatType(ft)}
                  className={`py-2 text-xs font-black uppercase border-2 border-[#1a1a1a] transition-all ${
                    flatType === ft
                      ? 'bg-[#ff4b00] text-white'
                      : 'bg-white text-[#1a1a1a] hover:bg-gray-100'
                  }`}
                >
                  {ft.replace('_', '-')}
                </button>
              ))}
            </div>
          </div>

          {/* Proximity Toggle */}
          <div className="pt-2">
            <label className="flex items-center gap-3 text-xs text-[#1a1a1a] cursor-pointer bg-white p-3 border-2 border-[#1a1a1a]">
              <input
                type="checkbox"
                checked={nearParents}
                onChange={(e) => setNearParents(e.target.checked)}
                className="w-5 h-5 border-2 border-[#1a1a1a] accent-[#ff4b00]"
              />
              <div>
                <div className="font-black uppercase text-[#1a1a1a]">Living with or within 4km of Parents/Children</div>
                <div className="text-[10px] font-bold uppercase text-gray-500">Qualifies for Proximity Housing Grant (PHG)</div>
              </div>
            </label>
          </div>
        </div>

        {/* Grant Breakdown & Results Card */}
        <div className="bg-[#fcfaf7] p-5 border-4 border-[#1a1a1a] shadow-[3px_3px_0px_0px_#1a1a1a] space-y-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b-4 border-[#1a1a1a]">
              <span className="text-xs font-black uppercase tracking-widest text-[#1a1a1a] flex items-center gap-2">
                <Award className="w-4 h-4 text-[#ff4b00]" />
                TOTAL ESTIMATED GRANTS
              </span>
              <span className="text-2xl font-black font-mono text-[#ff4b00]">
                ${grantResult.totalGrants.toLocaleString()}
              </span>
            </div>

            <div className="mt-4 space-y-3">
              {/* CPF Housing Grant for Singles */}
              <div className="bg-white p-3 border-2 border-[#1a1a1a] flex items-center justify-between">
                <div>
                  <div className="text-xs font-black uppercase text-[#1a1a1a]">CPF Housing Grant (Singles)</div>
                  <div className="text-[9px] font-bold uppercase text-gray-500">2-4 Room: $40k | 5-Room: $25k</div>
                </div>
                <div className="text-sm font-black font-mono text-[#1a1a1a]">
                  ${grantResult.singleGrant.toLocaleString()}
                </div>
              </div>

              {/* EHG for Singles */}
              <div className="bg-white p-3 border-2 border-[#1a1a1a] flex items-center justify-between">
                <div>
                  <div className="text-xs font-black uppercase text-[#1a1a1a]">Enhanced Grant (EHG)</div>
                  <div className="text-[9px] font-bold uppercase text-gray-500">Income tiered for earnings ≤ $4,500</div>
                </div>
                <div className="text-sm font-black font-mono text-[#ff4b00]">
                  ${grantResult.ehgGrant.toLocaleString()}
                </div>
              </div>

              {/* PHG for Singles */}
              <div className="bg-white p-3 border-2 border-[#1a1a1a] flex items-center justify-between">
                <div>
                  <div className="text-xs font-black uppercase text-[#1a1a1a]">Proximity Grant (PHG)</div>
                  <div className="text-[9px] font-bold uppercase text-gray-500">Within 4km parent/child distance</div>
                </div>
                <div className="text-sm font-black font-mono text-[#1a1a1a]">
                  ${grantResult.phgGrant.toLocaleString()}
                </div>
              </div>
            </div>
          </div>

          {/* Eligibility Criteria Checklist */}
          <div className="space-y-2 pt-3 border-t-4 border-[#1a1a1a] text-xs">
            <div className="font-black uppercase text-[#1a1a1a]">Income Cap Compliance Status:</div>
            <div className="flex items-center gap-2 font-bold uppercase text-[11px]">
              {grantResult.eligibleBTO ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              ) : (
                <XCircle className="w-4 h-4 text-[#ff4b00]" />
              )}
              <span>
                Single BTO Income Ceiling ($7,000/mo):{' '}
                <strong className={grantResult.eligibleBTO ? 'text-emerald-700 font-black' : 'text-[#ff4b00] font-black'}>
                  {grantResult.eligibleBTO ? 'PASS' : 'EXCEEDS'}
                </strong>
              </span>
            </div>

            <div className="flex items-center gap-2 font-bold uppercase text-[11px]">
              {grantResult.eligibleResale ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              ) : (
                <XCircle className="w-4 h-4 text-[#ff4b00]" />
              )}
              <span>
                Single Resale Income Ceiling ($14,000/mo):{' '}
                <strong className={grantResult.eligibleResale ? 'text-emerald-700 font-black' : 'text-[#ff4b00] font-black'}>
                  {grantResult.eligibleResale ? 'PASS' : 'EXCEEDS'}
                </strong>
              </span>
            </div>

            {/* Notes */}
            <div className="mt-3 bg-white p-3 border-2 border-[#1a1a1a] text-[10px] font-bold uppercase text-gray-700 space-y-1">
              {grantResult.notes.map((note, idx) => (
                <div key={idx} className="flex items-start gap-1.5">
                  <Info className="w-3.5 h-3.5 text-[#ff4b00] flex-shrink-0 mt-0.5" />
                  <span>{note}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

