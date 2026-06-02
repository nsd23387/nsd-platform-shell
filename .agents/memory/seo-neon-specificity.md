---
name: SEO content must be neon-specific
description: Business rule for Neon Signs Depot SEO copy and competitor sets — never generic "LED"/"signs", always neon.
---

# SEO content must be neon-specific

All SEO recommendations, keyword targets, and competitor lists surfaced to the user
must be neon-specific. Generic-sign framing ("Business LED Signs", "channel letter
signs", "monument sign", "buildasign.com", etc.) is wrong and actively harmful here.

**Why:** "LED signs" (and generic-sign) queries attract the wrong customers for a neon
brand and make conversion worse, not better — the user flagged this explicitly. The
right competitors are *neon* shops, not general sign printers.

**How to apply:**
- Canonical neon competitor set lives in `app/api/proxy/seo/competitor-gaps/route.ts`
  (`ALLOWED_COMPETITORS`): echoneon.com, neonmfg.com, voodooneon.com, neonpros.com.
  everythingneon.com is also a valid neon competitor. The route also lists signs.com,
  but the user rejected signs.com as a displayed competitor — do not surface it in UI.
- The SEO redesign mockups (`app/seo-mockups/proposed`, `app/seo-mockups/action-detail`)
  hold hardcoded SAMPLE data. Keep that sample data neon-specific too.
- One intentional exception: a `/blog/led-vs-neon/` comparison post is fine — "LED vs
  neon" captures LED searchers and converts them to neon; it is not generic-sign framing.
