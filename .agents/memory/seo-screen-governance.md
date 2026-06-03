---
name: SEO action-card governance scoping
description: Why Screen 2 (action/[id]) must read-only-gate all sibling candidates in shared lane components.
---

# SEO Command Center vs Action Card write scoping

The /dashboard/seo surface has TWO screens that both reuse the same shared
dossier components (LaneRoutedActions -> CandidateCard in app/dashboard/seo/_shared.tsx):

- **Screen 1 (Command Center, page.tsx)** is the multi-candidate TRIAGE surface.
  Its PageDossierDrawer renders LaneRoutedActions WITHOUT readOnly — actioning
  (approve/reject) multiple candidates there is intended.
- **Screen 2 (action/[id]/page.tsx)** is a single-action card. Its ONLY allowed
  write is approve/reject of the URL-scoped candidate (candidate.candidate_id from
  getSeoCandidate(id)). It also shows sibling candidates as CONTEXT, but those must
  be non-actionable.

**Rule:** any shared component that can mutate a candidate must accept a `readOnly`
prop, and Screen 2 must pass `readOnly` so sibling/context candidates cannot be
mutated. CandidateCard gates its `pending` state on `!readOnly` so the approve/
reject block is not rendered.

**Why:** a code review caught Screen 2 exposing approve/reject for ALL of the page's
candidates via LaneRoutedActions — a governance breach (single-action card must only
write the one candidate in the URL). Easy to reintroduce when adding new shared
lane components.

**How to apply:** when adding any actionable shared SEO dossier component, thread a
readOnly prop through it and default Screen 2 callers to readOnly; only Screen 1's
drawer stays actionable.
