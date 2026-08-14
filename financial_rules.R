### financial_rules.R ----
### Single source of truth for the amortization / MSR-TDSR arithmetic.
### Sourced by HDB_capstone_v3.R (PHASE 4), app.R, and
### generate_financial_fixtures.R — do NOT copy these definitions into any
### of those files directly. This is the file financial-calc.ts (the
### Vercel/TypeScript port) is checked against; if this file changes, the
### TS port and its parity fixtures must be regenerated and re-verified.

rules <- list(
  horizon_years = 5,
  ltv           = 0.75,   # verified current 2026 (bank + HDB concessionary, since Aug 2024)
  loan_years    = 25
)

MSR_CAP           <- 0.30
TDSR_CAP          <- 0.55
STRESS_RATE_FLOOR <- 0.04  # bank loan floor; HDB concessionary floor is 3% — see Part 4 docs

monthly_payment <- function(principal, annual_rate, years) {
  r <- annual_rate / 12; n <- years * 12
  if (r == 0) principal / n else principal * r / (1 - (1 + r)^(-n))
}

check_msr_tdsr <- function(gross_monthly_income, existing_monthly_debt,
                           loan_amount, loan_years, quoted_rate) {
  r_stress <- max(STRESS_RATE_FLOOR, quoted_rate)
  stressed_instalment <- monthly_payment(loan_amount, r_stress, loan_years)
  msr_cap_dollars  <- MSR_CAP  * gross_monthly_income
  tdsr_cap_dollars <- TDSR_CAP * gross_monthly_income
  list(
    stressed_instalment = stressed_instalment,
    regulatory_fail      = (stressed_instalment > msr_cap_dollars) ||
      ((stressed_instalment + existing_monthly_debt) > tdsr_cap_dollars)
  )
}

compute_equity <- function(price, annual_rate, growth, cash_injection = 0,
                           ltv = rules$ltv, loan_years = rules$loan_years,
                           horizon_years = rules$horizon_years) {
  min_down <- price * (1 - ltv)
  down     <- max(min_down, cash_injection)
  loan     <- max(0, price - down)
  pmt      <- monthly_payment(loan, annual_rate, loan_years)
  
  r <- annual_rate / 12; n <- loan_years * 12; k <- horizon_years * 12
  # Guard: if the loan term ends before the projection horizon (k >= n), the
  # loan is fully repaid by year `horizon_years` — balance is 0, not whatever
  # the amortization formula extrapolates to past full repayment (it can go
  # negative). Currently unreachable with fixed rules$loan_years=25 > 5-year
  # horizon, but this guard is required if loan tenure is ever made
  # user-configurable — caught by fixture case 11 (loan_years=1) before it
  # became a live bug.
  bal <- if (loan == 0 || k >= n) 0 else loan * ((1 + r)^n - (1 + r)^k) / ((1 + r)^n - 1)
  val_5y <- price * (1 + growth)^horizon_years
  equity <- val_5y - bal
  
  list(monthly_payment = pmt, balance_5y = bal, value_5y = val_5y, equity_5y = equity,
       loan = loan, down = down)
}
