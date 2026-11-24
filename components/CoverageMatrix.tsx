import type { MatrixView } from "@/lib/dto";
import type { Role } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Fixed axes: a missing role stays visible as an empty cell instead of vanishing. */
const ROLE_AXIS: readonly Role[] = ["economic", "technical", "user", "influencer", "none"];

const ROLE_ALIASES: Readonly<Record<string, string>> = {
  economic: "Buyer",
  technical: "Builder",
  user: "User",
  influencer: "Influencer",
  none: "Unmapped",
};

function density(rows: number): 0 | 1 | 2 | 3 | 4 {
  if (rows === 0) return 0;
  if (rows <= 2) return 1;
  if (rows <= 5) return 2;
  if (rows <= 10) return 3;
  return 4;
}

/** Real coverage grid: fixed role axis, redundant zero signals, full table semantics. */
export function CoverageMatrix({ matrix }: { matrix: MatrixView }) {
  const extraRoles = matrix.roles.filter((role): role is Role => !ROLE_AXIS.includes(role as Role));
  const columns: readonly string[] = [...ROLE_AXIS, ...extraRoles];

  if (matrix.segments.length === 0) {
    return <div className="card p-6 text-sm text-[var(--ink-muted)]">No roster evidence yet.</div>;
  }

  return (
    <div className="card overflow-hidden">
      <div className="p-6 border-b border-[var(--border)]">
        <h2 className="text-xl font-semibold tracking-tight text-[var(--ink)]">
          Who was in the room?
        </h2>
        <p className="text-sm text-[var(--ink-muted)] mt-1">
          Each cell counts interviews and the distinct organisations behind them. The empty cell is
          the finding.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse" aria-label="Evidence coverage matrix">
          <caption className="sr-only">Evidence coverage by segment and role</caption>
          <thead>
            <tr className="bg-[var(--paper)] text-[11px] uppercase tracking-wider border-b border-[var(--border)] text-[var(--ink-muted)]">
              <th scope="col" className="px-6 py-4 font-semibold text-[var(--ink)]">
                Segment
              </th>
              {columns.map((role) => (
                <th
                  key={role}
                  scope="col"
                  className="px-6 py-4 font-semibold text-center border-l border-[var(--border)]"
                >
                  <span>{role}</span>
                  <span className="block text-[10px] font-normal normal-case tracking-normal text-[var(--ink-faint)]">
                    {ROLE_ALIASES[role] ?? "Additional"}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {matrix.segments.map((segment) => (
              <tr key={segment} className="hover:bg-[var(--paper)]">
                <th scope="row" className="px-6 py-4 font-medium text-[var(--ink)] text-left">
                  <span className="block max-w-[16rem] truncate" title={segment}>
                    {segment}
                  </span>
                </th>
                {columns.map((role) => {
                  const cell = matrix.cells[`${segment}::${role}`];
                  return (
                    <MatrixCell
                      key={`${segment}::${role}`}
                      role={role}
                      rows={cell?.rows ?? 0}
                      orgs={cell?.orgs ?? 0}
                    />
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MatrixCell({
  role,
  rows,
  orgs,
}: {
  role: string;
  rows: number;
  orgs: number;
}) {
  const isEmpty = rows === 0;
  const label = isEmpty
    ? `no interviews · ${ROLE_ALIASES[role] ?? role}`
    : `${rows} interviews across ${orgs} organisations · ${ROLE_ALIASES[role] ?? role}`;

  return (
    <td
      className={cn("cell border-l border-[var(--border)] p-0", `cell-${density(rows)}`)}
      aria-label={label}
      title={label}
    >
      <div className="flex h-12 min-w-[4rem] flex-col items-center justify-center px-3">
        <span aria-hidden="true" className="mono text-sm font-semibold">
          {isEmpty ? "—" : rows}
        </span>
        {!isEmpty && orgs > 0 ? (
          <span aria-hidden="true" className="mono text-[10px] opacity-75">
            {orgs} org{orgs === 1 ? "" : "s"}
          </span>
        ) : null}
      </div>
    </td>
  );
}
