
install.packages("skimr")
install.packages("remotes")
install.packages("vip", repos = c("https://r-universe.dev", "https://cloud.r-project.org"))

# Load the library
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

### save RData ----
save.image("HDB_capstone_v2.RData")

resale_raw <- read_csv("data/ResaleflatpricesbasedonregistrationdatefromJan2017onwards.csv", show_col_types = FALSE)
bto_raw    <- read_csv("data/PriceRangeofHDBFlatsOffered.csv", show_col_types = FALSE)
rental_raw <- read_csv("data/RentingOutofFlatsfromJan2021.csv", show_col_types = FALSE)
town_feature_master <- read_csv("data/spatial/feature_master_table_v3.csv", show_col_types = FALSE)

glimpse(resale_raw)

### constants

sqm_to_sqf = 10.7639 # we are used to psf value. convert everything to psf.

### from Prof's guide. thank you Prof!!
### resale ----
resale <- resale_raw %>%
  mutate(
    date_parsed     = ym(month),  # "2020-01" -> Date
    year        = year(date_parsed),
    month_num   = month(date_parsed),
    town      = str_to_title(town),
    floor_area_sqf = sqm_to_sqf * floor_area_sqm,
    flat_type = str_replace(str_to_upper(flat_type), " ROOM", "_ROOM"), #need to scrub the field across 3 tables
    flat_age = year(Sys.Date()) - lease_commence_date, # using HDB definition since there is lease buy-back
    remaining_lease_yrs = 99 - flat_age, # this method can avoid the parsing issue and is more accurate realistically
    price_psf = resale_price / floor_area_sqf     
  ) %>%
  filter(flat_type %in% c("2_ROOM", "3_ROOM", "4_ROOM", "5_ROOM")) %>%
  select(year, town, flat_type, floor_area_sqf,
         remaining_lease_yrs, resale_price, price_psf) #use year instead of month from Prof's advice
write.csv(resale, "resale.csv", row.names = FALSE)
glimpse(resale)

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


### BTO ----

glimpse(bto_raw)

bto <- bto_raw %>%
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
resale_town_panel %>%
  filter(flat_type == "2_ROOM",
         town %in% c("Ang Mo Kio", "Punggol", "Clementi", "Bukit Batok",
                     "Woodlands", "Queenstown", "Sengkang", "Tampines", 
                     "Bedok", "Toa Payoh")) %>%
  ggplot(aes(year, med_psf, colour = town)) +
  geom_line(linewidth = 0.8) +
  labs(title = "2-ROOM resale price per sqf over time",
       x = NULL, y = "Median price per sqf (S$)", colour = "Town")

resale_town_panel %>%
  filter(flat_type == "3_ROOM",
         town %in% c("Ang Mo Kio", "Punggol", "Clementi", "Bukit Batok",
                     "Woodlands", "Queenstown", "Sengkang", "Tampines", 
                     "Bedok", "Toa Payoh")) %>%
  ggplot(aes(year, med_psf, colour = town)) +
  geom_line(linewidth = 0.8) +
  labs(title = "3-ROOM resale price per sqf over time",
       x = NULL, y = "Median price per sqf (S$)", colour = "Town")

resale_town_panel %>%
  filter(flat_type == "4_ROOM",
         town %in% c("Ang Mo Kio", "Punggol", "Clementi", "Bukit Batok",
                     "Woodlands", "Queenstown", "Sengkang", "Tampines", 
                     "Bedok", "Toa Payoh")) %>%
  ggplot(aes(year, med_psf, colour = town)) +
  geom_line(linewidth = 0.8) +
  labs(title = "4-ROOM resale price per sqf over time",
       x = NULL, y = "Median price per sqf (S$)", colour = "Town")

resale_town_panel %>%
  filter(flat_type == "5_ROOM",
         town %in% c("Ang Mo Kio", "Punggol", "Clementi", "Bukit Batok",
                     "Woodlands", "Queenstown", "Sengkang", "Tampines", 
                     "Bedok", "Toa Payoh")) %>%
  ggplot(aes(year, med_psf, colour = town)) +
  geom_line(linewidth = 0.8) +
  labs(title = "5-ROOM resale price per sqf over time",
       x = NULL, y = "Median price per sqf (S$)", colour = "Town")

