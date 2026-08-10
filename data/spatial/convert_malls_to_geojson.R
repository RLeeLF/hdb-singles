
# convert_malls_to_geojson.R
# Converts the manually-augmented mall coordinate list into GeoJSON
# for the point-in-polygon join against URA planning areas with the other features.
# in the 1st submission there were only 55 malls(missing the smaller HDB malls), discovered in data check
# in this submission there are 157 malls now
# 
# Input:  data/spatial/shopping_mall_coordinates.csv (updated to 2026 August)
# Output: data/spatial/singapore_malls_v2.geojson
#
# Run from the project root "HDB-for-singles_vx.x/"
# maintanence note : to check on a yearly basis to update


library(sf)
library(dplyr)
library(readr)

in_path  <- file.path("data", "spatial", "shopping_mall_coordinates.csv")
out_path <- file.path("data", "spatial", "singapore_malls_v2.geojson") #updated to 2026 Aug

stopifnot(file.exists(in_path))

malls_raw <- read_csv(in_path, show_col_types = FALSE)

glimpse(malls_raw)

# --- validation before conversion ---
required <- c("Longitude", "Latitude")
missing_cols <- setdiff(required, names(malls_raw))
if (length(missing_cols) > 0) {
  stop("Missing required column(s): ", paste(missing_cols, collapse = ", "))
}

# drop/flag rows with missing coordinates rather than letting st_as_sf fail opaquely
bad_coords <- malls_raw %>% filter(is.na(Longitude) | is.na(Latitude))
if (nrow(bad_coords) > 0) {
  warning(nrow(bad_coords), " row(s) dropped for missing coordinates.")
  malls_raw <- malls_raw %>% filter(!is.na(Longitude), !is.na(Latitude))
}

# sanity-check coordinates fall within Singapore's bounding box
oob <- malls_raw %>%
  filter(Longitude < 103.6 | Longitude > 104.1 |
           Latitude  <   1.15 | Latitude  >   1.48)
if (nrow(oob) > 0) {
  print(oob)
  stop(nrow(oob), " mall(s) fall outside Singapore's bounding box — check coordinates above.")
}

message("Converting ", nrow(malls_raw), " malls to GeoJSON.")

malls_sf <- st_as_sf(malls_raw,
                     coords = c("Longitude", "Latitude"),
                     crs = 4326)  # WGS84, the CRS GeoJSON expects

st_write(malls_sf, out_path, driver = "GeoJSON", delete_dsn = TRUE, quiet = TRUE)

message("Wrote ", out_path, " (", nrow(malls_sf), " features).")