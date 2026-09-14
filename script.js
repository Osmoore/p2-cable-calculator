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


// Every case, as data
const cases = [
  { name: "Case 1", length: 25,  current: 32, csa: 6,   supply: "single", voltage: 230, circuit: "power" },
  { name: "Case 2", length: 35,  current: 45, csa: 10,  supply: "single", voltage: 230, circuit: "power" },
  { name: "Case 3", length: 70,  current: 32, csa: 2.5, supply: "single", voltage: 230, circuit: "lighting" },
  { name: "Case 4", length: 100, current: 20, csa: 10,  supply: "three",  voltage: 415, circuit: "power" },
  { name: "Case 5", length: 150, current: 10, csa: 10,  supply: "three",  voltage: 415, circuit: "power" },
];

for (const run of cases) {
  const resistance = calculateConductorResistance(RHO_COPPER, run.length, run.csa);
  const volts = calculateVoltageDrop(getPhaseFactor(run.supply), resistance, run.current);
  const percent = calculateDropPercent(volts, run.voltage);
  const result = evaluateVerdict(percent, getDropLimit(run.circuit));
  console.log(`${run.name}: ${volts.toFixed(2)} V | ${percent.toFixed(2)} % | ${result}`);
}
