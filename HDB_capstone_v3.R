# Load the library ----
library(sf)
library(vip)
library (skimr)
library(dplyr)
library(tibble)
library(ggplot2)
library(cluster)      # silhouette(), daisy(), agnes()
library(factoextra) 
library(tidyverse)
library(readr)
library(lubridate)
library(stringr)
library(tidymodels)
library(timetk) 
library(modeltime)
library(ranger) # parsnip needs this
library(quarto)
library(httr2)
library(tidygeocoder)

# Data input----
resale_raw <- read_csv("data/ResaleflatpricesbasedonregistrationdatefromJan2017onwards.csv", show_col_types = FALSE)
bto_raw    <- read_csv("data/PriceRangeofHDBFlatsOffered.csv", show_col_types = FALSE)
rental_raw <- read_csv("data/RentingOutofFlatsfromJan2021.csv", show_col_types = FALSE)
town_feature_master <- read_csv("data/spatial/feature_master_table_v3.csv", show_col_types = FALSE)

n_resale_raw <- nrow(resale_raw)
n_rental_raw <- nrow(rental_raw)
n_bto_raw    <- nrow(bto_raw)

glimpse(resale_raw)

# Declared once, used at the point resale_town_features is actually built (in M2, below).
# Kallang/Whampoa is recovered via the boundary crosswalk (Part 1.1) — NOT excluded.
EXCLUDED_TOWNS <- c("CENTRAL AREA")

### constants

sqm_to_sqf = 10.7639 # we are used to psf value. convert everything to psf.

### resale ----
resale <- resale_raw %>%
  mutate(
    date_parsed     = ym(month),  # "2020-01" -> Date
    year        = year(date_parsed),
    month_num   = month(date_parsed),
    town      = str_to_title(town),
    floor_area_sqf = sqm_to_sqf * floor_area_sqm,
    flat_type = str_replace(str_to_upper(flat_type), " ROOM", "_ROOM"), #need to scrub the field across 3 tables
    flat_age = 2026 - lease_commence_date, # using HDB definition since there is lease buy-back. Fixed 2026 so features don't drift by rundate
    remaining_lease_yrs = 99 - flat_age, # this method can avoid the parsing issue and is more accurate realistically
    price_psf = resale_price / floor_area_sqf     
  ) %>%
  filter(flat_type %in% c("2_ROOM", "3_ROOM", "4_ROOM", "5_ROOM")) %>%
  select(year, town, flat_type, floor_area_sqf,
         remaining_lease_yrs, resale_price, price_psf) #use year instead of month from Prof's advice
write.csv(resale, "resale.csv", row.names = FALSE)

glimpse(resale)
n_resale_clean <- nrow(resale)

### rental ----

glimpse(rental_raw)

rental <- rental_raw %>%
  mutate(
    date_parsed   = ym(rent_approval_date),
    year          = year(date_parsed),
    month_num     = month(date_parsed),
    town          = str_to_title(town),
    flat_type     = str_replace(str_to_upper(flat_type), "-ROOM", "_ROOM"),
    #flat_age = year(Sys.Date()) - lease_commence_date, # rental does not take into account age of flat
    #remaining_lease_yrs = 99 - flat_age, # not applicable to rental
    #price_psf = resale_price / floor_area_sqm      # keep a per-sqm measure
  ) %>%
  filter(flat_type %in% c("2_ROOM", "3_ROOM", "4_ROOM", "5_ROOM")) %>%
  select(year, town, flat_type, monthly_rent)

glimpse(rental)
n_rental_clean <- nrow(rental)

### BTO ----

glimpse(bto_raw)

# 12 rows in the raw file record min_selling_price == max_selling_price == 0 —
# a project launched with 4-room/5-room units but no 2-room/3-room offering that
# year (e.g. Punggol 2017: 4-room and 5-room both have real prices, 2-room and
# 3-room both read 0,0). This is not a real $0 price; left uncleaned, it computes
# a fabricated $0 PSF and shows up as a false "price dip" in the BTO panel.
# Dropped BEFORE the price_psf calculation so no zero-derived PSF is ever created.
n_bto_zero_price <- bto_raw %>%
  filter(min_selling_price == 0, max_selling_price == 0) %>%
  nrow()
message(n_bto_zero_price, " BTO rows with min=max=0 price dropped (non-launched room type, not a real $0)")

bto <- bto_raw %>%
  filter(!(min_selling_price == 0 & max_selling_price == 0)) %>%
  mutate(
    year                      = as.integer(financial_year),
    #month_num                 = month(date_parsed),
    town                      = str_to_title(town),
    flat_type                 = str_replace(str_to_upper(room_type), "-ROOM", "_ROOM"),
    min_selling_price         = as.numeric(min_selling_price),
    max_selling_price         = as.numeric(max_selling_price),
    min_bto_flr_area_sqf      = 36 * sqm_to_sqf,
    max_bto_flr_area_sqf      = 45 * sqm_to_sqf,
    min_price_psf             = min_selling_price / min_bto_flr_area_sqf,
    max_price_psf             = max_selling_price / max_bto_flr_area_sqf
    #flat_age                  = year(Sys.Date()) - lease_commence_date, # using HDB definition since there is lease buy-back
    #remaining_lease_yrs       = 99 - flat_age, # this method can avoid the parsing issue and is more accurate realistically
    #price_psf                  = resale_price / floor_area_sqm      # keep a per-sqm measure
  ) %>%
  filter(flat_type %in% c("2_ROOM")) %>%
  select(year, town, flat_type, min_price_psf,max_price_psf,
         min_selling_price, max_selling_price)

glimpse(bto)
n_bto_clean <- nrow(bto)

### after cleaning this the the number of flats left
tibble(
  dataset = c("resale", "rental", "bto"),
  n_raw   = c(n_resale_raw, n_rental_raw, n_bto_raw),
  n_clean = c(n_resale_clean, n_rental_clean, n_bto_clean),
  pct_retained = round(100 * n_clean / n_raw, 1)
)

resale %>% count(town) %>% filter(str_detect(str_to_upper(town), "KALLANG"))

### building the common panel for 3 HDB types----
### resale town panel----

resale_town_panel <- resale %>%
  group_by(town, flat_type, year) %>%
  summarise(
    med_price = median(resale_price),
    med_psf   = median(price_psf),
    n         = n(),
    .groups   = "drop"
  )

