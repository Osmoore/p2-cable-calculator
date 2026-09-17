console.log("Calculator loaded");

// Copper at its 70 °C operating temperature, Ω·mm²/m.
//
// 0.022, not the 0.018 this project started with. The old figure was close to
// copper at 20 °C, and it made every volt drop this tool produced about 20%
// optimistic — in the unsafe direction.
//
// This value came from the project's own data, not from an outside claim.
// Rearranging mV/A/m = 2 × ρ × 1000 ÷ A across all eighteen sizes of
// Table 4D2B gives a mean of 0.02202, inside a band of 0.0213 to 0.0233.
//
// FALLBACK ONLY as of 17 Sep 2026. The tabulated figure governs wherever the
// table covers the size; this is what happens for a non-standard CSA.
const RHO_COPPER = 0.022;

// Go-and-return path, single phase
const SINGLE_PHASE = 2;
// Line-to-line factor, three phase
const THREE_PHASE = 1.732;

// Maximum permitted volt drop, percent
const LIMIT_LIGHTING = 3.0;
const LIMIT_POWER = 5.0;

// Nominal supply voltages, in volts.
const VOLTS_SINGLE_PHASE = 230;
const VOLTS_THREE_PHASE = 415;

// The published mid-market rate is not what anyone pays to buy dollars. The
// bank sells dearer than it buys, and the gap is a few percent. This is an
// allowance for that gap — an estimate, never a bank quotation.
// It opens at ZERO on purpose: nobody should ever be quoted a margin they
// did not choose. The user sets their own and the banner always shows it.
const DEFAULT_FX_ALLOWANCE_PERCENT = 0;

// Applies the FX allowance to a mid-market rate. Multiplied, not divided:
// the effective rate is HIGHER, because a dollar costs more cedis than the
// published rate suggests.
function calculateEffectiveRate(midMarketRate, allowancePercent) {
  return midMarketRate * (1 + allowancePercent / 100);
}

// Reads the FX allowance box. Falls back to zero for an empty or unusable
// entry — and zero is the honest fallback, because it adds nothing. The
// banner states whatever value was actually used, so nothing is hidden.
function getFxAllowancePercent() {
  const text = document.getElementById("fx-allowance").value;
  const value = Number(text);

  if (text.trim() === "" || !Number.isFinite(value) || value < 0) {
    return DEFAULT_FX_ALLOWANCE_PERCENT;
  }
  return value;
}


// Which currency the supplier quoted in. Declared by the person, never
// guessed — a tool that assumes USD will one day multiply a cedi price by
// 11.4 and quote a client eleven times the real figure.
function getPriceCurrency() {
  return document.getElementById("price-currency").value;
}


// Pesewas per cedi. Money is held as WHOLE PESEWAS so no cedi amount is ever
// a float: 0.1 + 0.2 is not exactly 0.3 in binary floating point, and an
// error of a pesewa repeated across a quote is money gone.
const PESEWAS_PER_CEDI = 100;

// Total cable cost for a run, in whole pesewas.
// Rounds ONCE, at the very end. Rounding per metre and then multiplying
// compounds the error across the length of the run.
function calculateCostPesewas(pricePerMetre, currency, lengthMetres, effectiveRate) {
  const costInSourceCurrency = pricePerMetre * lengthMetres;

  let costInCedis = costInSourceCurrency;
  if (currency === "USD") {
    costInCedis = costInSourceCurrency * effectiveRate;
  }

  return Math.round(costInCedis * PESEWAS_PER_CEDI);
}

// Turns whole pesewas into a cedi string for display. Display ONLY — the
// result is text, and text never goes back into arithmetic.
function formatCedis(pesewas) {
  return "GHS " + (pesewas / PESEWAS_PER_CEDI).toFixed(2);
}

// The supply type decides which voltage the percentage is measured against.
// Three phase is the LINE-TO-LINE voltage — comparing a three-phase drop
// against 230 V would make every three-phase run look like a fail.
function getSupplyVoltage(supplyType) {
  if (supplyType === "single") {
    return VOLTS_SINGLE_PHASE;
  }
  if (supplyType === "three") {
    return VOLTS_THREE_PHASE;
  }
  throw new Error("Unknown supply type: " + supplyType);
}


// These codes request for what type of supply either single or three phase

function getPhaseFactor(supplyType) {
  if (supplyType === "single") {
    return SINGLE_PHASE;
  }
  if (supplyType === "three") {
    return THREE_PHASE;
  }
  throw new Error("Unknown supply type: " + supplyType);
}

// these codes request for what type of circuit either power or lighting

function getDropLimit(circuitType) {
  if (circuitType === "lighting") {
    return LIMIT_LIGHTING;
  }
  if (circuitType === "power") {
    return LIMIT_POWER;
  }
  throw new Error("Unknown circuit type: " + circuitType);
}

// Resistance of the run, in ohms
function calculateConductorResistance(resistivity, length, csa) {
  return (resistivity * length) / csa;
}

// Volts dropped: V = I × R, over the round trip
function calculateVoltageDrop(phaseFactor, resistance, current) {
  return phaseFactor * resistance * current;
}

// percentage drop in voltage
function calculateDropPercent(voltsDropped, supplyVoltage) {
  return (voltsDropped / supplyVoltage) * 100;
}

// verdict either PASS or FAIL
function evaluateVerdict(percent, limit) {
  if (percent <= limit) {
    return "PASS";
  } else {
    return "FAIL";
  }
}


// Standard copper conductor sizes, smallest first. Order matters: the search
// below walks this list and stops at the first size that passes, so the list
// must stay sorted ascending.
const STANDARD_CSA_MM2 = [1, 1.5, 2.5, 4, 6, 10, 16, 25, 35, 50, 70, 95, 120, 150, 185, 240, 300, 400];


