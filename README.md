# HDB Housing Decision Engine for Singles 35+

> **CDAR 2026 Capstone Project Report — Resubmission**
> **Authors:** Ivy Poon · Lee Lai Forng · Tan Lee Yen
> **Live Web Application (production, assessed version):** [mysghousing.com](https://mysghousing.com)
> **Live Web Application (fallback URL, same deployment):** [hdb-singles-alpha.vercel.app](https://hdb-singles-alpha.vercel.app)
> **Before/after reference (original submission, intentionally kept live):** [ipoon.shinyapps.io/hdb_calculator](https://ipoon.shinyapps.io/hdb_calculator)

---

## 📌 Project Overview

Singles aged 35 and above in Singapore face a critical financial choice
when purchasing public housing under strict regulatory limits (TDSR
55%, MSR 30%, LTV 75%, and CPF usage rules). This project delivers an
integrated data pipeline, machine learning valuation model, and two
interactive decision engines — a local R Shiny app and a live,
Supabase-backed web app — to quantitatively evaluate whether purchasing
a **Build-To-Order (BTO)**, buying a **Resale flat**, or **Renting**
maximises projected 5-year net worth.

**This is a resubmission.** This detailed re-submission
structures the report to source the actual pipeline scripts directly
(rather than duplicate their logic inline) and states every result
alongside the check that validated it, organized around the same
narrative as the pipeline itself — data cleaning, boundary crosswalk,
clustering, valuation, forecasting, lease flexibility, MSR/TDSR, and the
live deployment — rather than a generic template. See
`hdb_singles35_housing_project_report.qmd` for the full account,
including several real bugs found, previously ignored(due to time constraint) 
spatial bugs and fixed during this resubmission (a town-boundary join gap, 
a `kmeans()` cluster-numbering bug that reached the live database, an 
unenforced MSR/TDSR requirement, and a missing edge-case guard in the deployed 
financial arithmetic — each documented with how it was caught and fixed).

---

## 🚀 Live Deliverables

- **Production web app:** [mysghousing.com](https://mysghousing.com) (Vercel, React/Vite, live Supabase data)
- **Local decision engine:** `app.R` (R Shiny, reads the same artefact from a committed CSV)
- **Compiled HTML report:** `hdb_singles35_housing_project_report.html`
- **Before/after reference:** the original Shiny deployment remains live at
  `ipoon.shinyapps.io/hdb_calculator`, intentionally not retired, so the
  resubmission's changes can be compared directly against the original.

---

## ⚡ Quickstart

1. Clone the repo and open **`hdb_calculator.Rproj`** in RStudio — this
   sets the working directory correctly. Don't open the `.R`/`.qmd`
   files directly first.
2. Install required packages (see below), or restore the exact pinned
   versions via `renv::restore()` (see **Reproducibility**).
3. Render the report:
   ```bash
   quarto render hdb_singles35_housing_project_report.qmd
   ```
   Rendering the R package version of Quarto is not required — pressing
   **Render** in RStudio, or running the command above in a terminal
   from the project root, both work without it. The report captures the
   current git commit SHA and tag live at render time (Executive
   Summary, "Reproducibility pinning") — commit any source changes
   **before** rendering, or the citation will point to a stale commit.
4. Run the local decision engine:
   ```r
   shiny::runApp("app.R")
   ```
5. To run the live web app locally instead: see `frontend/README` (or
   `frontend/.env.example`) for the two Supabase environment variables
   needed, then `cd frontend && npm install && npm run dev`.

All raw data files needed to run the project are included in `data/` —
no separate download required.

---

## 🛠️ Setup & Reproducing the Report

**Requirements:** R (version 4.6.0 or later), Node.js 18+ (only if
running the `frontend/` web app locally).

```r
install.packages(c(
  "shiny", "bslib", "skimr", "dplyr", "tibble", "ggplot2",
  "cluster", "factoextra", "tidyverse", "readr", "lubridate", "stringr",
  "tidymodels", "timetk", "modeltime", "sf", "vip", "quarto", "ranger",
  "httr2", "tidygeocoder", "DBI", "RPostgres", "jsonlite", "here"
))
```

`quarto` and `ranger` are required and were missing from an earlier
version of this list — `quarto` is needed by `modeltime`'s dependency
chain, and `ranger` is the random forest engine used in M3; `parsnip`
does not install engine packages automatically. `tidygeocoder`/`httr2`
support the Kallang/Whampoa boundary crosswalk; `DBI`/`RPostgres`/
`jsonlite` support the Supabase artefact push and fixture export.

### Reproducibility

`renv.lock` is committed and captures the full package set used across
every script in this repository, including packages added during this
resubmission. To restore an exact matching environment:

```r
renv::restore()
```

To confirm your current environment matches the lockfile without
restoring:

```r
renv::status()
```

Seed `2026` is used consistently across clustering, data splitting, and
forecasting.

---

## 🧠 Methodology (brief)

Full detail, including every validation check and bug found, is in the
rendered report. Summary of the pipeline:

1. **Boundary crosswalk** (`00_kw_crosswalk.R`): derives a
   Kallang/Whampoa town boundary via geocoding, since no direct URA
   subzone mapping exists for this HDB town label.
2. **Spatial feature compilation** (`data/spatial/capstone_districtmaster_v3.R`,
   run from the project root): processes URA MasterPlan2019 boundaries,
   Census 2020 household data, and point-location amenity datasets into
   town-level density and infrastructure counts. Output:
   `data/spatial/feature_master_table_v3.csv`.
3. **Data cleaning & feature engineering** (`HDB_capstone_v3.R`): raw
   HDB resale, rental, and BTO transactions (data.gov.sg) cleaned into
   price-per-square-foot panels by town, flat type, and year.
4. **Town clustering:** k-means groups towns into three structural
   segments, validated against alternative cluster counts (not
   asserted) and checked for balanced, interpretable membership.
5. **Valuation model:** a random forest predicts price-per-square-foot
   from flat type, remaining lease (as a full 40–95 year grid, not a
   fixed value), floor area, and town cluster — benchmarked against both
   a naive town-median baseline and a version without the cluster
   feature.
6. **Time-series forecasting:** ARIMA and ETS forecast 5-year price
   trajectories per town cluster and flat type, selected by held-out
   MAE and checked for generalization across multiple series.
7. **Artefact assembly:** the full set of predictions is consolidated
   into one canonical table (`housing_projection_matrix`), asserted for
   complete coverage before export, and pushed to a live Supabase
   database with row-level security enabled.
8. **Decision engines:** both `app.R` (local Shiny) and the deployed
   web app (`frontend/`) read this same artefact and apply identical
   MSR/TDSR, budget, and Singles Scheme eligibility logic — implemented
   once in `financial_rules.R` (R) and ported to `financial-calc.ts`
   (TypeScript), with both verified to agree via an automated parity
   check (`generate_financial_fixtures.R` → `check_financial_parity.mjs`).

> **Script execution order** (hard dependency chain):
> `00_kw_crosswalk.R` → `data/spatial/capstone_districtmaster_v3.R` →
> `HDB_capstone_v3.R` → `push_to_supabase.R`. Each step reads the
> previous step's output; regenerating one without the others upstream
> produces stale data. Run all from the project root (open
> `hdb_calculator.Rproj` first), not with the working directory set to
> a script's own folder.

---

## 📁 Repository Structure

```text
hdb_calculator/                                          # repo root — open the .Rproj here
├── hdb_calculator.Rproj
├── README.md
├── .gitignore
├── .Renviron                                             # Supabase credentials (git-ignored, not committed)
├── renv.lock                                              # pinned package versions
│
├── 00_kw_crosswalk.R                                     # Kallang/Whampoa boundary crosswalk (run FIRST)
├── financial_rules.R                                      # single source of truth: amortization, MSR/TDSR — sourced by 3 other scripts
├── HDB_capstone_v3.R                                      # main analysis pipeline: cleaning, clustering, M3/M4, artefact assembly
├── HDB_capstone_v2.R                                      # superseded — retained for the v0.1.0 before/after reference only
├── generate_financial_fixtures.R                          # exports R-computed ground truth for the TS arithmetic parity check
├── push_to_supabase.R                                     # pushes housing_projection_matrix to the live database
│
├── hdb_singles35_housing_project_report.qmd               # this report's source
├── hdb_singles35_housing_project_report.html              # rendered report — regenerate via `quarto render`, do not hand-edit
├── hdb_singles35_housing_project_report_files/            # supporting assets for the rendered report (auto-generated, safe to delete/regenerate)
├── images/
│   └── architecture-diagram.png                            # pipeline diagram, rendered externally (mermaid.live) and embedded as a static image — see report source for the Mermaid code that generated it
│
├── app.R                                                   # local R Shiny decision engine
├── www/                                                     # static assets for the Shiny app
├── rsconnect/                                               # shinyapps.io deployment metadata (before/after reference deployment)
│
├── model_outputs/                                           # generated deliverable artefacts (committed)
│   ├── housing_projection_matrix.csv                        # THE artefact — 1200 resale + 12 BTO rows
│   └── financial_parity_fixtures.json                       # ground-truth fixtures for the TS parity check
│
├── frontend/                                                 # live web app (Vite + React + TypeScript, deployed to Vercel)
│   ├── src/
│   │   ├── financial-calc.ts                                 # TypeScript port of financial_rules.R, verified via parity check
│   │   ├── supabase-lookup.ts                                 # live data layer — no fallback data, fails loudly on error
│   │   ├── types.ts
│   │   ├── components/
│   │   └── lib/simulation.ts
│   ├── check_financial_parity.mjs                             # arithmetic-layer parity check (run: npx tsx check_financial_parity.mjs)
│   ├── test-supabase-live.mjs                                  # data-layer live check (run: node --env-file=.env test-supabase-live.mjs)
│   └── .env.example
│
└── data/
    ├── ResaleflatpricesbasedonregistrationdatefromJan2017onwards.csv
    ├── PriceRangeofHDBFlatsOffered.csv
    ├── RentingOutofFlatsfromJan2021.csv
    ├── ResidentHouseholdsbyPlanningAreaofResidenceandTypeofDwellingCensusofPopulation2020.csv
    │
    └── spatial/
        ├── capstone_districtmaster_v3.R                        # compiles feature_master_table_v3 (run SECOND, after 00_kw_crosswalk.R)
        ├── feature_master_table_v3.csv
        ├── kw_subzone_shares.csv                                # output of 00_kw_crosswalk.R, consumed by capstone_districtmaster_v3.R
        ├── kw_streets_geocoded.csv                               # geocoding audit trail
        ├── singapore_malls_v2.geojson                            # rebuilt mall dataset, 55 -> 158 malls
        ├── malls_joined_audit.csv
        ├── MasterPlan2019PlanningAreaBoundaryNoSea.geojson
        ├── MasterPlan2019SubzoneBoundaryNoSeaGEOJSON.geojson
        ├── Parks.geojson
        ├── NEAMarketandFoodCentre.geojson
        ├── LTAMRTStationExitGEOJSON.geojson
        ├── PreSchoolsLocation.geojson
        └── HawkerCentresGEOJSON.geojson
```

---

## 📊 Data Sources

- HDB Resale Flat Prices — [data.gov.sg](https://data.gov.sg)
- HDB Renting Out of Flats — [data.gov.sg](https://data.gov.sg)
- Price Range of HDB Flats Offered (BTO) — [data.gov.sg](https://data.gov.sg)
- Resident Households by Planning Area & Dwelling Type, Census of
  Population 2020 — [SingStat](https://www.singstat.gov.sg)
- Master Plan 2019 Planning Area & Subzone Boundary — URA / data.gov.sg
- MRT Station Exits — LTA DataMall
- Parks, Hawker Centres, Preschools, NEA Markets — data.gov.sg
- Shopping mall coordinates — Kaggle (manually augmented from 55 to 158
  malls; see report for audit trail and methodology)

All datasets above are included in this repo under `data/`.

---

## 🚢 Deployment Architecture

- **Database:** Supabase Postgres, table `housing_projection_matrix`,
  Row Level Security enabled with a public-read-only policy for the
  `anon` role.
- **Frontend:** Vite + React + TypeScript, deployed to Vercel, connected
  to the production Supabase table via the public anon key
  (`VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`, set in Vercel's
  project environment variables — never committed to source).
- **Domain:** `mysghousing.com` points to the Vercel deployment via
  CNAME records; the original Cloudflare Worker routing to shinyapps.io
  has been removed for this domain specifically. The shinyapps.io
  deployment itself remains live and reachable at its raw URL.
- **Local fallback:** `app.R` can run entirely offline, reading the
  committed `model_outputs/housing_projection_matrix.csv` snapshot
  directly, with no dependency on the live database.

---

## 📄 License / Academic Use

For academic/capstone evaluation purposes only.
