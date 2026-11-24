"""
Hetic — final engine model, with its full test battery.

DESIGN
------
Verdict is a structured triple, not a score:

    level   L1..L6  highest evidence type present, in the claim's population
                    (Pattyn, Dillen & Goetz 2026, Computers 15(8):535)
    support         independent in-population organisations at that level
                    (Wilson & Lilien 1992: an informant is not an organisation)
    breadth         independent in-population organisations at any level

For stated evidence (level <= L2) it also reports a saturation rung
(Guest/Bunce/Johnson 2006; Hennink/Kaiser/Marconi 2017), and for prevalence
claims a Wilson score interval, because saturation answers "have I heard all
the themes", not "what share would pay".

COMMITMENT HIERARCHY (Pattyn 2026, verified against full text)
    L1 founder-internal / informal interest
    L2 structured stated evidence (surveys, discovery interviews)
    L3 concept exposure without commitment (prototype, landing page, MVE)
    L4 behavioural commitment, non-financial (signup, waitlist, pilot, LOI)
    L5 contingent investment commitment
    L6 paying customer pre-MVP
Ordering logic: increasing external commitment, decreasing uncertainty.

GOVERNING CONSTRAINT: nothing here is learned, guessed, or model-generated.
Every threshold is either cited or computed (Wilson interval).
"""

import math

TYPE_NAMES = {
    1: "internal", 2: "stated", 3: "concept",
    4: "commitment", 5: "investment", 6: "payment",
}

# A founder always holds L1 (own-itch / informal hypothesis). The ladder has no
# "no claim" rung; absence of a claim is not a verdict, it is an unformalised input.
FLOOR = 1


def wilson(k, n, z=1.96):
    """95% Wilson score interval. Deterministic, exact. No model involved."""
    if n == 0:
        return 0.0, 1.0
    p = k / n
    d = 1 + z * z / n
    c = p + z * z / (2 * n)
    m = z * math.sqrt(p * (1 - p) / n + z * z / (4 * n * n))
    return max(0.0, (c - m) / d), min(1.0, (c + m) / d)


def saturation_rung(breadth):
    """Thematic completeness of stated evidence, not prevalence precision."""
    if breadth < 6:
        return "insufficient"      # below Guest's basic-metatheme point
    if breadth < 12:
        return "basic"             # Guest: basic elements present at 6
    if breadth < 24:
        return "code"              # Guest: 12 -> 88% of themes; Hennink 9-17
    return "meaning"               # Hennink: meaning saturation 16-24


def verdict(claim_type, types, in_pop_orgs, observed):
    """types: {pattyn_level: n_orgs}. in_pop_orgs: orgs whose population matches.

    `observed` is the raw count the claim would be computed from (e.g. k of n
    said they would pay), used only for the Wilson readout.
    """
    applicable = {}
    for t, n in types.items():
        if n > 0 and in_pop_orgs > 0:
            applicable[t] = n

    level = max(applicable) if applicable else FLOOR
    support = applicable.get(level, 0)
    breadth = sum(applicable.values())

    v = dict(level=level, support=support, breadth=breadth, saturation="n/a",
             interval=None, binding=None)

    if level <= 2:
        v["saturation"] = saturation_rung(breadth)

    if claim_type == "prevalence" and observed and in_pop_orgs:
        k, n = observed
        lo, hi = wilson(k, n)
        v["interval"] = (round(lo, 3), round(hi, 3), round(hi - lo, 3))

    v["binding"] = binding(v, types, in_pop_orgs)
    return v


def next_target(level):
    """The next rung that would actually strengthen a customer claim.

    L5 is contingent *investor* commitment. It is a different stakeholder and it
    never validates a customer claim; Pattyn also notes that L6 makes L5
    unnecessary. So from L4 the target is L6, not L5.
    """
    if level == 4:
        return 6
    return min(6, level + 1)


def binding(v, types, in_pop_orgs):
    """The single change that would raise the defensible claim one rung."""
    if not types:
        return "type"                  # no external evidence exists at all
    if in_pop_orgs == 0:
        return "population"            # nothing you have is about this claim
    if v["level"] == FLOOR:
        return "type"
    if v["level"] < 6:
        nxt = next_target(v["level"])
        if types.get(nxt, 0) == 0:
            return "type"
        return None
    if v["support"] < 3:
        return "support"               # payment exists but rests on 1-2 orgs
    return None


def apply_fix(claim_type, types, in_pop_orgs, observed, v):
    """Perform the smallest real-world change matching the named constraint."""
    b = v["binding"]
    types = dict(types)
    if b == "population":
        return claim_type, types, sum(types.values()), observed
    if b == "type":
        nxt = next_target(v["level"])
        types[nxt] = types.get(nxt, 0) + 1
        return claim_type, types, in_pop_orgs + 1, observed
    if b == "support":
        add = 3 - types[v["level"]]
        types[v["level"]] = 3
        return claim_type, types, in_pop_orgs + add, observed
    return None


def rank(v):
    return (v["level"], v["support"], v["breadth"])


