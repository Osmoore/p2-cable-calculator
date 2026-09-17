# P2 — Cable calculator — project instructions

## What this is

No framework, no server, no database. Osmoore learning project 2.

## Commands

    open index.html     # view the page

## Rules

- Money is integer minor units (pesewas) with an explicit currency.
- Function names are verbNoun: `calculateVoltageDrop`, `formatCedis`.
- No value is hard-coded twice. If it appears in two places, it is a constant.
- Unknown input throws. It never falls through to a default. A calculator
  that guesses is worse than one that stops.
- `.toFixed()` returns a string. Display only. Never do arithmetic on it,
  and never round before a comparison.
- Every calculation is checked against a hand-worked case before it ships.

- Bad input never proceeds. Two kinds, two responses:
  - A wrong value passed by the CODE (an unrecognised supply type) THROWS.
    It means the program is wrong and should stop loudly.
  - A wrong value typed by a PERSON shows a message on the page naming the
    field and the problem. It means they made a typo, not that the program
    is broken — and a red console line is invisible to someone on site.
  Neither ever guesses a default, and neither ever calculates anyway.

- Every block of code carries an inline comment in plain English: what it
  does, and why it does it that way. Written so a person who does not read
  JavaScript can follow the logic. A comment never simply restates the
  line. A comment that no longer matches its code is a defect — fix it in
  the same edit that changed the code.

- Correction factors default to their base condition (1.00). Someone who
  ignores them gets exactly the tool that existed before they were added.
- Every data table validates its own shape at load: values never rise where
  physics says they fall, the base condition is exactly 1.00, and anything
  outside a sane range is a typo. A guard that CANNOT fire must say so in
  its comment — a guard that quietly does nothing is worse than no guard,
  because you relax.
- A table with no matching partner table does not ship. It is parked in
  Domain notes with the reason it was parked.
- Never interpolate between tabulated values. The page offers only the
  points the standard publishes, and an untabulated value throws.
- The output shows its working. A person who disagrees with the answer must
  be able to see which assumption to argue with.

- The currency of a supplier price is an INPUT, never an assumption. Every
  price carries the currency it was quoted in.
- A GHS price is used as-is. No rate is fetched, nothing can go stale, and
  the job prices with no internet at all.
- A USD price is converted using the locked rate. If there is no usable
  rate, USD pricing is unavailable — and the message says exactly that,
  not that pricing as a whole has failed.
- Money is integer pesewas. Round ONCE, at the final total. Rounding per
  metre and then multiplying compounds the error.
- A quote records the currency quoted. If it was converted, it also records
  the rate and the time. A cedi-priced quote shows no rate — printing one
  would imply a conversion that never happened




- The fetched rate is MID-MARKET. It is not what anyone pays to buy dollars.
  A quote priced at mid-market under-prices the job by the FX spread.
- An FX allowance percentage is applied to the fetched rate to produce the
  rate actually used. Default 2.5%, editable by the user.
- The allowance is ALWAYS visible on screen and ALWAYS printed on the quote,
  including when it is zero. A margin the user cannot see is a margin they
  will be blamed for.
- USD pricing is INDICATIVE. It is an estimate built on a public mid-market
  rate plus an assumed spread, not a bank quotation. The quote says so.

- A PASS is not an endorsement. Report HEADROOM (% of allowance used), not
  just a verdict — an oversized cable passes while wasting the client's money.
- The smallest CSA that satisfies volt drop is reported as "volt drop alone
  would permit X", NEVER as a recommendation. Current-carrying capacity,
  correction factors and disconnection time all set minimums this tool
  cannot see, and any of them may demand a larger conductor.

  - In (protective device rating) is DERIVED from Ib: the next standard
  BS EN 60898 rating at or above Ib (6, 10, 16, 20, 25, 32, 40, 50, 63,
  80, 100, 125 A). Always shown, always overridable. Reg 433.1.1:
  Ib <= In <= Iz — the cable carries In, not Ib.
- Auto-selection assumes a BS EN 60898 MCB. It does NOT hold for BS 3036
  rewireable fuses (Cf 0.725) or motor circuits sized on starting current.
- A PASS is not an endorsement. Report headroom (% of allowance used) and
  the minimum size, because an oversized cable passes while wasting money.
- The cable must satisfy BOTH capacity and volt drop. The larger minimum
  governs, and the output names which one it was.
- Data tables check their own shape at load (capacity must ascend with CSA).
  A wrong table pasted in is worse than no table — it produces confident,
  wrong sizes.

## The method — locked 14 Sep 2026

My own hand calculation. The code is a faithful copy of it. If the method
changes, the code changes, and the verified cases below are re-worked on
paper before they are trusted again.

    Vd  = (factor × L × I × ρ) / A
    %Vd = (Vd / Vs) × 100
- Correction factors inflate the REQUIREMENT; they do not derate the cable:

      It_required = In / (Ca × Cg × Ci × Cf)

  Cf can also be written as a ×1.38 multiplier on In. Same number
  (1 ÷ 0.725 = 1.3793), and deliberately NOT used — two expressions of one
  factor is two places for it to drift.

### Parked data — supplied 17 Sep 2026, not in the code

Correct tables with no matching capacity column yet. Shipping either against
the Method C PVC table would be wrong in the UNSAFE direction, because both
are gentler than the column actually in use.

**Ca, 90 °C thermosetting (XLPE), Table 4B1** — needs an XLPE capacity table:
25:1.02, 30:1.00, 35:0.96, 40:0.91, 45:0.87, 50:0.82, 55:0.76, 60:0.71,
65:0.65, 70:0.58, 75:0.50, 80:0.41

