import { FlatType, TownInfo } from '../types';

export const TOWN_CLUSTER_LOOKUP: TownInfo[] = [
  { town: 'ANG MO KIO', townGroup: '3', region: 'North-East', description: 'Mature estate with established amenities, MRT interchange, and hawker hubs.' },
  { town: 'BEDOK', townGroup: '3', region: 'East', description: 'Vibrant eastern mature town with Bedok Reservoir and direct airport connectivity.' },
  { town: 'BISHAN', townGroup: '2', region: 'Central', description: 'Prime central mature estate, home to top schools and Bishan-Ang Mo Kio Park.' },
  { town: 'BUKIT BATOK', townGroup: '1', region: 'West', description: 'Non-mature western town featuring scenic Little Guilin and Jurong Innovation District proximity.' },
  { town: 'BUKIT MERAH', townGroup: '2', region: 'South', description: 'City-fringe mature estate near Tiong Bahru, Telok Blangah, and Alexandra.' },
  { town: 'BUKIT PANJANG', townGroup: '1', region: 'West', description: 'Affordable non-mature town with LRT integration and tranquil greenery.' },
  { town: 'BUKIT TIMAH', townGroup: '2', region: 'Central', description: 'Exclusive city-fringe zone with low-density residential developments.' },
  { town: 'CENTRAL AREA', townGroup: '2', region: 'Central', description: 'Heart of Singapore CBD, Tanjong Pagar, and Chinatown icon flats.' },
  { town: 'CHOA CHU KANG', townGroup: '1', region: 'West', description: 'Family-centric non-mature western hub with Jurong Region Line expansion.' },
  { town: 'CLEMENTI', townGroup: '3', region: 'West', description: 'Highly connected educational hub near NUS, One-North, and Jurong East.' },
  { town: 'GEYLANG', townGroup: '3', region: 'East', description: 'Cultural mature precinct close to Paya Lebar Central regional commercial hub.' },
  { town: 'HOUGANG', townGroup: '1', region: 'North-East', description: 'Well-loved non-mature estate with Cross Island Line interchange developments.' },
  { town: 'JURONG EAST', townGroup: '1', region: 'West', description: 'Singapore second CBD with JEM, Westgate, and Jurong Lake District.' },
  { town: 'JURONG WEST', townGroup: '1', region: 'West', description: 'Sprawling western town near NTU and Jurong Innovation District.' },
  { town: 'KALLANG/WHAMPOA', townGroup: '3', region: 'Central', description: 'Historic city-fringe precinct next to Singapore Sports Hub and Kallang River.' },
  { town: 'MARINE PARADE', townGroup: '2', region: 'East', description: 'Coastal mature town with East Coast Park access and Thomson-East Coast Line.' },
  { town: 'PASIR RIS', townGroup: '1', region: 'East', description: 'Relaxed eastern coastal town with Pasir Ris Park and new integrated transport hubs.' },
  { town: 'PUNGGOL', townGroup: '1', region: 'North-East', description: 'Waterfront Digital District town, popular with young singles & tech hubs.' },
  { town: 'QUEENSTOWN', townGroup: '2', region: 'South', description: 'Singapore oldest mature estate, prime central locations near Buona Vista.' },
  { town: 'SEMBAWANG', townGroup: '1', region: 'North', description: 'Northern coastal non-mature town with Bukit Canberra integrated hub.' },
  { town: 'SENGKANG', townGroup: '1', region: 'North-East', description: 'Modern non-mature town with LRT loops, Sengkang Grand Mall, and hospital.' },
  { town: 'SERANGOON', townGroup: '3', region: 'North-East', description: 'Mature town centered around NEX shopping mall and Circle/NE Line MRT.' },
  { town: 'TAMPINES', townGroup: '1', region: 'East', description: 'Regional East center with Our Tampines Hub, commercial offices, and MRT.' },
  { town: 'TOA PAYOH', townGroup: '3', region: 'Central', description: 'Centrally located pioneer mature town with rapid access to Orchard Road.' },
  { town: 'WOODLANDS', townGroup: '1', region: 'North', description: 'Northern Regional Hub, RTS Link connection to Johor Bahru, and industrial growth.' },
  { town: 'YISHUN', townGroup: '1', region: 'North', description: 'Comprehensive northern town with Northpoint City and SAFRA Yishun.' }
];