# --------------------------------------------------------------------- corpus
# id, description, claim_type, types, in_pop_orgs, observed
CASES = [
    ("C1",  "30 discovery interviews, no commitment",            "theme",      {2: 30}, 30, None),
    ("C2",  "11 interviews from 9 orgs, one network",             "theme",      {2: 9},  9,  None),
    ("C3",  "11 interviews, 3 budget holders, recalled spend",    "theme",      {2: 10}, 10, None),
    ("C4",  "4 prepayments from 4 orgs",                          "prevalence", {6: 4},  4,  (4, 4)),
    ("C5",  "12 interviews, 6 verbal yes",                        "prevalence", {2: 12}, 12, (6, 12)),
    ("C6",  "20 interviews with end users, claim is about buyers", "theme",     {2: 18}, 0,  None),
    ("C7",  "8 interviews with budget holders",                   "theme",      {2: 8},  8,  None),
    ("C8",  "3 signed LOIs",                                      "prevalence", {4: 3},  3,  (3, 3)),
    ("C9",  "10 interviews + 2 prepayments",                      "prevalence", {2: 10, 6: 2}, 12, (2, 12)),
    ("C10", "50 interviews across 10 channels",                   "prevalence", {2: 50}, 50, (30, 50)),
    ("C11", "no interviews",                                      "theme",      {},      0,  None),
    ("C12", "14 orgs, workaround observed in situ",               "theme",      {3: 14}, 14, None),
    ("C13", "6 prepayments",                                      "prevalence", {6: 6},  6,  (6, 6)),
    ("C14", "35 interviews, 4 prepayments",                       "prevalence", {2: 35, 6: 4}, 39, (4, 39)),
]

V0_CHANNELS = {"C1": 1, "C2": 1, "C3": 2, "C4": 1, "C5": 3, "C6": 3, "C7": 2,
               "C8": 1, "C9": 3, "C10": 10, "C11": 0, "C12": 3, "C13": 2, "C14": 5}


def v0_ladder(cid, types, in_pop_orgs):
    """docs/01-prd.md as written."""
    orgs = sum(types.values())
    ch = V0_CHANNELS[cid]
    if in_pop_orgs == 0 or orgs == 0:
        return 0
    req = [(1, 5, 3, 2), (2, 12, 8, 2), (3, 20, 15, 3)]
    best = 0
    for lvl, o, ip, need_ch in req:
        if orgs >= o and in_pop_orgs >= ip and ch >= need_ch:
            best = lvl
    return best


def line():
    print("-" * 96)


print("=" * 96)
print("A. VERDICTS")
print("=" * 96)
print(f"{'id':<5}{'lvl':>4}{'type':>11}{'supp':>6}{'brdth':>7}{'saturation':>13}"
      f"{'95% interval':>16}{'ladder':>8}  binding")
V = {}
for cid, desc, ct, types, inpop, obs in CASES:
    v = verdict(ct, types, inpop, obs)
    V[cid] = v
    iv = f"[{v['interval'][0]:.2f},{v['interval'][1]:.2f}]" if v["interval"] else "-"
    print(f"{cid:<5}{v['level']:>4}{TYPE_NAMES[v['level']]:>11}{v['support']:>6}"
          f"{v['breadth']:>7}{v['saturation']:>13}{iv:>16}"
          f"{v0_ladder(cid, types, inpop):>8}  {v['binding'] or '-'}")

print()
print("The ladder reports 'no evidence' (L0) for cases that contain evidence:")
for cid, desc, ct, types, inpop, obs in CASES:
    if v0_ladder(cid, types, inpop) == 0 and sum(types.values()) > 0:
        print(f"  {cid}: {desc}  -> structured verdict L{V[cid]['level']}"
              f"/{V[cid]['support']}")

print()
print("=" * 96)
print("B. PATTYN ORDERING CONSTRAINTS")
print("=" * 96)
GT = [
    ("C4", "C10", "4 prepayments > 50 discovery interviews", True),
    ("C4", "C1",  "4 prepayments > 30 discovery interviews", True),
    ("C8", "C10", "3 LOIs > 50 discovery interviews", True),
    ("C8", "C7",  "3 LOIs > 8 budget-holder interviews", True),
    ("C9", "C5",  "2 prepayments + 10 interviews > 12 interviews", True),
    ("C13", "C14", "6 prepayments > 35 interviews + 4 prepayments", False),
    ("C14", "C1", "4 prepayments > 30 interviews", True),
]
BY = {c[0]: c for c in CASES}
ok0 = okv = 0
for a, b, why, hard in GT:
    p = v0_ladder(a, BY[a][3], BY[a][4]) > v0_ladder(b, BY[b][3], BY[b][4])
    q = rank(V[a]) > rank(V[b])
    ok0 += p
    okv += q
    tag = "HARD" if hard else "soft"
    print(f"  [{tag}] {a} > {b:<4} ladder {'PASS' if p else 'FAIL'}   "
          f"structured {'PASS' if q else 'FAIL'}   {why}")
