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
- ONE guard per rule, never one per metal. The guards take the table and the
  size list as arguments and run in a loop over CONDUCTORS. A rule written
  twice gets updated once.
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
- Everything that changes with ONE choice lives in ONE registry entry, and
  every lookup reads from that entry. INSTALLATION_ARRANGEMENTS does this for
  the installation (capacity column + Cg table); CONDUCTORS does it for the
  metal (capacity table, volt drop table, ρ, ρ window, size list). The form
  reads the choice once and passes it to every function that needs it, so a
  run can never be sized on aluminium capacity and copper volt drop.
- A table never travels without its size list. Copper is tabulated 1–400 mm²,
  aluminium 16–400 mm²; each metal's guards walk its OWN list.
- Each metal's ρ constant must sit inside the window its OWN volt drop table
  implies. Checked at load by checkConductorsAreComplete — the 0.018 mistake
  would now stop the page before it could calculate anything.
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
- The results row carries ONE verdict built from BOTH checks
  (combineVerdicts): PASS, FAIL (capacity), FAIL (volt drop), or
  FAIL (capacity, volt drop). Where capacity was never checked (Ib above the
  125 A ladder) the row says so — "PASS (volt drop only — capacity not
  checked)" — rather than claiming a full PASS.
- Percentages are never added. A percentage is a percentage OF something, and
  two links of a chain have different somethings. Sum the VOLTS, then take one
  percentage of the voltage at the point of utilisation (Reg 525.1).
- A chain is checked at BOTH levels: every link on its own terms, and the
  chain as a whole. The verdict names which link failed, not just which check.
- FOUR questions, four answers, one verdict: will the cable overheat
  (capacity), will the volts hold up (volt drop), will a fault disconnect the
  device (Zs), will the CPC survive while it does (adiabatic). A circuit can
  pass any three and fail the fourth, so the row names which failed.
- Zs is a SEPARATE question from Ib ≤ In ≤ Iz. Capacity says the cable will
  not overheat; Zs says a fault to earth will trip the device in time. A
  circuit can pass either and fail the other, so the row names which failed.
- The Zs limits are COMPUTED, never stored: Zs_max = (CMIN × U0) ÷ (Ia × In).
  CMIN and each type's Ia multiplier are single constants, and a load-time
  guard reproduces all 39 published values from them. Storing 39 numbers
  would be 39 chances to mistype a limit and no way to argue with the basis.
- Ze is a MEASUREMENT. An empty box uses the arrangement's typical figure and
  the note says "assumed"; a typed figure says "measured". A number nobody
  measured is never presented as one that was.
- Below a metal's smallest tabulated size the page REFUSES with a message.
  It does not fall back to the resistivity formula, because the tool would
  then be sizing a conductor the standard does not publish.
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

**Primary — tabulated.** BS 7671:2018+A2:2022 Table 4D2B (copper) or
Table 4D4B (aluminium), chosen through CONDUCTORS:

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
- **ρ** = 0.0365 Ω·mm²/m — aluminium at 70 °C (mean of what all 24 r cells
  of Table 4D4B imply; range 0.0360–0.0388).
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

### Case 7 — the aluminium reference run, added 19 Sep 2026

Cases 1 to 6 are copper. Case 7 is the aluminium one, so a change to the
aluminium tables or to ρ cannot pass unnoticed:

    70 mm², three-phase 415 V, 80 m, 100 A, power circuit

    tabulated    0.92 × 100 × 80 ÷ 1000            = 7.36 V   1.77%  PASS
    resistivity  1.732 × 80 × 100 × 0.0365 ÷ 70    = 7.22 V   1.74%  PASS

The methods differ by 1.8%, resistivity low, because the tabulated z carries
the reactance (x = 0.13) that the formula does not. Copper Case 6 shows the
same 1.8% gap for the same reason. Each case now names its own metal, and the
loop reads it — a case that does not say gets no default, it stops the page.

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

### Correction — the verdict judged volt drop only

Found 19 Sep 2026, by reading a real result. 63 A three-phase, 100 m, 25 mm²,
Method C, 40 °C, four circuits: the sizing note said "Minimum 35 mm² … You
specified 25 mm² — that is UNDERSIZED", and the results row said PASS.

Both were arithmetically true. The row's verdict came from evaluateVerdict,
which only ever asked whether the volt drop was inside the limit (2.28% of
5% — comfortably). The capacity check lived only in the note. 25 mm² is
tabulated at 96 A against the 96.6 A these conditions require; in service it
carries 62.6 A on a 63 A breaker. Anyone reading only the table would have
installed it.