### create the rental town panel----

glimpse(rental)

rental_town_panel <- rental %>%
  group_by(town, flat_type, year) %>%
  summarise(
    med_price = median(monthly_rent),
    n         = n(),
    .groups   = "drop"
  )
rental_town_panel %>%
  filter(flat_type == "3_ROOM",
         town %in% c("Ang Mo Kio", "Punggol", "Bukit Merah","Clementi","Bukit Batok",
                     "Woodlands", "Queenstown", "Sengkang","Tampines","Bedok","Toa Payoh")) %>%
  ggplot(aes(year, med_price, colour = town)) +
  geom_line(linewidth = 0.8) +
  labs(title = "3-ROOM rental price over time",
       x = NULL, y = "Median price (S$)", colour = "Town")

glimpse(rental_town_panel)

### post pandemic surge in rental prices eased as increase in supply due to more flats reaching MOP

### bto town panel----
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

### here's the master join
cluster_rec <- resale_town_features %>%
  left_join(town_feature_master, by = c("town" = "PLN_AREA_N")) %>%
  mutate(across(where(is.numeric), ~ ifelse(is.na(.), 0, .)))

glimpse(cluster_rec)
###skim(cluster_rec)

### Let's try to cluster----

set.seed(2026)
# clust_rec <- recipe(~ level_psf + growth_5y + volatility, data = cluster_rec) %>%
#   step_normalize(all_numeric_predictors())
# 
# clust_prepped <- prep(clust_rec) %>% bake(new_data = NULL)
# 
# km <- kmeans(clust_prepped, centers = 3, nstart = 25)
# 
# town_groups <- town_features %>%
#   mutate(cluster = factor(km$cluster)) %>%
#   # TODO: inspect centroids, then rename to interpretable labels
#   mutate(town_group = recode(cluster,
#                              `1` = "High-Yield",
#                              `2` = "Affordable-Growth",
#                              `3` = "Stable-Stagnant"
#   )) not using this

clust_rec <- recipe(~ ., data = cluster_rec) %>%
  update_role(town, new_role = "id") %>%
  step_zv(all_numeric_predictors()) %>%      # Drop structural zero variables safely
  step_normalize(all_numeric_predictors())   # Bring PSF, counts, and percentages to same scale

# bake the clean numeric matrix----
clust_prepped <- prep(clust_rec) %>% bake(new_data = NULL)
clust_matrix  <- clust_prepped %>% select(where(is.numeric))

# run K-Means Clustering (3 clusters)----
km <- kmeans(clust_matrix, centers = 3, nstart = 25)

# append cluster labels back to the master framework----
town_groups <- cluster_rec %>%
  mutate(cluster = factor(km$cluster))
# check the town distributions across the clusters----
town_groups %>% count(cluster)

### 13,6,7 districts in a cluster is ok


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
    avg_hdb_density     = mean(HDB_Density_per_SQKM)

  )

print(cluster_profiles)

# update 4R town_groups with the clean, descriptive labels-----
town_groups_labeled_4R <- town_groups %>%
  mutate(town_group = recode(cluster,
                             `1` = "High-Density Affordable Growth",
                             `2` = "Moderate-Density Transit Hub Moderate Growth",
                             `3` = "Low-Density Premium Lower Growth"
  ))

# verify the final labelled data
town_groups_labeled_4R %>% 
  select(town, town_group, level_psf_4_ROOM, growth_5y_4_ROOM)
### nice results! examples of 1. Seng Kang, Punggol, 2. Mature towns like AMK,Bedok 3. Bishan, Clementi 

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

