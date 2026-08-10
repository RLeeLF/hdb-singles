
library(sf)
library(dplyr)
library(tidyr)
library(readr)

# Load the Base District Map (Master Plan 2019) if there is a new update we need to change here
districts_raw <- st_read("data/spatial/MasterPlan2019PlanningAreaBoundaryNoSea.geojson") %>% 
  st_make_valid() %>% 
  st_transform(3414)

# Build baseline district dataframe with land area calculated in square kilometers
districts_base <- districts_raw %>%
  mutate(AREA_SQKM = as.numeric(st_area(.)) / 1e06) %>%
  st_drop_geometry() %>%
  select(PLN_AREA_N, AREA_SQKM)

# -------------------------------------------------------------------------
# Process HDB CSV Data & Calculate Density
# -------------------------------------------------------------------------

csv_path <- "data/spatial/ResidentHouseholdsbyPlanningAreaofResidenceandTypeofDwellingCensusofPopulation2020.csv"

# Load demographic table, cleaning up row names to match spatial map keys (uppercase)
hdb_data_raw <- read_csv(csv_path)

# Dynamically identifying column structures: SingStat uses 'HDBDwellings_Total' or similar 
# Pull out the primary planning area column and the HDB total metrics.
hdb_cleaned <- hdb_data_raw %>%
  rename_with(~ "Planning_Area", 1) %>% # Assumes first column tracks area names
  rename_with(~ "HDB_Total", contains("HDB") & contains("Total")) %>%
  mutate(
    PLN_AREA_N = toupper(trimws(Planning_Area)),
    HDB_Total = as.numeric(gsub("[^0-9]", "", HDB_Total)) # Strip formatting anomalies
  ) %>%
  filter(!is.na(HDB_Total) & PLN_AREA_N != "TOTAL") %>%
  select(PLN_AREA_N, HDB_Total)

# Merge HDB metrics with district dimensions to resolve density metric
hdb_density_df <- districts_base %>%
  left_join(hdb_cleaned, by = "PLN_AREA_N") %>%
  mutate(
    HDB_Total = replace_na(HDB_Total, 0),
    HDB_Density_per_SQKM = HDB_Total / AREA_SQKM
  ) %>%
  select(PLN_AREA_N, HDB_Total, HDB_Density_per_SQKM)

# -------------------------------------------------------------------------
# Process POINT Datasets (Aggregate by Count and has an inspectable audit trail
# -------------------------------------------------------------------------
process_points <- function(file_path, col_name, return_detail = FALSE) {
  pts <- st_read(file_path, quiet = TRUE) %>% 
    st_make_valid() %>% 
    st_transform(3414)
  
  joined <- st_join(pts, districts_raw, join = st_intersects) %>%
    st_drop_geometry()
  
  if (return_detail) return(joined)
  
  joined %>%
    filter(!is.na(PLN_AREA_N)) %>%
    group_by(PLN_AREA_N) %>%
    summarise(!!col_name := n(), .groups = "drop")
}

# Point datasets — with assignments and the data/spatial/ prefix:
preschool_counts  <- process_points("data/spatial/PreSchoolsLocation.geojson", "Preschool_Count")
mrt_exit_counts   <- process_points("data/spatial/LTAMRTStationExitGEOJSON.geojson", "MRT_Exit_Count")
hawker_counts     <- process_points("data/spatial/HawkerCentresGEOJSON.geojson", "Hawker_Centre_Count")
nea_market_counts <- process_points("data/spatial/NEAMarketandFoodCentre.geojson", "NEA_Market_Count")
shopping_mall_counts <- process_points("data/spatial/singapore_malls_v2.geojson", "Shopping_Mall_Count")

# -------------------------------------------------------------------------
# Compile the Final Re-ordered Master Data Table
# -------------------------------------------------------------------------
feature_master_table_v3 <- districts_base %>%
  # Main administrative metrics
  left_join(hdb_density_df,    by = "PLN_AREA_N") %>%
  # Physical infrastructure components
  left_join(preschool_counts,  by = "PLN_AREA_N") %>%
  left_join(mrt_exit_counts,   by = "PLN_AREA_N") %>%
#  left_join(sport_counts,      by = "PLN_AREA_N") %>%
  left_join(hawker_counts,     by = "PLN_AREA_N") %>%
  left_join(nea_market_counts, by = "PLN_AREA_N") %>%
  left_join(shopping_mall_counts,  by = "PLN_AREA_N") %>%
  # Fill infrastructure factors that are missing in specific districts with 0
  mutate(across(everything(), ~replace_na(., 0)))

# checking after updating shopping malls

sum(feature_master_table_v3$Shopping_Mall_Count) # count if 157

feature_master_table_v3 %>%
  filter(PLN_AREA_N %in% c("BISHAN", "TOA PAYOH", "BUKIT TIMAH")) %>%
  select(PLN_AREA_N, Shopping_Mall_Count) #check those 3 towns that were missing malls

feature_master_table_v3 %>%
  filter(Shopping_Mall_Count == 0) %>%
  pull(PLN_AREA_N) # sanity check areas without any malls

malls_detail <- process_points("data/spatial/singapore_malls_v2.geojson",
                               "Shopping_Mall_Count", return_detail = TRUE)
write_csv(malls_detail, "data/spatial/malls_joined_audit.csv")

View(malls_detail)

# View the structural array ordered by District
print(head(feature_master_table_v3))

# Save structural output back down into working project folder
write.csv(feature_master_table_v3, "data/spatial/feature_master_table_v3.csv", row.names = FALSE)

glimpse(feature_master_table_v3)

save.image("data/spatial/feature_master_table_v3.RData")