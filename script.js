console.log("Calculator loaded");

// Copper at operating temperature, ohm·mm²/m
const RHO_COPPER = 0.018;

// Go-and-return path, single phase 
const SINGLE_PHASE = 2;
// Line-to-line factor, three phase
const THREE_PHASE = 1.732

// Maximum permitted volt drop, percent
const LIMIT_LIGHTING = 3.0;
const LIMIT_POWER = 5.0;

// These codes request for what type of supply either sigle or three phase 

function phaseFactor(supplyType){
    if(supplyType === "single"){
        return SINGLE_PHASE
    }    
    if(supplyType === "three"){
        return THREE_PHASE
    }
    throw new Error("Unknown supply type:" + supplyType);
    
}   
// these codes request for what type of circuit either power or light 

function dropLimit(circuitType) {
  if (circuitType === "lighting") {
    return LIMIT_LIGHTING;
  }
  if (circuitType === "power") {
    return LIMIT_POWER;
  }
  throw new Error("Unknown circuit type: " + circuitType);
}


// Resistance of the run, in ohms
function conductorResistance(resistivity, length, csa) {
  return (resistivity * length) / csa;
}

// Volts dropped: V = I × R, over the round trip
function voltageDrop(phaseFactor, resistance, current) {
  return phaseFactor * resistance * current;
}

// percentage drop in voltage
function dropPercent(voltsDropped, supplyVoltage) {
  return (voltsDropped / supplyVoltage) * 100;
}

// verdict either "pass" or "fails"
function verdict(percent, limit) {
  if (percent <= limit) {
    return "PASS";
  } else {
    return "FAIL";
  }
}

// Case 1 — 6 mm², 25 m, 32 A, single phase 230 V, power circuit
const r1 = conductorResistance(RHO_COPPER, 25, 6);
const v1 = voltageDrop(SINGLE_PHASE, r1, 32);
const p1 = dropPercent(v1, 230);
console.log("Case 1:", v1.toFixed(2), "V |", p1.toFixed(2), "% |", verdict(p1, dropLimit("power")));



// Case 2 — 10 mm², 35 m, 45 A, single phase 230 V, power circuit
//const r1 = conductorResistance(RHO_COPPER, 35, 10);
//const v1 = voltageDrop(SINGLE_PHASE, r1, 45);
//const p1 = dropPercent(v1, 230);
//console.log("Case 2:", v1.toFixed(2), "V |", p1.toFixed(2), "% |", verdict(p1, dropLimit("power")));


// Case 3 — 2.5 mm², 70 m, 32 A, single phase 230 V, light circuit
//const r1 = conductorResistance(RHO_COPPER, 70, 2.5);
//const v1 = voltageDrop(SINGLE_PHASE, r1, 32);
//const p1 = dropPercent(v1, 230);
//console.log("Case 3:", v1.toFixed(2), "V |", p1.toFixed(2), "% |", verdict(p1, dropLimit("lighting")));


// Case 4 — 10 mm², 100 m, 20 A, three phase 415 V, power circuit
//const r1 = conductorResistance(RHO_COPPER, 100, 10);
//const v1 = voltageDrop(THREE_PHASE, r1, 20);
//const p1 = dropPercent(v1, 415);
//console.log("Case 4:", v1.toFixed(2), "V |", p1.toFixed(2), "% |", verdict(p1, dropLimit("power")));

// Case 5 — 10 mm², 150 m, 10 A, three phase 415 V, power circuit
//const r1 = conductorResistance(RHO_COPPER, 150, 10);
//const v1 = voltageDrop(THREE_PHASE, r1, 10);
//const p1 = dropPercent(v1, 415);
//console.log("Case 5:", v1.toFixed(2), "V |", p1.toFixed(2), "% |", verdict(p1, dropLimit("power")));