# update 3R town_groups with the clean, descriptive labels-----
town_groups_labeled_3R <- town_groups %>%
  mutate(town_group = recode(cluster,
                             `1` = "High-Density Potential Growth", # 1 is different from 4R has higher pot. growth
                             `2` = "Moderate-Density Transit Hub Moderate Growth",
                             `3` = "Low-Density Premium Lower Growth"
  ))

# verify the final labelled data
town_groups_labeled_3R %>% 
  select(town, town_group, level_psf_3_ROOM, growth_5y_3_ROOM)


# 5R clustering
cluster_profiles <- town_groups %>%
  group_by(cluster) %>%
  summarise(
    town_count          = n(),
    
    avg_HDB_density     = mean(HDB_Density_per_SQKM),
    
    # pricing profile (using 5-ROOM as the baseline)
    avg_5R_psf          = median(level_psf_5_ROOM),
    avg_5R_growth       = median(growth_5y_5_ROOM),
    avg_5R_volatility   = median(volatility_5_ROOM),
    
    # infrastructure & location Profile
    avg_mrt_exits       = mean(MRT_Exit_Count),
    avg_malls           = mean(Shopping_Mall_Count),
    avg_hawker_centres  = mean(Hawker_Centre_Count),
    avg_hdb_density     = mean(HDB_Density_per_SQKM)
  )

print(cluster_profiles)

# update 5R town_groups with the descriptive labels-----
town_groups_labeled_5R <- town_groups %>%
  mutate(town_group = recode(cluster,
                             `1` = "High-Density Affordable Potential Growth",
                             `2` = "Moderate-Density Transit Hub Premium Moderate Growth",
                             `3` = "Low-Density Premium Lower Growth"
  ))

# Review the final labeled dataset
town_groups_labeled_5R %>% 
  select(town, town_group, level_psf_5_ROOM, growth_5y_5_ROOM)


# 2R clustering
cluster_profiles <- town_groups %>%
  group_by(cluster) %>%
  summarise(
    town_count          = n(),
    
    avg_HDB_density     = mean(HDB_Density_per_SQKM),
    
    # pricing profile (using 3-ROOM as the baseline)
    avg_2R_psf          = median(level_psf_2_ROOM),
    avg_2R_growth       = median(growth_5y_2_ROOM),
    avg_2R_volatility   = median(volatility_2_ROOM),
    
    # infrastructure & location Profile
    avg_mrt_exits       = mean(MRT_Exit_Count),
    avg_malls           = mean(Shopping_Mall_Count),
    avg_hawker_centres  = mean(Hawker_Centre_Count),
    avg_hdb_density     = mean(HDB_Density_per_SQKM)
  )

print(cluster_profiles)

# update 2R town_groups with the descriptive labels-----
town_groups_labeled_2R <- town_groups %>%
  mutate(town_group = recode(cluster,
                             `1` = "High-Density Premium Potential Growth",
                             `2` = "Moderate-Density Transit Hub Premium Moderate Growth",
                             `3` = "Low-Density Premium Lower Growth"
  ))

# Review the final labeled dataset
town_groups_labeled_2R %>% 
  select(town, town_group, level_psf_2_ROOM, growth_5y_2_ROOM)

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

# TODO: state in prose whether the town_group (cluster)feature earned its place----
### The cluster feature engineered via k-means clustering earned its place in the supervised valuation engine  because it's inclusion induced
### 17.3% reduction in the RMSE from 120.0 to 99.2 while boosting the explained variance (R2) from 0.425 to 0.627.
### this 20.2% improvement in structural variance proves that the unsupervised clusters captured other features that influence prices


# flip to eval: true — which drivers matter in the WITH model.
fit_with %>% extract_fit_parsnip() %>% vip(num_features = 10)

# ==========================================
# GENERATE EMPIRICAL STARTING PSFS
# ==========================================

