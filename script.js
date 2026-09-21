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


// One verdict from both checks. A cable must pass capacity AND volt drop;
// listing every failure tells the person WHAT to fix, not just that it failed.
function combineVerdicts(voltDropResult, capacityResult, zsResult) {
  const failures = [];

  if (capacityResult === "FAIL") {
    failures.push("capacity");
  }
  if (voltDropResult === "FAIL") {
    failures.push("volt drop");
  }
  
    if (zsResult === "FAIL") {
    failures.push("Zs");
  }

  if (failures.length > 0) {
    return "FAIL (" + failures.join(", ") + ")";
  }
    const unchecked = [];

  if (capacityResult === "not checked") {
    unchecked.push("capacity");
  }
  if (zsResult === "not checked") {
    unchecked.push("Zs");
  }
  if (unchecked.length > 0) {
    return "PASS (" + unchecked.join(" and ") + " not checked)";
  }
  return "PASS";
}

// Standard copper conductor sizes, smallest first. Order matters: the search
// below walks this list and stops at the first size that passes, so the list
// must stay sorted ascending.
const STANDARD_CSA_MM2 = [1, 1.5, 2.5, 4, 6, 10, 16, 25, 35, 50, 70, 95, 120, 150, 185, 240, 300, 400];

// Current-carrying capacity It, in amperes.
// Source: BS 7671:2018+A2:2022, Appendix 4, Table 4D2A
// Cable type: Multicore 70 °C thermoplastic (PVC) insulated and sheathed,
//             non-armoured, copper conductors.
// Ambient 30 °C, no grouping, no thermal insulation.
//
// TWO dimensions now. Installation method, then core count:
//
//   A  cols 2, 3  enclosed in conduit in a thermally insulating wall
//   B  cols 4, 5  enclosed in conduit on a wall, or in trunking
//   C  cols 6, 7  clipped direct
//   E  cols 8, 9  on a perforated cable tray
//
//   singlePhase   one two-core cable
//   threePhase    one three- or four-core cable
//
// A sheds heat worst and E best, so capacity rises A → B → C → E at every
// size. That ordering is checked at load: it is what catches a whole column
// dropped into the wrong method.
const CURRENT_CAPACITY_A = {
  A: {
    singlePhase: { 1: 11, 1.5: 14, 2.5: 18.5, 4: 25, 6: 32, 10: 43, 16: 57, 25: 75, 35: 92, 50: 110, 70: 139, 95: 167, 120: 192, 150: 219, 185: 248, 240: 288, 300: 328, 400: 389 },
    threePhase:  { 1: 10, 1.5: 13, 2.5: 17.5, 4: 23, 6: 29, 10: 39, 16: 52, 25: 68, 35: 83, 50: 99, 70: 125, 95: 150, 120: 172, 150: 196, 185: 222, 240: 256, 300: 291, 400: 344 }
  },
  B: {
    singlePhase: { 1: 13, 1.5: 16.5, 2.5: 23, 4: 30, 6: 38, 10: 52, 16: 69, 25: 90, 35: 111, 50: 133, 70: 168, 95: 201, 120: 232, 150: 265, 185: 300, 240: 349, 300: 398, 400: 472 },
    threePhase:  { 1: 11.5, 1.5: 15, 2.5: 20, 4: 27, 6: 34, 10: 46, 16: 62, 25: 80, 35: 99, 50: 118, 70: 149, 95: 179, 120: 206, 150: 236, 185: 268, 240: 310, 300: 354, 400: 418 }
  },
  C: {
    singlePhase: { 1: 15, 1.5: 19.5, 2.5: 27, 4: 36, 6: 46, 10: 63, 16: 85, 25: 112, 35: 138, 50: 168, 70: 213, 95: 258, 120: 299, 150: 344, 185: 392, 240: 461, 300: 530, 400: 634 },
    threePhase:  { 1: 13.5, 1.5: 17.5, 2.5: 24, 4: 32, 6: 41, 10: 57, 16: 76, 25: 96, 35: 119, 50: 144, 70: 184, 95: 223, 120: 259, 150: 299, 185: 341, 240: 403, 300: 464, 400: 557 }
  },
  E: {
    singlePhase: { 1: 17, 1.5: 22, 2.5: 30, 4: 40, 6: 51, 10: 70, 16: 94, 25: 119, 35: 148, 50: 180, 70: 232, 95: 282, 120: 328, 150: 379, 185: 434, 240: 514, 300: 593, 400: 715 },
    threePhase:  { 1: 15, 1.5: 19.5, 2.5: 26, 4: 35, 6: 44, 10: 60, 16: 80, 25: 101, 35: 126, 50: 153, 70: 196, 95: 238, 120: 276, 150: 319, 185: 364, 240: 430, 300: 497, 400: 597 }
  }
};

// Which column this run reads. Same throw-on-unknown rule as everywhere else:
// picking the wrong column silently would be a 10% error nobody would see.
function getCapacityColumn(material, method, supplyType) {
  const columns = getConductor(material).capacity[method];

  if (columns === undefined) {
    throw new Error("Unknown installation method: " + method);
  }
  if (supplyType === "single") {
    return columns.singlePhase;
  }
  if (supplyType === "three") {
    return columns.threePhase;
  }
  throw new Error("Unknown supply type: " + supplyType);
}

// Only the part that never changes. "Reference Method C" has gone: the
// arrangement is an input now, and the note prints the one actually chosen.
const SIZING_BASIS =
  "BS 7671 Table 4D2A, multicore 70 °C thermoplastic, copper";
// The methods this tool holds, and the order of how well each one sheds heat.
// A is worst — buried in an insulating wall, nowhere for heat to go. E is best
// — open tray, air on all sides. The list is the severity order AND the list
// the guards walk, so a method added to one is added to both.
const CAPACITY_METHODS = ["A", "B", "C", "E"];

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

// Cg — grouping. Five tables, because BS 7671 does not publish one grouping
// factor: it publishes a row per ARRANGEMENT, and the arrangement follows
// the installation method.
//
// Source: BS 7671:2018+A2:2022, Appendix 4, Table 4C1
// Keyed by the number of circuits in the group, INCLUDING this one.
// One circuit is not a group, so every table starts at 1.00.
//
// Which table goes with which method:
//   Method A, B (in conduit / trunking)  → bunched
//   Method C     (clipped direct)        → clipped direct
//   Method E     (perforated tray)       → one of the three tray tables
//
// They rank the way physics says they should — more air, less derating:
//   bunched 0.50 → clipped 0.70 → tray touching 0.72 → spaced vertical 0.90
//   → spaced horizontal 1.00, at nine circuits.

// Item 1 — bunched in air, on a surface, embedded or enclosed.
// Supplied 17 Sep 2026 and parked until now: it had no capacity column to pair
// with. Methods A and B give it one.
const FACTOR_CG_BUNCHED = {
  1: 1.00,
  2: 0.80,
  3: 0.70,
  4: 0.65,
  5: 0.60,
  6: 0.57,
  7: 0.54,
  8: 0.52,
  9: 0.50
};

// Item 2 — single layer, clipped direct to a surface. Pairs with Method C.
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

// Item 3a — single layer on a perforated tray, cables TOUCHING.
const FACTOR_CG_TRAY_TOUCHING = {
  1: 1.00,
  2: 0.88,
  3: 0.82,
  4: 0.77,
  5: 0.75,
  6: 0.73,
  7: 0.73,
  8: 0.72,
  9: 0.72
};

// Item 3b — single layer on a HORIZONTAL perforated tray, cables SPACED by at
// least one cable diameter. No derating at any circuit count: with that much
// clearance the cables no longer heat each other.
//
// A factor that never bites deserves a second look, because if it were wrong
// it would be wrong in the unsafe direction. This one is as published.
const FACTOR_CG_TRAY_SPACED_HORIZONTAL = {
  1: 1.00,
  2: 1.00,
  3: 1.00,
  4: 1.00,
  5: 1.00,
  6: 1.00,
  7: 1.00,
  8: 1.00,
  9: 1.00
};

// Item 3b — same but a VERTICAL tray. Warm air rises past the cables above,
// so a vertical run derates slightly where a horizontal one does not.
const FACTOR_CG_TRAY_SPACED_VERTICAL = {
  1: 1.00,
  2: 0.98,
  3: 0.96,
  4: 0.93,
  5: 0.92,
  6: 0.91,
  7: 0.91,
  8: 0.90,
  9: 0.90
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
    // Five grouping tables now, one per arrangement. Checking them by name in a
  // loop means adding a sixth arrangement cannot quietly skip its base check —
  // the table goes in the list or it goes nowhere.
  const groupingTables = {
    "Cg bunched": FACTOR_CG_BUNCHED,
    "Cg clipped direct": FACTOR_CG_CLIPPED_DIRECT,
    "Cg tray touching": FACTOR_CG_TRAY_TOUCHING,
    "Cg tray spaced horizontal": FACTOR_CG_TRAY_SPACED_HORIZONTAL,
    "Cg tray spaced vertical": FACTOR_CG_TRAY_SPACED_VERTICAL
  };

  for (const name of Object.keys(groupingTables)) {
    if (groupingTables[name][1] !== 1.00) {
      throw new Error(name + " for one circuit must be 1.00 — one cable is no group.");
    }
  }
  if (FACTOR_CI[0] !== 1.00) {
    throw new Error("Ci with no insulation must be 1.00.");
  }
  if (FACTOR_CF.standard !== 1.00) {
    throw new Error("Cf for a standard device must be 1.00.");
  }
}

