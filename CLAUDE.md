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

## The method — locked 14 Sep 2026

My own hand calculation. The code is a faithful copy of it. If the method
changes, the code changes, and the verified cases below are re-worked on
paper before they are trusted again.

    Vd  = (factor × L × I × ρ) / A
    %Vd = (Vd / Vs) × 100

- **ρ** = 0.018 Ω·mm²/m — copper at operating temperature, not 20 °C.
  A conductor at full load runs near 70 °C. Designing at 20 °C is optimistic.
- **factor** = 2 single-phase (go and return path)
- **factor** = 1.732 three-phase (line-to-line)
- **L** = one-way route length, metres
- **I** = design load current, amperes (line current per phase for three-phase)
- **A** = conductor cross-sectional area, mm²
- **Vs** = nominal supply voltage. Single-phase 230 V. Three-phase is the
  **line-to-line** voltage, 400 V or 415 V — never 230 V. A three-phase drop
  compared against 230 V looks like a fail when it is not.

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
- The tabulated mV/A/m method is not implemented. It is intended as an
  independent cross-check on the resistivity figure, not a replacement.

## Known limitations

- **Checks volt drop ONLY.** It does not check current-carrying capacity,
  correction factors, earth fault loop impedance, or disconnection time.
  **A PASS here is not a compliant design.**
- Calculates ONE run in isolation. It cannot add a submain's drop to a
  downstream final circuit's drop.
- "mixed" applies the 3% lighting limit to the whole run. This is
  conservative: the real requirement is total drop from origin to the
  point of utilisation, budgeted across the chain.
- Cascading runs (origin → submain → final circuit) are a later feature.
- Copper only. No aluminium resistivity constant yet.

- Bad input never proceeds. Two kinds, two responses:
  - A wrong value passed by the CODE (an unrecognised supply type) THROWS.
    It means the program is wrong and should stop loudly.
  - A wrong value typed by a PERSON shows a message on the page naming the
    field and the problem. It means they made a typo, not that the program
    is broken — and a red console line is invisible to someone on site.
  Neither ever guesses a default, and neither ever calculates anyway.

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

- Every block of code carries an inline comment in plain English: what it
  does, and why it does it that way. Written so a person who does not read
  JavaScript can follow the logic. A comment never simply restates the
  line. A comment that no longer matches its code is a defect — fix it in
  the same edit that changed the code.
