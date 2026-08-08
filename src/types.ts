export type FlatType = '2_ROOM' | '3_ROOM' | '4_ROOM' | '5_ROOM';

export type Pathway = 'BTO Purchase' | 'Resale Purchase' | 'Renting';

export interface TownInfo {
  town: string;
  townGroup: '1' | '2' | '3';
  region: 'North' | 'South' | 'East' | 'West' | 'Central' | 'North-East';
  description: string;
}

export interface CalculationInput {
  selectedTowns: string[];
  selectedFlatTypes: FlatType[];
  monthlyBudget: number;
  cashInjection: number;
  interestRate: number; // percentage, e.g., 3.5
  baseRent: number;
  monthlyIncome?: number; // for grant eligibility check
  livesNearParents?: boolean;
}

export interface ScenarioResult {
  id: string;
  town: string;
  flatType: FlatType;
  label: string;
  path: Pathway;
  netWorth5Y: number;
  monthlyHousing: number;
  initialPrice: number | null;
  finalValue: number;
  growthRate: number;
  budgetViolator: boolean;
  displayName: string;
  loanBalance5Y: number;
  downpayment: number;
  loanAmount: number;
  psf: number;
  floorAreaSqf: number;
  townGroup: string;
  yearByYear: {
    year: number;
    assetValue: number;
    loanBalance: number;
    equity: number;
    cumulativePaid: number;
  }[];
}

export interface GrantEligibility {
  singleGrant: number;
  ehgGrant: number;
  phgGrant: number;
  totalGrants: number;
  eligibleBTO: boolean;
  eligibleResale: boolean;
  notes: string[];
}

export interface AIAdvisorRequest {
  monthlyBudget: number;
  cashInjection: number;
  interestRate: number;
  baseRent: number;
  selectedTowns: string[];
  selectedFlatTypes: FlatType[];
  topScenario?: {
    town: string;
    flatType: string;
    path: string;
    netWorth: number;
    monthlyCost: number;
  };
  userQuery?: string;
}

export interface AIAdvisorResponse {
  recommendation: string;
  prosAndCons: { pros: string[]; cons: string[] };
  keyRisks: string[];
  actionItems: string[];
}
