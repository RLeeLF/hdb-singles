# HDB Housing Decision Engine for Singles 35+
> **CDAR 2026 Capstone Project Report**
> **Authors:** Ivy Poon · Lee Lai Forng · Tan Lee Yen
> **Live Web Application:** [mysghousing.com](https://mysghousing.com)

---

## 📌 Project Overview

Singles aged 35 and above in Singapore face a critical financial choice when purchasing public housing under strict regulatory limits (TDSR 55%, MSR 30%, LTV 75%, and CPF usage rules).

This project delivers an integrated data pipeline, machine learning valuation model, and interactive decision engine to quantitatively evaluate whether purchasing a **Build-To-Order (BTO)**, buying a **Resale flat**, or **Renting** maximises projected **5-year net worth** across macro interest rate scenarios (2.6%, 3.5%, 4.5%) and town-level spatial growth clusters.

---

## 🚀 Live Deliverables

* **Interactive Simulator App:** [mysghousing.com](https://mysghousing.com)
* **Compiled HTML Report:** `hdb_singles35_housing_project_report.html`

---

## ⚡ Quickstart

1. Clone the repo and open **`hdb_calculator.Rproj`** in RStudio (this sets the working directory correctly — don't open the `.R`/`.qmd` files directly first).
2. Install required packages (see below).
3. Render the report:
   ```r
   quarto::quarto_render("hdb_singles35_housing_project_report.qmd")
   ```
   (Or run `HDB_capstone_v2.R` directly for the full analysis pipeline, including the population-density and clustering steps.)
4. Run the interactive app:
   ```r
   shiny::runApp("app.R")
   ```

All data files needed to run the project are already included in `data/` — no separate download required.

---

## 🛠️ Setup & Reproducing the Report

**Requirements:** R (version RStudio 2026.07.1+147)

Install the required packages before running anything:

```r
install.packages(c(
  "shiny",
  "skimr",
  "dplyr",
  "tibble",
  "ggplot2",
  "cluster",       # silhouette(), daisy(), agnes()
  "factoextra",
  "tidyverse",
  "readr",
  "lubridate",
  "stringr",
  "tidymodels",
  "timetk",
  "modeltime",
  "tidysynth",
))

# vip is installed from r-universe (not a standard CRAN install):
install.packages("remotes")
install.packages("vip", repos = c("https://r-universe.dev", "https://cloud.r-project.org"))
```

To render the report locally:

```r
quarto::quarto_render("hdb_singles35_housing_project_report.qmd")
```

To run the interactive app locally:

```r
shiny::runApp("app.R")
```

**Expected runtime:** the full report knit runs k-means clustering, random forest valuation models, and ARIMA/ETS forecasting across 12 town-group × flat-type combinations — expect several minutes on first run, not seconds.

---

## 🧠 Methodology (brief)

1. **Data cleaning & feature engineering:** raw HDB resale, rental, and BTO transactions (data.gov.sg) are cleaned and standardised into price-per-square-foot panels by town, flat type, and year.
2. **Town clustering:** k-means clustering groups Singapore's towns into structural segments (e.g. "High-Density Affordable Growth," "Low-Density Premium Lower Growth") based on price level, 5-year growth, volatility, and infrastructure features (MRT exits, malls, hawker centres, population density).
3. **Valuation model:** a random forest model predicts price-per-square-foot from flat type, remaining lease, floor area, and town cluster. Including the cluster label as a predictor reduced RMSE and improved R² over a model without it (see code comments in `HDB_capstone_v2.R` for the exact figures).
4. **Time-series forecasting:** ARIMA and ETS models forecast 5-year price trajectories for each town-group × flat-type combination, selecting the better-performing model by held-out MAE.
5. **Decision engine:** the Shiny app (`app.R`) combines these outputs with user inputs (savings, interest rate scenario, flat type, town) to simulate 5-year net worth under BTO, Resale, and Rent pathways, accounting for TDSR/MSR/LTV constraints and CPF usage rules.

---

## 📁 Repository Structure

```text
hdb_calculator/                                          # repo root — open the .Rproj here
├── hdb_calculator.Rproj                                 # open this first — sets working directory correctly
├── README.md                                             # Project overview and setup guide
├── .gitignore                                             # excludes session files, generated CSVs, secrets
├── HDB_capstone_v2.R                                     # Main analysis pipeline (cleaning, clustering, modeling, forecasting)
├── HDB_capstone_v2.RData                                 # Saved workspace from HDB_capstone_v2.R (includes population density calc)
├── hdb_singles35_housing_project_report.qmd             # Capstone report source (Quarto)
├── hdb_singles35_housing_project_report.html            # Rendered HTML report
├── hdb_singles35_housing_project_report_files/           # Supporting assets for the rendered HTML report
├── app.R                                                 # Interactive R Shiny application code
├── www/                                                   # Static assets used by the Shiny app
├── rsconnect/                                             # shinyapps.io deployment metadata (for mysghousing.com)
│
└── data/                                                 # All data (tabular + spatial)
    ├── README.md                                         # Data dictionary & column-level notes
    ├── ResaleflatpricesbasedonregistrationdatefromJan2017onwards.csv   # Data.gov.sg HDB resale transactions
    ├── PriceRangeofHDBFlatsOffered.csv                   # Data.gov.sg BTO price ranges
    ├── RentingOutofFlatsfromJan2021.csv                  # Data.gov.sg HDB rental transactions
    ├── ResidentHouseholdsbyPlanningAreaofResidenceandTypeofDwellingCensusofPopulation2020.csv  # Census 2020 — source for population density feature
    ├── singapore_shopping_malls_coordinates.csv
    │
    └── spatial/                                          # Spatial / geojson data (nested inside data/)
        ├── feature_master_table_v3.csv
        ├── singapore_malls.geojson
        ├── Parks.geojson
        ├── NEAMarketandFoodCentre.geojson
        ├── LTAMRTStationExitGEOJSON.geojson
        ├── PreSchoolsLocation.geojson
        ├── HawkerCentresGEOJSON.geojson
        └── MasterPlan2019PlanningAreaBoundaryNoSea.geojson
```

---

## 📊 Data Sources

* HDB Resale Flat Prices — [data.gov.sg](https://data.gov.sg)
* HDB Renting Out of Flats — [data.gov.sg](https://data.gov.sg)
* Price Range of HDB Flats Offered (BTO) — [data.gov.sg](https://data.gov.sg)
* Resident Households by Planning Area & Dwelling Type, Census of Population 2020 — [SingStat](https://www.singstat.gov.sg) (used to compute `HDB_Density_per_SQKM`, saved in `HDB_capstone_v2.RData`)
* Master Plan 2019 Planning Area Boundary — URA
* MRT Station Exits — LTA DataMall
* Parks, hawker centres, preschools, malls - [data.gov.sg](https://data.gov.sg)

All datasets above are included in this repo under `data/`. See `data/README.md` for full data dictionary and column-level notes.

---

## 📄 License / Academic Use

"For academic/capstone evaluation purposes only"