// Current-carrying capacity It, in amperes.
// Source: BS 7671:2018+A2:2022, Appendix 4, Table 4D2A, Column 6
// Cable type: Multicore 70 °C thermoplastic (PVC) insulated and sheathed,
//             non-armoured, copper conductors (1 two-core cable, single-phase)
// Installation method: Reference Method C (clipped direct)
// Ambient 30 °C, no grouping, no thermal insulation.
const CURRENT_CAPACITY_A = {
  1:   15,
  1.5: 19.5,
  2.5: 27,
  4:   36,
  6:   46,
  10:  63,
  16:  85,
  25:  112,
  35:  138,
  50:  168,
  70:  213,
  95:  258,
  120: 299,
  150: 344,
  185: 392,
  240: 461,
  300: 530,
  400: 634
};

// The assumptions behind that table, in one place so the note and the data
// can never disagree.
const SIZING_BASIS =
  "BS 7671 Table 4D2A, Reference Method C, multicore 70 °C thermoplastic, copper";

// Guard: capacity MUST rise with conductor size. A bigger conductor carries
// more current, never less. If this ever fails, the wrong table has been
// pasted in — and every size the tool recommends after that would be wrong.
// Fail loudly here at load, not quietly on site.
function checkCapacityTableAscends() {
  let previous = 0;

  for (const size of STANDARD_CSA_MM2) {
    const capacity = CURRENT_CAPACITY_A[size];

    // A size we do not stock is simply absent. Skip it, don't fail on it.
    if (capacity === undefined) {
      continue;
    }

    if (capacity <= previous) {
      throw new Error(
        "Capacity table is not ascending at " + size + " mm² — wrong table?");
    }
    previous = capacity;
  }
}

checkCapacityTableAscends();


// --- correction factors -----------------------------------------------------
// The capacity table above is for ONE set of conditions: 30 °C ambient, one
// circuit, no insulation, an MCB. Real installations are hotter, more crowded
// and sometimes buried in loft insulation. Every one of those makes the cable
// carry LESS. These four factors are how BS 7671 accounts for that.
//
// They are not applied to the cable. They are applied to the REQUIREMENT:
//     It_required = In / (Ca × Cg × Ci × Cf)
// and then you find the smallest size whose tabulated It meets it. A 32 A MCB
// at 40 °C in a group of four needs 32 / (0.87 × 0.75) = 49 A of tabulated
// capacity, not 32 A.

// Ca — ambient temperature.
// Source: BS 7671:2018+A2:2022, Appendix 4, Table 4B1
// 70 °C thermoplastic (PVC) row only. The 90 °C thermosetting row is NOT here
// on purpose: it belongs with an XLPE capacity table this tool does not hold.
// Keyed by ambient temperature in °C. 30 °C is the base condition, so 1.00.
const FACTOR_CA_PVC = {
  25: 1.03,
  30: 1.00,
  35: 0.94,
  40: 0.87,
  45: 0.79,
  50: 0.71,
  55: 0.61,
  60: 0.50
};

// Cg — grouping.
// Source: BS 7671:2018+A2:2022, Appendix 4, Table 4C1
// Single layer, clipped direct — the arrangement that matches Reference
// Method C above. The bunched/conduit column is NOT here: bunched cables need
// a bunched capacity column too, and this tool only has Method C.
// Keyed by the number of circuits in the group. One circuit is no group, 1.00.
const FACTOR_CG_CLIPPED_DIRECT = {
  1: 1.00,
  2: 0.85,
  3: 0.79,
  4: 0.75,
  5: 0.73,
  6: 0.72,
  7: 0.72,
  8: 0.71,
  9: 0.70
};

// Ci — thermal insulation.
// Source: BS 7671:2018+A2:2022, Regulation 523.9, Table 52.2
// Keyed by the route length IN MILLIMETRES that is surrounded by insulation.
// Zero means the run touches no insulation anywhere, so 1.00.
const FACTOR_CI = {
  0:   1.00,
  50:  0.88,
  100: 0.78,
  200: 0.63,
  400: 0.51
};

// Cf — protective device type.
// Source: BS 7671:2018+A2:2022, Regulation 433.1.202
// A BS 3036 rewireable fuse does not clear an overload as cleanly as an MCB,
// so the cable must be bigger. Everything else takes no penalty.
// Keyed by text, not by number — so the numeric guard below does NOT run on it.
const FACTOR_CF = {
  standard: 1.00,
  bs3036:   0.725
};


// Guard for the three NUMERIC factor tables. Three separate things can go
// wrong when a table is typed in by hand, and this catches all three:

//  1. Keys out of order. NOTE: JavaScript re-sorts WHOLE-NUMBER keys into
//      ascending order by itself, so for the three tables below this check
//      can NEVER fire — verified by scrambling Cg and watching it pass. It
//      earns its place only for a future table keyed by a fraction.

//   2. A factor that RISES — the table went in upside down. Note that EQUAL is
//      allowed: Table 4C1 really does give 0.72 for both 6 and 7 circuits.
//      Only an increase is impossible.
//   3. A factor outside 0 to 1.5 — that is a typo, not a correction factor.
//
// Throwing here at load is deliberate. A silently wrong factor under-sizes
// cable, and nobody finds out until something gets hot.
function checkFactorTable(tableName, table) {
  let previousKey = -Infinity;
  let previousValue = Infinity;

  for (const key of Object.keys(table)) {
    const numericKey = Number(key);
    const value = table[key];

    if (numericKey <= previousKey) {
      throw new Error(tableName + ": keys out of order at " + key);
    }
    if (value > previousValue) {
      throw new Error(tableName + ": factor rises at " + key + " — upside down?");
    }
    if (value <= 0 || value > 1.5) {
      throw new Error(tableName + ": " + value + " at " + key + " is not a factor");
    }

    previousKey = numericKey;
    previousValue = value;
  }
}

