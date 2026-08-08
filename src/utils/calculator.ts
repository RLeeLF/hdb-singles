import {
  APP_GROWTH_DATA,
  APP_START_PSF_DATA,
  FLAT_FLOOR_AREAS,
  FLAT_TYPE_LABELS,
  HOUSING_RULES,
  SINGLES_GRANT_INFO,
  TOWN_CLUSTER_LOOKUP
} from '../data/hdbData';
import { CalculationInput, FlatType, GrantEligibility, Pathway, ScenarioResult } from '../types';

export function calculateMonthlyPayment(principal: number, annualRate: number, years: number): number {
  if (principal <= 0) return 0;
  const r = annualRate / 12;
  const n = years * 12;
  if (r === 0) return principal / n;
  return (principal * r) / (1 - Math.pow(1 + r, -n));
}

export function calculateRemainingBalance(principal: number, annualRate: number, totalYears: number, elapsedYears: number): number {
  if (principal <= 0) return 0;
  const r = annualRate / 12;
  const n = totalYears * 12;
  const k = elapsedYears * 12;
  if (r === 0) return Math.max(0, principal * (1 - k / n));
  const num = Math.pow(1 + r, n) - Math.pow(1 + r, k);
  const den = Math.pow(1 + r, n) - 1;
  return Math.max(0, principal * (num / den));
}

export function calculateStampDuty(price: number): number {
  let duty = 0;
  if (price > 0) duty += Math.min(price, 180000) * 0.01;
  if (price > 180000) duty += Math.min(price - 180000, 180000) * 0.02;
  if (price > 360000) duty += Math.min(price - 360000, 640000) * 0.03;
  if (price > 1000000) duty += Math.min(price - 1000000, 500000) * 0.04;
  if (price > 1500000) duty += Math.min(price - 1500000, 1500000) * 0.05;
  if (price > 3000000) duty += (price - 3000000) * 0.06;
  return Math.round(duty);
}

