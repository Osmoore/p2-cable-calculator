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

// Nominal supply voltages, in volts.
const VOLTS_SINGLE_PHASE = 230;
const VOLTS_THREE_PHASE = 415;

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
  console.log(`${run.name}: ${volts.toFixed(2)} V | ${percent.toFixed(2)} % | ${result}`);
  rows += `<tr><td>${run.name}</td><td>${volts.toFixed(2)}</td><td>${percent.toFixed(2)}</td><td>${result}</td></tr>`;
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
  const resistance = calculateConductorResistance(RHO_COPPER, length, csa);
  const volts = calculateVoltageDrop(getPhaseFactor(supply), resistance, current);
  const percent = calculateDropPercent(volts, voltage);
  const result = evaluateVerdict(percent, getDropLimit(circuit));

  // Put the answer at the TOP of the table, above the verified cases, so the
  // newest result is the first thing the user sees.
  const resultsBody = document.getElementById("results");
  resultsBody.innerHTML =
    `<tr><td>Your run — ${length} m, ${current} A, ${csa} mm²</td>` +
    `<td>${volts.toFixed(2)}</td><td>${percent.toFixed(2)}</td><td>${result}</td></tr>` +
    resultsBody.innerHTML;

  // Put the cursor back in the CSA box and select what is there, so the
  // next keystroke replaces it. Tweaking one value is the common case —
  // the form is deliberately not reset, so the other fields stay as typed.
  const csaBox = document.getElementById("csa");
  csaBox.focus();
  csaBox.select();
});