Fixed the same day: capacityResult is judged beside the volt drop result and
combineVerdicts produces the one word the row shows. Nine runs were tested
through the form, including both-fail, off-ladder and non-standard sizes.

Same family as the two corrections above: two parts of the tool each told the
truth about their own question, and nothing made them agree.

### Earth fault loop impedance — added 21 Sep 2026

    Zs = Ze + (R1 + R2) × 1.20       compared against (CMIN × U0) ÷ (Ia × In)

- **Ze** comes from the supply: TN-C-S 0.35 Ω, TN-S 0.80 Ω as UK DNO design
  limits, which on ECG's network are assumptions until measured.
- **(R1 + R2)** is this circuit's line conductor plus its CPC, from the 20 °C
  resistance table. It is NOT stored as pairs: r1 + r2 is added when needed,
  so any line-and-CPC combination works and no number exists twice.
- **1.20** warms the circuit from 20 °C to its operating temperature. It
  belongs to 70 °C thermoplastic; XLPE differs and is still parked. Ze is not
  warmed — it is measured at the origin as it stands.
- **Ia** is 5 × In for Type B, 10 × for C, 20 × for D: the TOP of each
  published band, which is the worst case the breaker may need before it trips.
- **CMIN = 1.00**, because the printed Table 41.3 in use gives 7.67 Ω at 6 A,
  1.44 Ω at 32 A and 0.73 Ω at 63 A for Type B — U0 ÷ (5 × In) with no factor.
  Read from the book and confirmed 21 Sep 2026. A2:2022 is understood to apply
  Cmin = 0.95, which would lower every limit about 5% (1.37 Ω at 32 A) and is
  the SAFER figure; if that basis is ever confirmed for this installation, one
  constant changes and all 39 limits move together.
- **0.8 × the limit** is what a meter may read on site, because an instrument
  tests a cold conductor and the limit is for a hot one. The note prints it.

Two refusals rather than wrong answers:

- **TT** relies on an RCD (RA × IΔn ≤ 50 V), not on the breaker's Zs limit.
  Judging TT against a Type B limit would fail nearly every real installation
  and teach the user to ignore the tool.
- **BS 3036** has no fixed Ia multiple; its disconnection time comes from a
  time/current curve this tool does not hold.

A rating off the device ladder (45 A, say) is COMPUTED rather than refused:
the ladder says which devices the tool picks automatically, the formula says
what the physics is, and a 45 A Type B breaker exists. The boundary is the
device type — only B, C and D have a fixed Ia multiple, and getDeviceType
throws on anything else.

The strongest evidence in this section is accidental. The On-Site Guide's
20 °C resistances imply ρ = 18.3 for copper and 30.4 for aluminium; warmed by
1.2 they give 22.0 and 36.5, against the 0.022 and 0.0365 derived weeks
earlier from Tables 4D2B and 4D4B. Two unrelated sources, half a percent
apart, and a load-time guard now checks it on every page load.

### Adiabatic CPC check — added 21 Sep 2026

    S ≥ √(I² × t) ÷ k        I = U0 ÷ Zs

Zs asks whether the CPC is good enough to TRIP the device. This asks whether
it SURVIVES while the device is tripping. The two are not the same question
and a CPC can pass one and fail the other.

"Adiabatic" means the equation assumes ALL the heat stays in the conductor for
the duration of the fault — none escapes into the insulation or the air. That
is pessimistic on purpose: a fault is over long before heat has time to go
anywhere.

- **I** is U0 ÷ Zs, the Zs this tool just calculated, so the two checks cannot
  be based on different circuits. Note the direction: a LOW Zs is good for
  disconnection and hard on the CPC. The trouble appears near the origin, not
  at the far end of a long run.
- **k** comes from the CPC arrangement, not from the metal alone. One registry
  entry per arrangement holds the metal, k, and the two temperatures k was
  derived at, because a copper CPC inside a cable starts at 70 °C and a
  separate one starts at 30 °C — 115 against 143 for the same metal.
- **t = 0.1 s by default, and it is an INPUT.** The real trip time for an MCB
  on its magnetic element is a few milliseconds; 0.4 s from Reg 411.3.2.2 would
  demand a CPC several times too big and the tool would be ignored. Below
  0.1 s BS 7671 says to use the manufacturer's let-through energy instead of
  this formula at all.