**Cg, bunched or in conduit/trunking, Table 4C1** — needs a Method B column:
1:1.00, 2:0.80, 3:0.70, 4:0.65, 5:0.60, 6:0.57, 7:0.54, 8:0.52, 9:0.50,
12:0.45, 16:0.41, 20:0.38

**mV/A/m single-phase column** — for the deferred cross-check. Paste it here
when convenient; the ×2 go-and-return factor is already inside those numbers.
- **ρ** = 0.018 Ω·mm²/m — copper at operating temperature, not 20 °C.
## Known limitations — 17 Sep 2026

The tool sizes on current-carrying capacity AND volt drop, with Ca, Cg, Ci
and Cf applied. What it still does not know:

- ONE installation method: Reference Method C (clipped direct), multicore
  70 °C thermoplastic, copper, Table 4D2A col 6. The grouping factor is the
  clipped-direct single-layer column only — a bunched or in-conduit run is
  NOT covered, and would need its own capacity column as well as its own Cg.
- Ci stops at 400 mm. A cable totally surrounded by insulation over a longer
  route is not held. Size that by hand.
- The BS 3036 rating ladder is not held. Selecting a BS 3036 fuse requires
  the rating to be typed in; the tool refuses to derive one.
- The device ladder tops out at 125 A. Above that the tool says so and stops.
- NO earth fault loop impedance or disconnection time check.
- NO adiabatic check on CPC sizing.
- Calculates ONE run in isolation; cannot chain a submain to a final circuit.
  "Mixed" applies the 3% lighting limit to the whole run, which is
  conservative — the real requirement is total drop from origin to the point
  of utilisation, budgeted across the chain.
- Copper only. No aluminium. No XLPE.
- USD pricing is indicative: a public mid-market rate plus the user's own FX
  allowance, not a bank quotation.

**A PASS is not a compliant design. It is an arithmetic result against the
conditions you declared.**
| Circuit type | Limit |
|---|---|
| Lighting | 3.0% |
## Still to build — in the order chosen 17 Sep 2026

1. More installation methods. One extra Table 4D2A column per method plus a
   select. This is what unlocks the parked bunched Cg column above.
2. Aluminium. One resistivity constant, one more capacity table.
3. Earth fault loop impedance and disconnection time. Needs R1+R2 per metre
   per size, max Zs per device type and rating, and the earthing arrangement
   as an input. Much larger than anything above it.
4. Adiabatic check on CPC sizing. Needs k values and fault current. Pairs
   naturally with 3 — same data, same session.
5. Cascading runs (origin → submain → final circuit). A data-model change,
   not a table: the tool would hold a chain of runs and budget the total
   drop across them.
6. Tabulated mV/A/m as an independent cross-check on the resistivity figure.


- Anyone other than the author using this tool is pricing on a mid-market
  rate plus THEIR OWN assumed spread. It is not financial advice and not a
  bank quotation. Confirm the rate with your bank before committing to a
  fixed-price contract in foreign currency.

## Domain notes

- BS 7671 and manufacturer mV/A/m tables publish **separate single-phase and
  three-phase columns**. The three-phase column already contains the 1.732
  factor. Do not apply it again.
- Resistivity method: the factor is applied by us (2 or 1.732).
  Tabulated method: the factor is already inside the published number.
- The tabulated mV/A/m method is not implemented. It is intended as an
  independent cross-check on the resistivity figure, not a replacement.

## Known limitations

- ONE installation method: Reference Method C (clipped direct), multicore
  70 °C thermoplastic, copper, from BS 7671:2018+A2:2022 Table 4D2A col 6.
  Any other method needs its own column.
- NO correction factors. Assumes 30 °C ambient, no grouping, no thermal
  insulation, no BS 3036 fuse. Ca, Cg, Ci and Cf are all absent, and every
  one of them REDUCES the usable capacity. A run with any of these present
  is under-sized by this tool.
- NO earth fault loop impedance or disconnection time check.
- NO adiabatic check on CPC sizing.
- Calculates ONE run in isolation; cannot chain a submain to a final circuit.
- Copper only. No aluminium.
- USD pricing is indicative: public mid-market rate plus the user's own
  FX allowance, not a bank quotation.


## Still to build

- Session 2: cases as a data list, one loop instead of five repeated blocks
- Input form on the page, with validation
- Live USD→GHS cable pricing, API key kept off the browser
- Tabulated mV/A/m method as a cross-check

## Naming — resolved 14 Sep 2026

The verbNoun rule stands. All functions renamed to match it.

| Old | New | Why that verb |
|---|---|---|
| `conductorResistance` | `calculateConductorResistance` | does real arithmetic |
| `voltageDrop` | `calculateVoltageDrop` | does real arithmetic |
| `dropPercent` | `calculateDropPercent` | does real arithmetic |
| `phaseFactor` | `getPhaseFactor` | looks up a constant, cheap |
| `dropLimit` | `getDropLimit` | looks up a constant, cheap |
| `verdict` | `evaluateVerdict` | applies a rule and judges |

`get` vs `calculate` is not decoration. `get` tells a reader the function is a
lookup with nothing to go wrong inside it; `calculate` warns there is real work
worth checking. Functions returning true or false are the exception and read as
a question: `isValidCsa`, `hasThreePhaseSupply`. Event handlers read as
`handleCalculateClick`.