# Opening exhibit: median price/psf over time, 2-5-ROOM, faceted sample of towns to see if they exhibit the same patterns
# Define color palette by region
town_colors <- c(
  # North (Red shades)
  "Woodlands"   = "#B71C1C", # Dark Red
  "Ang Mo Kio"  = "#E53935", # Medium Red
  "Toa Payoh"   = "#FF7043", # Coral/Light Red
  
  # East (Green shades)
  "Bedok"       = "#2E7D32", # Dark Green
  "Tampines"    = "#66BB6A", # Light Green
  
  # North-East (Orange shades)
  "Sengkang"    = "#E65100", # Dark Orange
  "Punggol"     = "#FF9800", # Medium Orange
  
  # West (Blue shades)
  "Clementi"    = "#0D47A1", # Dark Blue
  "Queenstown"  = "#1976D2", # Medium Blue
  "Bukit Batok" = "#64B5F6"  # Light Blue
)

resale_town_panel %>%
  filter(
    flat_type %in% c("2_ROOM", "3_ROOM", "4_ROOM", "5_ROOM"),
    town %in% names(town_colors)
  ) %>%
  ggplot(aes(x = year, y = med_psf, group = town, colour = town)) +
  geom_line(linewidth = 0.8) +
  facet_wrap(~ flat_type, ncol = 2) +
  scale_color_manual(values = town_colors) +
  labs(
    title = "Resale Price per Sqft Over Time by Flat Type and Region",
    x = NULL,
    y = "Median price per sqf (S$)",
    colour = "Town"
  ) +
  theme_minimal()
### dip from 2013-2019 consistent with TDSR/ABSD/LTV cooling measures introduced
### 2013; recovery from 2020 as pandemic-era demand shifted buyers to resale market


### create the rental town panel and see if the room tyles show the same price trend over time----

glimpse(rental)

rental_town_panel <- rental %>%
  group_by(town, flat_type, year) %>%
  summarise(
    med_price = median(monthly_rent),
    n         = n(),
    .groups   = "drop"
  )

rental_town_panel %>%
  filter(
    flat_type %in% c("2_ROOM", "3_ROOM", "4_ROOM", "5_ROOM"),
    town %in% names(town_colors)
  ) %>%
  ggplot(aes(x = year, y = med_price, group = town, colour = town)) +
  geom_line(linewidth = 0.8) +
  facet_wrap(~ flat_type, ncol = 2) +
  scale_color_manual(values = town_colors) +
  labs(
    title = "Rental Price per Sqft Over Time by Flat Type and Region",
    x = NULL,
    y = "Median price per sqf (S$)",
    colour = "Town"
  ) +
  theme_minimal()

glimpse(rental_town_panel)

### post pandemic surge in overall rental prices eased as increase in supply due to more flats reaching MOP.
### But they did not revert to pre-pandemic times

### bto town panel, Singles can only buy 2R BTO----
glimpse(bto)

bto_town_panel <- bto %>%
  group_by(town, flat_type, year) %>%
  summarise(
    med_price_psf = median(max_price_psf),
    n         = n(),
    .groups   = "drop"
  )

glimpse(bto_town_panel)

bto_town_panel %>%
  filter(flat_type == "2_ROOM",
         town %in% c("Ang Mo Kio", "Punggol", "Bukit Merah","Clementi","Bukit Batok",
                     "Woodlands", "Queenstown", "Sengkang","Tampines","Bedok","Toa Payoh")) %>%
  ggplot(aes(year, med_price_psf, colour = town)) +
  geom_line(linewidth = 0.8) +
  labs(title = "2-ROOM BTO price over time",
       x = NULL, y = "Median price (S$)", colour = "Town")

### the earlier apparent "dip" for Punggol 2015-2020 was a fabricated $0 PSF from
### 2 rows where the launch had no 2-room units (min=max=0), now dropped upstream.
### Remaining gaps (2020, 2021, 2022, 2024) reflect genuine years with no 2-room
### BTO launch in Punggol at all — left as gaps, not interpolated (see 1.2 doc).

### Tengah check — has real BTO history but zero resale history, so it has no
### town_group and cannot enter the model. Excluded by decision (Part 1.2 doc).
bto %>% filter(flat_type == "2_ROOM") %>% distinct(town) %>% arrange(town)
bto %>% filter(flat_type == "2_ROOM", town == "Tengah")
resale %>% filter(str_to_upper(town) == "TENGAH")
### Tengah has only BTO info but not resale data. So decision is to drop "Tengah" from the app.
### Users can use Bukit Batok as an approximate due to proximity

### M2----

glimpse(resale_town_panel)

resale_town_features <- resale_town_panel %>%
  filter(flat_type %in% c("2_ROOM","3_ROOM","4_ROOM","5_ROOM")) %>%
  group_by(town, flat_type) %>%
  arrange(year, .by_group = TRUE) %>%
  summarise(
    level_psf   = median(med_psf),
    growth_5y   = last(med_psf) / first(med_psf) - 1,  # crude level growth
    volatility  = sd(med_psf),
    .groups = "drop"
  ) %>% 
  pivot_wider(
    names_from = flat_type,
    values_from = c(level_psf, growth_5y, volatility),
    names_glue = "{.value}_{flat_type}"
  ) %>% 
  # --- WRANGLING NAs ---
  mutate(
    level_psf_2_ROOM = ifelse(is.na(level_psf_2_ROOM), median(level_psf_2_ROOM, na.rm = TRUE), level_psf_2_ROOM),
    level_psf_3_ROOM = ifelse(is.na(level_psf_3_ROOM), median(level_psf_3_ROOM, na.rm = TRUE), level_psf_3_ROOM),
    level_psf_4_ROOM = ifelse(is.na(level_psf_4_ROOM), median(level_psf_4_ROOM, na.rm = TRUE), level_psf_4_ROOM),
    level_psf_5_ROOM = ifelse(is.na(level_psf_5_ROOM), median(level_psf_5_ROOM, na.rm = TRUE), level_psf_5_ROOM),
    
    growth_5y_2_ROOM = ifelse(is.na(growth_5y_2_ROOM), 0, growth_5y_2_ROOM),
    growth_5y_3_ROOM = ifelse(is.na(growth_5y_3_ROOM), median(growth_5y_3_ROOM, na.rm = TRUE), growth_5y_3_ROOM),
    growth_5y_4_ROOM = ifelse(is.na(growth_5y_4_ROOM), median(growth_5y_4_ROOM, na.rm = TRUE), growth_5y_4_ROOM),
    growth_5y_5_ROOM = ifelse(is.na(growth_5y_5_ROOM), median(growth_5y_5_ROOM, na.rm = TRUE), growth_5y_5_ROOM),
    
    #For Volatility: This part works fine as is because contains() safely handles names as text strings!
    across(contains("volatility"), ~ ifelse(is.na(.), 0, .))
  )