export function runHousingSimulation(input: CalculationInput): ScenarioResult[] {
  const interestRateDec = input.interestRate / 100;
  const h = HOUSING_RULES.horizonYears;
  const ltv = HOUSING_RULES.ltv;
  const loanYears = HOUSING_RULES.loanYears;

  const results: ScenarioResult[] = [];

  for (const town of input.selectedTowns) {
    const townLookup = TOWN_CLUSTER_LOOKUP.find((t) => t.town === town);
    const townGroup = townLookup ? townLookup.townGroup : '1';

    for (const flatType of input.selectedFlatTypes) {
      const psfRow = APP_START_PSF_DATA.find((r) => r.townGroup === townGroup && r.flatType === flatType);
      const growthRow = APP_GROWTH_DATA.find((r) => r.townGroup === townGroup && r.flatTypeClean === flatType);

      const psfVal = psfRow ? psfRow.predictedStartPsf : 600;
      const floorAreaSqf = psfRow ? psfRow.floorAreaSqf : (FLAT_FLOOR_AREAS[flatType] || 1000);
      const growthRate = growthRow ? growthRow.centralGrowthAnnual : 0.02;

      const calculatedResalePrice = psfVal * floorAreaSqf;
      const flatLabel = FLAT_TYPE_LABELS[flatType];
      const scenarioBaseLabel = `${town} (${flatLabel})`;

      // 1. RESALE PURCHASE PATHWAY
      const minDownpaymentResale = calculatedResalePrice * (1 - ltv);
      const downResale = Math.max(minDownpaymentResale, input.cashInjection);
      const loanResale = Math.max(0, calculatedResalePrice - downResale);
      const pmtResale = calculateMonthlyPayment(loanResale, interestRateDec, loanYears);
      const balResale5Y = calculateRemainingBalance(loanResale, interestRateDec, loanYears, h);
      const val5yResale = calculatedResalePrice * Math.pow(1 + growthRate, h);
      const resaleEquity = val5yResale - balResale5Y;

      const resaleViolator = pmtResale > input.monthlyBudget;
      const resaleYearByYear = Array.from({ length: 5 }, (_, i) => {
        const yr = i + 1;
        const val = calculatedResalePrice * Math.pow(1 + growthRate, yr);
        const bal = calculateRemainingBalance(loanResale, interestRateDec, loanYears, yr);
        return {
          year: yr,
          assetValue: Math.round(val),
          loanBalance: Math.round(bal),
          equity: Math.round(val - bal),
          cumulativePaid: Math.round(pmtResale * 12 * yr)
        };
      });

      results.push({
        id: `resale-${town}-${flatType}`,
        town,
        flatType,
        label: scenarioBaseLabel,
        path: 'Resale Purchase',
        netWorth5Y: Math.round(resaleEquity),
        monthlyHousing: Math.round(pmtResale),
        initialPrice: Math.round(calculatedResalePrice),
        finalValue: Math.round(val5yResale),
        growthRate,
        budgetViolator: resaleViolator,
        displayName: resaleViolator ? `${scenarioBaseLabel} [Resale] ⚠️ Unaffordable` : `${scenarioBaseLabel} [Resale]`,
        loanBalance5Y: Math.round(balResale5Y),
        downpayment: Math.round(downResale),
        loanAmount: Math.round(loanResale),
        psf: psfVal,
        floorAreaSqf,
        townGroup,
        yearByYear: resaleYearByYear
      });

      // 2. BTO PURCHASE PATHWAY
      // BTO Prices for 2-Room Flexi vs 3/4/5-Room
      let btoPriceStart = HOUSING_RULES.btoBasePrice2Room;
      if (flatType === '2_ROOM') btoPriceStart = 180000;
      else if (flatType === '3_ROOM') btoPriceStart = 290000;
      else if (flatType === '4_ROOM') btoPriceStart = 380000;
      else if (flatType === '5_ROOM') btoPriceStart = 490000;

      const btoGrowthRate = HOUSING_RULES.btoGrowthRate;
      const minDownpaymentBto = btoPriceStart * (1 - ltv);
      const downBto = Math.max(minDownpaymentBto, Math.min(input.cashInjection, btoPriceStart));
      const loanBto = Math.max(0, btoPriceStart - downBto);
      const pmtBto = calculateMonthlyPayment(loanBto, interestRateDec, loanYears);
      const balBto5Y = calculateRemainingBalance(loanBto, interestRateDec, loanYears, h);
      const val5yBto = btoPriceStart * Math.pow(1 + btoGrowthRate, h);
      const btoEquity = val5yBto - balBto5Y;

      const btoViolator = pmtBto > input.monthlyBudget;
      const btoYearByYear = Array.from({ length: 5 }, (_, i) => {
        const yr = i + 1;
        const val = btoPriceStart * Math.pow(1 + btoGrowthRate, yr);
        const bal = calculateRemainingBalance(loanBto, interestRateDec, loanYears, yr);
        return {
          year: yr,
          assetValue: Math.round(val),
          loanBalance: Math.round(bal),
          equity: Math.round(val - bal),
          cumulativePaid: Math.round(pmtBto * 12 * yr)
        };
      });

      results.push({
        id: `bto-${town}-${flatType}`,
        town,
        flatType,
        label: scenarioBaseLabel,
        path: 'BTO Purchase',
        netWorth5Y: Math.round(btoEquity),
        monthlyHousing: Math.round(pmtBto),
        initialPrice: Math.round(btoPriceStart),
        finalValue: Math.round(val5yBto),
        growthRate: btoGrowthRate,
        budgetViolator: btoViolator,
        displayName: btoViolator ? `${scenarioBaseLabel} [BTO] ⚠️ Unaffordable` : `${scenarioBaseLabel} [BTO]`,
        loanBalance5Y: Math.round(balBto5Y),
        downpayment: Math.round(downBto),
        loanAmount: Math.round(loanBto),
        psf: Math.round(btoPriceStart / floorAreaSqf),
        floorAreaSqf,
        townGroup,
        yearByYear: btoYearByYear
      });

      // 3. RENTING PATHWAY
      let rentTotal = 0;
      for (let yr = 1; yr <= h; yr++) {
        rentTotal += input.baseRent * 12 * Math.pow(1 + HOUSING_RULES.rentEscalationRate, yr - 1);
      }
      const rentViolator = input.baseRent > input.monthlyBudget;

      const rentYearByYear = Array.from({ length: 5 }, (_, i) => {
        const yr = i + 1;
        let cumRent = 0;
        for (let y = 1; y <= yr; y++) {
          cumRent += input.baseRent * 12 * Math.pow(1 + HOUSING_RULES.rentEscalationRate, y - 1);
        }
        return {
          year: yr,
          assetValue: 0,
          loanBalance: 0,
          equity: -Math.round(cumRent),
          cumulativePaid: Math.round(cumRent)
        };
      });

      results.push({
        id: `renting-${town}-${flatType}`,
        town,
        flatType,
        label: scenarioBaseLabel,
        path: 'Renting',
        netWorth5Y: -Math.round(rentTotal),
        monthlyHousing: Math.round(input.baseRent),
        initialPrice: null,
        finalValue: 0,
        growthRate: 0,
        budgetViolator: rentViolator,
        displayName: rentViolator ? `${scenarioBaseLabel} [Rent] ⚠️ Unaffordable` : `${scenarioBaseLabel} [Rent]`,
        loanBalance5Y: 0,
        downpayment: 0,
        loanAmount: 0,
        psf: 0,
        floorAreaSqf,
        townGroup,
        yearByYear: rentYearByYear
      });
    }
  }

  return results;
}

