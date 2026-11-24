import type { MatrixView } from "@/lib/dto";
import { cn } from "@/lib/utils";

/** Modern coverage grid driven by the real MatrixView, not a demo dataset. */
export function CoverageMatrix({ matrix }: { matrix: MatrixView }) {
  const columns = matrix.roles.filter((role) => role !== "none");

  if (matrix.segments.length === 0 || columns.length === 0) {
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
                  {role}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {matrix.segments.map((segment) => (
              <tr key={segment} className="hover:bg-[var(--paper)]">
                <th scope="row" className="px-6 py-4 font-medium text-[var(--ink)] text-left">
                  {segment}
                </th>
                {columns.map((role) => {
                  const cell = matrix.cells[`${segment}::${role}`];
                  return (
                    <MatrixCell key={`${segment}::${role}`} rows={cell?.rows ?? 0} orgs={cell?.orgs ?? 0} />
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

function MatrixCell({ rows, orgs }: { rows: number; orgs: number }) {
  const isEmpty = rows === 0;
  const isHigh = rows >= 5;

  return (
    <td className="px-6 py-4 text-center border-l border-[var(--border)]">
      <div
        title={`${rows} interviews · ${orgs} organisations`}
        className={cn(
          "inline-flex items-center justify-center min-w-[4rem] h-8 rounded-md font-semibold text-sm transition-colors",
          isEmpty
            ? "bg-[var(--signal-bg)] text-[var(--signal)] border border-[var(--signal-border)]"
            : isHigh
              ? "bg-[var(--confirm)] text-white border border-[var(--confirm)]"
              : "bg-[var(--confirm-bg)] text-[var(--confirm)]",
        )}
      >
        <span aria-hidden="true">{rows}</span>
        <span className="sr-only">{rows} interviews across {orgs} organisations</span>
      </div>
    </td>
  );
}