export const FLAT_TYPE_LABELS: Record<FlatType, string> = {
  '2_ROOM': '2-Room Flexi',
  '3_ROOM': '3-Room',
  '4_ROOM': '4-Room',
  '5_ROOM': '5-Room'
};

export const FLAT_FLOOR_AREAS: Record<FlatType, number> = {
  '2_ROOM': 500,  // ~46 sqm
  '3_ROOM': 750,  // ~68 sqm
  '4_ROOM': 1022, // ~93 sqm
  '5_ROOM': 1200  // ~112 sqm
};

// Empirical Starting PSF Matrix ($/sqft)
export const APP_START_PSF_DATA: { townGroup: string; flatType: FlatType; predictedStartPsf: number; floorAreaSqf: number }[] = [
  { townGroup: '1', flatType: '2_ROOM', predictedStartPsf: 782, floorAreaSqf: 500 },
  { townGroup: '1', flatType: '3_ROOM', predictedStartPsf: 603, floorAreaSqf: 750 },
  { townGroup: '1', flatType: '4_ROOM', predictedStartPsf: 581, floorAreaSqf: 1022 },
  { townGroup: '1', flatType: '5_ROOM', predictedStartPsf: 556, floorAreaSqf: 1200 },
  { townGroup: '2', flatType: '2_ROOM', predictedStartPsf: 640, floorAreaSqf: 500 },
  { townGroup: '2', flatType: '3_ROOM', predictedStartPsf: 564, floorAreaSqf: 750 },
  { townGroup: '2', flatType: '4_ROOM', predictedStartPsf: 929, floorAreaSqf: 1022 },
  { townGroup: '2', flatType: '5_ROOM', predictedStartPsf: 778, floorAreaSqf: 1200 },
  { townGroup: '3', flatType: '2_ROOM', predictedStartPsf: 574, floorAreaSqf: 500 },
  { townGroup: '3', flatType: '3_ROOM', predictedStartPsf: 624, floorAreaSqf: 750 },
  { townGroup: '3', flatType: '4_ROOM', predictedStartPsf: 729, floorAreaSqf: 1022 },
  { townGroup: '3', flatType: '5_ROOM', predictedStartPsf: 774, floorAreaSqf: 1200 }
];

// Empirical Central Growth Rates Matrix (Annualized)
export const APP_GROWTH_DATA: { townGroup: string; flatTypeClean: FlatType; centralGrowthAnnual: number }[] = [
  { townGroup: '1', flatTypeClean: '2_ROOM', centralGrowthAnnual: 0.0213 },
  { townGroup: '1', flatTypeClean: '3_ROOM', centralGrowthAnnual: 0.0143 },
  { townGroup: '1', flatTypeClean: '4_ROOM', centralGrowthAnnual: -0.0320 },
  { townGroup: '1', flatTypeClean: '5_ROOM', centralGrowthAnnual: -0.0339 },
  { townGroup: '2', flatTypeClean: '2_ROOM', centralGrowthAnnual: -0.0221 },
  { townGroup: '2', flatTypeClean: '3_ROOM', centralGrowthAnnual: -0.0871 },
  { townGroup: '2', flatTypeClean: '4_ROOM', centralGrowthAnnual: 0.0164 },
  { townGroup: '2', flatTypeClean: '5_ROOM', centralGrowthAnnual: 0.0067 },
  { townGroup: '3', flatTypeClean: '2_ROOM', centralGrowthAnnual: 0.0434 },
  { townGroup: '3', flatTypeClean: '3_ROOM', centralGrowthAnnual: -0.0216 },
  { townGroup: '3', flatTypeClean: '4_ROOM', centralGrowthAnnual: 0.0188 },
  { townGroup: '3', flatTypeClean: '5_ROOM', centralGrowthAnnual: -0.0095 }
];

// Rule Constants
export const HOUSING_RULES = {
  horizonYears: 5,
  ltv: 0.75, // 75% max loan
  loanYears: 25,
  btoBasePrice2Room: 380000,
  btoGrowthRate: 0.021,
  rentEscalationRate: 0.035
};

// Singapore Grants Knowledge Base for Singles Age 35+
export const SINGLES_GRANT_INFO = {
  singleGrantMax2To4Room: 40000,
  singleGrantMax5Room: 25000,
  ehgMaxSingle: 40000,
  ehgIncomeCap: 45000 / 12, // $3,750 or $4,500 monthly cap depending on scheme
  phgNearParents: 10000,
  phgWithParents: 15000,
  incomeCapBto2Room: 7000,
  incomeCapResale: 14000
};
