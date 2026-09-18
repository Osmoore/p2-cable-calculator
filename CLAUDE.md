# P2 — Cable calculator — project instructions

## What this is

A cable sizer for one run. Given a length, a load current and the conditions
the cable runs in, it says what size that run needs and what the drop will be.
No framework, no server, no database. Osmoore learning project 2.

## Commands

    open index.html     # view the page

## Rules

### General

- Money is integer minor units (pesewas) with an explicit currency.
- Function names are verbNoun: `calculateVoltageDrop`, `formatCedis`.
- No value is hard-coded twice. If it appears in two places, it is a constant.
- `.toFixed()` returns a string. Display only. Never do arithmetic on it,
  and never round before a comparison.
- Every calculation is checked against a hand-worked case before it ships.
- Every block of code carries an inline comment in plain English: what it
  does, and why it does it that way. Written so a person who does not read
  JavaScript can follow the logic. A comment never simply restates the line.
  A comment that no longer matches its code is a defect — fix it in the same
  edit that changed the code.

### Bad input never proceeds

Two kinds, two responses:

- A wrong value passed by the CODE (an unrecognised supply type) THROWS.
  It means the program is wrong and should stop loudly.
- A wrong value typed by a PERSON shows a message on the page naming the
  field and the problem. It means they made a typo, not that the program is
  broken — and a red console line is invisible to someone on site.

Neither ever guesses a default, and neither ever calculates anyway.

### Data and tables

- Never interpolate between tabulated values. The page offers only the points
  the standard publishes, and an untabulated value throws.
- Every data table validates its own shape at load. Capacity must ascend with
  CSA. Correction factors must never rise. Base conditions must be exactly
  1.00. Impedance must satisfy z = √(r² + x²) within the table's own rounding.
  A wrong table pasted in is worse than no table: it produces confident,
  wrong sizes.
- A guard that CANNOT fire must say so in its comment. A guard that quietly
  does nothing is worse than no guard, because you relax.
- Guards are layered on purpose, and they run in order. A single typo trips
  the first one. It takes an internally consistent error — the same decimal
  shift applied across a whole row or column — to reach the last one.
- A table with no matching partner table does not ship. It is parked in
  Domain notes with the reason.
- Read every table's own header against the code that uses it, and ask whether
  the code honours each condition the header names. Both defects found in the
  week of 17 Sep 2026 were exactly that: a stated assumption nothing enforced.
  ρ = 0.018 was documented as "copper at operating temperature" and was not.
  The capacity table said "1 two-core cable, single-phase" and was used for
  three-phase runs too. Neither was a logic bug — the file told the truth and
  the code ignored it. Run this pass whenever a table is added, and over the
  whole set periodically.
- Where two independent sources give the same physical quantity, the tool
  holds both and shows both. Two methods agreeing is the strongest evidence
  this project can produce. Two methods disagreeing is the second strongest.

### Sizing

- In (protective device rating) is DERIVED from Ib: the next standard
  BS EN 60898 rating at or above Ib (6, 10, 16, 20, 25, 32, 40, 50, 63, 80,
  100, 125 A). Always shown, always overridable. Reg 433.1.1: Ib ≤ In ≤ Iz —
  the cable carries In, not Ib.
- Auto-selection assumes a BS EN 60898 MCB. Selecting a BS 3036 rewireable
  fuse requires the rating to be typed in: the tool does not hold that ladder
  and will not invent one.
- Correction factors inflate the REQUIREMENT; they do not derate the cable:

      It_required = In / (Ca × Cg × Ci × Cf)

  Cf can also be written as a ×1.38 multiplier on In. Same number
  (1 ÷ 0.725 = 1.3793), and deliberately NOT used — two expressions of one
  factor is two places for it to drift.
- Correction factors default to their base condition (1.00). Someone who
  ignores them gets exactly the tool that existed before they were added.
- The capacity column is chosen by SUPPLY TYPE, never assumed. Table 4D2A
  publishes two-core (single-phase) and three-or-four-core (three-phase)
  columns, and a three-core cable carries LESS than a two-core of the same
  size: three loaded conductors in one sheath make more heat with nowhere to
  go. Reading the two-core column for a three-phase run over-states capacity
  and permits too small a conductor.
- The cable must satisfy BOTH capacity and volt drop. The larger minimum
  governs, and the output names which one it was.
- A PASS is not an endorsement. Report HEADROOM (% of allowance used), not
  just a verdict — an oversized cable passes while wasting the client's money.
- The output shows its working. A person who disagrees with the answer must
  be able to see which assumption to argue with.
- The size search uses the SAME function as the verdict. If the search used a
  different method, the tool could recommend a size and then fail it.

