# P2 — Cable calculator — project instructions

## What this is

A voltage-drop and cable-cost calculator. Plain HTML, CSS and JavaScript.
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

## Verified cases — 14 Sep 2026

Hand-worked on paper first, then matched by the code. This is the regression
baseline: after any change to the maths, re-run all five.

| # | ρ | L (m) | I (A) | A (mm²) | Phase | Vs | Vd (V) | %Vd | Limit | Verdict |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 0.018 | 25 | 32 | 6 | single | 230 | 4.80 | 2.09 | power | PASS |
| 2 | 0.018 | 35 | 45 | 10 | single | 230 | 5.67 | 2.47 | power | PASS |
| 3 | 0.018 | 70 | 32 | 2.5 | single | 230 | 32.26 | 14.02 | lighting | FAIL |
| 4 | 0.018 | 100 | 20 | 10 | three | 415 | 6.24 | 1.50 | power | PASS |
| 5 | 0.018 | 150 | 10 | 10 | three | 415 | 4.68 | 1.13 | power | PASS |

Case 3 also fails on current-carrying capacity — 32 A is beyond what 2.5 mm²
can carry. The calculator does not know that. See Known limitations.

## Still to build

- Session 2: cases as a data list, one loop instead of five repeated blocks
- Input form on the page, with validation
- Live USD→GHS cable pricing, API key kept off the browser
- Tabulated mV/A/m method as a cross-check

## Open decision

The Rules section says function names are verbNoun. The code currently uses
`voltageDrop`, `dropPercent`, `conductorResistance` — noun phrases, not
verbNoun. Either rename them (`calculateVoltageDrop`, `calculateDropPercent`,
`calculateConductorResistance`) or change the rule. Resolve before P3.