// Each table has a base condition where the factor MUST be exactly 1.00,
// because that condition is the one the capacity table was measured under.
// If any of these is not 1.00, the table does not belong with Table 4D2A.
function checkFactorBaseConditions() {
  if (FACTOR_CA_PVC[30] !== 1.00) {
    throw new Error("Ca at 30 °C must be 1.00 — wrong base temperature?");
  }
  if (FACTOR_CG_CLIPPED_DIRECT[1] !== 1.00) {
    throw new Error("Cg for one circuit must be 1.00 — one cable is no group.");
  }
  if (FACTOR_CI[0] !== 1.00) {
    throw new Error("Ci with no insulation must be 1.00.");
  }
  if (FACTOR_CF.standard !== 1.00) {
    throw new Error("Cf for a standard device must be 1.00.");
  }
}

checkFactorTable("Ca", FACTOR_CA_PVC);
checkFactorTable("Cg", FACTOR_CG_CLIPPED_DIRECT);
checkFactorTable("Ci", FACTOR_CI);
checkFactorBaseConditions();

// Voltage drop per ampere per metre (mV/A/m).
// Source: BS 7671:2018+A2:2022, Appendix 4, Table 4D2B
// Multicore 70 °C thermoplastic (PVC), non-armoured, copper. 70 °C operating.
//
// These numbers ALREADY contain the phase factor — 2 for the single-phase
// column, 1.732 for the three-phase column. Never apply it a second time.
//
// r = resistive part, x = inductive reactance, z = total impedance.
// Below 25 mm² reactance is negligible and z equals r. Above it, z is what
// the drop is calculated from, because a real a.c. circuit feels both.
const VOLTAGE_DROP_TABLE_4D2B = {
  // Columns 3 to 6: two-core cable, d.c. or single-phase a.c.
  singlePhase: {
    1:   { r: 44,    x: 0,     z: 44 },
    1.5: { r: 29,    x: 0,     z: 29 },
    2.5: { r: 18,    x: 0,     z: 18 },
    4:   { r: 11,    x: 0,     z: 11 },
    6:   { r: 7.3,   x: 0,     z: 7.3 },
    10:  { r: 4.4,   x: 0,     z: 4.4 },
    16:  { r: 2.8,   x: 0,     z: 2.8 },
    25:  { r: 1.75,  x: 0.170, z: 1.75 },
    35:  { r: 1.25,  x: 0.165, z: 1.25 },
    50:  { r: 0.93,  x: 0.160, z: 0.94 },
    70:  { r: 0.63,  x: 0.155, z: 0.65 },
    95:  { r: 0.46,  x: 0.150, z: 0.49 },
    120: { r: 0.36,  x: 0.145, z: 0.39 },
    150: { r: 0.29,  x: 0.145, z: 0.32 },
    185: { r: 0.23,  x: 0.145, z: 0.27 },
    240: { r: 0.180, x: 0.140, z: 0.230 },
    300: { r: 0.145, x: 0.140, z: 0.200 },
    400: { r: 0.115, x: 0.135, z: 0.180 }
  },

  // Columns 7 to 10: three- or four-core cable, balanced three-phase a.c.
  threePhase: {
    1:   { r: 38,    x: 0,     z: 38 },
    1.5: { r: 25,    x: 0,     z: 25 },
    2.5: { r: 15,    x: 0,     z: 15 },
    4:   { r: 9.5,   x: 0,     z: 9.5 },
    6:   { r: 6.4,   x: 0,     z: 6.4 },
    10:  { r: 3.8,   x: 0,     z: 3.8 },
    16:  { r: 2.4,   x: 0,     z: 2.4 },
    25:  { r: 1.50,  x: 0.145, z: 1.50 },
    35:  { r: 1.10,  x: 0.145, z: 1.10 },
    50:  { r: 0.80,  x: 0.140, z: 0.81 },
    70:  { r: 0.55,  x: 0.135, z: 0.57 },
    95:  { r: 0.40,  x: 0.130, z: 0.42 },
    120: { r: 0.31,  x: 0.130, z: 0.34 },
    150: { r: 0.25,  x: 0.125, z: 0.28 },
    185: { r: 0.20,  x: 0.125, z: 0.24 },
    240: { r: 0.155, x: 0.120, z: 0.195 },
    300: { r: 0.125, x: 0.120, z: 0.175 },
    400: { r: 0.100, x: 0.120, z: 0.155 }
  }
};


// Tabulated figures are ROUNDED, so no check here can demand exact equality.
// The worst real deviation in this table is 1.73%, so 2.5% leaves room for
// the rounding without leaving room for a typo.
const Z_TOLERANCE_PERCENT = 2.5;

// The resistivity these r values imply, in Ω·mm²/m. Every size in this table
// lands between 0.0213 and 0.0233, so this window passes the real data
// comfortably while catching a misplaced decimal point anywhere in 36 numbers.
const RHO_IMPLIED_MIN = 0.020;
const RHO_IMPLIED_MAX = 0.024;


// Guard 1: z must be the hypotenuse of r and x.
// Resistance and reactance act at right angles to each other, so they combine
// like the two short sides of a right-angled triangle: z = √(r² + x²). Three
// numbers that must agree means a typo in any one of them shows up here
// instead of in somebody's cable.
function checkImpedanceModulus(columnName, column) {
  for (const size of Object.keys(column)) {
    const row = column[size];
    const computed = Math.hypot(row.r, row.x);
    const deviation = Math.abs(computed - row.z) / row.z * 100;

    if (deviation > Z_TOLERANCE_PERCENT) {
      throw new Error(
        columnName + " " + size + " mm²: z is " + row.z + " but √(r²+x²) is " +
        computed.toFixed(4) + " — check r, x and z");
    }
  }
}

// Guard 2: the two columns must describe the same conductor.
// The single-phase column carries the ×2 go-and-return factor; the three-phase
// column carries ×1.732. So dividing one by the other must give
// 1.732 ÷ 2 = 0.866 at EVERY size. If a whole column is ever pasted into the
// wrong slot this catches it, even when both columns are individually perfect.
function checkPhaseColumnsAgree() {
  const single = VOLTAGE_DROP_TABLE_4D2B.singlePhase;
  const three = VOLTAGE_DROP_TABLE_4D2B.threePhase;

  for (const size of Object.keys(single)) {
    if (three[size] === undefined) {
      throw new Error("Table 4D2B: " + size + " mm² is missing from threePhase");
    }

    const ratio = three[size].z / single[size].z;

    if (ratio < 0.82 || ratio > 0.91) {
      throw new Error(
        "Table 4D2B " + size + " mm²: three-phase ÷ single-phase is " +
        ratio.toFixed(4) + ", expected about 0.866 — columns swapped?");
    }
  }
}