glimpse(resale_town_features)
#### bring in the towns feature master table----
glimpse(town_feature_master)

### have to align the names of town in both tables
resale_town_features <- resale_town_features %>%
  mutate(town = str_to_upper(town))

### Central Area excluded (declared once, at the top, as EXCLUDED_TOWNS).
### Kallang/Whampoa is recovered via the Part 1.1 boundary crosswalk and is NOT
### dropped here — town_feature_master now carries a real row for it.
resale_town_features <- resale_town_features %>%
  filter(!town %in% EXCLUDED_TOWNS)

nrow(resale_town_features)  # SG has 26 towns - 1 (Central Area) = 25 is correct

unmatched <- resale_town_features %>%
  anti_join(town_feature_master, by = c("town" = "PLN_AREA_N")) %>%
  distinct(town) %>% pull(town)

if (length(unmatched) > 0) {
  stop("Unexpected unmatched towns in feature join: ", paste(unmatched, collapse = ", "))
}

### master join ----
cluster_rec <- resale_town_features %>%
  left_join(town_feature_master, by = c("town" = "PLN_AREA_N")) %>%
  mutate(across(where(is.numeric), ~ ifelse(is.na(.), 0, .)))

glimpse(cluster_rec)
###skim(cluster_rec)

### try to cluster----

set.seed(2026)

clust_rec <- recipe(~ ., data = cluster_rec) %>%
  update_role(town, new_role = "id") %>%
  step_zv(all_numeric_predictors()) %>%      # Drop structural zero variables safely
  step_normalize(all_numeric_predictors())   # Bring PSF, counts, and percentages to same scale

# bake the clean numeric matrix----
clust_prepped <- prep(clust_rec) %>% bake(new_data = NULL)
clust_matrix  <- clust_prepped %>% select(where(is.numeric))

# --- 1.3: justify number of centers on the corrected 25-town matrix ---
fviz_nbclust(clust_matrix, kmeans, method = "wss", nstart = 25)
fviz_nbclust(clust_matrix, kmeans, method = "silhouette", nstart = 25)

km7 <- kmeans(clust_matrix, centers = 7, nstart = 25)
table(km7$cluster)

km6 <- kmeans(clust_matrix, centers = 6, nstart = 25)
table(km6$cluster)
### eventhough 6-7 clusters is statistically correct, but having a cluster with just 1-2 towns does not have a meaningful profile
### the data with 2 towns will be thin for me to use for time-series. so 6 clusters is not great.

km4 <- kmeans(clust_matrix, centers = 4, nstart = 25)
table(km4$cluster)

km3 <- kmeans(clust_matrix, centers = 3, nstart = 25)
table(km3$cluster)
### k=3's silhouette (~0.195) is meaningfully below k=4's (~0.22) and well below k=6/7's peak (~0.26) but the number
### of towns are more balanced

# run K-Means Clustering ----
set.seed(2026) # reseed here to prevent drifting
km <- kmeans(clust_matrix, centers = 3, nstart = 25)

# append cluster labels back to the master framework----
town_groups <- cluster_rec %>%
  mutate(cluster = factor(km$cluster))
# check the town distributions across the clusters----
town_groups %>% count(cluster)

# profile clusters to see what makes them distinct, use 4R as sample----
cluster_profiles <- town_groups %>%
  group_by(cluster) %>%
  summarise(
    town_count          = n(),
    
    avg_HDB_density     = mean(HDB_Density_per_SQKM),
    
    # pricing profile (using 4-ROOM as the baseline)
    avg_4R_psf          = median(level_psf_4_ROOM),
    avg_4R_growth       = median(growth_5y_4_ROOM),
    avg_4R_volatility   = median(volatility_4_ROOM),
    
    # infrastructure & location Profile
    avg_mrt_exits       = mean(MRT_Exit_Count),
    avg_malls           = mean(Shopping_Mall_Count),
    avg_hawker_centres  = mean(Hawker_Centre_Count),
    avg_Preschool       = mean(Preschool_Count)
    
  )

print(cluster_profiles)

# update 4R town_groups with the clean, descriptive labels-----
# NOTE: re-inspect cluster_profiles above before trusting these labels/numbers —
# cluster membership can shift now that Kallang/Whampoa (dense, mature, central)
# is back in the sample. Check where it lands before assuming these labels still fit.
town_groups_labeled_4R <- town_groups %>%
  mutate(town_group = recode(cluster,
                             `1` = "High-Density Affordable Growth Corridor",
                             `2` = "Low-Density Premium Slower-Growth Suburbs",
                             `3` = "Mature Well-Connected Heartland"
  ))

# verify the final labelled data
town_groups_labeled_4R %>% 
  select(town, town_group, level_psf_4_ROOM, growth_5y_4_ROOM)

glimpse(town_groups_labeled_4R)

# 3R clustering
cluster_profiles <- town_groups %>%
  group_by(cluster) %>%
  summarise(
    town_count          = n(),
    
    avg_HDB_density     = mean(HDB_Density_per_SQKM),
    
    # pricing profile (using 3-ROOM as the baseline)
    avg_3R_psf          = median(level_psf_3_ROOM),
    avg_3R_growth       = median(growth_5y_3_ROOM),
    avg_3R_volatility   = median(volatility_3_ROOM),
    
    # infrastructure & location Profile
    avg_mrt_exits       = mean(MRT_Exit_Count),
    avg_malls           = mean(Shopping_Mall_Count),
    avg_hawker_centres  = mean(Hawker_Centre_Count),
    avg_hdb_density     = mean(HDB_Density_per_SQKM)
  )

print(cluster_profiles)

town_groups_labeled_3R <- town_groups %>%
  mutate(town_group = recode(cluster,
                             `1` = "High-Density Affordable Growth Corridor",
                             `2` = "Low-Density Premium Slower-Growth Suburbs",
                             `3` = "Mature Well-Connected Heartland"
  ))

