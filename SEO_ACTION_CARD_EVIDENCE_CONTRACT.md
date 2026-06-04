# SEO Action Card — Evidence Contract & Producer Obligations

Scope: the Action Card at `app/dashboard/seo/action/[id]/page.tsx` is a **read-only**
governance surface in `nsd-platform-shell`. It renders real before/after context and
execution lifecycle for a single `seo_execution_candidate`. It introduces **no write
paths**: it consumes data the producer engines (`nsd-ods-api`, `nsd-integrations`)
capture and persist. This document is the contract the shell renders against and the
work the producers owe so the shell can stop degrading to "not yet captured".

The shell is split:
- **Part B/C (render — DONE here):** consume the evidence JSON, diff before/after,
  surface anchor context + lifecycle, and degrade honestly when a field is absent.
- **Part A (capture — owed by producers):** populate the snapshot, anchor context,
  and lifecycle fields at generation/execution time.
- **Part C enforcement (owed by producers):** keep governance invariants
  (draft-only, gate, reuse) authoritative on the producer side.

---

## 1. The evidence JSON contract (what the shell reads)

Consumed via the read-only proxy `GET /api/proxy/seo/candidate?id=<candidate_id>`,
typed as `SeoCandidateDetail` in `lib/seoApi.ts`. Every field is optional/nullable;
the shell never invents copy when a field is missing.

### 1.1 Before/after text mutations
- `mutation_type` — `meta_description_update` | `title_tag_refinement` |
  `h1_tag_refinement` | `internal_link_insertion` | `product_offer_schema` |
  `lost_page_redirect`.
- `current_value_snapshot` — the exact live value **frozen at generation time**.
  This is the intended BEFORE baseline.
- `proposed_value` — the engine's proposed new value (AFTER).

> **Current reality:** `current_value_snapshot` is NULL for every accepted
> candidate. Until Part A lands, the shell falls back to the live page state in
> `analytics.seo_page_dossier.state` (`.meta` / `.title` / `.h1`, chosen by
> `mutation_type`) so the BEFORE block shows the real current value rather than a
> placeholder. The shell decodes HTML entities + UTF-8/CP1252 mojibake for display
> (idempotent, so the word-diff against the clean `proposed_value` stays fair).

### 1.2 Internal-link anchor context (`evidence.anchor_context`, `SeoAnchorContext`)
- `anchor_phrase` — the exact phrase to hyperlink.
- `source_sentence` — the real sentence the anchor lives in (so the reviewer can
  judge naturalness, not box-checking).
- `placement_type` — `existing_anchor` (phrase already in copy → just link it) or
  `new_sentence` (no natural anchor → engine drafted a sentence; flag for scrutiny).
- `confidence` — naturalness score (0–1).
- `gate_result` — anchor/relevance gate outcome (`anchor_found`,
  `new_sentence_drafted`, `anchor_not_found`).
- `insertion_hint` — placement guidance for the drafted sentence.

### 1.3 Execution lifecycle (honest passthrough; display-only)
`original_value`, `applied_value`, `approval_timestamp`, `execution_timestamp`,
`rollback_available`, `rollback_status`. Canonical progression:
`proposed → approved → draft_applied → published`, rollback shown as **status only**
(the shell never triggers rollback).

---

## 2. Part A — capture obligations (nsd-ods-api / nsd-integrations)

1. **Snapshot the live value at generation.** When emitting a text candidate, read
   the current on-page value and persist it to
   `analytics.seo_execution_candidate.current_value_snapshot`. This removes the
   shell's dossier fallback and pins the BEFORE to the exact value the proposal was
   diffed against. Store decoded UTF-8 (no entities / mojibake) so consumers don't
   have to repair encoding.
2. **Capture anchor context for internal links.** Populate `evidence.anchor_context`
   (all fields in §1.2) at generation. Without it the shell can only say "exact
   source sentence not yet captured".
3. **Emit lifecycle fields as the executor advances.** Populate the §1.3 fields when
   approval/draft/publish/rollback states change so the lifecycle panel reflects
   real state instead of empty stages.
4. **Keep `target_field` aligned with `mutation_type`.** The candidate proxy
   response does not expose `target_field`; the shell derives the field from
   `mutation_type`. Producers must keep that mapping unambiguous (one field per
   mutation type).

---

## 3. Part C — enforcement obligations (producer-authoritative)

These invariants must hold at the producer, not be re-implemented as shell logic:
1. **Draft-only.** Candidates surface as proposals; the shell's only write is the
   existing approve/reject path (`/api/proxy/seo/recommendations`, `target:'engine'`
   + `candidate_id`). No publish path exists in the shell.
2. **Gate authority.** `gate_status='accepted'` is the producer's decision;
   `suppressed` rows remain the audit trail. The shell renders both, decides neither.
3. **Reuse gate.** Page/candidate reuse and dedupe stay producer-side; the shell
   reads the result.
4. **Governance state truth.** UI governance states (`DRAFT`, `PENDING_REVIEW`,
   `APPROVED_READY`, `BLOCKED`, `EXECUTED_READ_ONLY`, `ARCHIVED`) must map to real
   producer lifecycle state — never inferred optimistically in the shell.

---

## 4. Degradation matrix (current shell behavior)

| Field absent | Shell behavior |
| --- | --- |
| `current_value_snapshot` null | Fall back to live `seo_page_dossier.state.*`; caption marks it live-sourced |
| snapshot + dossier state both absent | Honest "current value not yet captured" message |
| `evidence.anchor_context` absent | "exact source sentence not yet captured"; no invented anchor |
| lifecycle fields null | Lifecycle stages render as not-yet-reached, never fabricated |

When Part A fully lands, rows (1) and (3)–(4) collapse to real captured data and the
fallbacks become dead paths kept only for resilience.
