### Part 5.4 prep — Financial arithmetic parity fixtures ----
### The frontend only needs to reproduce closed-form amortization arithmetic,
### since all statistical inference (RF, k-means, ARIMA) already happened at
### build time and is baked into housing_projection_matrix.csv (Part 5.1).
###
### Standalone script: depends ONLY on financial_rules.R, not on the resale
### model or housing_projection_matrix. Re-run whenever financial_rules.R
### changes (a rule/rate update), independent of the model's own build cadence.

install.packages("dplyr")
install.packages("tibble")
install.packages("jsonlite")

library(dplyr)
library(tibble)
library(jsonlite)

source("financial_rules.R")

# ---- Representative cases, drawn from realistic ranges ----
set.seed(2026)
representative <- tibble(
  price          = c(300000, 500000, 800000, 250000, 1000000, 450000, 650000),
  annual_rate    = c(0.026, 0.035, 0.045, 0.04, 0.026, 0.038, 0.021),
  growth         = c(0.02, -0.03, 0.05, 0.0, 0.015, -0.01, 0.033),
  loan_years     = c(25, 25, 20, 25, 30, 25, 25),
  cash_injection = c(75000, 150000, 400000, 50000, 300000, 0, 200000),
  gross_income    = c(4000, 6000, 9000, 3000, 12000, 5500, 7000),
  existing_debt  = c(0, 300, 500, 0, 1000, 200, 0)
)

# ---- Corner cases — mirrors the stroke script's edge-case philosophy:
# every boundary a slider can actually reach, not just "typical" values.
corners <- tibble(
  price          = c(1,        1000000,  400000,   400000,  400000),
  annual_rate    = c(0.01,     0.10,     0.0,       0.04,     0.04),
  growth         = c(-0.10,     0.10,     0.0,       0.02,     0.02),
  loan_years     = c(25,       25,       25,        1,        30),
  cash_injection = c(0,        0,        1000000,   100000,   100000),
  gross_income    = c(0,        20000,    5000,      5000,     5000),
  existing_debt  = c(0,        0,        0,         0,        4000)
)

test_cases <- bind_rows(representative, corners) %>%
  rowwise() %>%
  mutate(
    eq         = list(compute_equity(price, annual_rate, growth, cash_injection = cash_injection, loan_years = loan_years)),
    monthly_payment = eq$monthly_payment,
    balance_5y = eq$balance_5y,
    value_5y   = eq$value_5y,
    equity_5y  = eq$equity_5y,
    msr = list(check_msr_tdsr(gross_income, existing_debt,
                              eq$loan,
                              loan_years, annual_rate)),
    stressed_instalment = msr$stressed_instalment,
    regulatory_fail      = msr$regulatory_fail
  ) %>%
  ungroup() %>%
  select(-eq, -msr)

dir.create("model_outputs", showWarnings = FALSE)
jsonlite::write_json(test_cases, "model_outputs/financial_parity_fixtures.json",
                     auto_unbox = TRUE, digits = 10)

message("Wrote ", nrow(test_cases), " financial parity fixtures.")
print(test_cases)