town_groups_labeled_3R %>% 
  select(town, town_group, level_psf_3_ROOM, growth_5y_3_ROOM)


# 5R clustering
cluster_profiles <- town_groups %>%
  group_by(cluster) %>%
  summarise(
    town_count          = n(),
    
    avg_HDB_density     = mean(HDB_Density_per_SQKM),
    
    avg_5R_psf          = median(level_psf_5_ROOM),
    avg_5R_growth       = median(growth_5y_5_ROOM),
    avg_5R_volatility   = median(volatility_5_ROOM),
    
    avg_mrt_exits       = mean(MRT_Exit_Count),
    avg_malls           = mean(Shopping_Mall_Count),
    avg_hawker_centres  = mean(Hawker_Centre_Count),
    avg_hdb_density     = mean(HDB_Density_per_SQKM)
  )

print(cluster_profiles)

town_groups_labeled_5R <- town_groups %>%
  mutate(town_group = recode(cluster,
                             `1` = "High-Density Affordable Growth Corridor",
                             `2` = "Low-Density Premium Slower-Growth Suburbs",
                             `3` = "Mature Well-Connected Heartland"
  ))
town_groups_labeled_5R %>% 
  select(town, town_group, level_psf_5_ROOM, growth_5y_5_ROOM)


# 2R clustering
cluster_profiles <- town_groups %>%
  group_by(cluster) %>%
  summarise(
    town_count          = n(),
    
    avg_HDB_density     = mean(HDB_Density_per_SQKM),
    
    avg_2R_psf          = median(level_psf_2_ROOM),
    avg_2R_growth       = median(growth_5y_2_ROOM),
    avg_2R_volatility   = median(volatility_2_ROOM),
    
    avg_mrt_exits       = mean(MRT_Exit_Count),
    avg_malls           = mean(Shopping_Mall_Count),
    avg_hawker_centres  = mean(Hawker_Centre_Count),
    avg_hdb_density     = mean(HDB_Density_per_SQKM)
  )

print(cluster_profiles)

town_groups_labeled_2R <- town_groups %>%
  mutate(town_group = recode(cluster,
                             `1` = "High-Density Affordable Growth Corridor",
                             `2` = "Low-Density Premium Slower-Growth Suburbs",
                             `3` = "Mature Well-Connected Heartland"
  ))

town_groups_labeled_2R %>% 
  select(town, town_group, level_psf_2_ROOM, growth_5y_2_ROOM)


# Derive labels from the profile itself, not a hardcoded cluster number —
# kmeans() cluster numbers are arbitrary and can differ between runs even
# with the same seed, depending on convergence order. Ranking by the actual
# defining characteristics (density, MRT/hawker access, price) makes the
# label assignment robust to that, instead of hoping "1" always means the
# same thing.

cluster_characteristics <- town_groups %>%
  group_by(cluster) %>%
  summarise(
    avg_density = mean(HDB_Density_per_SQKM),
    avg_mrt     = mean(MRT_Exit_Count),
    avg_hawker  = mean(Hawker_Centre_Count),
    avg_4r_psf  = median(level_psf_4_ROOM),
    .groups = "drop"
  )

print(cluster_characteristics)

# Mature Heartland: highest MRT exits + highest hawker centres + highest price
# Growth Corridor: highest density + lowest price
# Premium Suburbs: the remaining one (lowest density, lowest MRT)



### M3----

resale_clean_upper <- resale %>%
  mutate(town = str_to_upper(town))

town_groups_upper <- town_groups %>%
  mutate(town = str_to_upper(town))

glimpse(town_groups_upper)
glimpse(resale_clean_upper)

resale_labelled <- resale_clean_upper %>%
  left_join(
    town_groups_upper %>% select(town, cluster), 
    by = "town"
  )

## decided to use all the data up to 2026 instead of stopping at 2021 to fully
## take in the effects post covid

set.seed(2026)
model_df <- resale_labelled %>%
  drop_na(price_psf, remaining_lease_yrs, cluster) %>%
  mutate(across(c(flat_type, cluster), as.factor))

split   <- initial_split(model_df, prop = 0.8, strata = price_psf)
train   <- training(split)
test    <- testing(split)

# flip to eval: true — two recipes: WITHOUT vs WITH the M2 cluster label.
rec_without <- recipe(price_psf ~ flat_type + remaining_lease_yrs + floor_area_sqf,
                      data = train) %>%
  step_dummy(all_nominal_predictors()) %>%
  step_zv(all_predictors())

rec_with <- recipe(price_psf ~ flat_type + remaining_lease_yrs + floor_area_sqf +
                     cluster, data = train) %>%
  step_dummy(all_nominal_predictors()) %>%
  step_zv(all_predictors())

rf_spec <- rand_forest(trees = 500) %>%
  set_engine("ranger", importance = "permutation") %>%
  set_mode("regression")

wf_without <- workflow() %>% add_recipe(rec_without) %>% add_model(rf_spec)
wf_with    <- workflow() %>% add_recipe(rec_with)    %>% add_model(rf_spec)

# flip to eval: true — HELD-OUT scoring on test, the number that counts.
set.seed(2026)
fit_without <- fit(wf_without, data = train)
fit_with    <- fit(wf_with,    data = train)

metric_set_reg <- metric_set(rmse, rsq, mae)

score <- function(fit_obj, label) {
  augment(fit_obj, new_data = test) %>%
    metric_set_reg(truth = price_psf, estimate = .pred) %>%
    mutate(model = label)
}

bind_rows(score(fit_without, "without M2 group"),
          score(fit_with,    "with M2 group")) %>%
  select(model, .metric, .estimate) %>%
  pivot_wider(names_from = .metric, values_from = .estimate)

# The cluster feature engineered via k-means clustering (Part 1.3, k=3, nstart=25,
# recomputed on the corrected 25-town matrix) whose inclusion reduced held-out RMSE from $120.0 to $101.0 psf
# (a 15.8% reduction), reduced MAE from $92.3 to $80.5 psf (12.8%), and increased
# R2 from 0.422 to 0.614 (a 19.2 percentage-point / 45.5% relative gain in explained
# variance). 
# This confirms the town cluster label — derived from unsupervised k-means
# on price level, growth, volatility and amenity/density features — captures real
# structural variation in resale price not captured by flat_type, remaining_lease_yrs
# and floor_area_sqf alone.

