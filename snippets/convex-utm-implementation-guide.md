# Convex Quote System — UTM Attribution Implementation Guide

This guide provides the exact code changes needed in the Convex codebase to capture UTM parameters from Google Ads (and other campaigns) and pass them through the webhook to the NSD Sales Engine analytics pipeline.

## Why This Is Needed

When a visitor clicks a Google Ad, the URL contains UTM parameters like:
```
https://neonsignsdepot.com/custom-neon-signs?utm_source=google&utm_medium=cpc&utm_campaign=custom-neon&gclid=EAIaIQobChMI...
```

Currently, these parameters are lost because:
1. The quote form does not read them from the URL
2. The Convex `quotes` table schema has no fields to store them
3. The webhook that sends quote events to the analytics endpoint does not include them

After these changes, every quote will carry its acquisition source, enabling per-channel conversion tracking (Google Ads vs Organic vs Direct).

---

## Change 1: Update the Convex Schema

**File:** `convex/schema.ts`

Add these fields to the `quotes` table definition, alongside the existing fields (near `campaign_info` or at the end of the field list):

```typescript
// Marketing attribution — captured from URL on quote submission
utm_source: v.optional(v.string()),
utm_medium: v.optional(v.string()),
utm_campaign: v.optional(v.string()),
utm_content: v.optional(v.string()),
utm_term: v.optional(v.string()),
gclid: v.optional(v.string()),
landing_page: v.optional(v.string()),
referrer: v.optional(v.string()),
```

All fields are `v.optional(v.string())` so they do not break existing quotes.

---

## Change 2: Capture UTMs on the Quote Form Page

The quote form runs on `quote.neonsignsdepot.com`. The JavaScript on that page needs to:
1. Read UTM parameters from sessionStorage (where the GTM "UTM Persistence" tag stores them)
2. Fall back to reading them directly from the URL
3. Pass them into the Convex mutation when submitting the quote

**Option A: Read from GTM's sessionStorage (recommended)**

The GTM "UTM Persistence" tag (already deployed) stores UTMs in sessionStorage under the key `_nsd_utm`. The quote form can read from there:

```typescript
// Helper function — add to the quote form component or a shared utils file
function getMarketingAttribution(): {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  gclid?: string;
  landing_page?: string;
  referrer?: string;
} {
  // First, try sessionStorage (set by GTM UTM Persistence tag)
  try {
    const stored = sessionStorage.getItem('_nsd_utm');
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed && parsed.utm_source) {
        return {
          utm_source: parsed.utm_source || undefined,
          utm_medium: parsed.utm_medium || undefined,
          utm_campaign: parsed.utm_campaign || undefined,
          utm_content: parsed.utm_content || undefined,
          utm_term: parsed.utm_term || undefined,
          gclid: parsed.gclid || undefined,
          landing_page: parsed.landing_page || undefined,
          referrer: parsed.referrer || undefined,
        };
      }
    }
  } catch (e) {
    // sessionStorage not available
  }

  // Fallback: read directly from URL
  try {
    const url = new URL(window.location.href);
    const source = url.searchParams.get('utm_source');
    if (source) {
      return {
        utm_source: source,
        utm_medium: url.searchParams.get('utm_medium') || undefined,
        utm_campaign: url.searchParams.get('utm_campaign') || undefined,
        utm_content: url.searchParams.get('utm_content') || undefined,
        utm_term: url.searchParams.get('utm_term') || undefined,
        gclid: url.searchParams.get('gclid') || undefined,
        landing_page: window.location.href,
        referrer: document.referrer || undefined,
      };
    }
  } catch (e) {
    // URL parsing failed
  }

  // No gclid in URL — check Google's Conversion Linker cookie
  try {
    const gclMatch = document.cookie.match(/(^| )_gcl_aw=([^;]+)/);
    if (gclMatch) {
      const parts = gclMatch[2].split('.');
      const gclid = parts.length >= 3 ? parts[2] : undefined;
      if (gclid) {
        return {
          utm_source: 'google',
          utm_medium: 'cpc',
          gclid,
          landing_page: window.location.href,
          referrer: document.referrer || undefined,
        };
      }
    }
  } catch (e) {
    // Cookie access failed
  }

  // No attribution data found — return referrer only
  return {
    referrer: document.referrer || undefined,
    landing_page: window.location.href,
  };
}
```

**Option B: Read directly from URL (simpler but less reliable)**

