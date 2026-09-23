# Cable Calculator (P2)

A cable sizer for one run or a two-link chain (submain into a final circuit). Given route lengths, design load currents, and the installation conditions the cables run in, it works out what conductor size each link needs, what the voltage drop will be across the run, whether earth faults trip the breaker in time, and whether the protective earth conductor survives the fault while that happens. It also prices the cable in Ghanaian Cedis or US Dollars.

No build step, no npm packages, no framework, no backend. Open `index.html` in a browser.

---

## 1. What It Does

The engine answers five engineering questions for every run — overheating, volt drop, loop impedance, CPC survival, and how those cascade down a two-link chain — and then turns the cable into an itemised cost:

1. **Will the cable overheat? (Current-carrying capacity):**
   * Follows Regulation 433.1.1 ($I_b \le I_n \le I_z$). The cable is sized to carry the breaker rating ($I_n$), not just the design current ($I_b$).
   * $I_n$ is derived automatically from $I_b$ using the next standard BS EN 60898 step (6, 10, 16, 20, 25, 32, 40, 50, 63, 80, 100, 125 A), and can be manually edited.
   * Derating factors inflate the requirement ($I_t = I_n / (C_a \cdot C_g \cdot C_i \cdot C_f)$); they do not derate the cable table.
   * Tables: Multicore 70 °C PVC copper (Table 4D2A) and aluminium (Table 4D4A) across Installation Methods A, B, C, and E. The capacity column is chosen strictly by core count: 2-core for single-phase, 3/4-core for three-phase.

2. **Will the volts hold up? (Voltage drop):**
   * Tabulated method (primary): BS 7671 Table 4D2B (copper) or Table 4D4B (aluminium), using the $z$ column from 25 mm² upward to account for a.c. reactance.
   * Resistivity method (cross-check): $V_d = (\text{factor} \cdot L \cdot I_b \cdot \rho) / A$, run at operating temperature ($\rho = 0.022$ for copper, $0.0365$ for aluminium). Both numbers are shown side by side.
   * Evaluated against 3.0% for Lighting and 5.0% for Power. A submain feeding both should be run at the stricter 3.0% figure by selecting Lighting on the form.

3. **Will a fault trip the breaker in time? (Earth fault loop impedance, $Z_s$):**
   * $Z_s = Z_e + (R_1 + R_2) \cdot 1.20 \cdot L / 1000$.
   * $Z_e$ takes measured site values or standard network defaults (0.35 Ω for TN-C-S, 0.80 Ω for TN-S).
   * $(R_1 + R_2)$ is summed from individual conductor resistances at 20 °C (Table I1) and warmed to 70 °C by the 1.20 factor.
   * Compared against the computed limit $(C_{min} \cdot U_0) / (I_a \cdot I_n)$ for Type B ($5 \cdot I_n$), Type C ($10 \cdot I_n$), and Type D ($20 \cdot I_n$). The 80% cold rule-of-thumb limit is printed beside it for meter verification.

4. **Will the CPC survive while it trips? (Adiabatic check):**
   * $S \ge \sqrt{I^2 \cdot t} / k$, where $I = U_0 / Z_s$.
   * $k$ factors are verified from physics and temperature limits using conductor constants: $k = 115$ for a copper CPC inside a PVC cable, $143$ for a separate PVC-insulated one, up to $228$ for bare copper.
   * Trip time $t$ defaults conservatively to 0.1 s, but remains an input field so a value read off a manufacturer's let-through energy sheet can replace the assumption.

5. **Two-link cascading (Origin $\rightarrow$ Submain $\rightarrow$ Final Circuit):**
   * Cascades $Z_e$: the submain's calculated $Z_s$ becomes the incoming $Z_e$ of the final circuit board.
   * Drops are summed as raw volts, not percentages ($V_{total} = V_{submain} + V_{final}$), and then compared as one final percentage against the utilisation voltage.
   * The submain is evaluated on its own terms: a run can fail on submain capacity while passing the final run, and the verdict names which failed.

6. **Cable Cost & Pricing:**
   * Calculated as unit price per metre multiplied by run length to give a total cost per row.
   * Money is calculated strictly in integer minor units (pesewas / cents) and rounded only once at the final total.
   * Local GHS quotes run offline with no external network calls.
   * USD quotes convert using a locked mid-market rate plus an editable, visible FX allowance percentage. The quote's timestamp reflects when this tool locked the rate, not when the rate was generated at the source; browsers can serve a cached rate up to an hour old.

---

## 2. What It Refuses to Do (And Why)

The code throws or displays a refusal message rather than guessing an ungrounded number:

* **TT Earthing Systems:** Refused for $Z_s$. TT systems rely on an earth electrode ($R_A$) and RCD disconnection ($R_A \cdot I_{\Delta n} \le 50\text{ V}$), not on overcurrent breaker magnetic trip thresholds. Running TT against a Type B table would fail almost every sound installation.
* **BS 3036 Rewirable Fuses:** Refused for automatic sizing and $Z_s$. The tool does not store the BS 3036 rating ladder, nor does it hold the empirical time-current curves needed to find $I_a$. If chosen, the user must supply the rating by hand.
* **90 °C Thermosetting (XLPE):** Refused. The $C_a$ column is parked in Domain Notes, but the matching capacity tables are not in the code. Shipping XLPE derating factors against PVC cable tables would be unsafe.
* **Aluminium below 16 mm²:** Refused. BS 7671 Table 52.1 does not permit aluminium conductors below 16 mm² for installation wiring. The tool stops and refuses to fall back to the resistivity formula.
* **Chains longer than two links:** Refused. The calculation models one submain and one final circuit.
* **Discrimination / Selectivity:** Refused. Verifying whether a final circuit breaker clears upstream of a submain breaker requires manufacturer energy let-through ($I^2 t$) and time-current envelopes. Sizing compliance does not imply discrimination.

---

## 3. Why a PASS Is Not a Compliant Design

> **A PASS from this tool is simple arithmetic against the numbers and options you selected. If you feed it the wrong conditions, it will calculate a wrong answer and display a green PASS.**

* **Declared vs. actual route:** If you choose Reference Method C (clipped direct) on the form, but pull the cable inside thermal insulation or bunch it with six other circuits without declaring them, the real cable will overheat on a load the tool said was safe.
* **Network assumptions:** Default $Z_e$ figures (0.35 Ω for PME / 0.80 Ω for TN-S) are standard UK supply limits. On an unfamiliar distribution network, they are guesses until verified with a loop tester. An unmeasured $Z_e$ means the calculated $Z_s$ is also an unmeasured guess.
* **Physical constraints:** The calculator checks thermal capacity, voltage drop, loop impedance, and adiabatic survival. It knows nothing about bend radius, pulling tension, containment weight limits, UV exposure, chemical contact, or terminal torque specs.
* **Engineering responsibility:** Software arithmetic cannot sign off an installation. A valid design requires on-site inspection, measurement with calibrated test instruments, and an Electrical Installation Certificate signed by a qualified person.