# flip to eval: true — which drivers matter in the WITH model.
fit_with %>% extract_fit_parsnip() %>% vip(num_features = 10)
# remaining lease years, cluster 3, floor area sqf are the top 3 factors

### 1.4 — Naive town-median baseline ----
# Predict each test transaction's price as its town's median from the training set.
# This is the naive baseline the rubric requires the RF models to beat.

naive_baseline <- train %>%
  group_by(town) %>%
  summarise(town_median_psf = median(price_psf), .groups = "drop")

test_naive <- test %>%
  left_join(naive_baseline, by = "town")

# Guard: every test-set town should have a training-set median. If not, that town's
# transactions in test are unscoreable by this baseline — surface it, don't silently NA it.
unscored <- test_naive %>% filter(is.na(town_median_psf)) %>% distinct(town)
if (nrow(unscored) > 0) {
  warning("Towns in test with no training-set median: ", paste(unscored$town, collapse = ", "))
}

naive_scores <- test_naive %>%
  filter(!is.na(town_median_psf)) %>%
  metric_set_reg(truth = price_psf, estimate = town_median_psf) %>%
  mutate(model = "naive town-median baseline")

# Combine with the RF comparison for the full three-row table 1.4 asks for
bind_rows(
  naive_scores,
  score(fit_without, "RF without cluster"),
  score(fit_with,    "RF with cluster")
) %>%
  select(model, .metric, .estimate) %>%
  pivot_wider(names_from = .metric, values_from = .estimate)

### New Addition — Lease flexibility diagnostics because of town rejuvenation efforts----
### Older towns can have very new HDBs. This is an attempt to make the app more realistic
### Establishes the real remaining_lease_yrs range before choosing bin
### boundaries for the valuation grid, replacing the hardcoded 94.

range(resale$remaining_lease_yrs)
quantile(resale$remaining_lease_yrs, seq(0, 1, 0.1))

resale %>%
  group_by(flat_type) %>%
  summarise(
    min_lease = min(remaining_lease_yrs),
    p10       = quantile(remaining_lease_yrs, 0.1),
    median    = median(remaining_lease_yrs),
    p90       = quantile(remaining_lease_yrs, 0.9),
    max_lease = max(remaining_lease_yrs),
    n         = n()
  )
### 2R has a higher median suggests a different group of owners 

### before picking a bin width, let me check cell density
resale %>%
  mutate(lease_bin = cut(remaining_lease_yrs,
                         breaks = seq(35, 95, by = 5),
                         include.lowest = TRUE)) %>%
  count(flat_type, lease_bin) %>%
  pivot_wider(names_from = flat_type, values_from = n, values_fill = 0) %>%
  arrange(lease_bin)
### previously assumed remaining lease = 94 is in accurate looking at this data
### can be fixed by creating a lease grid 

### Part 2 — Lease-aware valuation grid ----
### Replaces the single hardcoded remaining_lease_yrs = 94 with a real grid
### spanning the observed range. remaining_lease_yrs enters the RF as a
### continuous predictor (rec_with), so predict() is valid at any of these
### points — but n_train_support flags cells with little/no nearby training
### data (esp. 2-room, ~60-80y remaining lease — see lease diagnostic above)
### so the app can surface a low-confidence note rather than presenting every
### cell with equal confidence.

LEASE_GRID <- seq(40, 95, by = 5)

app_valuation_grid <- crossing(
  town_group          = c("1", "2", "3"),
  flat_type           = c("2_ROOM", "3_ROOM", "4_ROOM", "5_ROOM"),
  remaining_lease_yrs = LEASE_GRID
) %>%
  mutate(
    floor_area_sqf = case_when(
      flat_type == "2_ROOM" ~ 484,
      flat_type == "3_ROOM" ~ 732,
      flat_type == "4_ROOM" ~ 1022,
      flat_type == "5_ROOM" ~ 1184
    ),
    cluster = factor(town_group, levels = levels(model_df$cluster))
  )

# Support count: training rows within +/-2.5 years of each grid point, per
# flat_type (cluster intentionally not filtered here, since lease sparsity
# is a flat_type-level pattern, not a town/cluster-level one — confirmed in
# the diagnostic above).
train_support <- app_valuation_grid %>%
  rowwise() %>%
  mutate(
    n_train_support = sum(
      train$flat_type == flat_type &
        abs(train$remaining_lease_yrs - remaining_lease_yrs) <= 2.5
    )
  ) %>%
  ungroup()

empirical_start_matrix <- train_support %>%
  mutate(predicted_start_psf = predict(fit_with, new_data = train_support)$.pred) %>%
  select(town_group, flat_type, remaining_lease_yrs, floor_area_sqf,
         predicted_start_psf, n_train_support)

print("--- EMPIRICAL STARTING VALUATION MATRIX (lease-aware) ---")
print(empirical_start_matrix, n = Inf)

# Flag exactly which cells are low-confidence, for the app note and the report
low_confidence_cells <- empirical_start_matrix %>% filter(n_train_support < 30)
print(low_confidence_cells)

LOW_SUPPORT_THRESHOLD <- 20

empirical_start_matrix <- empirical_start_matrix %>%
  mutate(low_confidence = n_train_support < LOW_SUPPORT_THRESHOLD)

# Save the artefact — this is what app.R's lease-aware lookup (Part 3) will read
write_csv(empirical_start_matrix, "data/empirical_start_matrix_lease.csv")

empirical_start_matrix %>% filter(low_confidence) %>% arrange(n_train_support)

empirical_start_matrix %>% filter(n_train_support < 20, !low_confidence)

### M4 ----

# prepare the monthly timeline directly from 'resale' because i decided to drop "month" field earlier to align with other data tables
#that only have year. so here have to bring back the month using resale table

if ("town_group" %in% colnames(town_groups)) {
  town_map <- town_groups %>%
    mutate(
      town = str_to_upper(town),
      town_group = as.character(town_group)
    ) %>%
    select(town, town_group)
} else {
  town_map <- town_groups %>%
    mutate(
      town = str_to_upper(town),
      town_group = as.character(cluster)
    ) %>%
    select(town, town_group)
}

