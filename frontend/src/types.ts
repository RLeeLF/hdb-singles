export type FlatType = "2_ROOM" | "3_ROOM" | "4_ROOM" | "5_ROOM";

export interface UserInputs {
  selectedTowns: string[];
  selectedRoomTypes: FlatType[];
  remainingLease: number; // 40-95
  monthlyBudget: number; // 1000-10000
  cashInjection: number; // default 100000
  interestRate: number; // default 3.5%
  baseRent: number; // default 2200
  grossMonthlyIncome: number; // default 6000
  existingMonthlyDebt: number; // default 0
}

export interface SimulationResultRow {
  town: string;
  flat_type: FlatType;
  cluster_label: string;
  label: string;
  path: "BTO Purchase" | "Resale Purchase" | "Renting";
  net_worth_5y: number | null;
  monthly_housing: number | null;
  initial_price: number | null;
  growth_rate: number | null;
  regulatory_fail: boolean;
  budget_violator: boolean;
  scheme_ineligible: boolean;
  bto_data_unavailable: boolean;
  low_confidence: boolean;
  display_name: string;
}
