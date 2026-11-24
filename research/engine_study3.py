"""
Hetic engine study, v3 — corrected constraints + satisfiability proof.

Adds the decisive question: does ANY single-scalar assignment (0..3 over the
case set) satisfy the published constraints? If not, a one-dimensional
verdict is provably the wrong shape and the engine must report two axes.
"""

from itertools import product

CASES = [
    dict(id="C1",  n=30, rel=30, inpop=30, buy=0,  orgs=30, ch=1,  net=0.90, ev="E1", age=60, kind="wtp"),
    dict(id="C2",  n=11, rel=11, inpop=11, buy=0,  orgs=9,  ch=1,  net=0.82, ev="E1", age=60, kind="wtp"),
    dict(id="C3",  n=11, rel=11, inpop=11, buy=3,  orgs=10, ch=2,  net=0.45, ev="E2", age=90, kind="wtp"),
    dict(id="C4",  n=4,  rel=4,  inpop=4,  buy=4,  orgs=4,  ch=1,  net=0.25, ev="E5", age=30, kind="wtp"),
    dict(id="C5",  n=12, rel=12, inpop=12, buy=6,  orgs=12, ch=3,  net=0.33, ev="E2", age=60, kind="wtp"),
    dict(id="C6",  n=20, rel=20, inpop=0,  buy=0,  orgs=18, ch=3,  net=0.40, ev="E2", age=60, kind="wtp"),
    dict(id="C7",  n=8,  rel=8,  inpop=8,  buy=8,  orgs=8,  ch=2,  net=0.50, ev="E1", age=45, kind="wtp"),
    dict(id="C8",  n=3,  rel=3,  inpop=3,  buy=3,  orgs=3,  ch=1,  net=0.33, ev="E4", age=30, kind="wtp"),
    dict(id="C9",  n=12, rel=12, inpop=12, buy=4,  orgs=12, ch=3,  net=0.25, ev="E5", age=45, kind="wtp"),
    dict(id="C10", n=50, rel=50, inpop=50, buy=50, orgs=50, ch=10, net=0.20, ev="E1", age=30, kind="wtp"),
    dict(id="C11", n=0,  rel=0,  inpop=0,  buy=0,  orgs=0,  ch=0,  net=0.00, ev="E1", age=999, kind="wtp"),
    dict(id="C12", n=15, rel=15, inpop=15, buy=5,  orgs=14, ch=3,  net=0.33, ev="E3", age=60, kind="pain"),
    dict(id="C13", n=6,  rel=6,  inpop=6,  buy=6,  orgs=6,  ch=2,  net=0.33, ev="E5", age=30, kind="wtp"),
    dict(id="C14", n=40, rel=40, inpop=40, buy=4,  orgs=35, ch=5,  net=0.40, ev="E1", age=60, kind="wtp"),
]
EV = {"E1": 1, "E2": 2, "E3": 3, "E4": 4, "E5": 5}
BY = {c["id"]: c for c in CASES}

# Corrected. gt(a,b) means score(a) must exceed score(b).
GT = [
    ("C4",  "C1",  "HARD", "4 prepayments > 30 opinions (Pattyn 2026, L6 vs L1)"),
    ("C4",  "C10", "HARD", "4 prepayments > 50 opinions (Pattyn 2026)"),
    ("C8",  "C10", "HARD", "3 LOIs > 50 opinions (Pattyn 2026, L5 vs L1)"),
    ("C9",  "C5",  "HARD", "equal n: payment > recalled behaviour"),
    ("C13", "C5",  "HARD", "6 payments > 12 recalled interviews"),
    ("C3",  "C6",  "HARD", "right population > wrong population"),
    ("C10", "C2",  "WEAK", "more opinions from buyers > fewer without buyers"),
    ("C14", "C2",  "WEAK", "40 opinions across segments > 11 in one"),
    ("C4",  "C3",  "CONTESTED", "4 payments ~ 11 recalled + 3 buyers"),
]
# Absolute caps: opinions must never reach the top band.
CEILING = [("C10", 2, "50 opinions must not reach L3"),
           ("C14", 2, "40 opinions must not reach L3"),
           ("C1",  2, "30 opinions must not reach L3"),
           ("C2",  2, "11 opinions must not reach L3")]


def cov(c):
    if c["inpop"] == 0: return 0
    if c["inpop"] < 5: return 1
    if c["inpop"] < 12: return 2
    if c["buy"] >= 3 and c["ch"] >= 2 and c["net"] <= .5: return 3
    return 2


