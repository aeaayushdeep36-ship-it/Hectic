import math


def wilson(k, n, z=1.96):
    if n == 0:
        return 0.0, 1.0, 0.0
    p = k / n
    d = 1 + z * z / n
    c = p + z * z / (2 * n)
    m = z * math.sqrt(p * (1 - p) / n + z * z / (4 * n * n))
    return max(0.0, (c - m) / d), min(1.0, (c + m) / d), p


print("WILSON 95% INTERVALS")
print(f"{'k/n':>8} {'p':>6} {'lo':>6} {'hi':>6} {'width':>6}")
for n in [3, 5, 8, 10, 11, 12, 15, 20, 25, 30, 40]:
    for frac in [0.0, 0.5, 0.8]:
        k = round(n * frac)
        lo, hi, p = wilson(k, n)
        print(f"{str(k)+'/'+str(n):>8} {p:>6.2f} {lo:>6.2f} {hi:>6.2f} {hi-lo:>6.2f}")
    print()

print()
print("RULE OF THREE  (0 of n) exact 95% upper bound = 1 - 0.05^(1/n)")
for n in [3, 5, 8, 10, 11, 12, 15, 20, 30]:
    print(f"0/{n:<3} exact={1 - 0.05 ** (1 / n):.3f}   approx 3/n={3 / n:.3f}")

print()
print("N REQUIRED for given half-width at p=0.5 (worst case), 95%")
for target in [0.30, 0.25, 0.20, 0.15, 0.10]:
    n = 1
    while True:
        lo, hi, _ = wilson(n // 2, n)
        if (hi - lo) / 2 <= target:
            break
        n += 1
    print(f"half-width {target:.2f} -> n = {n}")