# 1. Construct a tracking matrix for mid-2026 across every structural asset type
app_valuation_grid <- crossing(
  town_group      = c("1", "2", "3"),
  flat_type       = c("2_ROOM", "3_ROOM", "4_ROOM", "5_ROOM"),
  remaining_lease_yrs = 94 # Setting a standardized 5-year-old flat baseline for comparison
) %>%
  mutate(
    # Map typical standard floor space constraints found in your EDA steps
    floor_area_sqf = case_when(
      flat_type == "2_ROOM" ~ 484,  # ~45 sqm
      flat_type == "3_ROOM" ~ 732,  # ~68 sqm
      flat_type == "4_ROOM" ~ 1022, # ~95 sqm
      flat_type == "5_ROOM" ~ 1184  # ~110 sqm
    ),
    # Map the factor levels to align identically with your dummy recipe setup
    cluster = factor(town_group, levels = levels(model_df$cluster))
  )

# 2. Extract the baseline valuations out using your top-performing supervised model
empirical_start_matrix <- app_valuation_grid %>%
  mutate(predicted_start_psf = predict(fit_with, new_data = app_valuation_grid)$.pred) %>%
  select(town_group, flat_type, floor_area_sqf, predicted_start_psf)

# 3. Print the matrix to verify the structural integrity of the valuations
print("--- EMPIRICAL STARTING VALUATION MATRIX ---")
print(empirical_start_matrix)


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

### winner is ARIMA(0,2,3), lower MAE 30.5, it forecasts on unseen data deviates by $30.50 psf on avg vs ETS $32.70 PSF


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

# Get all unique town groups
all_groups <- unique(group_ts$town_group)

# Generate an extraction tracking framework grid that runs across every single permutation
# of town group and flat layout type, then auto saves the 5-year forecasted endpoints into a results collector df

forecast_collector <- list()

# Extract every distinct housing combination available
combination_grid <- group_ts %>% 
  distinct(town_group, flat_type_clean) %>% 
  arrange(town_group, flat_type_clean)

# Loop through all 12 permutations dynamically
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

### Stimulator build prep---- 

# =====================================================================
# PHASE 4: UPGRADED DYNAMIC SIMULATOR CONFIGURATION
# =====================================================================

# 1. Global Housing Rules (Singapore Regulatory Framework)
rules <- list(
  horizon_years = 5,
  ltv           = 0.75, # Maximum 75% Loan-to-Value limit
  loan_years    = 25
)

# 2. Multi-tier Interest Rate Scenarios
rate_scenarios <- tibble(
  scenario    = c("low_rate", "central_rate", "high_rate"),
  annual_rate = c(0.026,      0.035,          0.045) # 2.6% (CPF) to 4.5% (Stress Test)
)

# 3. Dynamic Inflation Settings
rent_growth_annual <- 0.035  
bto_growth_annual  <- 0.021  

# 4. Standard Monthly Amortization Helper Function
monthly_payment <- function(principal, annual_rate, years) {
  r <- annual_rate / 12; n <- years * 12
  if (r == 0) principal / n else principal * r / (1 - (1 + r)^(-n))
}

# 5. Upgraded Simulator Engine (v3)
# Tracks customized cash injections and returns monthly outlays for budget checks
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
  # Enforce regulatory minimum downpayment if no custom cash is provided
  min_downpayment <- price * (1 - rules$ltv)
  
  if (is.null(cash_injection) || cash_injection < min_downpayment) {
    down <- min_downpayment
  } else {
    down <- cash_injection
  }
  
  # Calculate principal debt burden based on cash equity injection
  loan <- max(0, price - down) 
  
  # Calculate ongoing mortgage outlays
  pmt  <- monthly_payment(loan, annual_rate, rules$loan_years)
  paid <- pmt * 12 * h
  
  # Amortize remaining principal balance outstanding at Year 5
  r   <- annual_rate / 12; n <- rules$loan_years * 12; k <- h * 12
  bal <- if(loan == 0) 0 else loan * ((1 + r)^n - (1 + r)^k) / ((1 + r)^n - 1)
  
  # Appraise final asset valuation under localized ARIMA trajectories
  value_5y <- price * (1 + growth)^h
  equity   <- value_5y - bal
  
  return(tibble(
    net_worth_5y    = equity - paid - down,
    monthly_housing = pmt
  ))
}