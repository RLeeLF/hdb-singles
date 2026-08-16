import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { SimulationResultRow } from "../types";
import { formatDollar } from "../lib/formatters";

interface ProjectionsChartProps {
  data: SimulationResultRow[];
}

interface ChartItem {
  displayName: string;
  shortLabel: string;
  town: string;
  flatType: string;
  btoNetWorth?: number;
  resaleNetWorth?: number;
  rentNetWorth?: number;
  btoDisplay?: string;
  resaleDisplay?: string;
  rentDisplay?: string;
  hasBto: boolean;
}

export const ProjectionsChart: React.FC<ProjectionsChartProps> = ({ data }) => {
  // Filter out bto_data_unavailable rows for chart visualization, matching app.R:
  // df <- results_data() %>% filter(!bto_data_unavailable)
  const validRows = data.filter((row) => !row.bto_data_unavailable);

  // Group by (town x flat_type) combination
  const groupsMap = new Map<string, ChartItem>();

  for (const row of validRows) {
    const key = `${row.town}-${row.flat_type}`;
    if (!groupsMap.has(key)) {
      const short = `${row.town.substring(0, 3)} (${row.flat_type.replace("_ROOM", "R").replace("_", "-")})`;
      groupsMap.set(key, {
        displayName: row.display_name,
        shortLabel: short,
        town: row.town,
        flatType: row.flat_type,
        hasBto: false,
      });
    }

    const item = groupsMap.get(key)!;

    if (row.path === "BTO Purchase" && row.net_worth_5y !== null) {
      item.btoNetWorth = row.net_worth_5y;
      item.btoDisplay = row.display_name;
      item.hasBto = true;
    } else if (row.path === "Resale Purchase" && row.net_worth_5y !== null) {
      item.resaleNetWorth = row.net_worth_5y;
      item.resaleDisplay = row.display_name;
    } else if (row.path === "Renting" && row.net_worth_5y !== null) {
      item.rentNetWorth = row.net_worth_5y;
      item.rentDisplay = row.display_name;
    }
  }

  const chartData = Array.from(groupsMap.values());

  if (chartData.length === 0) {
    return (
      <div className="bg-white p-8 rounded-2xl border border-[#d8dadc] text-center text-[#1a1c1e]/50 font-mono text-xs">
        No valid projection data available for the current configuration.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-[#d8dadc] p-5 sm:p-6 shadow-xs flex flex-col">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
        <h3 className="text-[10px] font-bold uppercase tracking-widest text-[#1a1c1e]/60 font-mono">
          Wealth Growth (5Y Forecast)
        </h3>
        <div className="flex items-center gap-4 text-[10px] font-bold font-mono">
          <span className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
            <span>BTO</span>
          </span>
          <span className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-blue-600"></div>
            <span>RESALE</span>
          </span>
          <span className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-rose-500"></div>
            <span>RENTING</span>
          </span>
        </div>
      </div>

      <div className="h-64 sm:h-72 w-full pt-1">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 15, right: 15, left: 10, bottom: 25 }}
          >
            <CartesianGrid strokeDasharray="2 2" stroke="#e5e7eb" vertical={false} />
            <XAxis
              dataKey="shortLabel"
              tick={{ fill: "#1a1c1e", fontSize: 10, fontWeight: 700 }}
              tickLine={false}
              interval={0}
              height={30}
            />
            <YAxis
              tickFormatter={(val) => `$${(val / 1000).toFixed(0)}k`}
              tick={{ fill: "#1a1c1e", fontSize: 10, fontWeight: 600 }}
              tickLine={false}
              axisLine={{ stroke: "#d8dadc" }}
            />
            <ReferenceLine y={0} stroke="#94a3b8" strokeWidth={1} />
            <Tooltip
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="bg-white p-3 rounded-xl border border-[#d8dadc] shadow-lg text-xs space-y-1.5 max-w-xs">
                      <p className="font-heading font-bold text-[#1a1c1e] border-b border-[#d8dadc] pb-1 font-mono text-[11px]">
                        {label}
                      </p>
                      <div className="space-y-1">
                        {payload.map((entry: any, index: number) => {
                          const isNegative = Number(entry.value) < 0;
                          return (
                            <div
                              key={`item-${index}`}
                              className="flex items-center justify-between gap-4 text-[11px]"
                            >
                              <div className="flex items-center gap-1.5">
                                <span
                                  className="w-2 h-2 rounded-full"
                                  style={{ backgroundColor: entry.color }}
                                />
                                <span className="text-[#1a1c1e]/70 font-medium">
                                  {entry.name}:
                                </span>
                              </div>
                              <span
                                className={`font-bold font-mono ${
                                  isNegative ? "text-rose-600" : "text-emerald-700"
                                }`}
                              >
                                {formatDollar(entry.value)}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Bar
              dataKey="btoNetWorth"
              name="BTO Purchase"
              fill="#10b981"
              radius={[6, 6, 0, 0]}
              maxBarSize={40}
            />
            <Bar
              dataKey="resaleNetWorth"
              name="Resale Purchase"
              fill="#005fa6"
              radius={[6, 6, 0, 0]}
              maxBarSize={40}
            />
            <Bar
              dataKey="rentNetWorth"
              name="Renting (Outflow)"
              fill="#f43f5e"
              radius={[0, 0, 6, 6]}
              maxBarSize={40}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="pt-2 text-[10px] text-[#1a1c1e]/50 border-t border-[#d8dadc] flex items-center justify-between font-mono">
        <span>BTO 2-Room Only (Singles Scheme)</span>
        <span>Rental compounded @ 3.5% p.a.</span>
      </div>
    </div>
  );
};

