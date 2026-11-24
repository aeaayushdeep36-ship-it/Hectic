"""
Hetic engine study — do the competing designs survive the literature?

Reference constraints are taken from published findings, not from any engine:
  - Pattyn, Dillen & Goetz (2026), Computers 15(8):535
      "No clear relationship between the number of validation events and
       startup performance... Level 6 (paying customers) is the strongest
       form of pre-MVP market evidence."
  - Guest, Bunce & Johnson (2006): code saturation ~12, basic metathemes ~6
  - Hennink, Kaiser & Marconi (2017): code sat 9-17, meaning sat 16-24
  - Wilson (1927) intervals for small-n proportions
  - NATO AJP-2.1: reliability and credibility rated on independent axes
"""

from itertools import combinations

LEVELS = 4  # 0..3

# ---------------------------------------------------------------- case corpus

# evidence_class: E1 opinion, E2 recalled behaviour, E3 observed/artifact,
#                 E4 commitment (LOI/deposit), E5 payment
CASES = [
    dict(id="C1",  desc="30 opinions, network only, zero buyers",        kind="wtp",
         n=30, relevant=30, in_pop=30, buyers=0,  orgs=30, channels=1, net=0.90, ev="E1", age=60),
    dict(id="C2",  desc="11 opinions, one segment, zero buyers",         kind="wtp",
         n=11, relevant=11, in_pop=11, buyers=0,  orgs=9,  channels=1, net=0.82, ev="E1", age=60),
    dict(id="C3",  desc="11 recalled-behaviour, 3 buyers, 2 channels",   kind="wtp",
         n=11, relevant=11, in_pop=11, buyers=3,  orgs=10, channels=2, net=0.45, ev="E2", age=90),
    dict(id="C4",  desc="4 prepayments from 4 buyers",                   kind="wtp",
         n=4,  relevant=4,  in_pop=4,  buyers=4,  orgs=4,  channels=1, net=0.25, ev="E5", age=30),
    dict(id="C5",  desc="12 recalled-behaviour, 6 buyers, 3 channels",   kind="wtp",
         n=12, relevant=12, in_pop=12, buyers=6,  orgs=12, channels=3, net=0.33, ev="E2", age=60),
    dict(id="C6",  desc="20 users, no buyers, WTP claim",                kind="wtp",
         n=20, relevant=20, in_pop=0,  buyers=0,  orgs=18, channels=3, net=0.40, ev="E2", age=60),
    dict(id="C7",  desc="8 buyers, opinions only, 2 channels",           kind="wtp",
         n=8,  relevant=8,  in_pop=8,  buyers=8,  orgs=8,  channels=2, net=0.50, ev="E1", age=45),
    dict(id="C8",  desc="3 signed LOIs from 3 buyers",                   kind="wtp",
         n=3,  relevant=3,  in_pop=3,  buyers=3,  orgs=3,  channels=1, net=0.33, ev="E4", age=30),
    dict(id="C9",  desc="12 interviews, 4 buyers, 3 channels, 2 prepaid",kind="wtp",
         n=12, relevant=12, in_pop=12, buyers=4,  orgs=12, channels=3, net=0.25, ev="E5", age=45),
    dict(id="C10", desc="50 opinions, 10 channels, all buyers",          kind="wtp",
         n=50, relevant=50, in_pop=50, buyers=50, orgs=50, channels=10, net=0.20, ev="E1", age=30),
    dict(id="C11", desc="no interviews",                                 kind="wtp",
         n=0,  relevant=0,  in_pop=0,  buyers=0,  orgs=0,  channels=0, net=0.00, ev="E1", age=999),
    dict(id="C12", desc="15 interviews, 5 buyers, workarounds observed", kind="pain",
         n=15, relevant=15, in_pop=15, buyers=5,  orgs=14, channels=3, net=0.33, ev="E3", age=60),
    dict(id="C13", desc="6 interviews, 6 buyers, 2 prepaid",             kind="wtp",
         n=6,  relevant=6,  in_pop=6,  buyers=6,  orgs=6,  channels=2, net=0.33, ev="E5", age=30),
    dict(id="C14", desc="40 opinions, 3 segments, 4 buyers, 5 channels", kind="wtp",
         n=40, relevant=40, in_pop=40, buyers=4,  orgs=35, channels=5, net=0.40, ev="E1", age=60),
]