checkFactorTable("Ca", FACTOR_CA_PVC);
checkFactorTable("Cg bunched", FACTOR_CG_BUNCHED);
checkFactorTable("Cg clipped direct", FACTOR_CG_CLIPPED_DIRECT);
checkFactorTable("Cg tray touching", FACTOR_CG_TRAY_TOUCHING);
checkFactorTable("Cg tray spaced horizontal", FACTOR_CG_TRAY_SPACED_HORIZONTAL);
checkFactorTable("Cg tray spaced vertical", FACTOR_CG_TRAY_SPACED_VERTICAL);
checkFactorTable("Ci", FACTOR_CI);
checkFactorBaseConditions();


// --- installation arrangements ----------------------------------------------
// One choice that carries TWO consequences: the capacity column AND the
// grouping table.
//
// BS 7671 ties them together. Cables in conduit are bunched; cables clipped to
// a wall are a single layer; cables on a tray are a single layer with more air
// around them. Two separate inputs would let somebody pick "clipped direct"
// with "spaced on a tray", which is not a thing that exists.
//
// Same shape as the protective-device select: one choice, both consequences,
// no way for them to drift apart.
//
// Method E appears three times because "on a tray" is not enough to pick a Cg —
// touching, spaced horizontal and spaced vertical are three different rows of
// Table 4C1 sharing one capacity column.
const INSTALLATION_ARRANGEMENTS = {
  A: {
    method: "A",
    grouping: FACTOR_CG_BUNCHED,
    label: "Method A, conduit in an insulating wall (bunched)"
  },
  B: {
    method: "B",
    grouping: FACTOR_CG_BUNCHED,
    label: "Method B, conduit on a wall or trunking (bunched)"
  },
  C: {
    method: "C",
    grouping: FACTOR_CG_CLIPPED_DIRECT,
    label: "Method C, clipped direct (single layer)"
  },
  E_touching: {
    method: "E",
    grouping: FACTOR_CG_TRAY_TOUCHING,
    label: "Method E, perforated tray, touching"
  },
  E_spaced_h: {
    method: "E",
    grouping: FACTOR_CG_TRAY_SPACED_HORIZONTAL,
    label: "Method E, perforated tray, spaced, horizontal"
  },
  E_spaced_v: {
    method: "E",
    grouping: FACTOR_CG_TRAY_SPACED_VERTICAL,
    label: "Method E, perforated tray, spaced, vertical"
  }
};

function getArrangement(key) {
  const arrangement = INSTALLATION_ARRANGEMENTS[key];

  if (arrangement === undefined) {
    throw new Error("Unknown installation arrangement: " + key);
  }
  return arrangement;
}

// Guard: every arrangement must point at a capacity column that exists and a
// grouping table that is real. Adding a seventh arrangement and forgetting its
// capacity column would otherwise give undefined at calculation time, on site,
// instead of at load, here.
function checkArrangementsAreComplete() {
  for (const key of Object.keys(INSTALLATION_ARRANGEMENTS)) {
    const arrangement = INSTALLATION_ARRANGEMENTS[key];

    if (CURRENT_CAPACITY_A[arrangement.method] === undefined) {
      throw new Error(
        "Arrangement " + key + " names method " + arrangement.method +
        ", which has no capacity column");
    }
    if (arrangement.grouping === undefined || arrangement.grouping[1] !== 1.00) {
      throw new Error("Arrangement " + key + " has no usable grouping table");
    }
  }
}

checkArrangementsAreComplete();

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

// ============================================================================
// ALUMINIUM — Part A: data and guards only. Nothing reads these yet.
// Part B wires them into the sizing through a CONDUCTORS registry; until then
// the page is still copper-only and these tables just have to load clean.
// ============================================================================

// Aluminium is not tabulated below 16 mm² in Tables 4D4A/4D4B, so it gets its
// own size list. The copper list must NOT be used for aluminium: every copper
// guard walks 1 → 400, and aluminium has no 1 to 10 mm² rows to walk.
const STANDARD_CSA_AL_MM2 = [16, 25, 35, 50, 70, 95, 120, 150, 185, 240, 300, 400];

// BS 7671 Table 4D4A — multicore 70 °C thermoplastic, ALUMINIUM conductors.
// Same shape as CURRENT_CAPACITY_A: method → phase → size → amps.
// singlePhase is the two-core column, threePhase the three/four-core column.
const CURRENT_CAPACITY_AL_A = {
  A: {
    singlePhase: { 16: 44, 25: 58, 35: 71, 50: 86, 70: 108, 95: 130, 120: 150, 150: 172, 185: 195, 240: 229, 300: 263, 400: 314 },
    threePhase:  { 16: 40, 25: 53, 35: 64, 50: 77, 70: 97, 95: 117, 120: 135, 150: 155, 185: 176, 240: 207, 300: 237, 400: 282 },
  },
  B: {
    singlePhase: { 16: 53, 25: 70, 35: 86, 50: 104, 70: 131, 95: 157, 120: 182, 150: 208, 185: 236, 240: 278, 300: 319, 400: 381 },
    threePhase:  { 16: 48, 25: 62, 35: 77, 50: 92, 70: 116, 95: 139, 120: 161, 150: 184, 185: 209, 240: 246, 300: 282, 400: 336 },
  },
  C: {
    singlePhase: { 16: 66, 25: 87, 35: 107, 50: 131, 70: 166, 95: 201, 120: 233, 150: 268, 185: 306, 240: 360, 300: 413, 400: 495 },
    threePhase:  { 16: 59, 25: 75, 35: 93, 50: 112, 70: 144, 95: 174, 120: 202, 150: 233, 185: 266, 240: 315, 300: 362, 400: 435 },
  },
  E: {
    singlePhase: { 16: 73, 25: 93, 35: 115, 50: 141, 70: 181, 95: 220, 120: 256, 150: 296, 185: 339, 240: 401, 300: 463, 400: 558 },
    threePhase:  { 16: 62, 25: 79, 35: 98, 50: 119, 70: 153, 95: 186, 120: 216, 150: 249, 185: 285, 240: 336, 300: 388, 400: 467 },
  },
};

// BS 7671 Table 4D4B — voltage drop, mV/A/m, ALUMINIUM. Same r/x/z shape as
// VOLTAGE_DROP_TABLE_4D2B. Worst z deviation from √(r²+x²) is 2.27% (three-
// phase 240 mm²), inside the existing 2.5% tolerance.
const VOLTAGE_DROP_TABLE_4D4B_AL = {
  singlePhase: {
    16:  { r: 4.6,   x: 0,     z: 4.6  },
    25:  { r: 2.9,   x: 0.165, z: 2.9  },
    35:  { r: 2.1,   x: 0.16,  z: 2.1  },
    50:  { r: 1.55,  x: 0.155, z: 1.55 },
    70:  { r: 1.05,  x: 0.15,  z: 1.05 },
    95:  { r: 0.76,  x: 0.145, z: 0.77 },
    120: { r: 0.60,  x: 0.14,  z: 0.61 },
    150: { r: 0.48,  x: 0.14,  z: 0.50 },
    185: { r: 0.39,  x: 0.14,  z: 0.41 },
    240: { r: 0.30,  x: 0.135, z: 0.33 },
    300: { r: 0.24,  x: 0.135, z: 0.27 },
    400: { r: 0.185, x: 0.135, z: 0.23 },
  },
  threePhase: {
    16:  { r: 4.0,   x: 0,     z: 4.0  },
    25:  { r: 2.5,   x: 0.145, z: 2.5  },
    35:  { r: 1.80,  x: 0.14,  z: 1.80 },
    50:  { r: 1.35,  x: 0.135, z: 1.35 },
    70:  { r: 0.91,  x: 0.13,  z: 0.92 },
    95:  { r: 0.66,  x: 0.125, z: 0.67 },
    120: { r: 0.52,  x: 0.125, z: 0.53 },
    150: { r: 0.41,  x: 0.12,  z: 0.43 },
    185: { r: 0.34,  x: 0.12,  z: 0.36 },
    240: { r: 0.26,  x: 0.12,  z: 0.28 },
    300: { r: 0.21,  x: 0.115, z: 0.24 },
    400: { r: 0.160, x: 0.115, z: 0.20 },
  },
};

