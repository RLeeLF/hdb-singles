### push_to_supabase.R ----
### Part 5.3 — push the canonical artefact (housing_projection_matrix.csv)
### to Supabase. Standalone: depends only on the exported CSV, not on any
### in-memory object from HDB_capstone_v3.R's modeling session. Re-run
### whenever the artefact is regenerated (new resale data, rule changes),
### independent of the model's own build cadence — same principle as
### generate_financial_fixtures.R being decoupled from the model pipeline.
###
### Requires .Renviron in the project root with:
###   SUPABASE_DB_HOST, SUPABASE_DB_PORT, SUPABASE_DB_NAME,
###   SUPABASE_DB_USER, SUPABASE_DB_PASSWORD
### Never hardcode these values here.

install.packages("DBI")
install.packages("RPostgres")
install.packages("readr")

library(DBI)
library(RPostgres)
library(readr)

readRenviron(".Renviron")

ARTEFACT_PATH <- "model_outputs/housing_projection_matrix.csv"

if (!file.exists(ARTEFACT_PATH)) {
  stop("Missing ", ARTEFACT_PATH, ". Run HDB_capstone_v3.R's Part 5.1 block first.")
}

housing_projection_matrix <- read_csv(ARTEFACT_PATH, show_col_types = FALSE)

con <- dbConnect(
  RPostgres::Postgres(),
  host     = Sys.getenv("SUPABASE_DB_HOST"),
  port     = as.integer(Sys.getenv("SUPABASE_DB_PORT")),
  dbname   = Sys.getenv("SUPABASE_DB_NAME"),
  user     = Sys.getenv("SUPABASE_DB_USER"),
  password = Sys.getenv("SUPABASE_DB_PASSWORD")
)

dbWriteTable(con, "housing_projection_matrix", housing_projection_matrix, overwrite = TRUE)

# Confirm the round trip — row count should match exactly (1200 + 12 = 1212)
remote_n <- dbGetQuery(con, "SELECT COUNT(*) AS n FROM housing_projection_matrix")$n
stopifnot(remote_n == nrow(housing_projection_matrix))

dbDisconnect(con)
message("Pushed ", nrow(housing_projection_matrix), " rows to Supabase. Verified: ", remote_n, " rows present remotely.")