### Pricing

- The currency of a supplier price is an INPUT, never an assumption. Every
  price carries the currency it was quoted in.
- A GHS price is used as-is. No rate is fetched, nothing can go stale, and the
  job prices with no internet at all.
- A USD price is converted using the locked rate. If there is no usable rate,
  USD pricing is unavailable — and the message says exactly that, not that
  pricing as a whole has failed.
- Money is integer pesewas. Round ONCE, at the final total. Rounding per metre
  and then multiplying compounds the error.
- A quote records the currency quoted. If it was converted, it also records
  the rate and the time. A cedi-priced quote shows no rate — printing one
  would imply a conversion that never happened.
- The fetched rate is MID-MARKET. It is not what anyone pays to buy dollars.
  A quote priced at mid-market under-prices the job by the FX spread.
- An FX allowance percentage is applied to the fetched rate to produce the
  rate actually used. Defaults to 0%, editable by the user.
- The allowance is ALWAYS visible on screen and ALWAYS printed on the quote,
  including when it is zero. A margin the user cannot see is a margin they
  will be blamed for.
- USD pricing is INDICATIVE. A public mid-market rate plus an assumed spread,
  not a bank quotation. Anyone other than the author using this tool is
  pricing on their own assumed spread. Confirm the rate with your bank before
  committing to a fixed-price contract in foreign currency.

## The method — revised 17 Sep 2026

Volt drop is calculated TWO ways, and both are shown.

**Primary — tabulated.** BS 7671:2018+A2:2022 Table 4D2B:

    Vd = (mV/A/m × I × L) / 1000

The published figure already contains the phase factor (2 for the
single-phase column, 1.732 for the three-phase column) and is built from the
resistance of a real stranded conductor at 70 °C. No resistivity is assumed.
Never apply a phase factor to it a second time.

From 25 mm² upward the table splits into r, x and z. **The tool uses z**,
decided 17 Sep 2026, because a real a.c. circuit feels both resistance and
reactance. Below 25 mm² x is zero and z equals r, so the choice costs nothing
on small cables.

**Cross-check and fallback — resistivity.** The original hand calculation:

    Vd  = (factor × L × I × ρ) / A
    %Vd = (Vd / Vs) × 100

- **ρ** = 0.022 Ω·mm²/m — copper at its 70 °C operating temperature.
- **factor** = 2 single-phase (go and return path)
- **factor** = 1.732 three-phase (line-to-line)
- **L** = one-way route length, metres
- **I** = design load current, amperes (line current per phase for three-phase)
- **A** = conductor cross-sectional area, mm²
- **Vs** = nominal supply voltage. Single-phase 230 V. Three-phase is the
  **line-to-line** voltage, 400 V or 415 V — never 230 V. A three-phase drop
  compared against 230 V looks like a fail when it is not.

The resistivity method still runs on every calculation. It is the cross-check,
and it is the fallback for a CSA the table does not list (a non-standard size
typed by hand).

If the method changes, the code changes, and the verified cases are re-worked
on paper before they are trusted again.

### Correction — ρ was wrong for four days

From 14 to 17 Sep 2026 this tool used **ρ = 0.018**, documented as "copper at
operating temperature, not 20 °C". That was wrong. 0.018 is barely above the
20 °C figure, and it made every volt drop this tool produced about **20%
optimistic** — in the unsafe direction.

Nothing outside the tool found it. The cross-check did, on the day it was
built, before it had been wired into anything.

The evidence came from the project's own data. Rearranging the tabulated
figure, ρ = r × A ÷ 2000, across all eighteen sizes of Table 4D2B:

    mean 0.02202    min 0.02128    max 0.02325

Eighteen independent values inside ±5% of 0.022. Setting ρ = 0.022 collapsed
the disagreement between the two methods from 17.8–20.0% to 0.3–2.2%, with
Case 2 agreeing exactly — against a table the constant was never fitted to.

No verdict on the six verified cases flipped. But Case 6 went from 2.93% to
3.65%: on a 5% limit, 59% of the allowance turning into 73%. The margin was a
fifth smaller than the tool had been claiming.

The lesson is in the Rules above: hold both sources, show both numbers.

### Correction — three-phase runs read the two-core column

Found 18 Sep 2026, in the header of the capacity table itself. It read
"1 two-core cable, single-phase", and the code then used that one column for
every run including three-phase ones. Cases 4 and 5 and any three-phase run
through the form were sized against a capacity figure roughly 12% too
generous, which permits a conductor one size too small.

Worked example: 63 A three-phase, 40 °C, four circuits grouped. The tool said
25 mm². With the three-or-four-core column it says 35 mm².