// Aluminium at 70 °C is about 0.0365 Ω·mm²/m — roughly 1.66 × copper. The real
// table implies 0.0360 to 0.0388 (50 mm² is the high one, in BOTH columns, so
// it is the table, not a typo). The copper window 0.020–0.024 would reject
// every row, which is why aluminium needs its own.
const RHO_IMPLIED_AL_MIN = 0.034;
const RHO_IMPLIED_AL_MAX = 0.040;

// Aluminium carries about 0.77 to 0.82 of copper's current at the same size,
// same method, same phase. The band is wider than that, but a copper column
// pasted into the aluminium slot (ratio 1.00) or a column from the wrong
// method (typically 0.6 or 1.2) lands well outside it.
const AL_TO_CU_CAPACITY_MIN = 0.72;
const AL_TO_CU_CAPACITY_MAX = 0.88;

// The copper guards above are hard-wired to STANDARD_CSA_MM2 and to
// CURRENT_CAPACITY_A / VOLTAGE_DROP_TABLE_4D2B. These versions take the size
// list and the table as arguments instead. Part B points copper at them too
// and retires the copper-only copies — one guard per rule, not one per metal.

// Coverage: every size in the list has an entry. Runs first, like copper.
function checkCoversSizes(tableName, table, sizes) {
  for (const size of sizes) {
    if (table[size] === undefined) {
      throw new Error(
        tableName + " has no entry for " + size + " mm² — " +
        "the table and its size list disagree");
    }
  }
}

// Ascending: capacity rises with size. No undefined branch here — coverage
// has already run, so there is no gap to skip.
function checkAscendsOver(columnName, column, sizes) {
  let previous = 0;
  for (const size of sizes) {
    if (!(column[size] > previous)) {
      throw new Error(
        columnName + " capacity is not ascending at " + size + " mm² — wrong table?");
    }
    previous = column[size];
  }
}

// Three-phase below single-phase, inside the same 0.80–0.95 band as copper.
// Real aluminium data: 0.837 to 0.914.
function checkCapacityPhasesAgree(label, single, three, sizes) {
  for (const size of sizes) {
    const ratio = three[size] / single[size];
    if (!(ratio >= 0.80 && ratio <= 0.95)) {
      throw new Error(
        label + " " + size + " mm²: three-phase ÷ single-phase is " +
        ratio.toFixed(4) + ", expected 0.80 to 0.95 — columns swapped?");
    }
  }
}

// Methods rank A < B < C < E, same rule as copper.
function checkMethodsRankOver(label, capacity, sizes) {
  for (const phase of ["singlePhase", "threePhase"]) {
    for (const size of sizes) {
      for (let i = 1; i < CAPACITY_METHODS.length; i++) {
        const worse = CAPACITY_METHODS[i - 1];
        const better = CAPACITY_METHODS[i];
        const lo = capacity[worse][phase][size];
        const hi = capacity[better][phase][size];
        if (!(hi > lo)) {
          throw new Error(
            label + " " + size + " mm² " + phase + ": method " + better +
            " (" + hi + " A) is not above method " + worse + " (" + lo +
            " A) — columns out of order?");
        }
      }
    }
  }
}

// Voltage drop: three-phase ÷ single-phase z near 0.866. Real aluminium data:
// 0.848 to 0.889. Same 0.82–0.91 window as copper.
function checkDropPhasesAgree(label, table, sizes) {
  for (const size of sizes) {
    const ratio = table.threePhase[size].z / table.singlePhase[size].z;
    if (!(ratio >= 0.82 && ratio <= 0.91)) {
      throw new Error(
        label + " " + size + " mm²: three-phase ÷ single-phase is " +
        ratio.toFixed(4) + ", expected about 0.866 — columns swapped?");
    }
  }
}

// Implied resistivity, checked on BOTH columns this time. Single-phase r
// carries ×2 (go and return), three-phase r carries ×√3, so:
//   single: ρ = r × A ÷ 2000        three: ρ = r × A ÷ (√3 × 1000)
// Checking both means a typo in either r column is caught, not just one.
function checkResistivityWindow(label, table, sizes, rhoMin, rhoMax) {
  const divisors = { singlePhase: 2000, threePhase: Math.sqrt(3) * 1000 };
  for (const phase of ["singlePhase", "threePhase"]) {
    for (const size of sizes) {
      const rho = table[phase][size].r * size / divisors[phase];
      if (!(rho >= rhoMin && rho <= rhoMax)) {
        throw new Error(
          label + " " + phase + " " + size + " mm²: implies ρ = " +
          rho.toFixed(5) + ", outside " + rhoMin + "–" + rhoMax + " — typo?");
      }
    }
  }
}

// NEW, and only possible now there are two metals: aluminium must carry LESS
// than copper at every size both tables share, inside the expected band.
// This is the one check that catches a whole aluminium table that is
// internally perfect but is actually copper data in the wrong slot.
function checkAluminiumBelowCopper() {
  for (const method of CAPACITY_METHODS) {
    for (const phase of ["singlePhase", "threePhase"]) {
      for (const size of STANDARD_CSA_AL_MM2) {
        const al = CURRENT_CAPACITY_AL_A[method][phase][size];
        const cu = CURRENT_CAPACITY_A[method][phase][size];
        if (cu === undefined) {
          continue; // a size copper doesn't tabulate — nothing to compare
        }
        const ratio = al / cu;
        if (!(ratio >= AL_TO_CU_CAPACITY_MIN && ratio <= AL_TO_CU_CAPACITY_MAX)) {
          throw new Error(
            "Aluminium " + method + " " + phase + " " + size + " mm²: " + al +
            " A is " + ratio.toFixed(3) + " × copper's " + cu + " A, expected " +
            AL_TO_CU_CAPACITY_MIN + " to " + AL_TO_CU_CAPACITY_MAX +
            " — copper data in the aluminium slot?");
        }
      }
    }
  }
}

// The guards run once for EVERY conductor in CONDUCTORS — see the block just
// after the registry. Aluminium no longer keeps its own copy of the run order.
// ============================================================================
// End of aluminium Part A.
// ============================================================================

// ============================================================================
// CONDUCTORS — one choice, every consequence. (Aluminium Part B.)
//
// Same idea as INSTALLATION_ARRANGEMENTS. Picking the metal changes FIVE
// things at once: the capacity table, the volt drop table, ρ, the ρ window,
// and the size list. If each lookup chose its own, one day one of them would
// be left on copper while the rest moved to aluminium — a cable sized on
// aluminium capacity and copper volt drop, and nothing on screen to say so.
// Held together here, the five cannot disagree.
// ============================================================================

// Aluminium at 70 °C, Ω·mm²/m. The mean of what Table 4D4B implies across all
// 24 cells (both columns) is 0.03654. Fallback only, exactly like copper: the
// tabulated figure governs wherever the table lists the size.
const RHO_ALUMINIUM = 0.0365;

const CONDUCTORS = {
  copper: {
    label: "copper",
    rho: RHO_COPPER,
    rhoMin: RHO_IMPLIED_MIN,
    rhoMax: RHO_IMPLIED_MAX,
    sizes: STANDARD_CSA_MM2,
    capacity: CURRENT_CAPACITY_A,
    voltageDrop: VOLTAGE_DROP_TABLE_4D2B,
    voltageDropTable: "Table 4D2B",
    sizingBasis: SIZING_BASIS,
  },
  aluminium: {
    label: "aluminium",
    rho: RHO_ALUMINIUM,
    rhoMin: RHO_IMPLIED_AL_MIN,
    rhoMax: RHO_IMPLIED_AL_MAX,
    sizes: STANDARD_CSA_AL_MM2,
    capacity: CURRENT_CAPACITY_AL_A,
    voltageDrop: VOLTAGE_DROP_TABLE_4D4B_AL,
    voltageDropTable: "Table 4D4B",
    sizingBasis: "BS 7671 Table 4D4A, multicore 70 °C thermoplastic, aluminium",
  },
};

// Same throw-on-unknown rule as every other lookup in this file. A misspelt
// material must stop the page, not quietly fall back to copper.
function getConductor(material) {
  const conductor = CONDUCTORS[material];

  if (conductor === undefined) {
    throw new Error("Unknown conductor material: " + material);
  }
  return conductor;
}

// Guard: every entry is complete, every entry holds every method the page
// offers, and each ρ constant agrees with what its OWN table implies. That
// last one is the ρ lesson made permanent: 0.018 would fail here at load.
function checkConductorsAreComplete() {
  const fields = ["label", "rho", "rhoMin", "rhoMax", "sizes", "capacity",
                  "voltageDrop", "voltageDropTable", "sizingBasis"];

  for (const key of Object.keys(CONDUCTORS)) {
    const conductor = CONDUCTORS[key];

    for (const field of fields) {
      if (conductor[field] === undefined) {
        throw new Error("Conductor " + key + " has no " + field);
      }
    }
    for (const method of CAPACITY_METHODS) {
      if (conductor.capacity[method] === undefined) {
        throw new Error("Conductor " + key + " has no capacity for method " + method);
      }
    }
    if (!(conductor.rho >= conductor.rhoMin && conductor.rho <= conductor.rhoMax)) {
      throw new Error(
        "Conductor " + key + ": ρ " + conductor.rho + " is outside " +
        conductor.rhoMin + "–" + conductor.rhoMax +
        ", the range its own volt drop table implies");
    }
  }
}