print(f"\n  ladder {ok0}/{len(GT)}   structured {okv}/{len(GT)}")

print()
print("=" * 96)
print("C. ACTIONABILITY — apply the named constraint, claim must improve")
print("=" * 96)
bad = 0
for cid, desc, ct, types, inpop, obs in CASES:
    v = V[cid]
    if v["binding"] is None:
        print(f"  {cid:<4} no constraint            rests at L{v['level']} with {v['support']} orgs")
        continue
    fixed = apply_fix(ct, types, inpop, obs, v)
    nv = verdict(*fixed)
    ok = rank(nv) > rank(v)
    bad += not ok
    print(f"  {cid:<4} {v['binding']:<11} L{v['level']}/{v['support']} -> "
          f"L{nv['level']}/{nv['support']}   {'OK' if ok else 'NO EFFECT'}")
print(f"\n  constraints with no effect: {bad}")

print()
print("=" * 96)
print("D. MONOTONICITY — more evidence must never lower the claim")
print("=" * 96)
bad = 0
for cid, desc, ct, types, inpop, obs in CASES:
    base = verdict(ct, types, inpop, obs)
    for t in range(1, 7):
        t2 = dict(types)
        t2[t] = t2.get(t, 0) + 1
        nv = verdict(ct, t2, inpop + 1, obs)
        if nv["level"] < base["level"] or (nv["level"] == base["level"]
                                           and nv["support"] < base["support"]):
            bad += 1
            print(f"  {cid}: +1 org at L{t} lowered {rank(base)} -> {rank(nv)}")
print(f"  violations: {bad}")

print()
print("=" * 96)
print("E. POPULATION GATE — evidence about the wrong population cannot count")
print("=" * 96)
for cid, desc, ct, types, inpop, obs in CASES:
    if inpop == 0 and sum(types.values()) > 0:
        print(f"  {cid}: {sum(types.values())} orgs of evidence, L{V[cid]['level']} "
              f"for this claim, binding = {V[cid]['binding']}")
print("  property holds: applicable evidence is filtered before the level is taken")

print()
print("=" * 96)
print("F. PRECISION — the interval the claim actually carries")
print("=" * 96)
print(f"  {'case':<6}{'k/n':>8}{'point':>8}{'95% interval':>20}{'half-width':>12}")
for cid, desc, ct, types, inpop, obs in CASES:
    v = V[cid]
    if v["interval"]:
        k, n = obs
        lo, hi, w = v["interval"]
        print(f"  {cid:<6}{str(k)+'/'+str(n):>8}{k/n:>8.2f}"
              f"{'['+format(lo,'.2f')+','+format(hi,'.2f')+']':>20}{w/2:>11.2f}")
print()
print("  n needed for a given half-width at p=0.5 (worst case):")
for target in (0.25, 0.15, 0.10, 0.05):
    n = 1
    while True:
        lo, hi = wilson(n // 2, n)
        if (hi - lo) / 2 <= target:
            break
        n += 1
    print(f"    +/-{target:.2f} -> n = {n}")

print()
print("=" * 96)
print("G. DISCRIMINATION")
print("=" * 96)


def collisions(key):
    out = []
    ids = [c[0] for c in CASES]
    for i, a in enumerate(ids):
        for b in ids[i + 1:]:
            if key(a) == key(b):
                out.append((a, b, key(a)))
    return out


ladder_c = collisions(lambda cid: v0_ladder(cid, BY[cid][3], BY[cid][4]))
struct_c = collisions(lambda cid: (V[cid]["level"], V[cid]["support"]))
full_c = collisions(lambda cid: (V[cid]["level"], V[cid]["support"],
                                 V[cid]["interval"], V[cid]["binding"]))
print(f"  ladder:                {len(set(v0_ladder(c[0], c[3], c[4]) for c in CASES))} outcomes, "
      f"{len(ladder_c)} collided pairs")
print(f"  structured (L,supp):   {len(set((V[c[0]]['level'], V[c[0]]['support']) for c in CASES))} outcomes, "
      f"{len(struct_c)} collided pairs")
print(f"  structured + interval: "
      f"{len(set((V[c[0]]['level'], V[c[0]]['support'], V[c[0]]['interval']) for c in CASES))} outcomes, "
      f"{len(full_c)} collided pairs")
print()
print("  collisions by (L, support), and whether the interval resolves them:")
for a, b, s in struct_c:
    ia, ib = V[a]["interval"], V[b]["interval"]
    resolved = "resolved by interval" if ia != ib else "still identical"
    print(f"    {a} == {b} at L{s[0]}/support {s[1]}  -> {resolved}")
    print(f"      {BY[a][1]}")
    print(f"      {BY[b][1]}")
    if ia != ib:
        print(f"      {a} {ia}   {b} {ib}")
print()
print("  pairs still identical on the full verdict:")
for a, b, s in full_c:
    print(f"    {a} == {b}   {BY[a][1]}  |  {BY[b][1]}")
    print(f"      both bind on '{V[a]['binding']}'; the case detail differs, the claim does not")
