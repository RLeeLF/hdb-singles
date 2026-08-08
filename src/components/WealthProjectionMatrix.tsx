import React, { useState, useMemo } from 'react';
import { ScenarioResult } from '../types';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line
} from 'recharts';
import {
  AlertTriangle,
  Download,
  Filter,
  CheckCircle,
  BarChart2,
  TrendingUp,
  DollarSign,
  ArrowUpDown
} from 'lucide-react';

interface WealthProjectionMatrixProps {
  scenarios: ScenarioResult[];
  monthlyBudget: number;
}

export const WealthProjectionMatrix: React.FC<WealthProjectionMatrixProps> = ({
  scenarios,
  monthlyBudget
}) => {
  const [filterAffordable, setFilterAffordable] = useState<boolean>(false);
  const [chartMode, setChartMode] = useState<'bar' | 'growth'>('bar');
  const [sortField, setSortField] = useState<'netWorth5Y' | 'monthlyHousing' | 'initialPrice'>('netWorth5Y');
  const [sortAsc, setSortAsc] = useState<boolean>(false);

  const displayedScenarios = useMemo(() => {
    let list = filterAffordable ? scenarios.filter((s) => !s.budgetViolator) : scenarios;

    return [...list].sort((a, b) => {
      let valA = a[sortField] ?? -Infinity;
      let valB = b[sortField] ?? -Infinity;
      return sortAsc ? Number(valA) - Number(valB) : Number(valB) - Number(valA);
    });
  }, [scenarios, filterAffordable, sortField, sortAsc]);

  // Prepare Recharts bar data grouped by location & flat type
  const chartData = useMemo(() => {
    // Group scenarios by label (Town + FlatType)
    const grouped: Record<string, any> = {};

    displayedScenarios.forEach((sc) => {
      const key = sc.label;
      if (!grouped[key]) {
        grouped[key] = {
          name: key,
          town: sc.town,
          flatType: sc.flatType
        };
      }
      if (sc.path === 'BTO Purchase') {
        grouped[key]['BTO'] = sc.netWorth5Y;
        grouped[key]['BTO_Violator'] = sc.budgetViolator;
      } else if (sc.path === 'Resale Purchase') {
        grouped[key]['Resale'] = sc.netWorth5Y;
        grouped[key]['Resale_Violator'] = sc.budgetViolator;
      } else if (sc.path === 'Renting') {
        grouped[key]['Renting'] = sc.netWorth5Y;
        grouped[key]['Renting_Violator'] = sc.budgetViolator;
      }
    });

    return Object.values(grouped);
  }, [displayedScenarios]);

  // Aggregate year by year projection for top scenarios
  const topResale = scenarios.find((s) => s.path === 'Resale Purchase' && !s.budgetViolator) || scenarios[0];
  const topBto = scenarios.find((s) => s.path === 'BTO Purchase' && !s.budgetViolator) || scenarios[1];
  const rentingSc = scenarios.find((s) => s.path === 'Renting') || scenarios[2];

  const yearByYearData = useMemo(() => {
    if (!topResale && !topBto) return [];
    return [0, 1, 2, 3, 4].map((idx) => {
      const yr = idx + 1;
      return {
        year: `Year ${yr}`,
        'Resale Purchase': topResale?.yearByYear[idx]?.equity || 0,
        'BTO Purchase': topBto?.yearByYear[idx]?.equity || 0,
        Renting: rentingSc?.yearByYear[idx]?.equity || 0
      };
    });
  }, [topResale, topBto, rentingSc]);

  const toggleSort = (field: 'netWorth5Y' | 'monthlyHousing' | 'initialPrice') => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  const exportCSV = () => {
    const headers = ['Configuration Label', 'Pathway Option', 'Monthly Payment ($)', 'Initial Asset Price ($)', 'Growth Rate (%)', 'Projected 5Y Net Worth ($)', 'Affordable'];
    const rows = displayedScenarios.map((s) => [
      `"${s.label}"`,
      `"${s.path}"`,
      s.monthlyHousing,
      s.initialPrice ?? '-',
      (s.growthRate * 100).toFixed(2) + '%',
      s.netWorth5Y,
      s.budgetViolator ? 'NO' : 'YES'
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'HDB_5Year_Housing_Strategy_Projections.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Chart Control Bar */}
      <div className="bg-white border-4 border-[#1a1a1a] p-4 sm:p-6 shadow-[5px_5px_0px_0px_#1a1a1a] space-y-4 text-[#1a1a1a]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b-4 border-[#1a1a1a]">
          <div>
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[#ff4b00]">
              Equity Matrix
            </span>
            <h3 className="text-xl sm:text-2xl font-[900] text-[#1a1a1a] uppercase tracking-tighter flex items-center gap-2">
              <BarChart2 className="w-6 h-6 text-[#ff4b00]" />
              5-YEAR HOUSING WEALTH PROJECTION MATRIX
            </h3>
            <p className="text-xs font-bold text-gray-600 uppercase tracking-tight mt-0.5">
              Net Equity Comparison (Asset Appreciation Minus Outstanding Loan Debt)
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* View Mode Toggle */}
            <div className="bg-[#1a1a1a] p-1 border-2 border-[#1a1a1a] flex items-center gap-1">
              <button
                onClick={() => setChartMode('bar')}
                className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                  chartMode === 'bar' ? 'bg-[#ff4b00] text-white' : 'text-white hover:text-[#ff4b00]'
                }`}
              >
                <BarChart2 className="w-3.5 h-3.5" />
                Scenario Bar
              </button>
              <button
                onClick={() => setChartMode('growth')}
                className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                  chartMode === 'growth' ? 'bg-[#ff4b00] text-white' : 'text-white hover:text-[#ff4b00]'
                }`}
              >
                <TrendingUp className="w-3.5 h-3.5" />
                5Y Trajectory
              </button>
            </div>

            {/* Affordability Filter Toggle */}
            <button
              onClick={() => setFilterAffordable(!filterAffordable)}
              className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-wider border-2 border-[#1a1a1a] transition-all flex items-center gap-1.5 ${
                filterAffordable
                  ? 'bg-[#1a1a1a] text-white'
                  : 'bg-white text-[#1a1a1a] hover:bg-gray-100'
              }`}
            >
              <Filter className="w-3.5 h-3.5 text-[#ff4b00]" />
              {filterAffordable ? 'Affordable Only' : 'Filter Affordable'}
            </button>

            {/* CSV Export Button */}
            <button
              onClick={exportCSV}
              className="px-3 py-1.5 text-[10px] font-black uppercase tracking-wider bg-white text-[#1a1a1a] border-2 border-[#1a1a1a] hover:bg-[#ff4b00] hover:text-white transition-all flex items-center gap-1.5 shadow-[2px_2px_0px_0px_#1a1a1a]"
            >
              <Download className="w-3.5 h-3.5" />
              CSV Export
            </button>
          </div>
        </div>

        {/* Recharts Graphical Visualizer */}
        <div className="h-[420px] w-full pt-2">
          {chartMode === 'bar' ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 65 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="name"
                  stroke="#1a1a1a"
                  tick={{ fontSize: 10, fontWeight: 800 }}
                  angle={-30}
                  textAnchor="end"
                  interval={0}
                />
                <YAxis
                  stroke="#1a1a1a"
                  tickFormatter={(val) => `$${(val / 1000).toFixed(0)}k`}
                  tick={{ fontSize: 10, fontWeight: 800 }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1a1a1a',
                    borderColor: '#1a1a1a',
                    borderRadius: '0px',
                    color: '#ffffff',
                    fontSize: '11px',
                    fontWeight: 'bold',
                    textTransform: 'uppercase'
                  }}
                  formatter={(value: any) => [`$${Number(value).toLocaleString()}`, '5Y Net Worth']}
                />
                <Legend verticalAlign="top" wrapperStyle={{ paddingBottom: '10px', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase' }} />
                <Bar dataKey="BTO" name="BTO Purchase" fill="#1a1a1a" radius={[0, 0, 0, 0]} />
                <Bar dataKey="Resale" name="Resale Purchase" fill="#ff4b00" radius={[0, 0, 0, 0]} />
                <Bar dataKey="Renting" name="Renting" fill="#94a3b8" radius={[0, 0, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={yearByYearData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="year" stroke="#1a1a1a" tick={{ fontSize: 11, fontWeight: 800 }} />
                <YAxis
                  stroke="#1a1a1a"
                  tickFormatter={(val) => `$${(val / 1000).toFixed(0)}k`}
                  tick={{ fontSize: 10, fontWeight: 800 }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1a1a1a',
                    borderColor: '#1a1a1a',
                    borderRadius: '0px',
                    color: '#ffffff',
                    fontSize: '11px',
                    fontWeight: 'bold',
                    textTransform: 'uppercase'
                  }}
                  formatter={(value: any) => [`$${Number(value).toLocaleString()}`, 'Equity Position']}
                />
                <Legend verticalAlign="top" wrapperStyle={{ paddingBottom: '10px', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase' }} />
                <Line type="monotone" dataKey="BTO Purchase" stroke="#1a1a1a" strokeWidth={4} dot={{ r: 6, fill: '#1a1a1a' }} />
                <Line type="monotone" dataKey="Resale Purchase" stroke="#ff4b00" strokeWidth={4} dot={{ r: 6, fill: '#ff4b00' }} />
                <Line type="monotone" dataKey="Renting" stroke="#94a3b8" strokeWidth={3} dot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Granular Financial Breakdown Table */}
      <div className="bg-white border-4 border-[#1a1a1a] p-5 shadow-[5px_5px_0px_0px_#1a1a1a] space-y-4 text-[#1a1a1a]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b-4 border-[#1a1a1a]">
          <h4 className="text-base font-black uppercase tracking-tight text-[#1a1a1a] flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-[#ff4b00]" />
            Granular Financial Breakdown Table
          </h4>
          <span className="text-[10px] font-black uppercase text-gray-500 tracking-wider">
            Showing {displayedScenarios.length} Scenarios
          </span>
        </div>

        <div className="overflow-x-auto border-2 border-[#1a1a1a]">
          <table className="w-full text-left text-xs text-[#1a1a1a]">
            <thead className="bg-[#1a1a1a] text-white uppercase text-[10px] font-black tracking-widest border-b-2 border-[#1a1a1a]">
              <tr>
                <th className="p-3">Configuration</th>
                <th className="p-3">Pathway Option</th>
                <th
                  className="p-3 cursor-pointer hover:text-[#ff4b00]"
                  onClick={() => toggleSort('monthlyHousing')}
                >
                  <div className="flex items-center gap-1">
                    Monthly Payment
                    <ArrowUpDown className="w-3 h-3 text-[#ff4b00]" />
                  </div>
                </th>
                <th
                  className="p-3 cursor-pointer hover:text-[#ff4b00]"
                  onClick={() => toggleSort('initialPrice')}
                >
                  <div className="flex items-center gap-1">
                    Initial Asset Price
                    <ArrowUpDown className="w-3 h-3 text-[#ff4b00]" />
                  </div>
                </th>
                <th className="p-3">Growth Path Vector</th>
                <th
                  className="p-3 cursor-pointer hover:text-[#ff4b00]"
                  onClick={() => toggleSort('netWorth5Y')}
                >
                  <div className="flex items-center gap-1">
                    Projected 5Y Equity
                    <ArrowUpDown className="w-3 h-3 text-[#ff4b00]" />
                  </div>
                </th>
                <th className="p-3 text-center">Affordability Status</th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-[#1a1a1a] bg-white">
              {displayedScenarios.map((sc) => {
                const isAffordable = !sc.budgetViolator;
                return (
                  <tr
                    key={sc.id}
                    className={`hover:bg-gray-50 transition-colors font-bold ${
                      sc.budgetViolator ? 'opacity-50 bg-gray-100' : ''
                    }`}
                  >
                    <td className="p-3 uppercase font-black text-[#1a1a1a]">
                      {sc.label}
                    </td>
                    <td className="p-3">
                      <span
                        className={`inline-block px-2 py-0.5 text-[10px] font-black uppercase border-2 border-[#1a1a1a] ${
                          sc.path === 'BTO Purchase'
                            ? 'bg-[#1a1a1a] text-white'
                            : sc.path === 'Resale Purchase'
                            ? 'bg-[#ff4b00] text-white'
                            : 'bg-gray-200 text-[#1a1a1a]'
                        }`}
                      >
                        {sc.path}
                      </span>
                    </td>
                    <td className="p-3 font-mono font-bold">
                      <span className={sc.monthlyHousing > monthlyBudget ? 'text-[#ff4b00]' : 'text-[#1a1a1a]'}>
                        ${sc.monthlyHousing.toLocaleString()}/mo
                      </span>
                    </td>
                    <td className="p-3 font-mono font-bold">
                      {sc.initialPrice ? `$${sc.initialPrice.toLocaleString()}` : '-'}
                    </td>
                    <td className="p-3 font-mono font-bold">
                      {sc.path === 'Renting' ? (
                        <span className="text-gray-400">-</span>
                      ) : (
                        <span
                          className={`font-black ${
                            sc.growthRate >= 0 ? 'text-[#1a1a1a]' : 'text-[#ff4b00]'
                          }`}
                        >
                          {(sc.growthRate * 100).toFixed(2)}% p.a.
                        </span>
                      )}
                    </td>
                    <td className="p-3 font-black text-sm font-mono">
                      <span className={sc.netWorth5Y >= 0 ? 'text-[#ff4b00]' : 'text-gray-500'}>
                        ${sc.netWorth5Y.toLocaleString()}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      {isAffordable ? (
                        <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase text-[#1a1a1a] bg-emerald-100 border-2 border-[#1a1a1a] px-2 py-0.5">
                          <CheckCircle className="w-3 h-3 text-emerald-600" /> Within Budget
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase text-white bg-[#1a1a1a] border-2 border-[#1a1a1a] px-2 py-0.5">
                          <AlertTriangle className="w-3 h-3 text-[#ff4b00]" /> Unaffordable
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

