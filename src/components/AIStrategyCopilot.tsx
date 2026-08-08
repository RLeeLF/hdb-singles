import React, { useState, useEffect } from 'react';
import { AIAdvisorRequest, AIAdvisorResponse, ScenarioResult } from '../types';
import {
  Sparkles,
  Send,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertOctagon,
  ListTodo,
  Bot,
  MessageSquare
} from 'lucide-react';

interface AIStrategyCopilotProps {
  monthlyBudget: number;
  cashInjection: number;
  interestRate: number;
  baseRent: number;
  selectedTowns: string[];
  selectedFlatTypes: string[];
  scenarios: ScenarioResult[];
}

export const AIStrategyCopilot: React.FC<AIStrategyCopilotProps> = ({
  monthlyBudget,
  cashInjection,
  interestRate,
  baseRent,
  selectedTowns,
  selectedFlatTypes,
  scenarios
}) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [advice, setAdvice] = useState<AIAdvisorResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [userQuery, setUserQuery] = useState<string>('');

  const topScenario = scenarios.find((s) => !s.budgetViolator) || scenarios[0];

  const fetchAIAdvice = async (queryCustom?: string) => {
    setLoading(true);
    setError(null);

    try {
      const payload: AIAdvisorRequest = {
        monthlyBudget,
        cashInjection,
        interestRate,
        baseRent,
        selectedTowns,
        selectedFlatTypes: selectedFlatTypes as any,
        topScenario: topScenario
          ? {
              town: topScenario.town,
              flatType: topScenario.flatType,
              path: topScenario.path,
              netWorth: topScenario.netWorth5Y,
              monthlyCost: topScenario.monthlyHousing
            }
          : undefined,
        userQuery: queryCustom || userQuery
      };

      const res = await fetch('/api/housing-advisor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        throw new Error(`Server returned status ${res.status}`);
      }

      const data: AIAdvisorResponse = await res.json();
      setAdvice(data);
    } catch (err: any) {
      console.error('Failed to fetch AI advice:', err);
      setError(err.message || 'Unable to connect to Gemini AI Advisor server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAIAdvice();
  }, [monthlyBudget, cashInjection, interestRate]);

  const presetQuestions = [
    'Should I buy a 2-Room BTO or 4-Room Resale in Punggol at age 35?',
    'How does the Prime/Plus HDB classification affect my 10-year resale strategy?',
    'How do I balance CPF OA usage vs bank loan interest for a single home purchase?'
  ];

  const handlePresetClick = (q: string) => {
    setUserQuery(q);
    fetchAIAdvice(q);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userQuery.trim()) return;
    fetchAIAdvice(userQuery);
  };

  return (
    <div className="bg-white border-4 border-[#1a1a1a] p-6 shadow-[5px_5px_0px_0px_#1a1a1a] space-y-6 text-[#1a1a1a]">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b-4 border-[#1a1a1a]">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-[#1a1a1a] text-white border-2 border-[#1a1a1a]">
            <Sparkles className="w-8 h-8 text-[#ff4b00]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-black uppercase bg-[#ff4b00] text-white px-2 py-0.5 border border-[#1a1a1a]">
                Gemini 3.6 Flash Powered
              </span>
              <span className="text-xs font-bold uppercase text-gray-500">Singapore HDB Copilot</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-[900] uppercase tracking-tight text-[#1a1a1a] mt-0.5">
              INTERACTIVE AI HOUSING STRATEGY ADVISOR
            </h3>
          </div>
        </div>

        <button
          onClick={() => fetchAIAdvice()}
          disabled={loading}
          className="px-4 py-2 bg-[#1a1a1a] hover:bg-[#ff4b00] text-white font-black text-xs uppercase border-2 border-[#1a1a1a] transition-all shadow-[2px_2px_0px_0px_#1a1a1a] flex items-center gap-2 self-start md:self-auto disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin text-[#ff4b00]" /> : <Sparkles className="w-4 h-4 text-[#ff4b00]" />}
          Refresh AI Report
        </button>
      </div>

      {/* Preset Query Launcher */}
      <div className="space-y-2">
        <div className="text-xs font-black uppercase text-[#1a1a1a] flex items-center gap-1.5 tracking-wider">
          <MessageSquare className="w-3.5 h-3.5 text-[#ff4b00]" />
          QUICK ASK GEMINI ADVISOR:
        </div>
        <div className="flex flex-wrap gap-2">
          {presetQuestions.map((q, idx) => (
            <button
              key={idx}
              onClick={() => handlePresetClick(q)}
              className="text-xs font-bold uppercase bg-[#fcfaf7] hover:bg-[#ff4b00] hover:text-white text-[#1a1a1a] border-2 border-[#1a1a1a] px-3 py-1.5 transition-all text-left shadow-[2px_2px_0px_0px_#1a1a1a]"
            >
              "{q}"
            </button>
          ))}
        </div>
      </div>

      {/* Custom Prompt Input */}
      <form onSubmit={handleFormSubmit} className="relative">
        <input
          type="text"
          placeholder="ASK CUSTOM QUESTION (E.G. CAN I AFFORD A 3-ROOM IN TOA PAYOH ON $4.5K INCOME?)..."
          value={userQuery}
          onChange={(e) => setUserQuery(e.target.value)}
          className="w-full text-xs bg-[#fcfaf7] border-2 border-[#1a1a1a] pl-4 pr-12 py-3 text-[#1a1a1a] font-bold uppercase placeholder-gray-500 focus:outline-none focus:border-[#ff4b00]"
        />
        <button
          type="submit"
          disabled={loading || !userQuery.trim()}
          className="absolute right-2 top-2 p-2 bg-[#ff4b00] hover:bg-[#1a1a1a] text-white border-2 border-[#1a1a1a] transition-all disabled:opacity-40"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>

      {/* Loading Indicator */}
      {loading && (
        <div className="bg-[#fcfaf7] border-4 border-[#1a1a1a] p-8 text-center space-y-3 shadow-[4px_4px_0px_0px_#1a1a1a]">
          <Loader2 className="w-8 h-8 text-[#ff4b00] animate-spin mx-auto" />
          <div className="text-sm font-black uppercase text-[#1a1a1a]">
            SYNTHESIZING SINGAPORE HOUSING REGULATIONS & FINANCIAL PROJECTIONS...
          </div>
          <div className="text-xs font-bold text-gray-600 uppercase">
            Evaluating CPF Grants, EHG limits, Single Scheme regulations, and 5-year capital trajectories.
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && !loading && (
        <div className="bg-[#1a1a1a] text-white border-4 border-[#1a1a1a] p-4 text-xs font-bold uppercase flex items-center gap-2">
          <AlertOctagon className="w-5 h-5 text-[#ff4b00] flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* AI Strategy Response Display */}
      {advice && !loading && (
        <div className="space-y-6">
          {/* Executive Recommendation Box */}
          <div className="bg-[#fcfaf7] border-4 border-[#1a1a1a] p-5 shadow-[4px_4px_0px_0px_#1a1a1a] space-y-2">
            <div className="flex items-center gap-2 text-xs font-black text-[#ff4b00] uppercase tracking-widest">
              <Bot className="w-4 h-4" />
              EXECUTIVE STRATEGIC ADVISORY SUMMARY
            </div>
            <p className="text-sm font-bold text-[#1a1a1a] leading-relaxed">
              {advice.recommendation}
            </p>
          </div>

          {/* Pros & Cons Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Pros */}
            <div className="bg-white border-4 border-[#1a1a1a] p-4 shadow-[3px_3px_0px_0px_#1a1a1a] space-y-3">
              <div className="text-xs font-black text-emerald-700 uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                STRATEGIC ADVANTAGES (PROS)
              </div>
              <ul className="space-y-2 text-xs font-bold text-[#1a1a1a] uppercase">
                {advice.prosAndCons.pros.map((p, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-[#ff4b00] font-black">•</span>
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Cons / Trade-offs */}
            <div className="bg-white border-4 border-[#1a1a1a] p-4 shadow-[3px_3px_0px_0px_#1a1a1a] space-y-3">
              <div className="text-xs font-black text-[#ff4b00] uppercase tracking-wider flex items-center gap-1.5">
                <XCircle className="w-4 h-4" />
                KEY TRADE-OFFS (CONS)
              </div>
              <ul className="space-y-2 text-xs font-bold text-[#1a1a1a] uppercase">
                {advice.prosAndCons.cons.map((c, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-[#1a1a1a] font-black">•</span>
                    <span>{c}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Key Risks & Next Action Steps */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Key Risks */}
            <div className="bg-white border-4 border-[#1a1a1a] p-4 shadow-[3px_3px_0px_0px_#1a1a1a] space-y-3">
              <div className="text-xs font-black text-[#ff4b00] uppercase tracking-wider flex items-center gap-1.5">
                <AlertOctagon className="w-4 h-4" />
                RISK EXPOSURE TO MONITOR
              </div>
              <ul className="space-y-2 text-xs font-bold text-[#1a1a1a] uppercase">
                {advice.keyRisks.map((r, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-[#ff4b00] font-black">⚠️</span>
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Action Items */}
            <div className="bg-white border-4 border-[#1a1a1a] p-4 shadow-[3px_3px_0px_0px_#1a1a1a] space-y-3">
              <div className="text-xs font-black text-[#1a1a1a] uppercase tracking-wider flex items-center gap-1.5">
                <ListTodo className="w-4 h-4 text-[#ff4b00]" />
                RECOMMENDED NEXT ACTION STEPS
              </div>
              <ul className="space-y-2 text-xs font-bold text-[#1a1a1a] uppercase">
                {advice.actionItems.map((a, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-[#ff4b00] font-black">{i + 1}.</span>
                    <span>{a}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