export function checkGrantEligibility(monthlyIncome: number, flatType: FlatType, path: Pathway, livesNearParents: boolean): GrantEligibility {
  const notes: string[] = [];
  let singleGrant = 0;
  let ehgGrant = 0;
  let phgGrant = 0;

  // Single Age 35+ Income limits
  const eligibleBTO = monthlyIncome <= SINGLES_GRANT_INFO.incomeCapBto2Room;
  const eligibleResale = monthlyIncome <= SINGLES_GRANT_INFO.incomeCapResale;

  if (path === 'Resale Purchase') {
    if (flatType === '2_ROOM' || flatType === '3_ROOM' || flatType === '4_ROOM') {
      singleGrant = SINGLES_GRANT_INFO.singleGrantMax2To4Room;
      notes.push(`Eligible for $${singleGrant.toLocaleString()} CPF Housing Grant for Singles (2 to 4-Room Resale).`);
    } else if (flatType === '5_ROOM') {
      singleGrant = SINGLES_GRANT_INFO.singleGrantMax5Room;
      notes.push(`Eligible for $${singleGrant.toLocaleString()} CPF Housing Grant for Singles (5-Room Resale).`);
    }

    if (livesNearParents) {
      phgGrant = SINGLES_GRANT_INFO.phgNearParents;
      notes.push(`Eligible for $${phgGrant.toLocaleString()} Proximity Housing Grant (PHG) for living within 4km of parents/children.`);
    }
  } else if (path === 'BTO Purchase') {
    if (flatType !== '2_ROOM') {
      notes.push('Note: Under standard Single Scheme, BTO flat applications are restricted to 2-Room Flexi flats in any location (or 2-Room under Prime/Plus/Standard classification).');
    }
  }

  // EHG (Enhanced CPF Housing Grant) for Singles
  if (monthlyIncome <= 4500 && monthlyIncome > 0) {
    // EHG scales from $40,000 for income <= $750 down to $2,500 for income $4,250-$4,500
    const ratio = Math.max(0, 1 - monthlyIncome / 4500);
    ehgGrant = Math.min(40000, Math.max(2500, Math.round(40000 * ratio / 500) * 500));
    notes.push(`Eligible for approx. $${ehgGrant.toLocaleString()} Enhanced CPF Housing Grant (EHG) based on $${monthlyIncome.toLocaleString()}/mo income.`);
  } else if (monthlyIncome > 4500) {
    notes.push('Income exceeds $4,500/mo cap for Enhanced CPF Housing Grant (EHG).');
  }

  const totalGrants = singleGrant + ehgGrant + phgGrant;

  return {
    singleGrant,
    ehgGrant,
    phgGrant,
    totalGrants,
    eligibleBTO,
    eligibleResale,
    notes
  };
}
