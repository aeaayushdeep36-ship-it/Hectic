"""
Hetic engine study, v2 — model family search.

Question: can any single-scalar verdict model satisfy the published findings,
and if so, which one?

Literature constraints are marked [HARD] when a paper states the ordering
directly, [WEAK] when it is an inference from the role/coverage literature.
"""

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

# (higher, lower, weight, rationale)
CONSTRAINTS = [
    ("C4",  "C1",  "HARD", "4 prepayments > 30 opinions (Pattyn 2026)"),
    ("C4",  "C10", "HARD", "4 prepayments > 50 opinions (Pattyn 2026)"),
    ("C8",  "C10", "HARD", "3 LOIs > 50 opinions (Pattyn 2026, L5 vs L1)"),
    ("C9",  "C5",  "HARD", "equal n: payment > recalled behaviour"),
    ("C13", "C5",  "HARD", "6 payments > 12 recalled interviews"),
    ("C4",  "C3",  "HARD", "4 payments > 11 recalled + 3 buyers"),
    ("C2",  "C10", "HARD", "quantity alone must not reach the top band"),
    ("C3",  "C2",  "WEAK", "recalled + buyers > opinions with no buyers"),
    ("C6",  "C3",  "HARD", "wrong population is not interchangeable with right one"),
]


def band(score):
    return "L0" if score == 0 else f"L{score}"


# ---------------------------------------------------------------- models

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


def v1(c):
    if c["rel"] == 0: return 0
    if c["inpop"] == 0: return 0
    if c["kind"] == "wtp" and c["buy"] < 2: return 0
    req = [(1, 5, 3, 3, 1, 0, 1.00, 365), (2, 12, 8, 12, 3, 2, .50, 270), (3, 20, 15, 20, 5, 3, .30, 180)]
    best = 0
    for lvl, r, o, ip, ro, ch, nt, ag in req:
        if (c["rel"] >= r and c["orgs"] >= o and c["inpop"] >= ip and c["buy"] >= ro
                and c["ch"] >= ch and c["net"] <= nt and c["age"] <= ag):
            best = lvl
    return best


def cov(c):
    if c["inpop"] == 0: return 0
    if c["inpop"] < 5: return 1
    if c["inpop"] < 12: return 2
    if c["buy"] >= 3 and c["ch"] >= 2 and c["net"] <= .5: return 3
    return 2


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


REQN = {"E1": 24, "E2": 16, "E3": 10, "E4": 5, "E5": 3}


def v4(c):
    """Class-dependent sample requirement: payment needs 3, opinions need 24."""
    if c["rel"] == 0: return 0
    if c["inpop"] == 0: return 0
    if c["kind"] == "wtp" and c["buy"] < 2: return 0
    need = REQN[c["ev"]]
    if c["inpop"] < need * 0.30: s = 0
    elif c["inpop"] < need * 0.65: s = 1
    elif c["inpop"] < need: s = 2
    else: s = 3
    if c["ch"] < 2: s = min(s, 2)
    return s


def make_v5(w):
    """Weighted blend of evidence class and coverage, both normalised 0..1."""
    def v5(c):
        if c["rel"] == 0: return 0
        if c["inpop"] == 0: return 0
        if c["kind"] == "wtp" and c["buy"] < 2: return 0
        e = (EV[c["ev"]] - 1) / 4          # 0..1
        g = cov(c) / 3
        return min(3, round(3 * (w * e + (1 - w) * g)))
    return v5


# ---------------------------------------------------------------- scoring

def violations(fn):
    out = []
    for hi, lo, w, why in CONSTRAINTS:
        if not fn(BY[hi]) > fn(BY[lo]):
            out.append((hi, lo, w, why))
    return out


def weighted_violations(fn):
    return sum(2 if w == "HARD" else 1 for _, _, w, _ in violations(fn))


def monotonicity(fn):
    bad = 0
    for c in CASES:
        base = fn(c)
        for k in ("buy", "inpop", "ch", "rel", "orgs"):
            c2 = dict(c); c2[k] = c2[k] + 3
            if fn(c2) < base:
                bad += 1
    return bad


MODELS = {"V0 current": v0, "V1 relaxed": v1, "V2 two-axis": v2, "V3 GRADE": v3, "V4 class-n": v4}

print("=" * 92)
print("SCORE MATRIX")
print("=" * 92)
hdr = f"{'case':<6}{'n':>4}{'buy':>5}{'ev':>4}   " + "".join(f"{m:>14}" for m in MODELS)
print(hdr)
for c in CASES:
    print(f"{c['id']:<6}{c['n']:>4}{c['buy']:>5}{c['ev']:>4}   " + "".join(f"{fn(c):>14}" for fn in MODELS.values()))

print()
print("=" * 92)
print("CONSTRAINT CHECKS")
print("=" * 92)
for hi, lo, w, why in CONSTRAINTS:
    marks = ""
    for name, fn in MODELS.items():
        ok = fn(BY[hi]) > fn(BY[lo])
        marks += f"{name}:{'PASS' if ok else 'fail':>16}"
    print(f"[{w}] {hi} > {lo}{marks}")
    print(f"        {why}")

print()
print("=" * 92)
print("SUMMARY")
print("=" * 92)
print(f"{'model':<16}{'hard fails':>12}{'weak fails':>12}{'weighted':>10}{'mono':>8}")
for name, fn in MODELS.items():
    vs = violations(fn)
    hard = sum(1 for _, _, w, _ in vs if w == "HARD")
    weak = sum(1 for _, _, w, _ in vs if w == "WEAK")
    print(f"{name:<16}{hard:>12}{weak:>12}{weighted_violations(fn):>10}{monotonicity(fn):>8}")

print()
print("=" * 92)
print("V5 GRID SEARCH — blend weight w on evidence class")
print("=" * 92)
print(f"{'w':>6}{'hard':>8}{'weak':>8}{'weighted':>10}{'mono':>8}")
best = None
for i in range(0, 101, 5):
    w = i / 100
    fn = make_v5(w)
    vs = violations(fn)
    hard = sum(1 for _, _, k, _ in vs if k == "HARD")
    weak = sum(1 for _, _, k, _ in vs if k == "WEAK")
    wv = weighted_violations(fn)
    mo = monotonicity(fn)
    print(f"{w:>6.2f}{hard:>8}{weak:>8}{wv:>10}{mo:>8}")
    if best is None or (wv, hard) < (best[1], best[2]):
        best = (w, wv, hard)

print()
print(f"Best V5 weight: w={best[0]:.2f}  weighted violations={best[1]}  hard={best[2]}")