// Guard 3: the resistivity this table implies must be physically sensible.
// Rearranging mV/A/m = 2 × ρ × 1000 ÷ A gives ρ = r × A ÷ 2000. Copper at its
// 70 °C operating temperature is about 0.022. This is the strongest of the
// three checks: one wrong digit anywhere in the r column moves its size
// straight out of the window.
function checkImpliedResistivity() {
  const single = VOLTAGE_DROP_TABLE_4D2B.singlePhase;

  for (const size of Object.keys(single)) {
    const rho = single[size].r * Number(size) / 2000;

    if (rho < RHO_IMPLIED_MIN || rho > RHO_IMPLIED_MAX) {
      throw new Error(
        "Table 4D2B " + size + " mm²: implies ρ = " + rho.toFixed(5) +
        ", outside " + RHO_IMPLIED_MIN + "–" + RHO_IMPLIED_MAX + " — typo?");
    }
  }
}

checkImpedanceModulus("singlePhase", VOLTAGE_DROP_TABLE_4D2B.singlePhase);
checkImpedanceModulus("threePhase", VOLTAGE_DROP_TABLE_4D2B.threePhase);
checkPhaseColumnsAgree();
checkImpliedResistivity();


// Which column of Table 4D2B this supply uses. Same throw-on-unknown rule as
// getPhaseFactor, and for the same reason: picking the wrong column here would
// be a 15% error nobody would ever see.
function getVoltageDropColumn(supplyType) {
  if (supplyType === "single") {
    return VOLTAGE_DROP_TABLE_4D2B.singlePhase;
  }
  if (supplyType === "three") {
    return VOLTAGE_DROP_TABLE_4D2B.threePhase;
  }
  throw new Error("Unknown supply type: " + supplyType);
}

// The tabulated figure for one size on one supply type, in mV/A/m.
//
// Returns z, not r — decided 17 Sep 2026. z includes reactance, which matters
// from 25 mm² upward. Below that the table gives x as zero, so z and r are the
// same number and this choice costs nothing on small cables.
function getMilliVoltsPerAmpPerMetre(supplyType, csa) {
  const column = getVoltageDropColumn(supplyType);
  const row = column[csa];

  if (row === undefined) {
    throw new Error("Table 4D2B has no entry for " + csa + " mm²");
  }
  return row.z;
}

// Volt drop by the tabulated method, in volts.
//
// Two things make this shorter than it looks. The table is in MILLIvolts, so
// divide by 1000. And there is NO phase factor here — no 2, no 1.732 — because
// the published number already contains it. Applying it again is the classic
// way to double a volt drop and never notice.
function calculateTabulatedVoltageDrop(supplyType, lengthMetres, current, csa) {
  const mvPerAmpPerMetre = getMilliVoltsPerAmpPerMetre(supplyType, csa);

  return (mvPerAmpPerMetre * current * lengthMetres) / 1000;
}

// Plain words for how far apart the two methods are, measured against the
// published figure because that is the one with authority. Returns text for
// display, never a number for arithmetic.
function describeMethodGap(resistivityVolts, tabulatedVolts) {
  const differencePercent =
    (resistivityVolts - tabulatedVolts) / tabulatedVolts * 100;

  if (Math.abs(differencePercent) < 0.05) {
    return "methods agree";
  }
  if (differencePercent < 0) {
    return "resistivity " + Math.abs(differencePercent).toFixed(1) + "% LOW";
  }
  return "resistivity " + differencePercent.toFixed(1) + "% high";
}

// Each lookup below THROWS on a value it does not hold. That is deliberate and
// it is the same rule as getPhaseFactor and getDropLimit: a value the program
// was not given is a fault in the program, not something to guess around.
// Nothing here ever interpolates. BS 7671 tabulates factors at fixed points,
// and the page only ever offers those points, so an unknown value means the
// page and the table have drifted apart — which is worth stopping for.

// Ca — what the ambient temperature costs.
function getAmbientFactor(ambientC) {
  const factor = FACTOR_CA_PVC[ambientC];

  if (factor === undefined) {
    throw new Error("No Ca value for " + ambientC + " °C");
  }
  return factor;
}

// Cg — what sharing a route with other circuits costs. Count includes THIS
// circuit, so one means no group.
function getGroupingFactor(circuitsInGroup) {
  const factor = FACTOR_CG_CLIPPED_DIRECT[circuitsInGroup];

  if (factor === undefined) {
    throw new Error("No Cg value for " + circuitsInGroup + " circuits");
  }
  return factor;
}

// Ci — what being buried in thermal insulation costs, by route length in mm.
function getInsulationFactor(insulationMm) {
  const factor = FACTOR_CI[insulationMm];

  if (factor === undefined) {
    throw new Error("No Ci value for " + insulationMm + " mm in insulation");
  }
  return factor;
}

// Cf — what the protective device costs. Keyed by text, not number.
function getDeviceFactor(deviceType) {
  const factor = FACTOR_CF[deviceType];

  if (factor === undefined) {
    throw new Error("Unknown device type: " + deviceType);
  }
  return factor;
}

// All four multiplied together. Kept as its own function rather than written
// inline so there is exactly ONE place the four factors combine. If BS 7671
// ever changes how they compound, it changes here and nowhere else.
function calculateTotalCorrectionFactor(ca, cg, ci, cf) {
  return ca * cg * ci * cf;
}

