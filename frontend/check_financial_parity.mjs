// check_financial_parity.mjs
// Verifies financial-calc.ts (the deployed frontend's arithmetic) still
// matches financial_parity_fixtures.json (R-computed ground truth from
// financial_rules.R). This is the arithmetic-layer check, distinct from
// test-supabase-live.mjs (which checks the data layer) — both need to pass
// for Part 5 to be considered fully verified end-to-end.
//
// Place this file in frontend/, alongside package.json.
// Run with tsx (already a devDependency) so it can import the real .ts
// file directly, no separate compile step:
//
//   npx tsx check_financial_parity.mjs

import { computeEquity, checkMsrTdsr } from "./src/financial-calc.ts";
import { readFileSync } from "fs";

const TOLERANCE = 1e-6;

// Fixtures live at the hdb_calculator project root (model_outputs/),
// one level up from frontend/ — NOT inside the frontend project itself.
const FIXTURES_PATH = "../model_outputs/financial_parity_fixtures.json";

let fixtures;
try {
  fixtures = JSON.parse(readFileSync(FIXTURES_PATH, "utf-8"));
} catch (err) {
  console.error(`Could not read ${FIXTURES_PATH}`);
  console.error("Run generate_financial_fixtures.R first if this file doesn't exist yet.");
  console.error(err.message);
  process.exit(1);
}

let failures = 0;

for (const [i, c] of fixtures.entries()) {
  const eq = computeEquity(c.price, c.annual_rate, c.growth, c.cash_injection, 0.75, c.loan_years, 5);

  const loan = Math.max(0, c.price - Math.max(c.price * 0.25, c.cash_injection));
  const msr = checkMsrTdsr(c.gross_income, c.existing_debt, loan, c.loan_years, c.annual_rate);

  const checks = [
    ["monthly_payment", eq.monthlyPayment, c.monthly_payment],
    ["balance_5y", eq.balance5y, c.balance_5y],
    ["value_5y", eq.value5y, c.value_5y],
    ["equity_5y", eq.equity5y, c.equity_5y],
    ["stressed_instalment", msr.stressedInstalment, c.stressed_instalment],
  ];

  for (const [label, tsVal, rVal] of checks) {
    const diff = Math.abs(tsVal - rVal);
    if (diff > TOLERANCE) {
      failures++;
      console.error(
        `[case ${i}] ${label}: TS=${tsVal} R=${rVal} diff=${diff} ` +
        `(price=${c.price}, rate=${c.annual_rate}, loan_years=${c.loan_years})`
      );
    }
  }

  if (msr.regulatoryFail !== c.regulatory_fail) {
    failures++;
    console.error(`[case ${i}] regulatory_fail: TS=${msr.regulatoryFail} R=${c.regulatory_fail}`);
  }
}

if (failures > 0) {
  console.error(`\n${failures} parity failure(s) across ${fixtures.length} cases.`);
  process.exit(1);
}

console.log(`All ${fixtures.length} financial parity fixtures passed (tolerance ${TOLERANCE}).`);
