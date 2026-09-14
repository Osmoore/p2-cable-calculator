console.log("Calculator loaded");

// Copper at operating temperature, ohm·mm²/m
const RHO_COPPER = 0.018;

// Go-and-return path, single phase
const SINGLE_PHASE = 2;
// Line-to-line factor, three phase
const THREE_PHASE = 1.732;

// Maximum permitted volt drop, percent
const LIMIT_LIGHTING = 3.0;
const LIMIT_POWER = 5.0;

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

// Case 1 — 6 mm², 25 m, 32 A, single phase 230 V, power circuit
const r1 = calculateConductorResistance(RHO_COPPER, 25, 6);
const v1 = calculateVoltageDrop(getPhaseFactor("single"), r1, 32);
const p1 = calculateDropPercent(v1, 230);
console.log("Case 1:", v1.toFixed(2), "V |", p1.toFixed(2), "% |", evaluateVerdict(p1, getDropLimit("power")));


// Case 2 — 10 mm², 35 m, 45 A, single phase 230 V, power circuit
const r2 = calculateConductorResistance(RHO_COPPER, 35, 10);
const v2 = calculateVoltageDrop(getPhaseFactor("single"), r2, 45);
const p2 = calculateDropPercent(v2, 230);
console.log("Case 2:", v2.toFixed(2), "V |", p2.toFixed(2), "% |", evaluateVerdict(p2, getDropLimit("power")));


// Case 3 — 2.5 mm², 70 m, 32 A, single phase 230 V, lighting circuit
const r3 = calculateConductorResistance(RHO_COPPER, 70, 2.5);
const v3 = calculateVoltageDrop(getPhaseFactor("single"), r3, 32);
const p3 = calculateDropPercent(v3, 230);
console.log("Case 3:", v3.toFixed(2), "V |", p3.toFixed(2), "% |", evaluateVerdict(p3, getDropLimit("lighting")));


// Case 4 — 10 mm², 100 m, 20 A, three phase 415 V, power circuit
const r4 = calculateConductorResistance(RHO_COPPER, 100, 10);
const v4 = calculateVoltageDrop(getPhaseFactor("three"), r4, 20);
const p4 = calculateDropPercent(v4, 415);
console.log("Case 4:", v4.toFixed(2), "V |", p4.toFixed(2), "% |", evaluateVerdict(p4, getDropLimit("power")));


// Case 5 — 10 mm², 150 m, 10 A, three phase 415 V, power circuit
const r5 = calculateConductorResistance(RHO_COPPER, 150, 10);
const v5 = calculateVoltageDrop(getPhaseFactor("three"), r5, 10);
const p5 = calculateDropPercent(v5, 415);
console.log("Case 5:", v5.toFixed(2), "V |", p5.toFixed(2), "% |", evaluateVerdict(p5, getDropLimit("power")));