// Reads all four conditions off the page and returns them as ONE object.
//
// This function returns an object rather than a single number on purpose. The
// sizing note has to show its working — "0.87 × 0.75 = 0.65" tells the person
// WHY the tool wants 10 mm², where a bare 0.65 tells them nothing. So the
// individual factors travel alongside the total instead of being thrown away.
//
// Remember that .value always hands back TEXT. Number() turns it into a number
// before the lookup, so "40" from the page and 40 from a test both find the
// same row.
function readCorrectionFactors() {
  const ambientC = Number(document.getElementById("ambient").value);
  const circuitsInGroup = Number(document.getElementById("circuits-in-group").value);
  const insulationMm = Number(document.getElementById("insulation-mm").value);
  const deviceType = document.getElementById("device-type").value;

  const ca = getAmbientFactor(ambientC);
  const cg = getGroupingFactor(circuitsInGroup);
  const ci = getInsulationFactor(insulationMm);
  const cf = getDeviceFactor(deviceType);

  return {
    ca: ca,
    cg: cg,
    ci: ci,
    cf: cf,
    total: calculateTotalCorrectionFactor(ca, cg, ci, cf),
    ambientC: ambientC,
    circuitsInGroup: circuitsInGroup,
    insulationMm: insulationMm,
    deviceType: deviceType
  };
}

// Standard MCB ratings, BS EN 60898, ascending.
const STANDARD_DEVICE_RATINGS_A = [6, 10, 16, 20, 25, 32, 40, 50, 63, 80, 100, 125];

// The smallest standard device rating at or above the design current.
// BS 7671 Reg 433.1.1: Ib <= In <= Iz. The cable carries In, not Ib, because
// an overload between the two will never trip the device.
function selectDeviceRating(designCurrent) {
  for (const rating of STANDARD_DEVICE_RATINGS_A) {
    if (rating >= designCurrent) {
      return rating;
    }
  }
  return null;  // past the end of the ladder this tool covers
}

// The smallest listed size that can carry the device rating ONCE the
// installation conditions are accounted for.
//
// The factors do not shrink the cable. They inflate the requirement:
//     It_required = In / (Ca × Cg × Ci × Cf)
// A 32 A device in conditions worth 0.6525 needs a cable TABULATED at 49.0 A,
// because in those conditions a 49.0 A cable really only carries 32 A.
function findSmallestCsaForCapacity(deviceRating, correctionTotal) {
  // Written as "not greater than zero" rather than "less than or equal to
  // zero" on purpose. Every comparison against NaN is false, so NaN <= 0 is
  // false and a NaN would slip straight through. !(NaN > 0) is true, so this
  // form catches zero, negatives AND NaN. Dividing by any of them would
  // return a confident wrong size instead of stopping.
  if (!(correctionTotal > 0)) {
    throw new Error("Correction factor must be above zero, got " + correctionTotal);
  }

  const requiredTabulatedCurrent = deviceRating / correctionTotal;

  for (const candidate of STANDARD_CSA_MM2) {
    const capacity = CURRENT_CAPACITY_A[candidate];

    if (capacity !== undefined && capacity >= requiredTabulatedCurrent) {
      return candidate;
    }
  }
  return null;
}

// How much of the permitted volt drop this run actually uses, as a percentage
// of the allowance. 2.09% against a 5% limit is 42% of the allowance — a very
// different engineering fact from 96%, which PASS/FAIL hides completely.
function calculateHeadroomPercent(percent, limit) {
  return (percent / limit) * 100;}


// The volt drop for one run, by BOTH methods, with Table 4D2B governing.
//
// Decided 17 Sep 2026. The table is what BS 7671 publishes, it already carries
// the phase factor, and it is built from the resistance of a real stranded
// conductor at its operating temperature rather than from an assumed ρ.
//
// The resistivity formula does not go away. It stays for two jobs: as the
// cross-check that found this problem in the first place, and as the fallback
// for a size the table does not list.
//
// Returns an OBJECT, not a number, because the page has to be able to show
// both figures. A tool that quietly picks one of two disagreeing answers is
// hiding the disagreement, and the disagreement is the useful part.
function calculateRunVoltageDrop(supplyType, lengthMetres, current, csa, supplyVoltage) {
  const resistance = calculateConductorResistance(RHO_COPPER, lengthMetres, csa);
  const resistivityVolts =
    calculateVoltageDrop(getPhaseFactor(supplyType), resistance, current);

  // Is this size in the table? Every standard size is. A non-standard CSA
  // typed by hand — 3 mm², say — is not, and falls back to the formula.
  const column = getVoltageDropColumn(supplyType);
  const isTabulated = column[csa] !== undefined;

  let tabulatedVolts = null;
  let volts = resistivityVolts;
  let source = "resistivity";

  if (isTabulated) {
    tabulatedVolts =
      calculateTabulatedVoltageDrop(supplyType, lengthMetres, current, csa);
    volts = tabulatedVolts;
    source = "Table 4D2B";
  }

  return {
    volts: volts,
    percent: calculateDropPercent(volts, supplyVoltage),
    resistivityVolts: resistivityVolts,
    tabulatedVolts: tabulatedVolts,
    source: source
  };
}

// The smallest standard size that stays inside the volt drop limit for this
// run, or null if nothing up to 400 mm² does.
// NOT a recommendation — volt drop is one constraint of several, and it is
// usually not the binding one. See Known limitations in CLAUDE.md.
function findSmallestCsaForVoltDrop(supplyType, lengthMetres, current, supplyVoltage, limit) {
  for (const candidate of STANDARD_CSA_MM2) {

       // Exactly the same function the real calculation uses, so the size this
    // search recommends is judged by the rule the answer is judged by. If the
    // search used a different method from the verdict, the tool could recommend
    // a size and then fail it.
    const drop = calculateRunVoltageDrop(supplyType, lengthMetres, current, candidate, supplyVoltage);
    const percent = drop.percent; 

    // The list is sorted smallest first, so the first size that passes IS the
    // smallest that passes. "return" leaves the function immediately — there
    // is no point checking the fourteen larger sizes.
    if (percent <= limit) {
      return candidate;
    }
  }

  // Fell off the end: nothing on the list is big enough.
  return null;
}

