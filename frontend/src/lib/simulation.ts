import { computeEquity, checkMsrTdsr, rent_growth_annual } from "../financial-calc";
import { getResaleRow, getBtoRow } from "../supabase-lookup";
import { UserInputs, SimulationResultRow } from "../types";

export async function runSimulation(inputs: UserInputs): Promise<SimulationResultRow[]> {
  const {
    selectedTowns,
    selectedRoomTypes,
    remainingLease,
    monthlyBudget,
    cashInjection,
    interestRate,
    baseRent,
    grossMonthlyIncome,
    existingMonthlyDebt,
  } = inputs;

  const annualRateFraction = interestRate / 100;
  const horizonYears = 5;
  const ltv = 0.75;
  const loanYears = 25;

  // Calculate 5-year compounding rent
  let rentTotal5y = 0;
  for (let yr = 1; yr <= horizonYears; yr++) {
    rentTotal5y += baseRent * 12 * Math.pow(1 + rent_growth_annual, yr - 1);
  }

  const rawRows: SimulationResultRow[] = [];

  for (const town of selectedTowns) {
    for (const flatType of selectedRoomTypes) {
      // 1. Resale Purchase (mandatory lookup, throws on parity gate)
      const resaleRow = await getResaleRow(town, flatType, remainingLease);
      const resalePrice = resaleRow.predicted_start_psf * resaleRow.floor_area_sqf;
      const clusterLabel = resaleRow.cluster_label;
      const label = `${town} [${clusterLabel}] (${flatType})`;

      const eqResale = computeEquity(
        resalePrice,
        annualRateFraction,
        resaleRow.central_growth_annual,
        cashInjection,
        ltv,
        loanYears,
        horizonYears
      );

      const msrTdsrResale = checkMsrTdsr(
        grossMonthlyIncome,
        existingMonthlyDebt,
        eqResale.loan,
        loanYears,
        annualRateFraction
      );

      // 2. BTO Purchase (Only for 2_ROOM under Singles Scheme)
      const btoSchemeIneligible = flatType !== "2_ROOM";
      let btoDataUnavailable = false;
      let btoPriceStart: number | null = null;
      let btoGrowthRate: number | null = null;
      let pmtBto: number | null = null;
      let btoEquity: number | null = null;
      let btoLowConfidence = false;
      let msrTdsrBtoFail = false;

      if (!btoSchemeIneligible) {
        const btoRow = await getBtoRow(town);
        if (!btoRow) {
          btoDataUnavailable = true;
        } else {
          btoPriceStart = btoRow.predicted_start_psf * btoRow.floor_area_sqf;
          btoGrowthRate = btoRow.central_growth_annual;
          btoLowConfidence = btoRow.low_confidence;

          const eqBto = computeEquity(
            btoPriceStart,
            annualRateFraction,
            btoGrowthRate,
            cashInjection,
            ltv,
            loanYears,
            horizonYears
          );

          pmtBto = eqBto.monthlyPayment;
          btoEquity = eqBto.equity5y;

          const msrTdsrBto = checkMsrTdsr(
            grossMonthlyIncome,
            existingMonthlyDebt,
            eqBto.loan,
            loanYears,
            annualRateFraction
          );
          msrTdsrBtoFail = msrTdsrBto.regulatoryFail;
        }
      }

      // Add BTO row if eligible under scheme
      if (!btoSchemeIneligible) {
        rawRows.push({
          town,
          flat_type: flatType,
          cluster_label: clusterLabel,
          label,
          path: "BTO Purchase",
          net_worth_5y: btoDataUnavailable ? null : btoEquity,
          monthly_housing: btoDataUnavailable ? null : pmtBto,
          initial_price: btoDataUnavailable ? null : btoPriceStart,
          growth_rate: btoDataUnavailable ? null : btoGrowthRate,
          regulatory_fail: msrTdsrBtoFail,
          budget_violator: false, // will compute below
          scheme_ineligible: false,
          bto_data_unavailable: btoDataUnavailable,
          low_confidence: btoLowConfidence,
          display_name: label,
        });
      }

      // Add Resale row
      rawRows.push({
        town,
        flat_type: flatType,
        cluster_label: clusterLabel,
        label,
        path: "Resale Purchase",
        net_worth_5y: eqResale.equity5y,
        monthly_housing: eqResale.monthlyPayment,
        initial_price: resalePrice,
        growth_rate: resaleRow.central_growth_annual,
        regulatory_fail: msrTdsrResale.regulatoryFail,
        budget_violator: false, // will compute below
        scheme_ineligible: false,
        bto_data_unavailable: false,
        low_confidence: resaleRow.low_confidence,
        display_name: label,
      });

      // Add Renting row
      rawRows.push({
        town,
        flat_type: flatType,
        cluster_label: clusterLabel,
        label,
        path: "Renting",
        net_worth_5y: -rentTotal5y,
        monthly_housing: baseRent,
        initial_price: null,
        growth_rate: 0,
        regulatory_fail: false,
        budget_violator: false, // will compute below
        scheme_ineligible: false,
        bto_data_unavailable: false,
        low_confidence: false,
        display_name: label,
      });
    }
  }

  // Apply budget check and format display_name cascade according to app.R
  return rawRows.map((row) => {
    const isBudgetViolator =
      row.monthly_housing !== null && row.monthly_housing > monthlyBudget;

    let displayName = row.label;
    if (row.bto_data_unavailable) {
      displayName = `${row.label} 📨 No BTO history for this town`;
    } else if (row.regulatory_fail && isBudgetViolator) {
      displayName = `${row.label} ⚠️ Over budget & fails MSR/TDSR`;
    } else if (row.regulatory_fail) {
      displayName = `${row.label} 🚫 Fails MSR/TDSR`;
    } else if (isBudgetViolator) {
      displayName = `${row.label} ⚠️ Unaffordable`;
    } else if (row.low_confidence) {
      displayName = `${row.label} ℹ️ Limited data — treat with caution`;
    }

    return {
      ...row,
      budget_violator: isBudgetViolator,
      display_name: displayName,
    };
  });
}
