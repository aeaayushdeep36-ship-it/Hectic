"""
Hetic engine study 4 — the decisive comparison.

Pattyn, Dillen & Goetz (2026), Computers 15(8):535, verified from full text:
  L1  founder-internal / informal interest (own-itch, casual conversation)
  L2  structured stated evidence (surveys, exploratory/ discovery interviews)
  L3  concept exposure without commitment (prototype, wireframe, landing page, MVE)
  L4  behavioural commitment, non-financial (signup, waitlist, pilot agreement, LOI)
  L5  contingent investment commitment (pre-MVP funding)
  L6  paying customer pre-MVP
Ordering logic: increasing external commitment, decreasing uncertainty.
Explicit finding: "No clear relationship between the number of validation events
and startup performance." Quantity does not substitute for type.

Guest, Bunce & Johnson (2006): basic metathemes at 6 interviews, code
saturation at 12.
Hennink, Kaiser & Marconi (2017): code saturation 9-17, meaning saturation 16-24.
CERQual: adequacy and relevance are assessed separately from methodological
strength; overall confidence is driven by the weakest component.
Wilson & Lilien (1992): informant != organisation; multi-informant per org is not
independent evidence about the org.
"""

CASES = [
    # id,  description,                                        type_orgs, in_pop_orgs
    ("C1",  "30 discovery interviews, no commitment",            {2: 30}, 30),
    ("C2",  "11 interviews from 9 orgs, one network",             {2: 9},  9),
    ("C3",  "11 interviews, 3 budget holders, recalled spend",    {2: 10}, 10),
    ("C4",  "4 prepayments from 4 orgs",                          {6: 4},  4),
    ("C5",  "12 interviews, 6 verbal yes",                        {2: 12}, 12),
    ("C6",  "20 interviews with end users, claim is about buyers",{2: 18}, 0),
    ("C7",  "8 interviews with budget holders",                   {2: 8},  8),
    ("C8",  "3 signed LOIs",                                      {4: 3},  3),
    ("C9",  "10 interviews + 2 prepayments",                      {2: 10, 6: 2}, 12),
    ("C10", "50 interviews across 10 channels",                   {2: 50}, 50),
    ("C11", "no interviews",                                      {},      0),
    ("C12", "14 orgs, workaround observed in situ",               {3: 14}, 14),
    ("C13", "6 prepayments",                                      {6: 6},  6),
    ("C14", "35 interviews, 4 prepayments",                       {2: 35, 6: 4}, 39),
]

TYPE_NAMES = {0: "none", 1: "internal", 2: "stated", 3: "concept",
              4: "commitment", 5: "investment", 6: "payment"}


# ------------------------------------------------------------------ V0 ladder

def v0_current(c):
    """docs/01-prd.md as written: AND-requirements, L1..L3."""
    tid, _, types, inpop = c
    orgs = sum(types.values())
    buyers = types.get(6, 0)  # proxy for budget-holder count in this corpus
    req = [(1, 5, 3, 3, 2, 365), (2, 12, 8, 12, 2, 270), (3, 20, 15, 20, 3, 180)]
    if inpop == 0:
        return 0
    if orgs == 0:
        return 0
    best = 0
    for lvl, rel, o, ip, ch, age in req:
        if orgs >= o and inpop >= ip and ch >= 2:
            best = lvl
    return best


V0_CHANNELS = {"C1": 1, "C2": 1, "C3": 2, "C4": 1, "C5": 3, "C6": 3,
               "C7": 2, "C8": 1, "C9": 3, "C10": 10, "C11": 0, "C12": 3,
               "C13": 2, "C14": 5}


def v0(c):
    tid, _, types, inpop = c
    orgs = sum(types.values())
    ch = V0_CHANNELS[tid]
    if inpop == 0 or orgs == 0:
        return 0
    req = [(1, 5, 3, 3, 2), (2, 12, 8, 12, 2), (3, 20, 15, 20, 3)]
    best = 0
    for lvl, rel, o, ip, need_ch in req:
        if orgs >= o and inpop >= ip and ch >= need_ch:
            best = lvl
    return best