If the GTM tag is not on the quote subdomain, read from URL params directly. This only works if the user is still on the UTM-tagged URL when they submit (won't work if they navigated away from the landing page).

---

## Change 3: Pass Attribution into the Convex Mutation

Find the Convex mutation that creates a new quote. It will look something like:

```typescript
// BEFORE (current code — somewhere in your mutations)
export const createQuote = mutation({
  args: {
    // ... existing args like project_info, address_info, etc.
  },
  handler: async (ctx, args) => {
    const quoteId = await ctx.db.insert("quotes", {
      // ... existing fields
    });
    return quoteId;
  },
});
```

Update it to accept and store attribution fields:

```typescript
// AFTER
export const createQuote = mutation({
  args: {
    // ... all existing args stay the same ...

    // Add these new optional args:
    utm_source: v.optional(v.string()),
    utm_medium: v.optional(v.string()),
    utm_campaign: v.optional(v.string()),
    utm_content: v.optional(v.string()),
    utm_term: v.optional(v.string()),
    gclid: v.optional(v.string()),
    landing_page: v.optional(v.string()),
    referrer: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const quoteId = await ctx.db.insert("quotes", {
      // ... all existing fields stay the same ...

      // Add attribution fields:
      utm_source: args.utm_source,
      utm_medium: args.utm_medium,
      utm_campaign: args.utm_campaign,
      utm_content: args.utm_content,
      utm_term: args.utm_term,
      gclid: args.gclid,
      landing_page: args.landing_page,
      referrer: args.referrer,
    });
    return quoteId;
  },
});
```

Then, in the React component that calls this mutation, pass the attribution data:

```typescript
// In the quote form component, where the mutation is called:
const attribution = getMarketingAttribution();

await createQuote({
  // ... all existing fields ...

  // Add attribution:
  utm_source: attribution.utm_source,
  utm_medium: attribution.utm_medium,
  utm_campaign: attribution.utm_campaign,
  utm_content: attribution.utm_content,
  utm_term: attribution.utm_term,
  gclid: attribution.gclid,
  landing_page: attribution.landing_page,
  referrer: attribution.referrer,
});
```

---

## Change 4: Include Attribution in the Webhook Payload

Find the Convex action or function that sends quote lifecycle events to the NSD Sales Engine endpoint. It sends a POST request to:
```
https://analytics.neonsignsdepot.com/api/ingest/qms-deal
```

The webhook payload currently sends fields like `convex_quote_id`, `quote_number`, `quote_activity`, `customer_name`, etc. Add the attribution fields to this payload:

```typescript
// In the webhook action, where the payload is built:
const payload = {
  // ... all existing fields stay the same ...

  // Add these (read from the quote document):
  landing_page: quote.landing_page || null,
  referrer: quote.referrer || null,
  utm_source: quote.utm_source || null,
  utm_medium: quote.utm_medium || null,
  utm_campaign: quote.utm_campaign || null,
};
```

The analytics endpoint already accepts these fields — no changes needed on the receiving side.

---

## Verification

After deploying these changes:

1. **Open your website in an incognito window** with UTM parameters in the URL:
   ```
   https://neonsignsdepot.com/custom-neon-signs?utm_source=google&utm_medium=cpc&utm_campaign=test-attribution
   ```

2. **Check sessionStorage** in browser dev tools (Application tab > Session Storage). You should see `_nsd_utm` with the UTM values.

3. **Navigate to the quote form** and submit a test quote.

4. **Check the Convex dashboard** — the new quote document should have `utm_source: "google"`, `utm_medium: "cpc"`, `utm_campaign: "test-attribution"`.

5. **Check the NSD Sales Engine** — navigate to `/dashboard/marketing/warm-outreach`. The Source Attribution section should show a "google" source entry (in addition to "direct").

6. **Check the Click-to-Quote section** — the "Paid" rate should now show a non-zero value.

---

## Fields Reference

| Field | Example Value | Source |
|-------|--------------|--------|
| `utm_source` | `google` | URL param or sessionStorage |
| `utm_medium` | `cpc` | URL param or sessionStorage |
| `utm_campaign` | `custom-neon-b2b` | URL param or sessionStorage |
| `utm_content` | `headline-2` | URL param or sessionStorage |
| `utm_term` | `custom neon sign` | URL param or sessionStorage |
| `gclid` | `EAIaIQobChMI...` | URL param or `_gcl_aw` cookie |
| `landing_page` | `https://neonsignsdepot.com/custom-neon-signs` | Captured on first page load |
| `referrer` | `https://www.google.com/` | `document.referrer` |

---

## What This Unlocks

Once UTM data flows through, the Marketing Command Center automatically computes:
- Per-channel Click-to-Quote Rate (Google Ads vs Organic vs Direct)
- Per-channel Close Rate (Quote-to-Sale by source)
- Cost per Quote (Google Ads spend / paid quotes)
- Cost per Sale (Google Ads spend / paid won deals)
- Click-to-Sale Rate (end-to-end marketing efficiency)
- Source Attribution breakdown (which channels drive the most pipeline)

No additional changes are needed on the analytics side — the attribution bridge and dashboard queries are already built to use these fields.