EV_RANK = {"E1": 1, "E2": 2, "E3": 3, "E4": 4, "E5": 5}


# ------------------------------------------------------------------- engines

def v0_current(c):
    """As specified in docs/01-prd.md: AND-conditions per level."""
    if c["relevant"] == 0:
        return 0, "UNTOUCHED"
    if c["in_pop"] == 0:
        return 0, "WRONG_POPULATION"
    if c["kind"] == "wtp" and c["buyers"] < 2:
        return 0, "DOWNGRADE"

    reqs = [
        (1, dict(rel=5,  orgs=3,  inpop=3,  role=1, ch=2, net=0.60, age=365)),
        (2, dict(rel=12, orgs=8,  inpop=12, role=3, ch=2, net=0.50, age=270)),
        (3, dict(rel=20, orgs=15, inpop=20, role=5, ch=3, net=0.30, age=180)),
    ]
    best = 0
    for lvl, r in reqs:
        if (c["relevant"] >= r["rel"] and c["orgs"] >= r["orgs"]
                and c["in_pop"] >= r["inpop"] and c["buyers"] >= r["role"]
                and c["channels"] >= r["ch"] and c["net"] <= r["net"]
                and c["age"] <= r["age"]):
            best = lvl
    return best, "DOWNGRADE" if best < 3 else "MATCHES"


def v1_relaxed(c):
    """V0 with the L1 independence requirements removed."""
    if c["relevant"] == 0:
        return 0, "UNTOUCHED"
    if c["in_pop"] == 0:
        return 0, "WRONG_POPULATION"
    if c["kind"] == "wtp" and c["buyers"] < 2:
        return 0, "DOWNGRADE"

    reqs = [
        (1, dict(rel=5,  orgs=3,  inpop=3,  role=1, ch=0, net=1.00, age=365)),
        (2, dict(rel=12, orgs=8,  inpop=12, role=3, ch=2, net=0.50, age=270)),
        (3, dict(rel=20, orgs=15, inpop=20, role=5, ch=3, net=0.30, age=180)),
    ]
    best = 0
    for lvl, r in reqs:
        if (c["relevant"] >= r["rel"] and c["orgs"] >= r["orgs"]
                and c["in_pop"] >= r["inpop"] and c["buyers"] >= r["role"]
                and c["channels"] >= r["ch"] and c["net"] <= r["net"]
                and c["age"] <= r["age"]):
            best = lvl
    return best, "DOWNGRADE" if best < 3 else "MATCHES"


def coverage_grade(c):
    if c["in_pop"] == 0:
        return 0
    if c["in_pop"] < 5:
        return 1
    if c["in_pop"] < 12:
        return 2
    if c["buyers"] >= 3 and c["channels"] >= 2 and c["net"] <= 0.5:
        return 3
    return 2


def v2_two_axis(c):
    """NATO-style: evidence class and coverage kept independent.
    Headline = min(class, coverage) so neither axis can carry the other."""
    if c["relevant"] == 0:
        return 0, "UNTOUCHED"
    e = EV_RANK[c["ev"]]
    g = coverage_grade(c)
    score = min(e, g + 1)          # coverage caps, but cannot manufacture class
    return score - 1, "PAIR"


def v3_grade(c):
    """GRADE-style: baseline set by evidence class, then downgrade for coverage.
    Quantity can never raise the ceiling set by evidence type."""
    if c["relevant"] == 0:
        return 0, "UNTOUCHED"
    if c["in_pop"] == 0:
        return 0, "WRONG_POPULATION"

    baseline = {"E1": 1, "E2": 2, "E3": 2, "E4": 3, "E5": 3}[c["ev"]]
    g = coverage_grade(c)
    downgrade = {3: 0, 2: 1, 1: 2, 0: 3}[g]
    score = max(0, baseline - downgrade)

    # a stated-WTP claim with no budget holder cannot exceed Very Low
    if c["kind"] == "wtp" and c["buyers"] < 2:
        score = 0
    return score, "GRADE"


ENGINES = {
    "V0 current": v0_current,
    "V1 relaxed": v1_relaxed,
    "V2 two-axis": v2_two_axis,
    "V3 GRADE-style": v3_grade,
}


