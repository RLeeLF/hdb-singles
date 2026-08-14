### Derives the Kallang/Whampoa subzone crosswalk from raw resale transactions.
### Inputs: resale CSV (raw), MasterPlan2019 planning-area + subzone boundaries.
### Output: data/spatial/kw_subzone_shares.csv
###
### Run this FIRST, before capstone_districtmaster_v2.R and HDB_capstone_v3.R —
### it has no dependency on either script's output, only on raw source data.
### See 1.1 documentation for the full derivation, thresholds tested, and
### rejected alternatives (Method B: named subzones; Method C: whole-PA union).

library(sf)
library(dplyr)
library(readr)
library(stringr)
library(httr2)
library(tidygeocoder)

resale_raw <- read_csv("data/ResaleflatpricesbasedonregistrationdatefromJan2017onwards.csv",
                       show_col_types = FALSE)

sz <- st_read("data/spatial/MasterPlan2019SubzoneBoundaryNoSeaGEOJSON.geojson") |>
  st_make_valid()

pa <- st_read("data/spatial/MasterPlan2019PlanningAreaBoundaryNoSea.geojson") |>
  st_make_valid()

central_area_pas <- pa |>
  st_drop_geometry() |>
  filter(CA_IND == "Y") |>
  pull(PLN_AREA_N)

kw_streets <- resale_raw |>
  filter(town == "KALLANG/WHAMPOA") |>
  distinct(street_name) |>
  arrange(street_name)

kw_geo <- kw_streets |>
  mutate(query = paste(street_name, "Singapore")) |>
  geocode(address = query, method = "osm", lat = lat, long = lon)

write_csv(kw_geo, "data/spatial/kw_streets_geocoded.csv")

kw_geo |> summarise(submitted = n(), matched = sum(!is.na(lat)),
                    pct = round(100 * sum(!is.na(lat)) / n(), 1))

kw_pts <- kw_geo |>
  filter(!is.na(lat), between(lon, 103.6, 104.1), between(lat, 1.20, 1.48)) |>
  st_as_sf(coords = c("lon", "lat"), crs = 4326)

kw_txn <- resale_raw |>
  filter(town == "KALLANG/WHAMPOA") |>
  count(street_name, name = "n_txn")

kw_dist <- st_join(kw_pts, sz["SUBZONE_N"]) |>
  st_drop_geometry() |>
  left_join(kw_txn, by = "street_name") |>
  count(SUBZONE_N, wt = n_txn, sort = TRUE, name = "n_txn") |>
  mutate(share = n_txn / sum(n_txn)) |>
  left_join(
    sz |> st_drop_geometry() |> distinct(SUBZONE_N, PLN_AREA_N),
    by = "SUBZONE_N"
  ) |>
  mutate(is_central = PLN_AREA_N %in% central_area_pas)

if (any(is.na(kw_dist$SUBZONE_N))) {
  warning("Unjoined points: ", sum(kw_dist$n_txn[is.na(kw_dist$SUBZONE_N)]), " transactions")
}
kw_dist <- kw_dist |> filter(!is.na(SUBZONE_N))

SHARE_THRESHOLD <- 0.08

if (any(kw_dist$is_central & kw_dist$share >= SHARE_THRESHOLD)) {
  stop("Central Area subzone above threshold — conflicts with the CENTRAL AREA exclusion")
}

kw_subzones <- kw_dist |>
  filter(!is_central, share >= SHARE_THRESHOLD) |>
  pull(SUBZONE_N)

stopifnot(length(kw_subzones) > 0)
print(kw_subzones)
# expected: BENDEMEER, BALESTIER, KALLANG BAHRU, KAMPONG JAVA, GEYLANG BAHRU

write_csv(kw_dist, "data/spatial/kw_subzone_shares.csv")