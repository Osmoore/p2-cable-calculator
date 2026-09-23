# Journal — Project 2 (Cable Calculator)

*23 September 2026*

P2 started as a quick form to size a radial cable and price it. It ended as a verified engineering tool with a two-link chain, EFLI, an adiabatic check, and pricing that handles Ghanaian Cedis and US Dollars without breaking when the internet drops. 

Fourteen sessions taught me five things about writing engineering software that I want locked in before touching P3.

---

### 1. Two sources agreeing is proof; two sources disagreeing is an alarm

For four days, this engine ran on $\rho = 0.018\,\Omega\cdot\text{mm}^2/\text{m}$ for copper. I had written in the comments that it was "copper at operating temperature", but 0.018 is barely warm—it is essentially the cold $20^\circ\text{C}$ laboratory figure. Every voltage drop the tool computed was roughly 20% too optimistic, leaning straight into the unsafe direction.

No test runner or syntax linter caught it. It was caught because I wrote a cross-check: the primary tabulated $mV/A/m$ method running side-by-side against the classical resistivity equation. When they disagreed by 18%, the math made the truth obvious. Rearranging the standard's own table across eighteen cable sizes gave an average $\rho$ of 0.022. The moment $\rho$ was corrected to 0.022, the gap between the two methods collapsed to under 2%. 

If you hold only one source, you have no way to know when you have mistyped the world. Hold two independent sources and display both.

### 2. When a cross-check disagrees, don't assume the book is wrong

When a formula and a published table clash, the natural instinct is to suspect a typo in the table. Real engineering software quickly humbles that assumption.

Case in point: Table 54.4 gives $k = 51$ for steel wire armour between initial $60^\circ\text{C}$ and final $160^\circ\text{C}$. When running the physics check derived from thermodynamic constants, the calculation returned 44.4 instead of 51, leading to the immediate suspicion that the book's printed temperatures were wrong. Reading the printed page directly confirmed that Table 54.4 explicitly states $60^\circ\text{C}$, $160^\circ\text{C}$, and $k = 51$. The check was wrong, not the book: steel wire armour behaves mechanically and thermally differently from a bare drawn steel conductor. The resolution was to mark both armour rows `checkable: false` in the registry and state out loud in the code that they rest on the standard's authority alone.

A cross-check that disagrees tells you something is wrong—it doesn't tell you *what*. Twice in this project it caught bad data; once it caught a bad check.

### 3. If two parts of the screen disagree, one is lying

On 19 September, I ran a real test case: 63 A three-phase, 100 m, 25 mm² cable, Method C, grouped in 40 °C ambient. The sizing note at the bottom warned in red: *"Minimum 35 mm² … You specified 25 mm² — that is UNDERSIZED"*. But the results table row proudly showed a green **PASS**.

Both calculations were mathematically true on their own terms. The volt drop was 2.28% (well inside the 5% limit), and that was the only question `evaluateVerdict` was answering. The thermal capacity check lived only in the narrative note. 

A user in the field glances at the green badge and installs the cable. Now, `combineVerdicts` evaluates thermal capacity, volt drop, loop impedance, and adiabatic survival together. If any one fails, the row shows a failure and names exactly which check fell short.

### 4. One choice must decide all its consequences

Whenever one physical choice affected two separate variables, putting them in two places caused them to drift. I solved this by using unified registry objects:
* Choosing an installation arrangement (`INSTALLATION_ARRANGEMENTS`) sets both the capacity column and the grouping row ($C_g$).
* Choosing a metal (`CONDUCTORS`) sets the capacity table, volt drop table, $\rho$, the $\rho$ acceptance window, and the conductor size list.
* Choosing a CPC (`CPC_TYPES`) binds the metal, the temperature limits, and the physics-derived $k$ factor together.

If the user picks aluminium, the tool cannot physically evaluate copper volt drop or check sizes below 16 mm². When one selection drives a single registry lookup, invalid combinations become structurally impossible.

### 5. Percentages cannot be added

When cascading from a submain into a final circuit, the obvious shortcut is adding the percentages: 2% drop on the submain plus 3% drop on the final circuit equals 5% total—a clean pass.

That shortcut is mathematically false and dangerous. Percentages are relative to their base voltage. A 2% drop on a 415 V three-phase submain is 8.3 V. A 3% drop on a 230 V single-phase final circuit is 6.9 V. Summed as actual volts, that is 15.2 V lost. Measured against the 230 V socket where the equipment plugs in, 15.2 V is **6.61%**—a massive failure that is a third over the statutory 5% threshold.

Always sum physical quantities (volts, ohms, milliohms). Never sum percentages.

---

P2 is built and tested. Volt drop and capacity are verified against seven hand-worked cases. Zs, the adiabatic check, and the chain are verified only against the tables and the physics behind them — the first real test of those comes with a measured $Z_e$ and a measured $Z_s$ from a job. Moving to P3.