group_ts <- resale_raw %>%
  mutate(
    month_date      = ym(month), 
    town_upper      = str_to_upper(town),
    flat_type_clean = str_replace(str_to_upper(flat_type), " ROOM", "_ROOM"),
    floor_area_sqf  = floor_area_sqm * 10.76391,
    price_psf       = resale_price / floor_area_sqf
  ) %>%
  # Allow all room sizes to pass through for modeling for users to choose multiple
  filter(flat_type_clean %in% c("2_ROOM", "3_ROOM", "4_ROOM", "5_ROOM")) %>%
  left_join(town_map, by = c("town_upper" = "town")) %>%
  # Include flat_type_clean in the group parameters
  group_by(town_group, flat_type_clean, month_date) %>%
  summarise(med_psf = median(price_psf, na.rm = TRUE), .groups = "drop") %>%
  drop_na(town_group, flat_type_clean, month_date)

# Extract every distinct housing combination available — MOVED UP to right
# after group_ts is built, so it exists before the spot-check block below
# uses it (was previously defined much later, after being referenced here —
# same "used before defined" bug pattern as elsewhere in this project).
combination_grid <- group_ts %>% 
  distinct(town_group, flat_type_clean) %>% 
  arrange(town_group, flat_type_clean)

combination_grid %>%
  slice_sample(n = 3) %>%   # spot-check a few other combos
  pwalk(function(town_group, flat_type_clean) {
    ts <- group_ts %>% filter(town_group == !!town_group, flat_type_clean == !!flat_type_clean)
    if (nrow(ts) < 12) return(NULL)
    sp <- time_series_split(ts, date_var = month_date, assess = "12 months", cumulative = TRUE)
    m_a <- arima_reg() %>% set_engine("auto_arima") %>% fit(med_psf ~ month_date, data = training(sp))
    m_e <- exp_smoothing() %>% set_engine("ets") %>% fit(med_psf ~ month_date, data = training(sp))
    modeltime_table(m_a, m_e) %>% modeltime_calibrate(new_data = testing(sp)) %>% modeltime_accuracy() %>%
      mutate(town_group = town_group, flat_type = flat_type_clean) %>% print()
  })

one_group <- group_ts %>% 
  filter(town_group == "1", flat_type_clean == "4_ROOM")

set.seed(2026)

splits <- time_series_split(
  one_group, 
  date_var = month_date,                            
  assess = "12 months", 
  cumulative = TRUE
)

# Fit Auto-ARIMA
m_arima <- arima_reg() %>% 
  set_engine("auto_arima") %>%  
  fit(med_psf ~ month_date, data = training(splits))

# Fit ETS (Exponential Smoothing)
m_ets <- exp_smoothing() %>% 
  set_engine("ets") %>%  
  fit(med_psf ~ month_date, data = training(splits))

# Model Table & Performance Calibration
mtbl <- modeltime_table(m_arima, m_ets)

calibration_results <- mtbl %>%  
  modeltime_calibrate(new_data = testing(splits))

# Print accuracy metrics to console
calibration_results %>%  
  modeltime_accuracy()

### Winner is ARIMA(0,2,3) — held on the corrected 25-town clustering (Part 1.1/1.3).
### On held-out test data: MAE $31.2 psf vs ETS $35.1 psf (ARIMA 11.1% lower);
### RMSE $33.8 vs $37.6 (10.1% lower); R2 0.525 vs 0.506. ARIMA forecasts on
### unseen data deviate by $31.20 psf on average, vs $35.10 for ETS.

max(training(splits)$month_date)   # training-window end date

group_ts %>%
  filter((town_group == "3" & flat_type_clean == "2_ROOM") |
           (town_group == "2" & flat_type_clean == "3_ROOM")) %>%
  count(town_group, flat_type_clean, name = "n_months")


resale_raw %>%
  mutate(
    month_date      = ym(month),
    town_upper      = str_to_upper(town),
    flat_type_clean = str_replace(str_to_upper(flat_type), " ROOM", "_ROOM")
  ) %>%
  filter(flat_type_clean %in% c("2_ROOM", "3_ROOM", "4_ROOM", "5_ROOM")) %>%
  left_join(town_map, by = c("town_upper" = "town")) %>%
  filter(
    (town_group == "3" & flat_type_clean == "2_ROOM") |
      (town_group == "2" & flat_type_clean == "3_ROOM") |
      (town_group == "1" & flat_type_clean == "4_ROOM")   # your original strong-R2 series, for comparison
  ) %>%
  count(town_group, flat_type_clean, month_date) %>%
  group_by(town_group, flat_type_clean) %>%
  summarise(
    avg_txn_per_month = mean(n),
    median_txn_per_month = median(n),
    min_txn_per_month = min(n),
    .groups = "drop"
  )

resale_raw %>%
  mutate(
    month_date = ym(month),
    town_upper = str_to_upper(town),
    flat_type_clean = str_replace(str_to_upper(flat_type), " ROOM", "_ROOM")
  ) %>%
  filter(flat_type_clean %in% c("2_ROOM","3_ROOM","4_ROOM","5_ROOM")) %>%
  left_join(town_map, by = c("town_upper" = "town")) %>%
  filter(!is.na(town_group)) %>%
  count(town_group, flat_type_clean, month_date) %>%
  group_by(town_group, flat_type_clean) %>%
  summarise(avg_txn_per_month = round(mean(n), 1), .groups = "drop") %>%
  arrange(avg_txn_per_month)

# 2RM transactions are infrequent (<30/month) in every town cluster, so month to month
# price forecasts for this flat type carries wider uncertainty. The 5 year growth projections should be 
# read as directional only.

### Refit and forecast-----

refit_tbl <- calibration_results %>%
  filter(.model_id == 1) %>% # Select the ARIMA model (ID 1)
  modeltime_refit(data = one_group)

# Forecast the next 60 months (5 years) with 95% confidence intervals
forecast_tbl <- refit_tbl %>%
  modeltime_forecast(
    h           = "60 months",
    actual_data = one_group
  )

# View the projected 5-year bounds in your console
forecast_tbl %>%
  filter(.key == "prediction") %>%
  slice_tail(n = 1) %>% # Grab the final month (Month 60)
  select(.index, .value, .conf_lo, .conf_hi)

# Generate an extraction tracking framework grid that runs across every single permutation
# of town group and flat layout type, then auto saves the 5-year forecasted endpoints into a results collector df

forecast_collector <- list()

