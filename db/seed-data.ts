/**
 * Rebuilds database content from the four hand-computed fixtures.
 * All seeded workspaces carry a `demo` badge in the UI and are synthetic.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { nanoid } from "nanoid";
import { parseRoster } from "../lib/csv";
import { claimsFileSchema } from "../lib/schemas";
import { THRESHOLDS, isInPopulation } from "../engine/index";
import {
  channelToSource,
  evidenceTypeToDb,
  relationshipToDb,
} from "../server/mappers";
import { db } from "./client";
import {
  claimThresholds,
  claims,
  evidence,
  evidenceClaimTags,
  events,
  modelCalls,
  resolutions,
  runFindings,
  runs,
  workspaces,
} from "./schema";

const definitions = [
  {
    name: "clean",
    title: "Clean — three payments",
    note: "18 organisations, three prepayments, three segments. Synthetic demo data.",
  },
  {
    name: "underpowered",
    title: "Underpowered — network sample",
    note: "11 interviews from five organisations, no budget holders. Synthetic demo data.",
  },
  {
    name: "wrong-population",
    title: "Wrong population",
    note: "14 end-user interviews, claim about budget holders. Synthetic demo data.",
  },
  {
    name: "ambiguous",
    title: "Ambiguous — one LOI",
    note: "12 interviews plus a signed LOI from a friend. Synthetic demo data.",
  },
] as const;

export function seedDatabase(): number {
  // Children first: the database enforces foreign keys, so the reset is a real
  // reset rather than a soft-delete illusion.
  for (const table of [
    events,
    modelCalls,
    resolutions,
    runFindings,
    runs,
    evidenceClaimTags,
    claimThresholds,
    claims,
    evidence,
    workspaces,
  ]) {
    db.delete(table).run();
  }

  const now = Date.now();

  for (const definition of definitions) {
    const workspaceId = nanoid();
    const dir = path.join(process.cwd(), "fixtures", definition.name);
    const { rows, errors } = parseRoster(
      readFileSync(path.join(dir, "roster.csv"), "utf8"),
    );
    if (errors.length > 0) {
      throw new Error(`${definition.name}: ${JSON.stringify(errors)}`);
    }
    const parsedClaims = claimsFileSchema.parse(
      JSON.parse(readFileSync(path.join(dir, "claims.json"), "utf8")),
    );

    db.insert(workspaces)
      .values({
        id: workspaceId,
        slug: definition.name,
        name: definition.title,
        contextNote: definition.note,
        isDemo: true,
        createdAt: now,
      })
      .run();

    for (const parsed of parsedClaims) {
      const claimId = `${definition.name}-${parsed.id}`;
      db.insert(claims)
        .values({
          id: claimId,
          workspaceId,
          ordinal: parsed.ordinal,
          rawText: parsed.rawText,
          population: parsed.population,
          populationSpec: JSON.stringify(parsed.populationSpec),
          predicate: parsed.predicate,
          kind: parsed.kind,
          claimType: parsed.claimType,
          claimedLevel: parsed.claimedLevel,
          observedK: parsed.observed?.k ?? null,
          observedN: parsed.observed?.n ?? null,
          precisionTolerance: parsed.precisionTolerance,
          proposedByAgent: 0,
          confirmedAt: now,
          createdAt: now,
        })
        .run();

      for (const thresholdDefinition of THRESHOLDS) {
        db.insert(claimThresholds)
          .values({
            id: nanoid(),
            claimId,
            kind: thresholdDefinition.kind,
            code: thresholdDefinition.code,
            scope: thresholdDefinition.scope,
            requiredValue: thresholdDefinition.value,
            rationale: thresholdDefinition.rationale,
            sourceRef: thresholdDefinition.source,
          })
          .run();
      }
    }

    for (const row of rows) {
      db.insert(evidence)
        .values({
          id: `${definition.name}-${row.id}`,
          workspaceId,
          alias: row.alias,
          interviewedAt: Date.parse(row.date),
          role: row.role,
          orgRef: row.orgId,
          segment: row.segment,
          sourceChannel: channelToSource(row.channel),
          relationship: relationshipToDb(row.relationship),
          evidenceType: evidenceTypeToDb(row.evidenceType),
          durationMin: row.durationMin,
          notesRaw: row.notes,
          notesRedacted: row.notes,
          importBatch: definition.name,
          createdAt: now,
        })
        .run();
    }

    for (const parsed of parsedClaims) {
      const claimId = `${definition.name}-${parsed.id}`;
      for (const row of rows) {
        db.insert(evidenceClaimTags)
          .values({
            id: nanoid(),
            evidenceId: `${definition.name}-${row.id}`,
            claimId,
            bearsOn: true,
            polarity: "supports",
            inPopulation: isInPopulation(row, parsed),
            populationMatchProducer: "rule",
            producer: "human",
            createdAt: now,
          })
          .run();
      }
    }

    db.insert(events)
      .values({
        id: nanoid(),
        workspaceId,
        type: "workspace.seeded",
        payloadJson: JSON.stringify({
          fixture: definition.name,
          rows: rows.length,
          claims: parsedClaims.length,
          synthetic: true,
        }),
        createdAt: now,
      })
      .run();
  }

  return db.select({ id: workspaces.id }).from(workspaces).all().length;
}