// Checks one typed value and returns a plain-English description of what is
// wrong with it, or an empty string if it is fine. Returns a message rather
// than throwing: a typo by the person using the calculator is not a fault in
// the program, and a red console line is invisible to someone on site.
function describeNumberProblem(text, fieldName) {

  // trim() strips spaces, so a box holding only spaces counts as empty.
  if (text.trim() === "") {
    return fieldName + " is empty.";
  }

  const value = Number(text);

  // Number() returns NaN — "not a number" — for anything it cannot read,
  // such as "50mm" or "abc". Number.isFinite() rejects NaN and Infinity.
  if (!Number.isFinite(value)) {
    return fieldName + ' is not a number: "' + text + '"';
  }

  // Zero or negative has no physical meaning for a length, a current or an
  // area — and a CSA of zero would divide by zero and give Infinity.
  if (value <= 0) {
    return fieldName + " must be greater than zero.";
  }

  return "";  // empty string means: no problem found
}

// Every case, as data
const cases = [
  { name: "Case 1", length: 25,  current: 32, csa: 6,   supply: "single", voltage: 230, circuit: "power" },
  { name: "Case 2", length: 35,  current: 45, csa: 10,  supply: "single", voltage: 230, circuit: "power" },
  { name: "Case 3", length: 70,  current: 32, csa: 2.5, supply: "single", voltage: 230, circuit: "lighting" },
  { name: "Case 4", length: 100, current: 20, csa: 10,  supply: "three",  voltage: 415, circuit: "power" },
  { name: "Case 5", length: 150, current: 10, csa: 10,  supply: "three",  voltage: 415, circuit: "power" },
  { name: "Case 6", length: 200, current: 15, csa: 16,  supply: "single", voltage: 230, circuit: "power" },
];

let rows = "";

for (const run of cases) {
  const resistance = calculateConductorResistance(RHO_COPPER, run.length, run.csa);
  const volts = calculateVoltageDrop(getPhaseFactor(run.supply), resistance, run.current);
  const percent = calculateDropPercent(volts, run.voltage);
  const result = evaluateVerdict(percent, getDropLimit(run.circuit));
    console.log(`${run.name}: ${volts.toFixed(2)} V | ${percent.toFixed(2)} % | ${result}   resistivity`);

  // THE CROSS-CHECK. Two independent routes to the same physical number: your
  // resistivity formula, and the figure BS 7671 publishes. They should agree.
  // Where they do not, one of them is wrong, and the gap says by how much.
  const tabVolts = calculateTabulatedVoltageDrop(run.supply, run.length, run.current, run.csa);
  const tabPercent = calculateDropPercent(tabVolts, run.voltage);
  const tabResult = evaluateVerdict(tabPercent, getDropLimit(run.circuit));
  console.log(`        ${tabVolts.toFixed(2)} V | ${tabPercent.toFixed(2)} % | ${tabResult}   tabulated 4D2B  (${describeMethodGap(volts, tabVolts)})`);
    // The TABULATED figure goes in the table, because that is now what governs.
  // The console above still shows both, which is where the cross-check lives.
  // One basis for every row: a table mixing two methods is a table nobody can
  // read.
  rows += `<tr><td>${run.name}</td><td>${tabVolts.toFixed(2)}</td><td>${tabPercent.toFixed(2)}</td><td>${tabResult}</td><td>—</td></tr>`; 
}

document.getElementById("results").innerHTML = rows;


// Find the form on the page so we can listen for it being submitted.
const form = document.getElementById("run-form");