Same shape as the rho error: a documented assumption the code quietly ignored.
It was caught by reading the table's own header against the code that used it,
which is the cheapest audit available and worth doing on every table here.

## Limits

| Circuit type | Limit |
|---|---|
| Lighting | 3.0% |
| Power / general | 5.0% |
| Mixed (submain feeding both) | 3.0% — the stricter figure |

At exactly the limit the verdict is PASS (`<=`). Deliberate, not accidental.
Change to `<` if practice requires the drop to be strictly under.

## Domain notes

- BS 7671 and manufacturer mV/A/m tables publish **separate single-phase and
  three-phase columns**. The three-phase column already contains the 1.732
  factor. Do not apply it again.
- Resistivity method: the factor is applied by us (2 or 1.732).
  Tabulated method: the factor is already inside the published number.
- Table 4D2A splits the same way Table 4D2B does, and for the same physical
  reason: the number of loaded conductors changes the answer. Three-phase
  capacity sits between 0.857 and 0.905 of single-phase across col 6 vs col 7,
  and a load-time guard checks the ratio stays below 1 at every size — if the
  columns are ever swapped it fires, even though both are individually
  perfect ascending tables.
- The installation arrangement decides TWO things, not one: the Table 4D2A
  capacity column AND which row of Table 4C1 supplies Cg. Conduit is bunched;
  clipped direct is a single layer on a surface; a tray is a single layer with
  more air. They are one input in the code (INSTALLATION_ARRANGEMENTS) because
  two inputs would let someone pick a combination that does not exist.
- Method E appears three times in that list. "On a tray" does not pick a Cg —
  touching, spaced horizontal and spaced vertical are three different rows of
  Table 4C1 sharing one capacity column.
- Capacity rises A < B < C < E at every size, both phases, because that is the
  order in which the cable can shed heat. A load-time guard checks it, and it
  is what catches a whole method column dropped into the wrong slot.
- The two columns of Table 4D2B are related. Dividing three-phase by
  single-phase gives 1.732 ÷ 2 = 0.866 at every size. This is a load-time
  guard, and it catches a whole column pasted into the wrong slot even when
  both columns are individually perfect.

### Parked data — supplied 17 Sep 2026, not in the code

Correct tables with no matching capacity column yet. Shipping either against
the Method C PVC table would be wrong in the UNSAFE direction, because both
are gentler than the column actually in use.

**Ca, 90 °C thermosetting (XLPE), Table 4B1** — needs an XLPE capacity table:
25:1.02, 30:1.00, 35:0.96, 40:0.91, 45:0.87, 50:0.82, 55:0.76, 60:0.71,
65:0.65, 70:0.58, 75:0.50, 80:0.41

*(The bunched Cg column was parked here from 17 to 18 Sep 2026 waiting for a
capacity column to pair with. Methods A and B gave it one, and it now ships.)*

## Known limitations — 17 Sep 2026

The tool sizes on current-carrying capacity AND volt drop, with Ca, Cg, Ci
and Cf applied, and cross-checks volt drop against Table 4D2B. What it still
does not know:

- FOUR installation methods: A (conduit in an insulating wall), B (conduit on
  a wall or in trunking), C (clipped direct) and E (perforated tray, in three
  arrangements). Table 4D2A cols 2 to 9. Methods D, F and G are NOT held, nor
  is any single-core arrangement.
- Multicore 70 °C thermoplastic, non-armoured, copper only. Armoured (SWA)
  cable has its own tables and is not covered.
- Ci stops at 400 mm. A cable totally surrounded by insulation over a longer
  route is not held. Size that by hand.
- The BS 3036 rating ladder is not held. Selecting a BS 3036 fuse requires the
  rating to be typed in; the tool refuses to derive one.
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

## Still to build — in the order chosen 17 Sep 2026

1. Aluminium. One resistivity constant, one more capacity table.
2. Earth fault loop impedance and disconnection time. Needs R1+R2 per metre
   per size, max Zs per device type and rating, and the earthing arrangement
   as an input. Much larger than anything above it.
3. Adiabatic check on CPC sizing. Needs k values and fault current. Pairs
   naturally with 3 — same data, same session.
4. Cascading runs (origin → submain → final circuit). A data-model change,
   not a table: the tool would hold a chain of runs and budget the total drop
   across them.

Done and struck off: current-carrying capacity (16 Sep), correction factors
Ca/Cg/Ci/Cf (17 Sep), tabulated mV/A/m cross-check (17 Sep), capacity column by
core count (18 Sep), installation methods A/B/C/E (18 Sep).

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