# --------------------------------------------------------- structured verdict

def verdict(c):
    """Two facts, no composite score.

    level      highest Pattyn type supported by >=1 in-population org
    support    independent in-population orgs at that level
    breadth    total independent in-population orgs (any level)
    saturation only meaningful for stated evidence (level <= 2)
    """
    _, _, types, inpop = c
    if inpop == 0 or not types:
        return dict(level=0, support=0, breadth=0, saturation="n/a")

    applicable = {t: min(n, inpop) for t, n in types.items()}
    level = max(applicable)
    support = applicable[level]
    breadth = sum(applicable.values())
    if level <= 2:
        if breadth < 6:
            sat = "none"
        elif breadth < 12:
            sat = "basic"      # Guest: basic metathemes at 6
        elif breadth < 24:
            sat = "code"       # Guest: code saturation at 12
        else:
            sat = "meaning"    # Hennink: meaning saturation 16-24
    else:
        sat = "n/a"
    return dict(level=level, support=support, breadth=breadth, saturation=sat)


def binding(c):
    """Name the one thing that would most raise the defensible claim."""
    v = verdict(c)
    _, _, types, inpop = c
    if inpop == 0:
        return "population"
    if v["level"] == 0:
        return "type"
    if v["level"] <= 2 and v["breadth"] < 6:
        return "breadth"
    if 3 <= v["level"] <= 4 and v["support"] < 3:
        return "support"
    if v["level"] == 5 and v["support"] < 2:
        return "support"
    return None


def apply_fix(c):
    """Smallest real-world change matching the named constraint."""
    tid, desc, types, inpop = c
    b = binding(c)
    types = dict(types)
    if b == "population":
        return (tid, desc, types, sum(types.values()))
    if b == "type":
        nxt = (max(types) if types else 1) + 1
        types[nxt] = types.get(nxt, 0) + 1
        return (tid, desc, types, inpop + 1)
    if b == "breadth":
        nxt = max(types)
        add = 6 - sum(types.values())
        types[nxt] = types.get(nxt, 0) + add
        return (tid, desc, types, inpop + add)
    if b == "support":
        nxt = max(types)
        need = 3 if nxt == 4 else 2
        add = need - types[nxt]
        types[nxt] = types[nxt] + add
        return (tid, desc, types, inpop + add)
    return None


def improves(before, after):
    """Lexicographic: level, then support, then breadth."""
    a = (before["level"], before["support"], before["breadth"])
    b = (after["level"], after["support"], after["breadth"])
    return b > a


# ------------------------------------------------------------------- tests

print("=" * 100)
print("1. VERDICTS")
print("=" * 100)
print(f"{'id':<5}{'level':>7}{'name':>12}{'support':>9}{'breadth':>9}{'saturation':>12}{'V0':>5}  binding")
rows = []
for c in CASES:
    v = verdict(c)
    b = binding(c)
    rows.append((c[0], v, b))
    flag = ""
    if v["level"] == 0 and sum(c[2].values()) > 0:
        flag = "  <-- real evidence, no verdict"
    print(f"{c[0]:<5}{v['level']:>7}{TYPE_NAMES[v['level']]:>12}{v['support']:>9}"
          f"{v['breadth']:>9}{v['saturation']:>12}{v0(c):>5}  {b or '-'}{flag}")

v0_zero = [c[0] for c in CASES if v0(c) == 0 and sum(c[2].values()) > 0]
new_zero = [c[0] for c in CASES if verdict(c)["level"] == 0 and sum(c[2].values()) > 0]
print()
print(f"V0 reports 'no evidence' for {len(v0_zero)} cases that contain evidence: {v0_zero}")
print(f"Structured verdict reports 'no evidence' for {len(new_zero)} such cases: {new_zero}")

