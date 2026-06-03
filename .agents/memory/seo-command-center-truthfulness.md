---
name: SEO Command Center data-truthfulness invariants
description: Non-negotiable governance rules when rendering SEO recommendation/action surfaces (Screen 1 detections + Screen 2 action card).
---

# SEO Command Center — data-truthfulness invariants

These are governance ("data truthfulness") rules for `/dashboard/seo` surfaces. They
are not derivable from a single file — they are cross-cutting and have been violated
before by hardcoding.

## 1. Action type must come from the real `mutation_type`
The engine candidate queue contains MULTIPLE mutation types simultaneously — confirmed
live: `title_tag_refinement`, `meta_description_update`, `internal_link_insertion`
(also schema / redirect / h1). **Never** hardcode an "INTERNAL LINK" / "Add internal
link" label or internal-link-specific copy on a detection row or the action card.
Render every label, headline, before/after copy, risk bullet, and reversibility note
from the candidate's actual type. The shared `mutationDisplay()` helper in
`app/dashboard/seo/_shared.tsx` is the single source for tag + headline; gate any
link-only copy behind an `isInternalLink` check.

**Why:** the prior rebuild hardcoded internal-link wording, so meta/title candidates
were mislabeled as internal links — a false statement about what the action does.

**How to apply:** when both `mutation_type` and `primary_remedy` are absent, fall back
to an explicit `UNKNOWN` / "Unknown change type" — never a generic invented verb.

## 2. Position = top-query average position, never `gsc_best_position`
Canonical position everywhere (portfolio bucketing AND the action-card baseline /
measurement plan) is the avg position of the page's **highest-demand query**, i.e.
`demand[0].avg_position` from the page dossier (the `/api/proxy/seo/page` route orders
demand by `impressions DESC`, so `demand[0]` is the top-demand query). `gsc_best_position`
is the all-time minimum and overstates rank — do not surface it as "position".

**Why:** `gsc_best_position` made e.g. the homepage (top-query pos ~46) look like a
"win"; bucketing/labels must reflect realistic standing.

## 3. No fabricated projections
There is no modelled lift / CTR / position projection in the source data for ANY
candidate type. Frame outcomes as "measured post-deploy" against the live GSC baseline;
never display a predicted number.