// Wait for the Calculate button. This function does not run when the page
// loads — it sits idle until someone submits the form, then runs once.
form.addEventListener("submit", function (event) {
    event.preventDefault();

  // Read the boxes. These are TEXT, not numbers — hence the "Text" names.
  const lengthText = document.getElementById("length").value;
  const currentText = document.getElementById("current").value;
  const csaText = document.getElementById("csa").value;
  const supply = document.getElementById("supply").value;
  const circuit = document.getElementById("circuit").value;


  // Check every field before calculating anything. Stop at the first problem
  // found — one clear message beats a list the user has to decode.
  let problem = describeNumberProblem(lengthText, "Length");
  if (problem === "") {
    problem = describeNumberProblem(currentText, "Current");
  }
  if (problem === "") {
    problem = describeNumberProblem(csaText, "CSA");
  }

  const errorBox = document.getElementById("error");

  // A bad value stops the calculation dead. No result is better than a wrong
  // result. "return" leaves the handler immediately — nothing below it runs,
  // so no row is written and the previous results stay on screen.
  if (problem !== "") {
    errorBox.textContent = problem;
    return;
  }

  // Input is good, so clear any message left over from a previous attempt.
  errorBox.textContent = "";

  // Number() converts text into a real number, so the arithmetic behaves.
  const length = Number(lengthText);
  const current = Number(currentText);
  const csa = Number(csaText);

  // Exactly the same functions the five verified cases use. The maths lives
  // in one place; the form is just another way of feeding it.
  const voltage = getSupplyVoltage(supply);
  
    // Both methods in one call. Table 4D2B governs wherever it covers the size.
  const drop = calculateRunVoltageDrop(supply, length, current, csa, voltage);
  const volts = drop.volts;
  const percent = drop.percent;
  const result = evaluateVerdict(percent, getDropLimit(circuit));

    // --- sizing -------------------------------------------------------------
  // Answers the question the person actually has on site: what size does this
  // run need? A cable must satisfy BOTH current-carrying capacity and volt
  // drop, so the larger of the two minimums governs.
  const limit = getDropLimit(circuit);
  const headroom = calculateHeadroomPercent(percent, limit);
  const sizingNote = document.getElementById("sizing-note");

  // In is derived from Ib by default, but can be overridden. Auto-selection
  // assumes a BS EN 60898 MCB — it does not hold for BS 3036 rewireable fuses
  // (Cf 0.725) or motor circuits sized on starting current.
  const deviceText = document.getElementById("device-rating").value;
  let deviceRating = selectDeviceRating(current);
  let deviceSource = "derived";

  if (deviceText.trim() !== "") {
    const deviceProblem = describeNumberProblem(deviceText, "Device rating");
    if (deviceProblem !== "") {
      errorBox.textContent = deviceProblem;
      return;
    }
    deviceRating = Number(deviceText);
    deviceSource = "entered";
  }


  // The installation conditions, read ONCE. Used in three places below: the
  // capacity search, the Iz figure and the note. Reading once means the number
  // quoted to the person is always the number the tool actually used.
  const factors = readCorrectionFactors();

  // A BS 3036 fuse is not on the BS EN 60898 ladder, so a derived rating here
  // would be a made-up number wearing a real one's clothes. This tool does not
  // hold the BS 3036 ratings yet, so it asks instead of guessing.
  if (factors.deviceType === "bs3036" && deviceSource === "derived") {
    errorBox.textContent =
      "BS 3036 rewireable fuse selected — enter the fuse rating in the " +
      "Device rating box. This tool holds the BS EN 60898 ladder only.";
    return;
  }

  if (deviceRating === null) {
    // Ib is past the end of the device ladder this tool knows.
    sizingNote.textContent =
      `Design current ${current} A is above the largest device rating this tool ` +
      `covers (125 A). Size this run by hand.`;

  } else {
    const csaForVoltDrop = findSmallestCsaForVoltDrop(supply, length, current, voltage, limit);
    const csaForCapacity = findSmallestCsaForCapacity(deviceRating, factors.total);

    // The binding constraint is whichever demands the bigger conductor.
    let minimumCsa = null;
    let governedBy = "";

    if (csaForCapacity !== null && csaForVoltDrop !== null) {
      if (csaForCapacity >= csaForVoltDrop) {
        minimumCsa = csaForCapacity;
        governedBy = "current-carrying capacity";
      } else {
        minimumCsa = csaForVoltDrop;
        governedBy = "volt drop";
      }
    }

    let note = "";

    if (minimumCsa === null) {
      note =
        `No size up to 400 mm² satisfies both checks on this run. ` +
        `Split the circuit or size by hand. `;
    } else {
      note =
        `Minimum ${minimumCsa} mm² — governed by ${governedBy}. ` +
        `Ib ${current} A → In ${deviceRating} A (${deviceSource}) → ` +
        `It ${CURRENT_CAPACITY_A[minimumCsa]} A tabulated → ` +
        `Iz ${(CURRENT_CAPACITY_A[minimumCsa] * factors.total).toFixed(1)} A here. `;

      if (csa > minimumCsa) {
        note += `You specified ${csa} mm²; ${minimumCsa} mm² satisfies both checks. `;
      } else if (csa < minimumCsa) {
        note += `You specified ${csa} mm² — that is UNDERSIZED. `;
      }
    }

        // Plain words for the note. "bs3036" is a key, not something to show a
    // person. If/else rather than a one-liner, same as everywhere else here.
    let deviceWords = "MCB / RCBO / BS 88 fuse";
    if (factors.deviceType === "bs3036") {
      deviceWords = "BS 3036 rewireable fuse";
    }

    // The note now SHOWS ITS WORKING. Four factors and the number they
    // multiply to. A person who disagrees with the answer can see which
    // assumption to argue with, instead of arguing with the whole tool.
    note +=
      `Volt drop at ${csa} mm² is ${percent.toFixed(2)}% — ` +
      `${headroom.toFixed(0)}% of the ${limit.toFixed(1)}% allowance. ` +
      `Conditions: ${factors.ambientC} °C (Ca ${factors.ca}), ` +
      `${factors.circuitsInGroup} circuit(s) (Cg ${factors.cg}), ` +
      `${factors.insulationMm} mm in insulation (Ci ${factors.ci}), ` +
      `${deviceWords} (Cf ${factors.cf}) ` +
      `→ combined ${factors.total.toFixed(3)}. ` +
      `Sized on ${SIZING_BASIS}.`;

    sizingNote.textContent = note;
  }

  // Put the answer at the TOP of the table, above the verified cases, so the
  // newest result is the first thing the user sees.
    // Pricing is OPTIONAL. This is a volt drop calculator first: an empty price
  // box gives a volt drop answer with no cost, not an error.
  const priceText = document.getElementById("price").value;
  const currency = getPriceCurrency();
  let costCell = "—";

  if (priceText.trim() !== "") {

    // Same validator the electrical inputs use. One rule, one place.
    const priceProblem = describeNumberProblem(priceText, "Price per metre");
    if (priceProblem !== "") {
      errorBox.textContent = priceProblem;
      return;
    }

    // A dollar price needs a rate; a cedi price does not. Name the exact
    // thing that is missing rather than saying "pricing failed".
    if (currency === "USD" && lockedRate === null) {
      errorBox.textContent =
        "No rate locked — cannot price a USD figure. Refresh the rate, or enter the price in cedis.";
      return;
    }

    // Only USD is converted. A cedi price is used exactly as entered.
    let effectiveRate = 0;
    if (currency === "USD") {
      effectiveRate = calculateEffectiveRate(lockedRate, getFxAllowancePercent());
    }

    const costPesewas =
      calculateCostPesewas(Number(priceText), currency, length, effectiveRate);
    costCell = formatCedis(costPesewas);
  }

  const resultsBody = document.getElementById("results");
  resultsBody.innerHTML =
    `<tr><td>Your run — ${length} m, ${current} A, ${csa} mm²</td>` +
    `<td>${volts.toFixed(2)}</td><td>${percent.toFixed(2)}</td>` +
    `<td>${result}</td><td>${costCell}</td></tr>` +
    resultsBody.innerHTML;

  // Put the cursor back in the CSA box and select what is there, so the
  // next keystroke replaces it. Tweaking one value is the common case —
  // the form is deliberately not reset, so the other fields stay as typed.
  const csaBox = document.getElementById("csa");
  csaBox.focus();
  csaBox.select();
});


