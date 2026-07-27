# HDB Housing Decision Engine for Singles 35+

> **CDAR 2026 Capstone Project Report**  
> **Authors:** Team— Ivy Poon · Lee Lai Forng ·Tan Lee Yen  
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

## 📁 Repository Structure

```text
├── README.md                                  # Project overview and setup guide
├── hdb_singles35_housing_project_report.Rmd   # Main capstone project report source code
├── hdb_singles35_housing_project_report.html  # Standalone rendered HTML report
├── app.R                                      # Interactive R Shiny application code
└── data/                                      # Data directory
    ├──ResaleflatpricesbasedonregistrationdatefromJan2017onwards.csv   # Data.gov.sg HDB resale transactions
    ├── CDAR_capstone_feature_master_table_v3.RData
    ├──singapore_shopping_malls_coordinates.csv
    ├──PriceRangeofHDBFlatsOffered.csv
    ├──RentingOutofFlatsfromJan2021.csv
    ├──ResaleflatpricesbasedonregistrationdatefromJan2017onwards.csv
└── spatial
    ├──feature_master_table_v3.csv
    ├──singapore_malls.geojson
    ├── Parks.geojson
    ├── NEAMarketandFoodCentre.geojson
    ├── LTAMRTStationExitGEOJSON.geojson
    ├── PreSchoolsLocation.geojson
    ├── HawkerCentresGEOJSON.geojson
└── MasterPlan2019PlanningAreaBoundaryNoSea.geojson
└── README.md                              # Data dictionary & data download notes
    




