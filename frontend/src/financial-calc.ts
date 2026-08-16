// financial-calc.ts — the R amortization/MSR-TDSR arithmetic, re-expressed
// in TypeScript for the Vercel frontend.
//
// Unlike the stroke case study's scorer.ts, there is no model here. All
// statistical inference (random forest, k-means, ARIMA) happened in R at
// build time and is baked into housing_projection_matrix.csv — the frontend
// only does a table lookup plus this closed-form financial arithmetic.
// Contract: exact parity with monthly_payment()/check_msr_tdsr() in
// HDB_capstone_v3.R and app.R, enforced by financial_parity_fixtures.json.

export const MSR_CAP = 0.30;
export const TDSR_CAP = 0.55;
export const STRESS_RATE_FLOOR = 0.04;
export const rent_growth_annual = 0.035;
export const RENT_GROWTH_ANNUAL = 0.035;

/**
 * Standard amortization formula. r === 0 is a real, reachable case — the
 * interest rate slider allows values as low as 1%, but a stress-test rate
 * or an edge-case fixture could still hit exactly 0, and the division form
 * blows up (0/0) at that point. R's monthly_payment() branches on this
 * explicitly; the JS port must too, or NaN silently propagates.
 */
export function monthlyPayment(principal: number, annualRate: number, years: number): number {
  const r = annualRate / 12;
  const n = years * 12;
  if (r === 0) return principal / n;
  return (principal * r) / (1 - Math.pow(1 + r, -n));
}

export interface MsrTdsrResult {
  stressedInstalment: number;
  regulatoryFail: boolean;
}

/**
 * MSR/TDSR eligibility, stress-tested at max(4% floor, quoted rate) — NOT
 * the quoted rate itself. This mirrors check_msr_tdsr() in app.R exactly;
 * do not simplify to "always use 4%", since a quoted rate above 4% must
 * stress-test at that higher rate (see app.R's own fix for this).
 */
export function checkMsrTdsr(
  grossMonthlyIncome: number,
  existingMonthlyDebt: number,
  loanAmount: number,
  loanYears: number,
  quotedRate: number
): MsrTdsrResult {
  const rStress = Math.max(STRESS_RATE_FLOOR, quotedRate);
  const stressedInstalment = monthlyPayment(loanAmount, rStress, loanYears);

  const msrCapDollars = MSR_CAP * grossMonthlyIncome;
  const tdsrCapDollars = TDSR_CAP * grossMonthlyIncome;

  const msrFail = stressedInstalment > msrCapDollars;
  const tdsrFail = stressedInstalment + existingMonthlyDebt > tdsrCapDollars;

  return { stressedInstalment, regulatoryFail: msrFail || tdsrFail };
}

export interface EquityResult {
  monthlyPayment: number;
  balance5y: number;
  value5y: number;
  equity5y: number;
  loan: number;
  down: number;
}

/**
 * 5-year equity projection: downpayment -> loan -> monthly instalment ->
 * remaining balance at year 5 -> appreciated value -> equity (value - debt).
 * Mirrors compute_equity() / the resale-equity block of results_data() in
 * app.R. horizonYears/ltv/loanYears default to this project's fixed rules
 * (rules$horizon_years, rules$ltv, rules$loan_years) — pass explicitly if
 * that ever changes.
 */
export function computeEquity(
  price: number,
  annualRate: number,
  growth: number,
  cashInjection: number,
  ltv = 0.75,
  loanYears = 25,
  horizonYears = 5
): EquityResult {
  const minDown = price * (1 - ltv);
  const down = Math.max(minDown, cashInjection);
  const loan = Math.max(0, price - down);
  const pmt = monthlyPayment(loan, annualRate, loanYears);

  const r = annualRate / 12;
  const n = loanYears * 12;
  const k = horizonYears * 12;
  const balance5y = loan === 0 || k >= n
  ? 0
  : (loan * (Math.pow(1 + r, n) - Math.pow(1 + r, k))) / (Math.pow(1 + r, n) - 1);

  const value5y = price * Math.pow(1 + growth, horizonYears);
  const equity5y = value5y - balance5y;

  return { monthlyPayment: pmt, balance5y, value5y, equity5y, loan, down };
}