# -------------------------------------------------- literature constraints
# Each tuple: (must_be_higher, must_be_lower, justification)
CONSTRAINTS = [
    ("C4",  "C1",  "4 prepayments > 30 opinions (Pattyn 2026, L6 vs L1)"),
    ("C4",  "C2",  "4 prepayments > 11 opinions"),
    ("C4",  "C10", "4 prepayments > 50 opinions"),
    ("C8",  "C10", "3 LOIs > 50 opinions"),
    ("C3",  "C2",  "recalled behaviour + buyers > opinions only"),
    ("C9",  "C5",  "same n, payment evidence > recalled evidence"),
    ("C13", "C5",  "6 interviews with prepayment > 12 recalled"),
    ("C3",  "C7",  "recalled + buyers > opinions from buyers"),
    ("C7",  "C2",  "opinions from buyers > opinions from non-buyers"),
    ("C10", "C4",  "CEILING VIOLATION if quantity can beat payment"),
]


def main():
    print("=" * 78)
    print("CASE SCORES")
    print("=" * 78)
    print(f"{'ID':<5}{'n':>4}{'buy':>5}{'ev':>4}  " +
          "".join(f"{name:>15}" for name in ENGINES))
    for c in CASES:
        row = f"{c['id']:<5}{c['n']:>4}{c['buyers']:>5}{c['ev']:>4}  "
        for fn in ENGINES.values():
            s, _ = fn(c)
            row += f"{s:>15}"
        print(row)

    print()
    print("=" * 78)
    print("CONSTRAINT VIOLATIONS (lower is better)")
    print("=" * 78)
    totals = {k: 0 for k in ENGINES}
    by_id = {c["id"]: c for c in CASES}
    for hi, lo, why in CONSTRAINTS:
        line = ""
        for name, fn in ENGINES.items():
            a, _ = fn(by_id[hi])
            b, _ = fn(by_id[lo])
            ok = a > b
            if not ok:
                totals[name] += 1
            line += f"{name}:{'ok' if ok else 'FAIL':>12}  "
        print(f"{hi} > {lo}   {line}")
        print(f"          {why}")
    print()
    print("Violation totals:", totals)

    print()
    print("=" * 78)
    print("MONOTONICITY: adding a buyer/evidence must never lower a score")
    print("=" * 78)
    for name, fn in ENGINES.items():
        bad = 0
        for c in CASES:
            for key in ("buyers", "in_pop", "channels", "relevant"):
                c2 = dict(c)
                c2[key] = c[key] + 3
                a, _ = fn(c)
                b, _ = fn(c2)
                if b < a:
                    bad += 1
                    print(f"  {name}: {c['id']} {key}+3  {a} -> {b}  VIOLATION")
        print(f"{name:<16} violations: {bad}")

    print()
    print("=" * 78)
    print("THRESHOLD SENSITIVITY: % of verdicts that move under +/-20% thresholds")
    print("=" * 78)

    def perturbed_v0(c, f):
        if c["relevant"] == 0:
            return 0
        if c["in_pop"] == 0:
            return 0
        if c["kind"] == "wtp" and c["buyers"] < 2:
            return 0
        reqs = [(1, 5, 3, 3, 1, 2, 0.60, 365),
                (2, 12, 8, 12, 3, 2, 0.50, 270),
                (3, 20, 15, 20, 5, 3, 0.30, 180)]
        best = 0
        for lvl, rel, orgs, inpop, role, ch, net, age in reqs:
            if (c["relevant"] >= rel * f and c["orgs"] >= orgs * f
                    and c["in_pop"] >= inpop * f and c["buyers"] >= role * f
                    and c["channels"] >= ch * f and c["net"] <= min(1, net * f)
                    and c["age"] <= age * f):
                best = lvl
        return best

    for name, fn in [("V0 current", v0_current), ("V1 relaxed", v1_relaxed)]:
        base = [fn(c)[0] for c in CASES]
        moved = 0
        for f in (0.8, 1.2):
            alt = [perturbed_v0(c, f) for c in CASES]
            moved += sum(1 for a, b in zip(base, alt) if a != b)
        print(f"{name:<16} verdicts changed: {moved} of {len(CASES)*2} perturbations")

    print()
    print("(V2/V3 carry only the coverage cutoffs, which are count-based and")
    print(" reported separately; they have no tunable n-thresholds to perturb.)")


if __name__ == "__main__":
    main()
