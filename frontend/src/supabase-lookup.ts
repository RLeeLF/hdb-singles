// supabase-lookup.ts — live data layer for the Vercel frontend.
// Mirrors app.R's serve-time parity gate: resale must return exactly 1 row
// for any valid town/flat_type/lease combination (build-time coverage is
// guaranteed — Part 5.2); BTO returning 0 rows is a genuine, documented
// state (13 of 25 towns have no launch history — Part 1.2), not an error.

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

// A plain presence check, nothing more — unlike the AI-Studio-generated
// version, nothing in this file branches on this to decide whether to
// serve fabricated data. If credentials are missing, every query below
// still throws a real error rather than silently falling back.
export function isSupabaseConfigured(): boolean {
  return Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY);
}

export interface ProjectionRow {
  town: string;
  cluster_label: string;
  flat_type: string;
  remaining_lease_yrs: number;
  path: string;
  predicted_start_psf: number;
  floor_area_sqf: number;
  low_growth_annual: number | null;
  central_growth_annual: number;
  high_growth_annual: number | null;
  n_train_support: number | null;
  low_confidence: boolean;
  data_source: string;
}

export async function getResaleRow(
  town: string,
  flatType: string,
  leaseYrs: number
): Promise<ProjectionRow> {
  const { data, error } = await supabase
    .from("housing_projection_matrix")
    .select("*")
    .eq("town", town)
    .eq("flat_type", flatType)
    .eq("remaining_lease_yrs", leaseYrs)
    .eq("path", "Resale Purchase");

  if (error) throw new Error(`Supabase query failed: ${error.message}`);
  if (data.length !== 1) {
    throw new Error(
      `Parity gate violation: expected exactly 1 resale row for ` +
      `${town}/${flatType}/${leaseYrs}y, got ${data.length}. Either an ` +
      `invalid combination was requested, or the remote table has drifted ` +
      `from the build-time-asserted coverage.`
    );
  }
  return data[0] as ProjectionRow;
}

export async function getBtoRow(town: string): Promise<ProjectionRow | null> {
  const { data, error } = await supabase
    .from("housing_projection_matrix")
    .select("*")
    .eq("town", town)
    .eq("flat_type", "2_ROOM")
    .eq("path", "BTO Purchase");

  if (error) throw new Error(`Supabase query failed: ${error.message}`);
  return (data[0] as ProjectionRow) ?? null;   // null = genuinely no BTO history
}

export async function getTableCounts(): Promise<{ resale: number; bto: number }> {
  const { count: resale, error: e1 } = await supabase
    .from("housing_projection_matrix")
    .select("*", { count: "exact", head: true })
    .eq("path", "Resale Purchase");

  const { count: bto, error: e2 } = await supabase
    .from("housing_projection_matrix")
    .select("*", { count: "exact", head: true })
    .eq("path", "BTO Purchase");

  if (e1 || e2) throw new Error(`Count query failed: ${e1?.message ?? e2?.message}`);
  return { resale: resale ?? 0, bto: bto ?? 0 };
}

// The town selector MUST be derived from this, never hardcoded in the
// frontend — a hardcoded list is exactly what caused the old town_cluster_lookup
// to silently drift from the real clustering (missing towns, a spelling
// mismatch on "Sengkang" that broke that town's lookups). Deriving from the
// live table means the selector can never go stale relative to the data.
export async function getAllTowns(): Promise<string[]> {
  const { data, error } = await supabase
    .from("housing_projection_matrix")
    .select("town")
    .eq("path", "Resale Purchase");

  if (error) throw new Error(`Town list query failed: ${error.message}`);
  const towns = Array.from(new Set(data.map((row) => row.town))).sort();
  return towns;
}