# Loop through all permutations dynamically
for (i in 1:nrow(combination_grid)) {
  current_g  <- combination_grid$town_group[i]
  current_ft <- combination_grid$flat_type_clean[i]
  
  cat("PROCESSING FRAMEWORK -> Group:", current_g, "| Type:", current_ft, "\n")
  
  # Isolate specific time series path
  target_series <- group_ts %>% 
    filter(town_group == current_g, flat_type_clean == current_ft)
  
  # Skip if sequence doesn't have enough data points to calibrate
  if(nrow(target_series) < 12) next
  
  # Refit ARIMA engine on this explicit track
  refit_tbl <- calibration_results %>%
    filter(.model_id == 1) %>% 
    modeltime_refit(data = target_series)
  
  # Project out 60 months into the future
  forecast_tbl <- refit_tbl %>%
    modeltime_forecast(h = "60 months", actual_data = target_series)
  
  # Extract Month 60 predictions
  summary_line <- forecast_tbl %>%
    filter(.key == "prediction") %>%
    slice_tail(n = 1) %>% 
    mutate(town_group = current_g, flat_type_clean = current_ft) %>%
    select(town_group, flat_type_clean, .value, .conf_lo, .conf_hi)
  
  forecast_collector[[i]] <- summary_line
}

# Combine all generated predictions cleanly into a single data asset
forecast_bounds_dynamic <- bind_rows(forecast_collector) %>%
  rename(
    forecast_central = .value,
    forecast_low     = .conf_lo,
    forecast_high    = .conf_hi
  )

glimpse(forecast_bounds_dynamic)

# 1. Establish structural starting baselines from the latest historical figures
starting_values_dynamic <- group_ts %>%
  group_by(town_group, flat_type_clean) %>%
  filter(month_date == max(month_date)) %>% 
  summarise(start_psf = med_psf, .groups = "drop")

# 2. Join historical records with dynamic future forecasts and compute 5-Year CAGRs
growth_matrix_dynamic <- starting_values_dynamic %>%
  left_join(forecast_bounds_dynamic, by = c("town_group", "flat_type_clean")) %>%
  mutate(
    low_growth_annual     = (forecast_low / start_psf)^(1/5) - 1,
    central_growth_annual = (forecast_central / start_psf)^(1/5) - 1,
    high_growth_annual    = (forecast_high / start_psf)^(1/5) - 1
  )

# 3. Print the clean multi-room growth asset table to the console
print("--- EMPIRICAL MULTI-ROOM GROWTH MATRIX ---")
print(growth_matrix_dynamic)

### =====================================================================
### PART 5.1 — Assemble the Canonical Artefact ----
### One export covering crossing(town, flat_type, remaining_lease_yrs, path)
### per the plan. Two paths modeled (Resale, BTO); Renting deliberately
### excluded — it has no per-town prediction, it's computed live from the
### user's base_rent input in app.R, so there's nothing to serve here.
### =====================================================================

# ---- BTO real per-town pricing ----
# Most recent 2-room launch per town, not averaged — BTO prices escalate
# over time (same convention as M4's starting_values_dynamic). Towns with
# no 2-room BTO history get bto_available = FALSE, not a fabricated price.
# Tengah excluded by decision (Part 1.2 documentation, checked above) — has
# BTO history but zero resale history, so it has no town_group and cannot
# enter this artefact via the town_groups join below.

bto_town_latest <- bto_town_panel %>%
  filter(flat_type == "2_ROOM") %>%
  group_by(town) %>%
  filter(year == max(year)) %>%
  ungroup() %>%
  transmute(
    town                      = str_to_upper(town),
    bto_price_start           = med_price_psf * (45 * sqm_to_sqf),
    bto_latest_launch_year    = year,
    bto_available             = TRUE
  )

all_towns <- resale_town_features %>% distinct(town) %>% pull(town)

bto_town_pricing <- tibble(town = all_towns) %>%
  left_join(bto_town_latest, by = "town") %>%
  mutate(
    bto_available          = coalesce(bto_available, FALSE),
    bto_years_since_launch = 2026 - bto_latest_launch_year,
    bto_stale              = bto_available & bto_years_since_launch > 2
  )

# Sanity check — expect roughly 12 TRUE / 13 FALSE (25 towns), per Part 1.2's finding
bto_town_pricing %>% count(bto_available)

# Derive labels from the profile itself, not a hardcoded cluster number —
# kmeans() cluster numbers are arbitrary and can differ between runs even
# with the same seed, depending on convergence order. Ranking by the actual
# defining characteristics (density, MRT/hawker access, price) makes the
# label assignment robust to that, instead of hoping "1" always means the
# same thing.

cluster_characteristics <- town_groups %>%
  group_by(cluster) %>%
  summarise(
    avg_density = mean(HDB_Density_per_SQKM),
    avg_mrt     = mean(MRT_Exit_Count),
    avg_hawker  = mean(Hawker_Centre_Count),
    avg_4r_psf  = median(level_psf_4_ROOM),
    .groups = "drop"
  )

cluster_label_map <- cluster_characteristics %>%
  mutate(
    cluster_label = case_when(
      avg_mrt == max(avg_mrt) & avg_hawker == max(avg_hawker) ~ "Cluster: Mature Heartland",
      avg_density == max(avg_density)                          ~ "Cluster: Growth Corridor",
      TRUE                                                       ~ "Cluster: Premium Suburbs"
    )
  ) %>%
  select(cluster, cluster_label)

town_cluster_map <- town_groups %>%
  mutate(town = str_to_upper(town), town_group = as.character(cluster)) %>%
  left_join(cluster_label_map, by = "cluster") %>%
  select(town, town_group, cluster_label)

# Anchor check — this is the guard that just caught the original bug.
# Keep it, now checking against the label (correct by construction), not
# a hardcoded cluster number (which is what was wrong before).
stopifnot(
  town_cluster_map %>% filter(town == "ANG MO KIO") %>% pull(cluster_label) == "Cluster: Mature Heartland",
  town_cluster_map %>% filter(town == "PUNGGOL")    %>% pull(cluster_label) == "Cluster: Growth Corridor",
  town_cluster_map %>% filter(town == "BISHAN")     %>% pull(cluster_label) == "Cluster: Premium Suburbs"
)

