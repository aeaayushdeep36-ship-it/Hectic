"use client";

import { useState, type FocusEvent, type MouseEvent } from "react";
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

interface ActiveCell {
  readonly key: string;
  readonly segment: string;
  readonly role: string;
  readonly aliases: readonly string[];
  readonly left: number;
  readonly top: number;
}

type CellIdentity = Omit<ActiveCell, "left" | "top">;
type CellEvent = MouseEvent<HTMLTableCellElement> | FocusEvent<HTMLTableCellElement>;

function density(rows: number): 0 | 1 | 2 | 3 | 4 {
  if (rows === 0) return 0;
  if (rows <= 2) return 1;
  if (rows <= 5) return 2;
  if (rows <= 10) return 3;
  return 4;
}

/** Real coverage grid: fixed role axis, redundant zero signals, full table semantics. */
export function CoverageMatrix({ matrix }: { matrix: MatrixView }) {
  const [active, setActive] = useState<ActiveCell | null>(null);
  const extraRoles = matrix.roles.filter((role): role is Role => !ROLE_AXIS.includes(role as Role));
  const columns: readonly string[] = [...ROLE_AXIS, ...extraRoles];

  function show(event: CellEvent, cell: CellIdentity) {
    const rect = event.currentTarget.getBoundingClientRect();
    const popoverHeight = 84;
    const below = rect.bottom + 8;
    const top =
      below + popoverHeight > window.innerHeight
        ? Math.max(8, rect.top - popoverHeight - 8)
        : below;
    const left = Math.min(Math.max(rect.left + rect.width / 2, 144), window.innerWidth - 144);
    setActive({ ...cell, left, top });
  }

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
                  <span className="block max-w-[28ch] truncate" title={segment}>
                    {segment}
                  </span>
                </th>
                {columns.map((role) => {
                  const key = `${segment}::${role}`;
                  const cell = matrix.cells[key] ?? { rows: 0, orgs: 0, aliases: [] };
                  return (
                    <MatrixCell
                      key={key}
                      identity={{ key, segment, role, aliases: cell.aliases }}
                      rows={cell.rows}
                      orgs={cell.orgs}
                      describedBy={active?.key === key ? "coverage-cell-tooltip" : undefined}
                      onShow={show}
                      onHide={() => setActive(null)}
                    />
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {active ? (
        <div
          id="coverage-cell-tooltip"
          role="tooltip"
          className="pointer-events-none fixed z-50 w-max max-w-[18rem] -translate-x-1/2 rounded-[10px] border border-[var(--border)] bg-[var(--surface)] p-3 text-left"
          style={{ left: active.left, top: active.top }}
        >
          <p className="label">
            {active.segment} · {ROLE_ALIASES[active.role] ?? active.role}
          </p>
          <p className="mono mt-1 text-[12px] leading-5 text-[var(--ink)]">
            {active.aliases.slice(0, 6).join(", ")}
            {active.aliases.length > 6 ? ` +${active.aliases.length - 6} more` : ""}
          </p>
          <p className="mt-1 text-[11px] text-[var(--ink-muted)]">Contributing aliases</p>
        </div>
      ) : null}
    </div>
  );
}

function MatrixCell({
  identity,
  rows,
  orgs,
  describedBy,
  onShow,
  onHide,
}: {
  identity: CellIdentity;
  rows: number;
  orgs: number;
  describedBy?: string;
  onShow: (event: CellEvent, cell: CellIdentity) => void;
  onHide: () => void;
}) {
  const isEmpty = rows === 0;
  const roleLabel = ROLE_ALIASES[identity.role] ?? identity.role;
  const label = isEmpty
    ? `no interviews · ${roleLabel}`
    : `${rows} interviews across ${orgs} organisations · ${roleLabel}`;

  return (
    <td
      className={cn("cell border-l border-[var(--border)] p-0", `cell-${density(rows)}`)}
      aria-label={label}
      aria-describedby={describedBy}
      title={label}
      tabIndex={0}
      onMouseEnter={(event) => onShow(event, identity)}
      onMouseLeave={onHide}
      onFocus={(event) => onShow(event, identity)}
      onBlur={onHide}
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