def v0(c):
    if c["rel"] == 0: return 0
    if c["inpop"] == 0: return 0
    if c["kind"] == "wtp" and c["buy"] < 2: return 0
    req = [(1, 5, 3, 3, 1, 2, .60, 365), (2, 12, 8, 12, 3, 2, .50, 270), (3, 20, 15, 20, 5, 3, .30, 180)]
    best = 0
    for lvl, r, o, ip, ro, ch, nt, ag in req:
        if (c["rel"] >= r and c["orgs"] >= o and c["inpop"] >= ip and c["buy"] >= ro
                and c["ch"] >= ch and c["net"] <= nt and c["age"] <= ag):
            best = lvl
    return best


def v2(c):
    if c["rel"] == 0: return 0
    return max(0, min(EV[c["ev"]], cov(c) + 1) - 1)


def v3(c):
    if c["rel"] == 0: return 0
    if c["inpop"] == 0: return 0
    base = {"E1": 1, "E2": 2, "E3": 2, "E4": 3, "E5": 3}[c["ev"]]
    dg = {3: 0, 2: 1, 1: 2, 0: 3}[cov(c)]
    s = max(0, base - dg)
    if c["kind"] == "wtp" and c["buy"] < 2: s = 0
    return s


def make_v5(w):
    def f(c):
        if c["rel"] == 0: return 0
        if c["inpop"] == 0: return 0
        if c["kind"] == "wtp" and c["buy"] < 2: return 0
        e = (EV[c["ev"]] - 1) / 4
        g = cov(c) / 3
        return max(0, min(3, round(3 * (w * e + (1 - w) * g))))
    return f


MODELS = {"V0 current": v0, "V2 two-axis": v2, "V3 GRADE": v3,
          "V5 w=0.70": make_v5(0.70), "V5 w=0.80": make_v5(0.80)}


def score_model(fn):
    hard = sum(1 for a, b, k, _ in GT if k == "HARD" and not fn(BY[a]) > fn(BY[b]))
    weak = sum(1 for a, b, k, _ in GT if k == "WEAK" and not fn(BY[a]) > fn(BY[b]))
    con = sum(1 for a, b, k, _ in GT if k == "CONTESTED" and not fn(BY[a]) > fn(BY[b]))
    ceil = sum(1 for a, cap, _ in CEILING if fn(BY[a]) > cap)
    return hard, weak, con, ceil


print("=" * 96)
print("SCORE MATRIX")
print("=" * 96)
print(f"{'case':<6}{'n':>4}{'buy':>5}{'ev':>4}   " + "".join(f"{m:>14}" for m in MODELS))
for c in CASES:
    print(f"{c['id']:<6}{c['n']:>4}{c['buy']:>5}{c['ev']:>4}   " + "".join(f"{fn(c):>14}" for fn in MODELS.values()))

print()
print("=" * 96)
print("FAILURES")
print("=" * 96)
print(f"{'model':<14}{'HARD':>7}{'weak':>7}{'contested':>11}{'ceiling':>9}   failing checks")
for name, fn in MODELS.items():
    h, w, ct, ce = score_model(fn)
    fails = [f"{a}>{b}" for a, b, k, _ in GT if k == "HARD" and not fn(BY[a]) > fn(BY[b])]
    fails += [f"{a}<={cap}" for a, cap, _ in CEILING if fn(BY[a]) > cap]
    print(f"{name:<14}{h:>7}{w:>7}{ct:>11}{ce:>9}   {', '.join(fails)}")

print()
print("=" * 96)
print("SATISFIABILITY: does any 0..3 assignment exist over the constrained cases?")
print("=" * 96)
ids = sorted({a for a, b, k, _ in GT if k != "CONTESTED"} | {b for a, b, k, _ in GT if k != "CONTESTED"})
print(f"cases constrained: {ids}  ({len(ids)} vars, 4^{len(ids)} = {4**len(ids):,} assignments)")

sols = 0
witness = None
for combo in product(range(4), repeat=len(ids)):
    a = dict(zip(ids, combo))
    ok = all(a[x] > a[y] for x, y, k, _ in GT if k == "HARD")
    if ok:
        ok = all(a[x] <= cap for x, cap, _ in CEILING if x in a)
    if ok:
        sols += 1
        if witness is None:
            witness = dict(a)

print(f"assignments satisfying all HARD + ceiling constraints: {sols:,}")
if sols:
    print("witness:", witness)

print()
print("Now add the CONTESTED ordering C4 > C3:")
sols2 = 0
witness2 = None
for combo in product(range(4), repeat=len(ids)):
    a = dict(zip(ids, combo))
    ok = all(a[x] > a[y] for x, y, k, _ in GT if k in ("HARD", "CONTESTED"))
    if ok:
        ok = all(a[x] <= cap for x, cap, _ in CEILING if x in a)
    if ok:
        sols2 += 1
        if witness2 is None:
            witness2 = dict(a)
print(f"assignments satisfying HARD + CONTESTED + ceiling: {sols2:,}")
if sols2:
    print("witness:", witness2)