// --- live exchange rate ---------------------------------------------------

// Where the rate comes from. Open endpoint, no API key needed.
const RATE_URL = "https://open.er-api.com/v6/latest/USD";

// The locked rate for this session. null until the first successful fetch.
// ONE QUOTE, ONE RATE: every line is priced off this single number, so the
// quote foots. It is never re-fetched in the middle of a quote.
let lockedRate = null;

// When that rate was fetched. Kept so we can tell how old it is, and so it
// can be printed on the quote — a price without its rate cannot be defended.
let lockedRateFetchedAt = null;

// Fetches today's USD to GHS rate from the internet.
// "async" marks a function that has to WAIT for something. Inside it, "await"
// means: pause here, let the rest of the page carry on responding, and
// continue on this line once the answer arrives.
async function fetchUsdToGhsRate() {

  // First wait: the request goes out and the reply's headers come back.
  const response = await fetch(RATE_URL);

  // fetch() does NOT treat 404 or 500 as a failure — it only throws when the
  // request could not be made at all, such as no internet. A bad status is a
  // perfectly normal reply that happens to carry bad news, so we check it
  // ourselves. Skipping this line is how a page ends up trying to read a
  // rate out of an error page.
  if (!response.ok) {
    throw new Error("Rate service answered " + response.status);
  }

  // Second wait: reading and decoding the body. Two separate waits because
  // the headers arrive before the content does.
  const data = await response.json();
  return data.rates.GHS;
}

// A locked rate is good until the calendar date changes. toDateString() gives
// "Tue Sep 15 2026" — no time of day — so comparing two of them asks exactly
// one question: is this still the same day it was fetched?
function isRateStale() {
  if (lockedRateFetchedAt === null) {
    return true;
  }
  return lockedRateFetchedAt.toDateString() !== new Date().toDateString();
}



// Writes the current rate state onto the page in plain words. Called after
// every change, so the banner and the locked rate can never disagree.
function showRateStatus() {
  const statusBox = document.getElementById("rate-status");
  const refreshButton = document.getElementById("refresh-rate");
  const currency = getPriceCurrency();

  // Cedi prices need no rate at all — nothing to fetch, nothing to go stale,
  // and no internet required. This is the common case for a Tema supplier,
  // so it is the default. The refresh button is hidden because there is
  // nothing to refresh; a button that does nothing is a lie.
  if (currency === "GHS") {
    statusBox.textContent = "Pricing in cedis — no exchange rate needed.";
    refreshButton.hidden = true;
    return;
  }

  refreshButton.hidden = false;

  if (lockedRate === null) {
    statusBox.textContent =
      "No rate locked — USD pricing unavailable. Switch to cedis, or refresh.";
    return;
  }

  const allowance = getFxAllowancePercent();
  const effective = calculateEffectiveRate(lockedRate, allowance);
  const stamp = lockedRateFetchedAt.toLocaleString();

  // The allowance is stated ALWAYS, including at zero, with the mid-market
  // figure beside it, so the person can see exactly what was added. A margin
  // the user cannot see is a margin they will be blamed for.
  const detail =
    `1 USD = ${effective.toFixed(4)} GHS ` +
    `(mid-market ${lockedRate.toFixed(4)} + ${allowance}% FX allowance), ` +
    `locked ${stamp}. Indicative only — confirm the margin with your bank ` +
    `before you commit to a rate.`;

  if (isRateStale()) {
    statusBox.textContent = "STALE RATE — " + detail + " Refresh before quoting.";
    return;
  }

  statusBox.textContent = detail;
}

// Fetches a rate, locks it, and reports what happened on the page.
async function refreshLockedRate() {
  const statusBox = document.getElementById("rate-status");

  // Loading state. Never leave someone looking at a dead screen wondering
  // whether their click registered.
  statusBox.textContent = "Fetching today's rate…";

  // try/catch: the code in "try" runs normally. If anything inside it throws
  // — no internet, a bad status, a reply we cannot read — control jumps to
  // "catch" instead of the page dying. This one block is what keeps the volt
  // drop calculator working when the rate service does not.
  try {
    const rate = await fetchUsdToGhsRate();

    // Only overwrite the locked rate on SUCCESS. A failed refresh must never
    // destroy a rate we already have.
    lockedRate = rate;
    lockedRateFetchedAt = new Date();
    showRateStatus();

  } catch (error) {
    // Say plainly what failed and what still works. The console line is for
    // us; the page message is for the person holding the meter.
    console.log("Rate fetch failed:", error.message);

    if (lockedRate === null) {
      statusBox.textContent =
        "No rate — could not reach the rate service. Volt drop still works; pricing is unavailable.";
    } else {
      statusBox.textContent =
        `Could not refresh. Still using 1 USD = ${lockedRate} GHS from ${lockedRateFetchedAt.toLocaleString()}.`;
    }
  }
}

// NOTHING is fetched on page load. The tool opens in cedis, which needs no
// rate, so it works offline and costs nothing to open. The network is only
// touched when someone actually chooses to price in dollars.
showRateStatus();

// Refreshing is a deliberate action by the person, never automatic and never
// mid-quote. This is the "one quote, one rate" rule made physical.
document.getElementById("refresh-rate").addEventListener("click", refreshLockedRate);


// Redraw the banner whenever the allowance is typed in, so the effective rate
// on screen always matches the number the person is about to quote on.
document.getElementById("fx-allowance").addEventListener("input", showRateStatus);


// The currency decides whether a rate is needed at all. Switching to USD is
// the moment we go to the network — never on page load, because a cedi job
// should not cost anyone a byte of mobile data. An existing usable rate is
// reused rather than re-fetched: one quote, one rate.
document.getElementById("price-currency").addEventListener("change", function () {
  if (getPriceCurrency() === "USD" && (lockedRate === null || isRateStale())) {
    refreshLockedRate();
  } else {
    showRateStatus();
  }
});