print()
print("=" * 100)
print("2. PATTYN ORDERING CONSTRAINTS (type axis)")
print("=" * 100)
GT = [
    ("C4", "C10", "4 prepayments > 50 discovery interviews"),
    ("C4", "C1",  "4 prepayments > 30 discovery interviews"),
    ("C13", "C14", "6 prepayments > 35 interviews + 4 prepayments"),
    ("C8", "C10", "3 LOIs > 50 discovery interviews"),
    ("C8", "C7",  "3 LOIs > 8 budget-holder interviews"),
    ("C9", "C5",  "2 prepayments + 10 interviews > 12 interviews"),
    ("C12", "C1", "observed workaround > 30 interviews"),
]
V0 = {c[0]: v0(c) for c in CASES}
V = {c[0]: verdict(c)["level"] for c in CASES}
print(f"{'check':<12}{'ladder':>10}{'structured':>13}   statement")
ok0 = okv = 0
for a, b, why in GT:
    p = V0[a] > V0[b]
    q = V[a] > V[b]
    ok0 += p
    okv += q
    print(f"{a+' > '+b:<12}{('PASS' if p else 'FAIL'):>10}{('PASS' if q else 'FAIL'):>13}   {why}")
print(f"{'totals':<12}{str(ok0)+'/'+str(len(GT)):>10}{str(okv)+'/'+str(len(GT)):>13}")

print()
print("=" * 100)
print("3. ACTIONABILITY — apply the named constraint, does the claim improve?")
print("=" * 100)
bad = 0
for c in CASES:
    b = binding(c)
    if b is None:
        print(f"{c[0]:<5} no binding constraint (fully supported at its level)")
        continue
    fixed = apply_fix(c)
    before, after = verdict(c), verdict(fixed)
    ok = improves(before, after)
    if not ok:
        bad += 1
    print(f"{c[0]:<5} {b:<11} L{before['level']}/{before['support']} -> "
          f"L{after['level']}/{after['support']}   {'OK' if ok else 'NO EFFECT'}")
print(f"\nconstraints that do not move the verdict: {bad}")

print()
print("=" * 100)
print("4. MONOTONICITY — adding evidence must never lower the claim")
print("=" * 100)
bad = 0
for c in CASES:
    tid, desc, types, inpop = c
    base = verdict(c)
    for t in range(1, 7):
        t2 = dict(types)
        t2[t] = t2.get(t, 0) + 1
        after = verdict((tid, desc, t2, inpop + 1))
        if after["level"] < base["level"]:
            bad += 1
            print(f"  {tid}: adding type {t} lowered level {base['level']} -> {after['level']}")
print(f"monotonicity violations: {bad}")

print()
print("=" * 100)
print("5. DISCRIMINATION — does the output distinguish materially different cases?")
print("=" * 100)
def pairs(score_fn):
    out = {}
    for a in CASES:
        for b in CASES:
            if a[0] >= b[0]:
                continue
            if score_fn(a) == score_fn(b):
                out[(a[0], b[0])] = score_fn(a)
    return out

same_v0 = pairs(v0)
same_v = pairs(lambda c: (verdict(c)["level"], verdict(c)["support"]))
print(f"ladder:     {len(set(v0(c) for c in CASES))} distinct outcomes over {len(CASES)} cases, "
      f"{len(same_v0)} collided pairs")
print(f"structured: {len(set((verdict(c)['level'], verdict(c)['support']) for c in CASES))} "
      f"distinct outcomes, {len(same_v)} collided pairs")
print()
print("pairs the ladder cannot separate:")
for (a, b), s in sorted(same_v0.items()):
    print(f"  {a} == {b}  at L{s}")
print()
print("pairs the structured verdict cannot separate:")
for (a, b), s in sorted(same_v.items()):
    print(f"  {a} == {b}  at L{s[0]}/{s[1]}")