checkConductorsAreComplete();

// Every table, every metal, one run order. Each conductor brings its own size
// list, its own tables and its own ρ window, so a third metal means a registry
// entry and nothing else.
//
// This replaced six copper-only guard functions on 21 Sep 2026. They did the
// same work against hard-wired copper data: every rule existed twice, and only
// one copy was ever updated when a rule changed.
for (const materialKey of Object.keys(CONDUCTORS)) {
  const conductor = CONDUCTORS[materialKey];
  const label = conductor.label;
  const sizes = conductor.sizes;

  // Coverage runs FIRST. Every check after it can then assume every size is
  // present, instead of each one deciding what to do about a gap.
  for (const method of CAPACITY_METHODS) {
    const cols = conductor.capacity[method];

    checkCoversSizes(label + " capacity " + method + " singlePhase", cols.singlePhase, sizes);
    checkCoversSizes(label + " capacity " + method + " threePhase", cols.threePhase, sizes);
    checkAscendsOver(label + " " + method + " singlePhase", cols.singlePhase, sizes);
    checkAscendsOver(label + " " + method + " threePhase", cols.threePhase, sizes);
    checkCapacityPhasesAgree(label + " capacity " + method, cols.singlePhase, cols.threePhase, sizes);
  }
  checkMethodsRankOver(label + " capacity", conductor.capacity, sizes);

  const drop = conductor.voltageDrop;
  const dropName = conductor.voltageDropTable;

  checkCoversSizes(dropName + " singlePhase", drop.singlePhase, sizes);
  checkCoversSizes(dropName + " threePhase", drop.threePhase, sizes);
  checkImpedanceModulus(dropName + " singlePhase", drop.singlePhase);
  checkImpedanceModulus(dropName + " threePhase", drop.threePhase);
  checkDropPhasesAgree(dropName, drop, sizes);
  checkResistivityWindow(dropName, drop, sizes, conductor.rhoMin, conductor.rhoMax);
}

checkAluminiumBelowCopper();



// Which column of Table 4D2B this supply uses. Same throw-on-unknown rule as
// getPhaseFactor, and for the same reason: picking the wrong column here would
// be a 15% error nobody would ever see.
function getVoltageDropColumn(material, supplyType) {
  if (supplyType === "single") {
    return getConductor(material).voltageDrop.singlePhase;
  }
  if (supplyType === "three") {
    return getConductor(material).voltageDrop.threePhase;
  }
  throw new Error("Unknown supply type: " + supplyType);
}

// The tabulated figure for one size on one supply type, in mV/A/m.
//
// Returns z, not r — decided 17 Sep 2026. z includes reactance, which matters
// from 25 mm² upward. Below that the table gives x as zero, so z and r are the
// same number and this choice costs nothing on small cables.
function getMilliVoltsPerAmpPerMetre(material, supplyType, csa) {
  const column = getVoltageDropColumn(material, supplyType);
  const row = column[csa];

  if (row === undefined) {
    throw new Error(getConductor(material).voltageDropTable + " has no entry for " + csa + " mm²");
  }
  return row.z;
}

