import type { MatrixView } from "../lib/dto";

function heat(count: number): string {
  if (count === 0) return "cell-0";
  if (count <= 2) return "cell-1";
  if (count <= 5) return "cell-2";
  if (count <= 10) return "cell-3";
  return "cell-4";
}

export function CoverageMatrix({ matrix }: { matrix: MatrixView }) {
  if (matrix.segments.length === 0) {
    return <p className="text-[var(--ink-muted)]">No interviews imported yet.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-[13px]">
        <caption className="label mb-3 text-left">
          Who was in the room · {matrix.totalRows} interviews · {matrix.totalOrgs} organisations
        </caption>
        <thead>
          <tr>
            <th scope="col" className="sunk label p-2 text-left">
              Segment
            </th>
            {matrix.roles.map((role) => (
              <th key={role} scope="col" className="sunk label p-2">
                {role}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {matrix.segments.map((segment) => (
            <tr key={segment}>
              <th
                scope="row"
                className="border-t border-[var(--border)] p-2 text-left font-normal"
                title={segment}
              >
                <span className="block max-w-[28ch] truncate">{segment}</span>
              </th>
              {matrix.roles.map((role) => {
                const cell = matrix.cells[`${segment}::${role}`] ?? { rows: 0, orgs: 0 };
                return (
                  <td
                    key={role}
                    className={`cell ${heat(cell.rows)} h-8 p-1 mono`}
                    aria-label={`${segment}, ${role}: ${cell.rows === 0 ? "no interviews" : `${cell.rows} interviews from ${cell.orgs} organisations`}`}
                    title={`${cell.rows} interviews · ${cell.orgs} organisations`}
                  >
                    {cell.rows === 0 ? "—" : cell.rows}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-3 text-[12px] text-[var(--ink-muted)]">
        Channel and network composition are reported as diagnostics, never used as gates.
      </p>
    </div>
  );
}
