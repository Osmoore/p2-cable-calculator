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
    // The verified cases carry no price, so their cost cell is a dash — the
  // table has five columns now and every row must have five.
  rows += `<tr><td>${run.name}</td><td>${volts.toFixed(2)}</td><td>${percent.toFixed(2)}</td><td>${result}</td><td>—</td></tr>`;
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