**The known consequence, accepted deliberately.** At high fault current the
0.1 s assumption fails circuits that are compliant in practice. A 32 A Type B
with 6/2.5 mm² twin and earth, 5 m from a strong supply: 2036 A needs 5.60 mm²
at 0.1 s, against the 2.5 mm² installed. The real breaker current-limits and
clears in milliseconds. So the tool does three things rather than just failing:
it names the basis in the verdict — FAIL (adiabatic at t = 0.1 s) — it prints
the let-through energy the installed CPC can take (2.5 mm² at k 115 withstands
82,656 A²s), and it takes t as an input so a figure read off the device curve
replaces the assumption. A FAIL is a prompt to check the data sheet, not a
dead end.

**Where the k values come from, and one place they do not.** k follows from
the metal's own properties:

    k = K0 × √( ln( (β + θf) ÷ (β + θi) ) )

with K0/β of 226/234.5 for copper, 148/228 for aluminium, 78/202 for steel.
All THIRTEEN conductor rows of Tables 54.2 and 54.3 reproduce to within 0.8%,
and a load-time guard recomputes every one of them. That is stronger than
checking a table against itself: each k is derived from physics and the
temperatures the book prints beside it.

The two armour rows of Table 54.4 are the exception. No single β reproduces
both 51 at 60→160 and 46 at 80→200, so they carry checkable:false and rest on
the book's authority alone — if a wrong k is ever typed there, nothing catches
it. Said out loud in the code, because a guard that cannot fire must say so.

(On 21 Sep 2026 this check appeared to find an error in the book: steel's
conductor constant gives 44.4, not 51, at 60→160. Emmanuel read the printed
table and it says 60, 160 and 51. The check was wrong, not the book — armour
assumes different properties from a steel conductor. A cross-check that
disagrees means one of the two is wrong, and it is not always the data.)

### Cascading runs — added 23 Sep 2026

Origin → submain → final circuit. Two things flow along the chain:

- **Ze.** The origin's Ze feeds the submain; the submain's Zs becomes the
  final circuit's Ze. One line in the handler, and the note says
  "(the submain's Zs)" rather than printing a number with no provenance.
- **Volts dropped.** Summed along the chain, then ONE percentage of the
  voltage at the point of utilisation.

**Why volts and not percentages.** A 415 V submain dropping 2% loses 8.3 V; a
230 V final circuit dropping 3% loses 6.9 V. Added as percentages: 5%, exactly
at the limit, pass. Added as volts: 15.2 V, which against the 230 V at the
socket is 6.61% — a third over the limit. The naive sum flatters the design in
the unsafe direction, and it flatters it most when the two links run at
different voltages, which is the normal case for a submain.

**Both levels are judged.** Each link gets the same four checks from the same
functions — nothing is re-implemented for the submain — and the chain total is
a fifth. The verdict names the level: FAIL (chain volt drop, submain capacity)
says the total is over AND the submain is undersized, while the final circuit
itself is fine.

That second half was a defect caught by a test during the build, on 23 Sep: the
submain's own failures appeared in the note and never reached the verdict. Same
shape as the volt-drop-only verdict of 19 Sep. Two parts each telling the truth
about their own question, with nothing making them agree — this project's
recurring failure, now caught in minutes rather than by reading a result.

**Deliberate simplifications, stated rather than hidden:**

- ONE set of installation conditions (Ca, Cg, Ci, Cf) serves both links. A real
  submain often runs hotter or in a different group; a second set of selects
  would nearly double the form.
- No discrimination check. Whether the final circuit's device clears before the
  submain's needs manufacturer time/current curves and let-through energy,
  which this tool does not hold.
- Two links only. The data model takes a list of links and the volt drop
  function takes an array, so a third link is a page change, not a maths
  change.

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

- Aluminium carries about 0.77–0.82 of copper's current at the same size,
  method and phase. A load-time guard (checkAluminiumBelowCopper) holds it to
  0.72–0.88 at every shared size: a copper table pasted into the aluminium
  slot reads 1.000 and stops the page.
- The implied-ρ check on aluminium runs on BOTH columns of Table 4D4B.
  Single-phase r carries ×2 (ρ = r × A ÷ 2000); three-phase r carries ×√3
  (ρ = r × A ÷ 1732). 50 mm² implies 0.0388 in both columns — the table,
  not a typo.
- Table 4D4B three-phase 240 mm² gives z = 0.28 against √(r² + x²) = 0.286,
  a 2.27% gap. Confirmed against the book 19 Sep 2026: it is the table's
  rounding, and it sits inside the 2.5% tolerance.

### Parked data — supplied 17 Sep 2026, not in the code