// Volt drop by the tabulated method, in volts.
//
// Two things make this shorter than it looks. The table is in MILLIvolts, so
// divide by 1000. And there is NO phase factor here — no 2, no 1.732 — because
// the published number already contains it. Applying it again is the classic
// way to double a volt drop and never notice.
function calculateTabulatedVoltageDrop(material, supplyType, lengthMetres, current, csa) {
  const mvPerAmpPerMetre = getMilliVoltsPerAmpPerMetre(material, supplyType, csa);

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
function getGroupingFactor(circuitsInGroup, groupingTable) {
  // The table is passed IN rather than picked here. There are five of them and
  // only the arrangement knows which one applies, so this function does the
  // lookup and nothing else.
  const factor = groupingTable[circuitsInGroup];

  if (factor === undefined) {
    throw new Error(
      "No Cg value for " + circuitsInGroup + " circuits in this arrangement");
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
  // The arrangement is read FIRST, because it decides which grouping table the
  // Cg lookup is even allowed to use.
  const arrangementKey = document.getElementById("installation").value;
  const arrangement = getArrangement(arrangementKey);

  const ambientC = Number(document.getElementById("ambient").value);
  const circuitsInGroup = Number(document.getElementById("circuits-in-group").value);
  const insulationMm = Number(document.getElementById("insulation-mm").value);
  const deviceType = document.getElementById("device-type").value;

  const ca = getAmbientFactor(ambientC);
  const cg = getGroupingFactor(circuitsInGroup, arrangement.grouping);
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
    deviceType: deviceType,

    // The arrangement travels with the factors, so the capacity search and the
    // note both use the method that chose the Cg — they cannot disagree.
    arrangementKey: arrangementKey,
    method: arrangement.method,
    arrangementLabel: arrangement.label
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


// ============================================================================
// EARTH FAULT LOOP IMPEDANCE — Part A: data and guards only.
// Nothing reads these yet. Part B does the calculation, Part C the page.
// ============================================================================

// U0 — the nominal voltage line to EARTH, not line to line. 230 V on both a
// single-phase supply and a 415 V three-phase one, because a fault to earth
// is a line-to-earth event on one phase. Never use 415 here.
const NOMINAL_U0_VOLTS = 230;

// The voltage factor applied to the Zs limits.
//
// 1.00 because that is what the book in use prints: Table 41.3 gives 7.67 Ω
// at 6 A, 1.44 Ω at 32 A and 0.73 Ω at 63 A for Type B, which is exactly
// U0 ÷ (5 × In) with no factor applied. Read from the printed table and
// confirmed 21 Sep 2026.
//
// KEPT AS A CONSTANT ON PURPOSE. BS 7671:2018+A2:2022 is understood to apply
// Cmin = 0.95, which would make every limit here about 5% lower — 1.37 Ω at
// 32 A rather than 1.44 Ω. Lower is the SAFER figure. If a later check of the
// amendment shows the 0.95 basis applies to this installation, this one line
// changes and all 39 limits move together.
const CMIN = 1.00;

// The measured-value rule of thumb: an instrument reading taken at ambient
// temperature must not exceed 0.8 × the tabulated limit, because the tabulated
// limit is for a conductor at its operating temperature, which is hotter and
// therefore higher-resistance than the one being tested.
const MEASURED_ZS_FACTOR = 0.8;

// (R1 + R2) is tabulated at 20 °C; a fault happens with the cable already at
// its operating temperature. 1.20 is the multiplier for 70 °C thermoplastic.
// It belongs to the INSULATION, not to the metal — 90 °C thermosetting (XLPE)
// has a different figure, and XLPE is still parked. One insulation, one value,
// said out loud rather than buried in the arithmetic.
const FAULT_TEMPERATURE_FACTOR = 1.20;

// The device types this tool holds, and what makes them different: the
// multiple of In at which the magnetic trip operates instantaneously.
//
// One entry, both consequences — the multiplier and the label travel together,
// so a type can never be added with a name but no Ia.
//
// Each figure is the TOP of the published band (B is 3–5, C is 5–10,
// D is 10–20). The top of the band is the conservative choice: it is the
// worst case the breaker is permitted to need before it trips.
const DEVICE_TYPES = {
  B: { iaMultiplier: 5,  label: "Type B MCB / RCBO" },
  C: { iaMultiplier: 10, label: "Type C MCB / RCBO" },
  D: { iaMultiplier: 20, label: "Type D MCB / RCBO" },
};

function getDeviceType(typeCode) {
  const deviceType = DEVICE_TYPES[typeCode];

  if (deviceType === undefined) {
    throw new Error("Unknown device type: " + typeCode);
  }
  return deviceType;
}

// The maximum Zs for one device, in ohms. COMPUTED, not looked up.
//
//     Zs_max = (CMIN × U0) ÷ (Ia multiplier × In)
//
// Computing it rather than storing 39 numbers means: no rating can be missing,
// no limit can be rounded the wrong way, and the safety basis is one line a
// person can argue with instead of a number buried in a table.
function calculateMaxZs(typeCode, deviceRating) {
  if (!(deviceRating > 0)) {
    throw new Error("Device rating must be above zero, got " + deviceRating);
  }
  const ia = getDeviceType(typeCode).iaMultiplier * deviceRating;

  return (CMIN * NOMINAL_U0_VOLTS) / ia;
}

// The published table, held ONLY to check the formula against. Nothing reads
// these values in a calculation — they are the second source, exactly as
// Table 4D2B was the second source for ρ.
// BS 7671:2018+A2:2022 Table 41.3, transcribed 21 Sep 2026.
const SUPPLIED_MAX_ZS_41_3 = {
  B: { 3: 15.33, 6: 7.67, 10: 4.60, 16: 2.87, 20: 2.30, 25: 1.84, 32: 1.44,
       40: 1.15, 50: 0.92, 63: 0.73, 80: 0.57, 100: 0.46, 125: 0.37 },
  C: { 3: 7.67, 6: 3.83, 10: 2.30, 16: 1.44, 20: 1.15, 25: 0.92, 32: 0.72,
       40: 0.57, 50: 0.46, 63: 0.36, 80: 0.29, 100: 0.23, 125: 0.18 },
  D: { 3: 3.83, 6: 1.92, 10: 1.15, 16: 0.72, 20: 0.57, 25: 0.46, 32: 0.36,
       40: 0.29, 50: 0.23, 63: 0.18, 80: 0.14, 100: 0.11, 125: 0.09 },
};

// The table is printed to two decimal places, so a value may sit half a unit
// in the last place away from the exact figure — 0.005. The published 63 A
// Type C value is rounded DOWN from 0.3651 to 0.36, which is 0.0051 away, so
// the tolerance is 0.006. Anything further apart is not rounding.
const ZS_TABLE_TOLERANCE_OHMS = 0.006;

// Guard 1: the formula must reproduce the published table at every rating of
// every type. 39 independent checks on one line of arithmetic. If CMIN is ever
// changed without the table being changed too, all 39 fail at once — which is
// the intention: the two must move together or be argued about.
function checkMaxZsMatchesPublishedTable() {
  for (const typeCode of Object.keys(SUPPLIED_MAX_ZS_41_3)) {
    const published = SUPPLIED_MAX_ZS_41_3[typeCode];

    for (const rating of Object.keys(published)) {
      const computed = calculateMaxZs(typeCode, Number(rating));
      const gap = Math.abs(computed - published[rating]);

      if (gap > ZS_TABLE_TOLERANCE_OHMS) {
        throw new Error(
          "Zs Type " + typeCode + " " + rating + " A: formula gives " +
          computed.toFixed(4) + " but Table 41.3 prints " + published[rating] +
          " — the formula and the table disagree");
      }
    }
  }
}

// Guard 2: every rating this tool can select must have a limit. The device
// ladder and the Zs data have to agree about which devices exist, the same
// rule as the capacity tables and the size lists.
function checkZsCoversDeviceLadder() {
  for (const typeCode of Object.keys(DEVICE_TYPES)) {
    for (const rating of STANDARD_DEVICE_RATINGS_A) {
      const limit = calculateMaxZs(typeCode, rating);

      if (!(limit > 0)) {
        throw new Error(
          "Zs Type " + typeCode + " " + rating + " A: no usable limit");
      }
      if (SUPPLIED_MAX_ZS_41_3[typeCode][rating] === undefined) {
        throw new Error(
          "Zs Type " + typeCode + ": the device ladder offers " + rating +
          " A but Table 41.3 as transcribed has no such row");
      }
    }
  }
}

// Guard 3: the types must rank D < C < B at every rating. A bigger Ia needs a
// lower impedance to reach it, so a Type D limit is always the tightest. This
// catches two type tables swapped even when each is internally perfect.
function checkDeviceTypesRankCorrectly() {
  for (const rating of STANDARD_DEVICE_RATINGS_A) {
    const b = calculateMaxZs("B", rating);
    const c = calculateMaxZs("C", rating);
    const d = calculateMaxZs("D", rating);

    if (!(d < c && c < b)) {
      throw new Error(
        "Zs " + rating + " A: expected D < C < B, got " + d.toFixed(3) +
        ", " + c.toFixed(3) + ", " + b.toFixed(3));
    }
  }
}

// Conductor resistance at 20 °C, in mΩ per metre.
// Source: IET On-Site Guide Table I1 / BS 7671 Appendix 3, supplied 21 Sep 2026.
//
// R1 + R2 is NOT stored. It is r1 + r2, added when needed: storing the sums
// would be the same numbers twice, and any combination of line and CPC size
// works rather than only the pairs somebody listed.
const RESISTANCE_PER_METRE_20C = {
  copper: {
    1: 18.10, 1.5: 12.10, 2.5: 7.41, 4: 4.61, 6: 3.08, 10: 1.83, 16: 1.15,
    25: 0.727, 35: 0.524, 50: 0.387, 70: 0.268, 95: 0.193, 120: 0.153,
    150: 0.124, 185: 0.0991, 240: 0.0754, 300: 0.0601, 400: 0.0470,
  },
  aluminium: {
    16: 1.91, 25: 1.20, 35: 0.868, 50: 0.641, 70: 0.443, 95: 0.320,
    120: 0.253, 150: 0.206, 185: 0.164, 240: 0.125, 300: 0.100, 400: 0.0778,
  },
};

// The resistivity these figures imply at 20 °C, in Ω·mm²/m ÷ 1000. Copper
// lands near 18.3 and aluminium near 30.4. The windows are wide enough for
// the real scatter between stranding classes and tight enough to catch a
// misplaced decimal point.
const RHO_20C_WINDOWS = {
  copper: { min: 17.5, max: 19.5 },
  aluminium: { min: 29.0, max: 33.0 },
};

// How closely the 20 °C table, warmed by FAULT_TEMPERATURE_FACTOR, has to
// agree with the 70 °C ρ already in CONDUCTORS. Checked on the MEAN, because
// individual sizes scatter by a few percent but the whole column cannot.
const RHO_CROSS_CHECK_PERCENT = 3.0;

// Guard 4: coverage. Each metal's resistance table must hold every size that
// metal is tabulated in — the same size list its capacity table walks.
function checkResistanceCoversSizes() {
  for (const material of Object.keys(RESISTANCE_PER_METRE_20C)) {
    checkCoversSizes(
      "resistance at 20 °C, " + material,
      RESISTANCE_PER_METRE_20C[material],
      getConductor(material).sizes);
  }
}

// Guard 5: resistance must FALL as the conductor gets bigger, and the
// resistivity each row implies must sit inside its metal's window.
function checkResistanceFallsAndIsSensible() {
  for (const material of Object.keys(RESISTANCE_PER_METRE_20C)) {
    const table = RESISTANCE_PER_METRE_20C[material];
    const window = RHO_20C_WINDOWS[material];
    let previous = Infinity;

    for (const size of getConductor(material).sizes) {
      if (!(table[size] < previous)) {
        throw new Error(
          "Resistance " + material + " " + size + " mm²: " + table[size] +
          " mΩ/m is not below the smaller size — wrong table?");
      }
      previous = table[size];

      const rho20 = table[size] * size;

      if (!(rho20 >= window.min && rho20 <= window.max)) {
        throw new Error(
          "Resistance " + material + " " + size + " mm²: implies ρ at 20 °C = " +
          rho20.toFixed(2) + ", outside " + window.min + "–" + window.max +
          " — typo?");
      }
    }
  }
}

// Guard 6: the two temperatures must describe the same metal.
//
// This is the strongest check in the set, and the reason it exists is that it
// already paid: the 20 °C table came from the On-Site Guide, ρ at 70 °C came
// from Table 4D2B weeks earlier, and 18.3 × 1.2 = 21.96 against 22.0 for
// copper — two unrelated sources agreeing to within half a percent. An error
// in either one breaks that agreement.
function checkResistanceAgreesWithOperatingRho() {
  for (const material of Object.keys(RESISTANCE_PER_METRE_20C)) {
    const table = RESISTANCE_PER_METRE_20C[material];
    const sizes = getConductor(material).sizes;
    let total = 0;

    for (const size of sizes) {
      total += table[size] * size;
    }

    const meanRho20 = total / sizes.length;
    const warmed = meanRho20 * FAULT_TEMPERATURE_FACTOR / 1000;
    const operating = getConductor(material).rho;
    const deviation = Math.abs(warmed - operating) / operating * 100;

    if (deviation > RHO_CROSS_CHECK_PERCENT) {
      throw new Error(
        "Resistance " + material + ": 20 °C table warmed by " +
        FAULT_TEMPERATURE_FACTOR + " implies ρ = " + warmed.toFixed(5) +
        ", but CONDUCTORS holds " + operating + " — " +
        deviation.toFixed(1) + "% apart");
    }
  }
}

// The earthing arrangements, and what each one means for this check.
//
// supported:false is a REFUSAL, not a gap. On a TT system the disconnection
// requirement is met by an RCD (RA × IΔn ≤ 50 V), not by the breaker's Zs
// limit. Judging a TT installation against a Type B Zs limit would fail
// nearly every real one and teach the user to ignore the tool.
//
// The Ze figures are UK DNO DESIGN LIMITS. On ECG's network they are a
// starting assumption and nothing more: Ze is measured at the origin, and the
// output says whether the figure used was measured or assumed.
const EARTHING_SYSTEMS = {
  TN_S: {
    code: "TN-S",
    label: "TN-S — separate earth conductor back to the transformer",
    typicalZe: 0.80,
    supported: true,
    refusal: "",
  },
  TN_C_S: {
    code: "TN-C-S",
    label: "TN-C-S (PME) — combined neutral and earth on the supply network",
    typicalZe: 0.35,
    supported: true,
    refusal: "",
  },
  TT: {
    code: "TT",
    label: "TT — earth electrode installation",
    typicalZe: 21.0,
    supported: false,
    refusal: "TT relies on an RCD, not on the breaker's Zs limit " +
             "(RA × IΔn ≤ 50 V). This tool does not hold that check yet — " +
             "size the earth electrode and RCD by hand.",
  },
};

function getEarthingSystem(code) {
  const system = EARTHING_SYSTEMS[code];

  if (system === undefined) {
    throw new Error("Unknown earthing arrangement: " + code);
  }
  return system;
}

// Guard 7: every arrangement is complete, and an unsupported one carries the
// message that will be shown. A refusal with no words is a dead end.
function checkEarthingSystemsAreComplete() {
  for (const key of Object.keys(EARTHING_SYSTEMS)) {
    const system = EARTHING_SYSTEMS[key];

    for (const field of ["code", "label", "typicalZe", "supported", "refusal"]) {
      if (system[field] === undefined) {
        throw new Error("Earthing arrangement " + key + " has no " + field);
      }
    }
    if (!(system.typicalZe > 0)) {
      throw new Error(
        "Earthing arrangement " + key + ": typical Ze must be above zero");
    }
    if (system.supported === false && system.refusal === "") {
      throw new Error(
        "Earthing arrangement " + key + " is unsupported but has no message");
    }
  }
}

checkMaxZsMatchesPublishedTable();
checkZsCoversDeviceLadder();
checkDeviceTypesRankCorrectly();
checkResistanceCoversSizes();
checkResistanceFallsAndIsSensible();
checkResistanceAgreesWithOperatingRho();
checkEarthingSystemsAreComplete();
// ============================================================================
// End of earth fault loop impedance Part A.
// ============================================================================


// ============================================================================
// ADIABATIC CPC CHECK — Part A: data and guards only.
// Zs asks whether the CPC is big enough to make the device TRIP. This asks
// whether it SURVIVES the fault current while the device is tripping. A CPC
// can pass one and fail the other.
// ============================================================================

//     S ≥ √(I² × t) ÷ k
//
// t is the disconnection time. For an MCB tripping on its magnetic element the
// real time is a few milliseconds, not the 0.4 s of Reg 411.3.2.2 — using 0.4 s
// would demand a CPC several times too big and the tool would be ignored.
// 0.1 s is the working convention, and below that BS 7671 says to use the
// manufacturer's let-through energy (I²t) instead of this formula at all.
//
// So: an INPUT, defaulting to 0.1 s, with the note printing the value used and
// saying where a better figure comes from.
const ADIABATIC_TIME_DEFAULT_S = 0.1;

// One entry per real CPC arrangement. Not three nested groups with three
// different shapes: the arrangement is ONE choice, and it decides the metal,
// the k, and the temperatures k was derived at, which travel together.
//
// initialC is where the conductor starts (hotter if it is inside the cable,
// carrying its share of the load) and finalC is the highest temperature the
// insulation around it may reach.
const CPC_TYPES = {
  separate_pvc_cu:   { label: "separate copper CPC, PVC insulated",      material: "copper",    k: 143, initialC: 30, finalC: 160, checkable: true },
  separate_xlpe_cu:  { label: "separate copper CPC, thermosetting",      material: "copper",    k: 176, initialC: 30, finalC: 250, checkable: true },
  separate_bare_cu:  { label: "separate copper CPC, bare and visible",   material: "copper",    k: 228, initialC: 30, finalC: 500, checkable: true },
  separate_pvc_al:   { label: "separate aluminium CPC, PVC insulated",   material: "aluminium", k: 95,  initialC: 30, finalC: 160, checkable: true },
  separate_xlpe_al:  { label: "separate aluminium CPC, thermosetting",   material: "aluminium", k: 116, initialC: 30, finalC: 250, checkable: true },
  separate_bare_al:  { label: "separate aluminium CPC, bare and visible", material: "aluminium", k: 152, initialC: 30, finalC: 500, checkable: true },
  separate_pvc_st:   { label: "separate steel CPC, PVC insulated",       material: "steel",     k: 52,  initialC: 30, finalC: 160, checkable: true },
  separate_xlpe_st:  { label: "separate steel CPC, thermosetting",       material: "steel",     k: 64,  initialC: 30, finalC: 250, checkable: true },
  separate_bare_st:  { label: "separate steel CPC, bare and visible",    material: "steel",     k: 82,  initialC: 30, finalC: 500, checkable: true },
  in_cable_pvc_cu:   { label: "copper CPC in a 70 °C PVC cable",         material: "copper",    k: 115, initialC: 70, finalC: 160, checkable: true },
  in_cable_xlpe_cu:  { label: "copper CPC in a 90 °C thermosetting cable", material: "copper",  k: 143, initialC: 90, finalC: 250, checkable: true },
  in_cable_pvc_al:   { label: "aluminium CPC in a 70 °C PVC cable",      material: "aluminium", k: 76,  initialC: 70, finalC: 160, checkable: true },
  in_cable_xlpe_al:  { label: "aluminium CPC in a 90 °C thermosetting cable", material: "aluminium", k: 94, initialC: 90, finalC: 250, checkable: true },

  // Table 54.4. checkable:false, and the reason is in checkKFactorsAgainstPhysics
  // below — it is NOT laziness, it is that no single constant reproduces both
  // armour rows, so this tool cannot verify them. They are transcribed only.
  armour_pvc:        { label: "steel wire armour on a 70 °C PVC cable",  material: "steel",     k: 51,  initialC: 60, finalC: 160, checkable: false },
  armour_xlpe:       { label: "steel wire armour on a 90 °C XLPE cable", material: "steel",     k: 46,  initialC: 80, finalC: 200, checkable: false },
};

function getCpcType(typeCode) {
  const cpcType = CPC_TYPES[typeCode];

  if (cpcType === undefined) {
    throw new Error("Unknown CPC type: " + typeCode);
  }
  return cpcType;
}

// k comes from the conductor's own material properties:
//
//     k = K0 × √( ln( (β + θf) ÷ (β + θi) ) )
//
// K0 gathers the heat capacity and resistivity of the metal; β is the inverse
// of its temperature coefficient. Both are constants of the METAL, so one pair
// per metal reproduces every row that metal appears in, at any temperature.
const K_CONSTANTS = {
  copper:    { k0: 226, beta: 234.5 },
  aluminium: { k0: 148, beta: 228 },
  steel:     { k0: 78,  beta: 202 },
};

// The thirteen conductor rows reproduce to within 0.8%, so 3% passes the real
// rounding and catches a mistyped digit or a k filed against the wrong
// temperature pair.
const K_TOLERANCE_PERCENT = 3.0;

// Guard 1: every checkable k must follow from its own temperature pair.
//
// This is the strongest check available on this data: it does not compare the
// table with itself, it derives each value from physics and the temperatures
// the book prints beside it.
//
// The two armour rows are EXCLUDED and this is said out loud rather than
// quietly skipped. No single β reproduces both 51 at 60→160 and 46 at 80→200,
// so the armour figures are transcribed on the book's authority alone. If a
// wrong k is ever typed into those two rows, nothing here will catch it.
function checkKFactorsAgainstPhysics() {
  for (const code of Object.keys(CPC_TYPES)) {
    const cpcType = CPC_TYPES[code];

    if (cpcType.checkable === false) {
      continue;
    }

    const constants = K_CONSTANTS[cpcType.material];

    if (constants === undefined) {
      throw new Error("CPC type " + code + ": no k constants for " + cpcType.material);
    }
    if (!(cpcType.finalC > cpcType.initialC)) {
      throw new Error(
        "CPC type " + code + ": final temperature " + cpcType.finalC +
        " °C is not above the initial " + cpcType.initialC + " °C");
    }

    const computed = constants.k0 * Math.sqrt(
      Math.log((constants.beta + cpcType.finalC) / (constants.beta + cpcType.initialC)));
    const deviation = Math.abs(computed - cpcType.k) / cpcType.k * 100;

    if (deviation > K_TOLERANCE_PERCENT) {
      throw new Error(
        "CPC type " + code + ": k is " + cpcType.k + " but " +
        cpcType.initialC + "→" + cpcType.finalC + " °C gives " +
        computed.toFixed(1) + " — " + deviation.toFixed(1) + "% apart");
    }
  }
}

// Guard 2: a CPC that starts COLD can absorb more before it reaches the same
// final temperature, so a separate conductor must have a higher k than the
// same metal inside a cable. This catches the two groups being swapped, which
// the physics check alone would not: both would still be internally correct.
function checkSeparateCpcBeatsInCable() {
  const pairs = [
    ["separate_pvc_cu", "in_cable_pvc_cu"],
    ["separate_xlpe_cu", "in_cable_xlpe_cu"],
    ["separate_pvc_al", "in_cable_pvc_al"],
    ["separate_xlpe_al", "in_cable_xlpe_al"],
  ];

  for (const pair of pairs) {
    const separate = getCpcType(pair[0]);
    const inCable = getCpcType(pair[1]);

    if (!(separate.k > inCable.k)) {
      throw new Error(
        "CPC k: " + pair[0] + " (" + separate.k + ") is not above " +
        pair[1] + " (" + inCable.k + ") — groups swapped?");
    }
  }
}

// Guard 3: every entry is complete. A missing label or metal is a page that
// prints "undefined" at somebody on site.
function checkCpcTypesAreComplete() {
  for (const code of Object.keys(CPC_TYPES)) {
    const cpcType = CPC_TYPES[code];

    for (const field of ["label", "material", "k", "initialC", "finalC", "checkable"]) {
      if (cpcType[field] === undefined) {
        throw new Error("CPC type " + code + " has no " + field);
      }
    }
    if (!(cpcType.k > 0)) {
      throw new Error("CPC type " + code + ": k must be above zero");
    }
  }
}

checkCpcTypesAreComplete();
checkKFactorsAgainstPhysics();
checkSeparateCpcBeatsInCable();
// ============================================================================
// End of adiabatic Part A.
// ============================================================================


// The prospective earth fault current, in amperes: I = U0 ÷ Zs.
//
// The same Zs the loop check produced, so the two answers cannot be based on
// different circuits. A low Zs is GOOD for disconnection and HARD on the CPC:
// the closer the supply, the more current a fault draws through it.
function calculateEarthFaultCurrent(zsOhms) {
  if (!(zsOhms > 0)) {
    throw new Error("Zs must be above zero, got " + zsOhms);
  }
  return NOMINAL_U0_VOLTS / zsOhms;
}

// The smallest CPC that survives the fault, in mm²:
//
//     S = √(I² × t) ÷ k
//
// This is the adiabatic equation: "adiabatic" because it assumes ALL the heat
// stays in the conductor for the duration of the fault — none escapes into the
// insulation or the air. That is pessimistic, deliberately: a fault is over
// long before heat has time to go anywhere.
//
// It returns a raw size, not a standard one. The caller compares it with the
// CPC actually installed; rounding up to a standard size is a separate step.
function calculateAdiabaticCsa(faultCurrentA, timeSeconds, k) {
  if (!(faultCurrentA > 0)) {
    throw new Error("Fault current must be above zero, got " + faultCurrentA);
  }
  if (!(timeSeconds > 0)) {
    throw new Error("Disconnection time must be above zero, got " + timeSeconds);
  }
  if (!(k > 0)) {
    throw new Error("k must be above zero, got " + k);
  }
  return Math.sqrt(faultCurrentA * faultCurrentA * timeSeconds) / k;
}

// The let-through energy the INSTALLED CPC can take, in A²s: rearranging the
// same equation for I²t gives (k × S)².
//
// This is the number that resolves a failure. When the tool says a 2.5 mm² CPC
// is too small at t = 0.1 s, it is really saying "this fault delivers more
// energy than 2.5 mm² can absorb" — and the breaker's published let-through
// energy is usually far lower than the assumption, because a real device
// current-limits instead of holding the fault for a tenth of a second.
function calculateLetThroughCapacity(csa, k) {
  return (k * csa) * (k * csa);
}

// Does the CPC survive? Returns the working, not a verdict — same rule as
// calculateZs: the page has to be able to show which number to argue with.
function evaluateAdiabatic(zsOhms, timeSeconds, cpcTypeCode, cpcCsa) {
  const cpcType = getCpcType(cpcTypeCode);
  const faultCurrent = calculateEarthFaultCurrent(zsOhms);
  const requiredCsa = calculateAdiabaticCsa(faultCurrent, timeSeconds, cpcType.k);

  return {
    faultCurrent: faultCurrent,
    timeSeconds: timeSeconds,
    k: cpcType.k,
    cpcLabel: cpcType.label,
    requiredCsa: requiredCsa,
    installedCsa: cpcCsa,
    letThroughLimit: calculateLetThroughCapacity(cpcCsa, cpcType.k),
    passes: cpcCsa >= requiredCsa
  };
}
// One resistance, at 20 °C, in mΩ per metre. A lookup, so it THROWS on a size
// the metal is not tabulated in — the same rule as every other lookup here.
// A person typing an impossible CPC size is caught on the page, before this.
function getResistancePerMetre(material, csa) {
  const table = RESISTANCE_PER_METRE_20C[material];

  if (table === undefined) {
    throw new Error("No resistance table for " + material);
  }
  if (table[csa] === undefined) {
    throw new Error(
      "No " + material + " resistance for " + csa + " mm² at 20 °C");
  }
  return table[csa];
}

// The earth fault loop for one circuit, and whether it is inside the limit.
//
//     Zs = Ze + (R1 + R2)
//
// Ze is what the supply brings to the origin. (R1 + R2) is this circuit's own
// line conductor and CPC — the fault current goes out on one and back on the
// other, which is why both are in the loop and why the CPC size matters as
// much as the line size.
//
// The table is at 20 °C and a fault happens with the cable at its operating
// temperature, so the CIRCUIT part is warmed by FAULT_TEMPERATURE_FACTOR.
// Ze is NOT warmed: it is measured at the origin as it stands.
//
// Returns an object, not a verdict, because the page has to show the working:
// a person who disagrees with the answer needs to see which number to argue
// with. Nothing here is rounded — rounding happens at display only.
function calculateZs(lineMaterial, cpcMaterial, lineCsa, cpcCsa, lengthMetres, zeOhms, deviceTypeCode, deviceRating) {
  if (!(lengthMetres > 0)) {
    throw new Error("Length must be above zero, got " + lengthMetres);
  }
  if (!(zeOhms >= 0)) {
    throw new Error("Ze must be zero or above, got " + zeOhms);
  }

  const r1 = getResistancePerMetre(lineMaterial, lineCsa);
  const r2 = getResistancePerMetre(cpcMaterial, cpcCsa);

  // mΩ/m × m gives mΩ, so divide by 1000 for ohms.
  const circuitOhms =
    ((r1 + r2) * FAULT_TEMPERATURE_FACTOR * lengthMetres) / 1000;

  const zs = zeOhms + circuitOhms;
  const maxZs = calculateMaxZs(deviceTypeCode, deviceRating);

  return {
    ze: zeOhms,
    r1PlusR2PerMetre: r1 + r2,
    temperatureFactor: FAULT_TEMPERATURE_FACTOR,
    circuitOhms: circuitOhms,
    zs: zs,
    maxZs: maxZs,
    measuredMaxZs: maxZs * MEASURED_ZS_FACTOR,
    passes: zs <= maxZs,
    marginOhms: maxZs - zs
  };
}

// The smallest listed size that can carry the device rating ONCE the
// installation conditions are accounted for.
//
// The factors do not shrink the cable. They inflate the requirement:
//     It_required = In / (Ca × Cg × Ci × Cf)
// A 32 A device in conditions worth 0.6525 needs a cable TABULATED at 49.0 A,
// because in those conditions a 49.0 A cable really only carries 32 A.
function findSmallestCsaForCapacity(material, deviceRating, correctionTotal, supplyType, installationMethod) {
// Written as "not greater than zero" rather than "less than or equal to
  // zero" on purpose. Every comparison against NaN is false, so NaN <= 0 is
  // false and a NaN would slip straight through. !(NaN > 0) is true, so this
  // form catches zero, negatives AND NaN. Dividing by any of them would
  // return a confident wrong size instead of stopping.
  if (!(correctionTotal > 0)) {
    throw new Error("Correction factor must be above zero, got " + correctionTotal);
  }

  // A three-core cable carries LESS than a two-core of the same size: three
  // loaded conductors in one sheath make more heat with nowhere to go. Reading
  // the two-core column for a three-phase run over-states the capacity, which
  // permits a conductor that is too small.
  const column = getCapacityColumn(material, installationMethod, supplyType);

  const requiredTabulatedCurrent = deviceRating / correctionTotal;

  for (const candidate of getConductor(material).sizes) {
    const capacity = column[candidate];

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
  return (percent / limit) * 100;
}


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
function calculateRunVoltageDrop(material, supplyType, lengthMetres, current, csa, supplyVoltage) {
  const resistance = calculateConductorResistance(getConductor(material).rho, lengthMetres, csa);
  const resistivityVolts =
    calculateVoltageDrop(getPhaseFactor(supplyType), resistance, current);

  // Is this size in the table? Every standard size is. A non-standard CSA
  // typed by hand — 3 mm², say — is not, and falls back to the formula.
  const column = getVoltageDropColumn(material, supplyType);
  const isTabulated = column[csa] !== undefined;

  let tabulatedVolts = null;
  let volts = resistivityVolts;
  let source = "resistivity";

  if (isTabulated) {
    tabulatedVolts =
      calculateTabulatedVoltageDrop(material, supplyType, lengthMetres, current, csa);
    volts = tabulatedVolts;
    source = getConductor(material).voltageDropTable;
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
function findSmallestCsaForVoltDrop(material, supplyType, lengthMetres, current, supplyVoltage, limit) {
  for (const candidate of getConductor(material).sizes) {

       // Exactly the same function the real calculation uses, so the size this
    // search recommends is judged by the rule the answer is judged by. If the
    // search used a different method from the verdict, the tool could recommend
    // a size and then fail it.
    const drop = calculateRunVoltageDrop(material, supplyType, lengthMetres, current, candidate, supplyVoltage);
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
  { name: "Case 1", length: 25,  current: 32, csa: 6,   supply: "single", voltage: 230, material: "copper", circuit: "power" },
  { name: "Case 2", length: 35,  current: 45, csa: 10,  supply: "single", voltage: 230, material: "copper", circuit: "power" },
  { name: "Case 3", length: 70,  current: 32, csa: 2.5, supply: "single", voltage: 230, material: "copper", circuit: "lighting" },
  { name: "Case 4", length: 100, current: 20, csa: 10,  supply: "three",  voltage: 415, material: "copper", circuit: "power" },
  { name: "Case 5", length: 150, current: 10, csa: 10,  supply: "three",  voltage: 415, material: "copper", circuit: "power" },
  { name: "Case 6", length: 200, current: 15, csa: 16,  supply: "single", voltage: 230, material: "copper", circuit: "power" },
  { name: "Case 7", length: 80,  current: 100, csa: 70, supply: "three",  voltage: 415, material: "aluminium", circuit: "power" },
];

let rows = "";

for (const run of cases) {
  const resistance = calculateConductorResistance(getConductor(run.material).rho, run.length, run.csa);
  const volts = calculateVoltageDrop(getPhaseFactor(run.supply), resistance, run.current);
  const percent = calculateDropPercent(volts, run.voltage);
  const result = evaluateVerdict(percent, getDropLimit(run.circuit));
    console.log(`${run.name}: ${volts.toFixed(2)} V | ${percent.toFixed(2)} % | ${result}   resistivity`);

  // THE CROSS-CHECK. Two independent routes to the same physical number: your
  // resistivity formula, and the figure BS 7671 publishes. They should agree.
  // Where they do not, one of them is wrong, and the gap says by how much.
  const tabVolts = calculateTabulatedVoltageDrop(run.material, run.supply, run.length, run.current, run.csa);
  const tabPercent = calculateDropPercent(tabVolts, run.voltage);
  const tabResult = evaluateVerdict(tabPercent, getDropLimit(run.circuit));
  console.log(`        ${tabVolts.toFixed(2)} V | ${tabPercent.toFixed(2)} % | ${tabResult}   ${getConductor(run.material).voltageDropTable}  (${describeMethodGap(volts, tabVolts)})`);
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
  const material = document.getElementById("material").value;
  const earthing = document.getElementById("earthing").value;
  const zeText = document.getElementById("ze").value;
  const curve = document.getElementById("mcb-curve").value;
  const cpcText = document.getElementById("cpc").value;
  const cpcMaterial = document.getElementById("cpc-material").value;

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

  // Each metal's tables start at its own smallest size — copper at 1 mm²,
  // aluminium at 16 mm². Below that there is no tabulated data, so refuse
  // rather than quietly fall back to the resistivity formula.
  const smallestSize = getConductor(material).sizes[0];
  if (csa < smallestSize) {
    errorBox.textContent =
      "BS 7671 does not tabulate " + getConductor(material).label + " below " +
      smallestSize + " mm² — enter " + smallestSize + " mm² or larger.";
    return;
  }


  // The CPC is half the earth fault loop, so it is validated like any other
  // electrical input and named in the message when it is wrong.
  const cpcProblem = describeNumberProblem(cpcText, "CPC size");

  if (cpcProblem !== "") {
    errorBox.textContent = cpcProblem;
    return;
  }

  const cpcSize = Number(cpcText);

  if (RESISTANCE_PER_METRE_20C[cpcMaterial][cpcSize] === undefined) {
    errorBox.textContent =
      cpcMaterial + " is not tabulated at " + cpcSize + " mm² — " +
      "choose a standard size.";
    return;
  }

  if (zeText.trim() !== "") {
    const zeProblem = describeNumberProblem(zeText, "Ze");

    if (zeProblem !== "") {
      errorBox.textContent = zeProblem;
      return;
    }
  }

  // Exactly the same functions the five verified cases use. The maths lives
  // in one place; the form is just another way of feeding it.
  const voltage = getSupplyVoltage(supply);
  
    // Both methods in one call. Table 4D2B governs wherever it covers the size.
  const drop = calculateRunVoltageDrop(material, supply, length, current, csa, voltage);
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

    // Starts as "not checked" and stays that way if Ib is past the device
  // ladder — the tool never sized the cable, so it must not claim a PASS.
  let capacityResult = "not checked";
 
  // Same rule as capacity: "not checked" until something checks it, so an
  // unchecked circuit can never be reported as a pass.
  let zsResult = "not checked";

  if (deviceRating === null) {
    // Ib is past the end of the device ladder this tool knows.
    sizingNote.textContent =
      `Design current ${current} A is above the largest device rating this tool ` +
      `covers (125 A). Size this run by hand.`;

  } else {
    const csaForVoltDrop = findSmallestCsaForVoltDrop(material, supply, length, current, voltage, limit);
    // Which column of Table 4D2A this run reads. Two-core for single-phase,
    // three-or-four-core for three-phase. Held in a variable because the note
    // below quotes the same figure the search used.
        // "C" is hard-coded for one more step. Part C turns it into the input.
        // The method is an input now, carried on the factors object because the
    // arrangement that chose the Cg table is the same one that chose the column.
    const capacityColumn = getCapacityColumn(material, factors.method, supply);
    const csaForCapacity = findSmallestCsaForCapacity(material, deviceRating, factors.total, supply, factors.method);
    
    
    // Does the size the person SPECIFIED carry the current? It does if it is
    // at least the smallest size that passed. null means nothing up to 400 mm²
    // passed, so no size they could have typed carries it.
    if (csaForCapacity === null || csa < csaForCapacity) {
      capacityResult = "FAIL";
    } else {
      capacityResult = "PASS";
    }
    
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
        `It ${capacityColumn[minimumCsa]} A tabulated → ` +
        `Iz ${(capacityColumn[minimumCsa] * factors.total).toFixed(1)} A here. `;

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
      `Sized on ${factors.arrangementLabel}, ${getConductor(material).sizingBasis}.`;
          // --- earth fault loop ----------------------------------------------
    // Ib <= In <= Iz says the cable will not overheat. It says nothing about
    // whether a fault to earth will trip the device fast enough — that is Zs,
    // and it is a separate question with a separate answer.
    const system = getEarthingSystem(earthing);

    if (system.supported === false) {
      note += ` Earth fault loop NOT checked — ${system.refusal}`;

    } else if (factors.deviceType === "bs3036") {
      note += ` Earth fault loop NOT checked — a BS 3036 fuse has no fixed ` +
              `Ia multiple; its disconnection time comes from a time/current ` +
              `curve this tool does not hold.`;

    } else {
      // An empty Ze box uses the arrangement's typical figure, and the note
      // says ASSUMED. Ze is a measurement, not a constant: a number nobody
      // measured should never be presented as one that was.
      let ze = system.typicalZe;
      let zeSource = "assumed";

      if (zeText.trim() !== "") {
        ze = Number(zeText);
        zeSource = "measured";
      }

      const loop = calculateZs(
        material, cpcMaterial, csa, cpcSize, length, ze, curve, deviceRating);

      zsResult = loop.passes ? "PASS" : "FAIL";

      note +=
        ` Earth fault loop: Ze ${loop.ze} Ω (${zeSource}, ${system.code}) + ` +
        `${length} m of ${csa}/${cpcSize} mm² ` +
        `(R1+R2 ${loop.r1PlusR2PerMetre.toFixed(2)} mΩ/m × ` +
        `${loop.temperatureFactor} = ${loop.circuitOhms.toFixed(3)} Ω) ` +
        `→ Zs ${loop.zs.toFixed(3)} Ω against ${loop.maxZs.toFixed(2)} Ω ` +
        `for a ${deviceRating} A ${getDeviceType(curve).label} — ` +
        `${zsResult}. On site the meter must read ` +
        `${loop.measuredMaxZs.toFixed(2)} Ω or less.`;
    }
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

  // ONE verdict for the row, from BOTH checks. Before this, the row showed
  // the volt drop verdict alone — PASS on runs the capacity check had failed.
  const verdict = combineVerdicts(result, capacityResult, zsResult);
  const resultsBody = document.getElementById("results");
  resultsBody.innerHTML =
    `<tr><td>Your run — ${length} m, ${current} A, ${csa} mm²</td>` +
    `<td>${volts.toFixed(2)}</td><td>${percent.toFixed(2)}</td>` +
    `<td>${verdict}</td><td>${costCell}</td></tr>` +
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