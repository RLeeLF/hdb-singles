
library(sf)
library(dplyr)
library(tidyr)
library(readr)


# 1. Rebuild districts_raw: Central Area excluded, Kallang/Whampoa dissolved
pa_raw <- st_read("data/spatial/MasterPlan2019PlanningAreaBoundaryNoSea.geojson") %>%
  st_make_valid() %>%
  st_transform(3414)

sz_raw <- st_read("data/spatial/MasterPlan2019SubzoneBoundaryNoSeaGEOJSON.geojson") %>%
  st_make_valid() %>%
  st_transform(3414)

central_area_pas <- pa_raw %>%
  st_drop_geometry() %>%
  filter(CA_IND == "Y") %>%
  pull(PLN_AREA_N)

kw_subzones <- c("BENDEMEER", "BALESTIER", "KALLANG BAHRU", "KAMPONG JAVA", "GEYLANG BAHRU")

kw_parent_pas <- sz_raw %>%
  st_drop_geometry() %>%
  filter(SUBZONE_N %in% kw_subzones) %>%
  distinct(PLN_AREA_N) %>%
  pull(PLN_AREA_N)

stopifnot(setequal(kw_parent_pas, c("KALLANG", "NOVENA")))

kw <- sz_raw %>%
  filter(SUBZONE_N %in% kw_subzones) %>%
  summarise(.groups = "drop") %>%
  st_make_valid() %>%
  mutate(PLN_AREA_N = "KALLANG/WHAMPOA")

kw_residual <- sz_raw %>%
  filter(PLN_AREA_N %in% kw_parent_pas, !SUBZONE_N %in% kw_subzones) %>%
  group_by(PLN_AREA_N) %>%
  summarise(.groups = "drop") %>%
  st_make_valid() %>%
  mutate(PLN_AREA_N = paste0(PLN_AREA_N, " (RESIDUAL)"))

districts_raw <- pa_raw %>%
  filter(!PLN_AREA_N %in% central_area_pas,
         !PLN_AREA_N %in% kw_parent_pas) %>%
  select(PLN_AREA_N) %>%
  bind_rows(kw_residual, kw)

# Sanity check: no overlap introduced by the rebuild
a_parts <- sum(as.numeric(st_area(districts_raw)))
a_union <- as.numeric(st_area(st_union(districts_raw)))
stopifnot(abs(a_parts - a_union) / a_union < 1e-6)

# 2. Derive districts_base from the rebuilt districts_raw
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

# ---- Reallocate Census dwelling counts for the split planning areas ----
# Census 2020 has no subzone-level breakdown, so KALLANG and NOVENA's
# HDB_Total cannot be split by direct lookup. Approximated using the
# transaction-weighted subzone shares derived for the boundary dissolve
# (kw_dist, produced by 00_kw_crosswalk.R) as a proxy for dwelling
# distribution. Stated as a limitation: this assumes transaction volume
# is proportional to dwelling stock, which is imperfect but the best
# available signal at subzone resolution.
#
# MUST run before hdb_density_df is built — hdb_density_df joins on
# hdb_cleaned_adj (below), not the original hdb_cleaned.

kw_dist <- read_csv("data/spatial/kw_subzone_shares.csv", show_col_types = FALSE)

kw_share <- kw_dist %>%
  filter(SUBZONE_N %in% kw_subzones) %>%
  summarise(n_txn = sum(n_txn)) %>%
  pull(n_txn)

parent_totals <- kw_dist %>%
  filter(PLN_AREA_N %in% kw_parent_pas) %>%
  summarise(n_txn = sum(n_txn)) %>%
  pull(n_txn)

kw_hdb_share <- kw_share / parent_totals       # fraction of parent-PA HDB stock assigned to KW

kallang_novena_total <- hdb_cleaned %>%
  filter(PLN_AREA_N %in% kw_parent_pas) %>%
  summarise(total = sum(HDB_Total, na.rm = TRUE)) %>%
  pull(total)

kw_hdb_total       <- round(kallang_novena_total * kw_hdb_share)
residual_hdb_total <- kallang_novena_total - kw_hdb_total

hdb_cleaned_adj <- hdb_cleaned %>%
  filter(!PLN_AREA_N %in% kw_parent_pas) %>%
  bind_rows(
    tibble(PLN_AREA_N = "KALLANG/WHAMPOA", HDB_Total = kw_hdb_total),
    tibble(PLN_AREA_N = paste0(kw_parent_pas, " (RESIDUAL)"),
           HDB_Total = residual_hdb_total / length(kw_parent_pas))  # even split if 2 residuals
  )

stopifnot(kw_hdb_total > 0)  # fail loudly here, not three steps downstream in feature_master_table_v3

# Merge HDB metrics with district dimensions to resolve density metric
# NOTE: joins on hdb_cleaned_adj (reallocated), not hdb_cleaned (original)
hdb_density_df <- districts_base %>%
  left_join(hdb_cleaned_adj, by = "PLN_AREA_N") %>%
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

# Drop the internal residual bookkeeping rows — they exist only so amenity
# points near Kallang/Novena aren't lost or double-counted during the join;
# they don't correspond to any HDB town label and would never match resale
# data, so they're removed before this table becomes a lookup others read.
feature_master_table_v3 <- feature_master_table_v3 %>%
  filter(!grepl("\\(RESIDUAL\\)$", PLN_AREA_N))

# checking after updating shopping malls

sum(feature_master_table_v3$Shopping_Mall_Count) # count if 157

feature_master_table_v3 %>%
  filter(PLN_AREA_N %in% c("BISHAN", "TOA PAYOH", "BUKIT TIMAH")) %>%
  select(PLN_AREA_N, Shopping_Mall_Count) #check those 3 towns that were missing malls

feature_master_table_v3 %>%
  filter(Shopping_Mall_Count == 0) %>%
  pull(PLN_AREA_N) # sanity check areas without any malls

# KALLANG/WHAMPOA specific checks — must exist with a real, non-zero density
kw_row <- feature_master_table_v3 %>%
  filter(PLN_AREA_N == "KALLANG/WHAMPOA")
if (nrow(kw_row) == 0) {
  stop("KALLANG/WHAMPOA is missing from feature_master_table_v3 — boundary rebuild failed")
}
kw_density <- kw_row %>% pull(HDB_Density_per_SQKM)
if (length(kw_density) == 0 || kw_density == 0) {
  stop("KALLANG/WHAMPOA has zero HDB density — Census reallocation failed")
}
print(kw_row)  # eyeball AREA_SQKM (~5.94), HDB_Density_per_SQKM, and amenity counts

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