Correct tables with no matching capacity column yet. Shipping either against
the Method C PVC table would be wrong in the UNSAFE direction, because both
are gentler than the column actually in use.

**Ca, 90 °C thermosetting (XLPE), Table 4B1** — needs an XLPE capacity table:
25:1.02, 30:1.00, 35:0.96, 40:0.91, 45:0.87, 50:0.82, 55:0.76, 60:0.71,
65:0.65, 70:0.58, 75:0.50, 80:0.41

*(The bunched Cg column was parked here from 17 to 18 Sep 2026 waiting for a
capacity column to pair with. Methods A and B gave it one, and it now ships.)*

## Known limitations — 21 Sep 2026

The tool sizes on current-carrying capacity AND volt drop, with Ca, Cg, Ci
and Cf applied, and cross-checks volt drop against Table 4D2B or 4D4B. What it still
does not know:

- FOUR installation methods: A (conduit in an insulating wall), B (conduit on
  a wall or in trunking), C (clipped direct) and E (perforated tray, in three
  arrangements). Table 4D2A cols 2 to 9. Methods D, F and G are NOT held, nor
  is any single-core arrangement.
- Multicore 70 °C thermoplastic, non-armoured. Copper 1–400 mm²
  (Tables 4D2A/4D2B) or aluminium 16–400 mm² (Tables 4D4A/4D4B). Armoured
  (SWA) cable has its own tables and is not covered.
- Ci stops at 400 mm. A cable totally surrounded by insulation over a longer
  route is not held. Size that by hand.
- The BS 3036 rating ladder is not held. Selecting a BS 3036 fuse requires the
  rating to be typed in; the tool refuses to derive one.
- The device ladder tops out at 125 A. Above that the tool says so and stops.
- Zs is checked for TN-S and TN-C-S with Type B, C and D devices only. TT
  (needs the RCD rule) and BS 3036 are refused with their reasons. RCD
  disconnection, and the 5 s versus 0.4 s distinction for distribution
  circuits, are not modelled — for these devices one Ia satisfies both.
- Ze defaults are UK DNO design limits. On ECG's network they are assumptions
  until measured, and the note says which was used.
- The adiabatic check runs only where Zs runs: TN-S and TN-C-S with a Type B,
  C or D device. Its default t = 0.1 s is conservative at high fault currents
  (see The method), and the two armour k values cannot be verified by the
  load-time guard.
- Lead-sheathed cable (k = 26) is NOT held: the source gave no temperature
  pair to check it against, and it is not a cable used here.
- Chains TWO links only (origin → submain → final circuit), with one set of
  installation conditions shared by both, and no discrimination check between
  the two devices. See The method.
- No XLPE (90 °C thermosetting). Its Ca column is parked in Domain notes.
- USD pricing is indicative: a public mid-market rate plus the user's own FX
  allowance, not a bank quotation.

**A PASS is not a compliant design. It is an arithmetic result against the
conditions you declared.**

## Still to build

Nothing from the original list. Everything chosen on 17 Sep 2026 is built.

Candidates when work resumes, in no fixed order: XLPE (the Ca column is parked
in Domain notes and needs a matching capacity table); the TT earth electrode
and RCD rule; discrimination between devices in a chain; a third link in a
chain; BS 3036 and BS 88 fuse curves; armoured (SWA) cable tables.

Done and struck off: current-carrying capacity (16 Sep), correction factors
Ca/Cg/Ci/Cf (17 Sep), tabulated mV/A/m cross-check (17 Sep), capacity column by
core count (18 Sep), installation methods A/B/C/E (18 Sep), aluminium — data
and guards, CONDUCTORS registry, material select and 16 mm² refusal (19 Sep),
combined capacity + volt drop verdict (19 Sep), earth fault loop impedance —
computed Zs limits, 20 °C resistance table, TN-S/TN-C-S, Type B/C/D, TT and
BS 3036 refusals (21 Sep), adiabatic CPC check — CPC_TYPES registry, k
recomputed from physics, t as an input (21 Sep), cascading runs — chain volt
drop in volts, Ze carried forward, submain judged on its own terms (23 Sep).

Retired 21 Sep 2026: the six copper-only guard functions. One loop over
CONDUCTORS now runs the general guards over every metal, which gave copper two
checks it never had — the ρ window on its three-phase column, and coverage
driven by its own size list. 174 lines out, 40 in.

Small job outstanding: a hand-worked verified case for Zs, the adiabatic check
and a chain, ideally from a real job — every number in those three has been
checked by this tool against data supplied to it, never against a meter.

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
