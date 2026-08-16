// test-supabase-live.mjs
// Standalone — does NOT import supabase-lookup.ts, because that file uses
// import.meta.env.VITE_*, which is Vite-specific syntax that only resolves
// when Vite's build process handles the file. Running it through plain
// Node (as this script does) would leave those values undefined. This
// script creates its own client from process.env instead, running the
// identical queries so it still verifies the exact same behavior.
//
// Run from inside frontend/ :
//   node --env-file=.env test-supabase-live.mjs        (Node 20+)
// or, if your Node version doesn't support --env-file:
//   npm install dotenv
//   node -r dotenv/config test-supabase-live.mjs

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY.");
  console.error("Check that .env exists in this directory and you ran with --env-file=.env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

let failures = 0;
function check(label, condition, detail = "") {
  if (condition) {
    console.log(`  PASS  ${label}`);
  } else {
    failures++;
    console.error(`  FAIL  ${label}  ${detail}`);
  }
}

async function getResaleRow(town, flatType, leaseYrs) {
  const { data, error } = await supabase
    .from("housing_projection_matrix")
    .select("*")
    .eq("town", town)
    .eq("flat_type", flatType)
    .eq("remaining_lease_yrs", leaseYrs)
    .eq("path", "Resale Purchase");
  if (error) throw new Error(error.message);
  if (data.length !== 1) throw new Error(`expected 1 row, got ${data.length}`);
  return data[0];
}

async function getBtoRow(town) {
  const { data, error } = await supabase
    .from("housing_projection_matrix")
    .select("*")
    .eq("town", town)
    .eq("flat_type", "2_ROOM")
    .eq("path", "BTO Purchase");
  if (error) throw new Error(error.message);
  return data[0] ?? null;
}

async function getTableCounts() {
  const { count: resale } = await supabase
    .from("housing_projection_matrix")
    .select("*", { count: "exact", head: true })
    .eq("path", "Resale Purchase");
  const { count: bto } = await supabase
    .from("housing_projection_matrix")
    .select("*", { count: "exact", head: true })
    .eq("path", "BTO Purchase");
  return { resale: resale ?? 0, bto: bto ?? 0 };
}

async function main() {
  console.log("1. Table coverage (mirrors R build-time assertion, live table)");
  const counts = await getTableCounts();
  check("resale rows == 1200", counts.resale === 1200, `got ${counts.resale}`);
  check("bto rows == 12", counts.bto === 12, `got ${counts.bto}`);

  console.log("\n2. Resale lookup — valid combination returns exactly 1 row");
  const resale = await getResaleRow("ANG MO KIO", "4_ROOM", 60);
  check("predicted_start_psf is positive", resale.predicted_start_psf > 0, `got ${resale.predicted_start_psf}`);

  console.log("\n3. Regression test — cluster-labeling bug (kmeans numbering drift)");
  check("Ang Mo Kio == Cluster: Mature Heartland",
        resale.cluster_label === "Cluster: Mature Heartland",
        `got "${resale.cluster_label}"`);

  console.log("\n4. BTO — town WITH genuine launch history");
  const btoYes = await getBtoRow("PUNGGOL");
  check("Punggol BTO row exists", btoYes !== null);

  console.log("\n5. BTO — town WITHOUT launch history returns null");
  const btoNo = await getBtoRow("BISHAN");
  check("Bishan BTO row is null", btoNo === null, `got ${JSON.stringify(btoNo)}`);

  console.log("\n6. Full lease grid for one town/flat_type");
  for (const lease of [40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95]) {
    const row = await getResaleRow("PUNGGOL", "2_ROOM", lease);
    check(`  lease=${lease}y returns a valid row`, row.remaining_lease_yrs === lease);
  }

  console.log(`\n${failures === 0 ? "ALL CHECKS PASSED" : failures + " CHECK(S) FAILED"}`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error("Test run crashed:", err);
  process.exit(1);
});