# ---- Resale artefact: full crossing(town, flat_type, lease), town-level ----
resale_artefact <- crossing(
  town                = all_towns,
  flat_type           = c("2_ROOM", "3_ROOM", "4_ROOM", "5_ROOM"),
  remaining_lease_yrs = LEASE_GRID
) %>%
  left_join(town_cluster_map, by = "town") %>%
  left_join(
    empirical_start_matrix,
    by = c("town_group", "flat_type", "remaining_lease_yrs")
  ) %>%
  left_join(
    growth_matrix_dynamic %>%
      rename(flat_type = flat_type_clean) %>%
      select(town_group, flat_type, low_growth_annual, central_growth_annual, high_growth_annual),
    by = c("town_group", "flat_type")
  ) %>%
  mutate(
    path        = "Resale Purchase",
    data_source = "model"
  ) %>%
  select(town, cluster_label, flat_type, remaining_lease_yrs, path,
         predicted_start_psf, floor_area_sqf,
         low_growth_annual, central_growth_annual, high_growth_annual,
         n_train_support, low_confidence, data_source)

# ---- BTO artefact: 2-room only, towns with real launch history only ----
# remaining_lease_yrs = 99 (standard fresh lease) — the Flexi scheme's
# short-lease CHOICE (15-45y at a different price) is real but not modeled
# here; flagged as a known gap, not fabricated.
bto_artefact <- bto_town_pricing %>%
  filter(bto_available) %>%
  left_join(town_cluster_map, by = "town") %>%
  transmute(
    town, cluster_label,
    flat_type            = "2_ROOM",
    remaining_lease_yrs  = 99,
    path                  = "BTO Purchase",
    predicted_start_psf  = bto_price_start / (45 * sqm_to_sqf),
    floor_area_sqf        = 45 * sqm_to_sqf,
    low_growth_annual     = NA_real_,   # BTO growth not town/cluster-modeled — see TODO below
    central_growth_annual = 0.021,       # existing flat placeholder (bto_growth_annual)
    high_growth_annual     = NA_real_,
    n_train_support        = NA_integer_,
    low_confidence          = bto_stale,  # reuse the same signal: thin/stale = lower confidence
    data_source              = "model"
  )
# TODO: BTO growth rate is still a flat 0.021 constant, not town/cluster-
# specific — unlike resale, M4's ARIMA forecasts were never built on the
# BTO panel. Real gap, stated here rather than silently inherited.

housing_projection_matrix <- bind_rows(resale_artefact, bto_artefact)

# ---- Part 5.2 (build-time half): assert complete coverage ----
# Resale must cover every town x flat_type x lease combination — no silent
# gaps. BTO coverage target is the confirmed-available town set only (13
# towns genuinely have no BTO; that's not a gap, it's documented reality
# from Part 1.2 and must NOT be asserted against). MOVED HERE — this block
# depends on housing_projection_matrix, which does not exist until the
# bind_rows() immediately above; it previously sat before this block was
# ever built and threw "object 'housing_projection_matrix' not found".

expected_resale_rows <- length(all_towns) * 4 * length(LEASE_GRID)
actual_resale_rows   <- housing_projection_matrix %>% filter(path == "Resale Purchase") %>% nrow()
stopifnot(actual_resale_rows == expected_resale_rows)

expected_bto_towns <- bto_town_pricing %>% filter(bto_available) %>% nrow()
actual_bto_rows    <- housing_projection_matrix %>% filter(path == "BTO Purchase") %>% nrow()
stopifnot(actual_bto_rows == expected_bto_towns)

if (any(is.na(housing_projection_matrix$predicted_start_psf))) {
  stop("housing_projection_matrix has NA predicted_start_psf — coverage gap, investigate before export")
}

message("Parity gate passed: ", actual_resale_rows, " resale rows, ",
        actual_bto_rows, " BTO rows, 0 coverage gaps.")

# ---- Export: committed to the repo, and what gets pushed to Supabase later ----
dir.create("model_outputs", showWarnings = FALSE)
write_csv(housing_projection_matrix, "model_outputs/housing_projection_matrix.csv")

glimpse(housing_projection_matrix)
housing_projection_matrix %>% count(path, data_source)

### Stimulator build prep---- 

# =====================================================================
# PHASE 4: UPGRADED DYNAMIC SIMULATOR CONFIGURATION
# =====================================================================

# 1 & 4 (Global Housing Rules, Standard Monthly Amortization Helper):
# now sourced from financial_rules.R — this is the SAME rules list,
# monthly_payment(), check_msr_tdsr(), and compute_equity() used by app.R
# and generate_financial_fixtures.R. Do not redefine these locally; a
# fourth independent copy is exactly the drift risk that produced the
# k >= n balance bug caught earlier this session (fixed once, in
# financial_rules.R, rather than three more times here).
source("financial_rules.R")

# 2. Multi-tier Interest Rate Scenarios
rate_scenarios <- tibble(
  scenario    = c("low_rate", "central_rate", "high_rate"),
  annual_rate = c(0.026,      0.035,          0.045) # 2.6% (CPF) to 4.5% (Stress Test)
)

# 3. Dynamic Inflation Settings
rent_growth_annual <- 0.035  
bto_growth_annual  <- 0.021  

# 5. Upgraded Simulator Engine (v3)
# Tracks customized cash injections and returns monthly outlays for budget checks.
# Ownership pathway now delegates to compute_equity() (financial_rules.R)
# instead of recomputing the amortization/balance formula inline.
simulate_networth_v3 <- function(path, price, annual_rate, growth, rules, 
                                 cash_injection = NULL, base_rent = 2200, 
                                 rent_growth = rent_growth_annual) {
  h <- rules$horizon_years
  
  # --- PATHWAY A: RENTAL SYSTEM ---
  if (path == "rent") {
    yearly_rent_outlays <- numeric(h)
    for (year in 1:h) {
      yearly_rent_outlays[year] <- (base_rent * 12) * (1 + rent_growth)^(year - 1)
    }
    total_rent_paid <- sum(yearly_rent_outlays)
    
    return(tibble(
      net_worth_5y    = -total_rent_paid,
      monthly_housing = base_rent
    ))
  }
  
  # --- PATHWAY B: HDB OWNERSHIP (BTO / RESALE) ---
  cash <- if (is.null(cash_injection)) 0 else cash_injection
  eq <- compute_equity(price, annual_rate, growth, cash_injection = cash,
                       ltv = rules$ltv, loan_years = rules$loan_years,
                       horizon_years = h)
  
  down <- max(price * (1 - rules$ltv), cash)
  paid <- eq$monthly_payment * 12 * h
  
  return(tibble(
    net_worth_5y    = eq$equity_5y - paid - down,
    monthly_housing = eq$monthly_payment
  ))
}

### save RData ----
save.image("HDB_capstone_v3.RData")