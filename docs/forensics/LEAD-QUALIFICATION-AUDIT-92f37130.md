# Deep Forensics Audit: Lead Qualification Process

**Campaign ID:** `92f37130-3800-4811-bb17-2e46d5d9b4f9`  
**Campaign Name:** Q1 2026 - Gym Campaign Texas  
**Audit Date:** January 20, 2026  
**Status:** BLOCKED - Zero Leads Created Despite 77 Orgs + 1153 Contacts

---

## 1. Executive Summary

The campaign has successfully sourced **77 organizations** and discovered **1153 contacts**, but has created **0 leads**. This audit investigates the lead qualification pipeline to identify why contacts are not being promoted to leads.

### Current State
| Stage | Count | Status |
|-------|-------|--------|
| Organizations Sourced | 77 | Complete |
| Organizations Qualified | 0 | All in Review |
| Contacts Discovered | 1,153 | Complete |
| Leads Created | 0 | Blocked |
| Leads Approved | 0 | Blocked |

---

## 2. Forensic SQL Queries

Run these queries against the production database to diagnose the issue.

### 2.1 Organization Status Breakdown

```sql
-- Check organization status distribution (column is 'status', not 'qualification_status')
SELECT 
    status,
    COUNT(*) as count,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentage
FROM public.organizations
WHERE campaign_id = '92f37130-3800-4811-bb17-2e46d5d9b4f9'
GROUP BY status
ORDER BY count DESC;
```

**Expected Output Analysis:**
- If all 77 orgs are in `review` status → Org approval is blocking lead creation
- If orgs are `qualified` but no leads → Contact qualification is the blocker

### 2.2 Organization Scoring Details

```sql
-- Check org scoring results and why none were auto-approved
SELECT 
    id,
    name,
    status,
    score,
    created_at
FROM public.organizations
WHERE campaign_id = '92f37130-3800-4811-bb17-2e46d5d9b4f9'
ORDER BY score DESC NULLS LAST
LIMIT 20;
```

### 2.3 Contact Status Analysis

```sql
-- Check contact status distribution
SELECT 
    status,
    COUNT(*) as count
FROM public.campaign_contacts
WHERE campaign_id = '92f37130-3800-4811-bb17-2e46d5d9b4f9'
GROUP BY status
ORDER BY count DESC;
```

### 2.4 Contact Email Status

```sql
-- Check how many contacts have verified emails (required for lead promotion)
SELECT 
    CASE 
        WHEN email IS NOT NULL AND email != '' THEN 'has_email'
        ELSE 'no_email'
    END as email_status,
    CASE
        WHEN email_verified = true THEN 'verified'
        WHEN email_verified = false THEN 'unverified'
        ELSE 'unknown'
    END as verification_status,
    COUNT(*) as count
FROM public.campaign_contacts
WHERE campaign_id = '92f37130-3800-4811-bb17-2e46d5d9b4f9'
GROUP BY 1, 2
ORDER BY count DESC;
```

### 2.5 Contact Tier Distribution

```sql
-- Check contact tier assignments (leads are created from Tier A/B contacts)
SELECT 
    tier,
    COUNT(*) as count,
    COUNT(CASE WHEN email IS NOT NULL AND email != '' THEN 1 END) as with_email
FROM public.campaign_contacts
WHERE campaign_id = '92f37130-3800-4811-bb17-2e46d5d9b4f9'
GROUP BY tier
ORDER BY tier NULLS LAST;
```

### 2.6 Lead Qualification Config

```sql
-- Check the campaign's lead qualification configuration
SELECT 
    id,
    name,
    lead_qualification_config,
    contact_targeting,
    icp
FROM core.campaigns
WHERE id = '92f37130-3800-4811-bb17-2e46d5d9b4f9';
```

### 2.7 Execution Logs - Lead Stage

```sql
-- Check execution logs for lead-related stages
SELECT 
    stage,
    action,
    status,
    message,
    details,
    created_at
FROM public.execution_logs
WHERE campaign_id = '92f37130-3800-4811-bb17-2e46d5d9b4f9'
AND (stage ILIKE '%lead%' OR message ILIKE '%lead%')
ORDER BY created_at DESC
LIMIT 20;
```

### 2.8 Check for Blocking Conditions

```sql
-- Check if there's a blocking condition in the pipeline
SELECT 
    stage,
    action,
    status,
    message,
    details->>'blockingReason' as blocking_reason,
    created_at
FROM public.execution_logs
WHERE campaign_id = '92f37130-3800-4811-bb17-2e46d5d9b4f9'
AND (
    status = 'blocked' 
    OR status = 'failed'
    OR details->>'blockingReason' IS NOT NULL
)
ORDER BY created_at DESC;
```

### 2.9 Contact-to-Lead Pipeline Check

```sql
-- Check if any contacts meet lead promotion criteria
SELECT 
    cc.id as contact_id,
    cc.first_name,
    cc.last_name,
    cc.title,
    cc.email,
    cc.email_verified,
    cc.tier,
    cc.status,
    o.name as org_name,
    o.qualification_status as org_status
FROM public.campaign_contacts cc
JOIN public.organizations o ON cc.organization_id = o.id
WHERE cc.campaign_id = '92f37130-3800-4811-bb17-2e46d5d9b4f9'
AND cc.email IS NOT NULL 
AND cc.email != ''
AND cc.tier IN (0, 1)  -- Tier A and B
LIMIT 50;
```

### 2.10 Full Pipeline State Summary

```sql
-- Comprehensive pipeline state check (uses 'status' column for orgs)
WITH pipeline_state AS (
    SELECT
        (SELECT COUNT(*) FROM public.organizations WHERE campaign_id = '92f37130-3800-4811-bb17-2e46d5d9b4f9') as total_orgs,
        (SELECT COUNT(*) FROM public.organizations WHERE campaign_id = '92f37130-3800-4811-bb17-2e46d5d9b4f9' AND status = 'qualified') as qualified_orgs,
        (SELECT COUNT(*) FROM public.organizations WHERE campaign_id = '92f37130-3800-4811-bb17-2e46d5d9b4f9' AND status = 'review') as review_orgs,
        (SELECT COUNT(*) FROM public.campaign_contacts WHERE campaign_id = '92f37130-3800-4811-bb17-2e46d5d9b4f9') as total_contacts,
        (SELECT COUNT(*) FROM public.campaign_contacts WHERE campaign_id = '92f37130-3800-4811-bb17-2e46d5d9b4f9' AND email IS NOT NULL AND email != '') as contacts_with_email,
        (SELECT COUNT(*) FROM public.campaign_contacts WHERE campaign_id = '92f37130-3800-4811-bb17-2e46d5d9b4f9' AND tier IN (0, 1)) as tier_ab_contacts,
        (SELECT COUNT(*) FROM public.leads WHERE campaign_id = '92f37130-3800-4811-bb17-2e46d5d9b4f9') as total_leads
)
SELECT 
    total_orgs,
    qualified_orgs,
    review_orgs,
    total_contacts,
    contacts_with_email,
    tier_ab_contacts,
    total_leads,
    CASE 
        WHEN qualified_orgs = 0 AND review_orgs > 0 THEN 'BLOCKER: No orgs qualified (all in review)'
        WHEN contacts_with_email = 0 THEN 'BLOCKER: No contacts have emails'
        WHEN tier_ab_contacts = 0 THEN 'BLOCKER: No Tier A/B contacts'
        ELSE 'Pipeline looks OK - check lead creation logic'
    END as diagnosis
FROM pipeline_state;
```

---

## 3. Known Execution History

From the execution logs already retrieved:

### Run 1: January 19, 2026 (22:11 ET)
```
Stage: org_sourcing    → SUCCESS: Sourced 77 organizations
Stage: org_scoring     → SUCCESS: 0 auto-approved, 77 review, 0 disqualified
Stage: contacts_sourcing → SUCCESS: Sourced 2306 contacts, created 0 leads
```

### Run 2: January 20, 2026 (14:36 ET)
```
Stage: contacts_sourcing → SUCCESS: Sourced 0 contacts, created 0 leads
                          (No new contacts - they already exist)
```

---

## 4. Hypothesis: Root Cause

Based on the execution logs, the most likely blockers are:

### Hypothesis A: Organization Approval Blocking (HIGH PROBABILITY)
The org scoring stage shows: `"0 auto-approved, 77 review, 0 disqualified"`

**All 77 organizations are stuck in "review" status.**

Lead creation typically requires organizations to be in `qualified` or `approved` status. If the pipeline requires org approval before contact promotion, this would explain zero leads.

### Hypothesis B: Email Discovery Not Triggered
The contacts_sourcing log shows:
```json
{
  "needsEmailDiscovery": 0,
  "contactsSourced": 2306
}
```

If contacts don't have verified emails, they cannot be promoted to leads for outreach.

### Hypothesis C: Tier Assignment Issue
Check if contacts are being assigned to promotable tiers (Tier 0/A, Tier 1/B). Only certain tiers get promoted to leads.

### Hypothesis D: Lead Qualification Config
The campaign's `lead_qualification_config` may have criteria that no contacts meet.

---

## 5. Recommended Actions

### Immediate Actions

1. **Run Query 2.10** (Full Pipeline State Summary) to identify the exact blocker
2. **Check org approval status** - If all orgs are in "review", they need manual approval or auto-approval criteria adjustment
3. **Check email status** - Contacts may need email enrichment before lead promotion

### If Orgs Are Blocking:
```sql
-- Option: Bulk approve organizations for this campaign (if appropriate)
UPDATE public.organizations
SET status = 'qualified'
WHERE campaign_id = '92f37130-3800-4811-bb17-2e46d5d9b4f9'
AND status = 'review';
```

### If Emails Are Blocking:
- Trigger email discovery/enrichment stage
- Or check Apollo/data provider integration

### Re-run Lead Promotion:
After unblocking, re-run the campaign to trigger lead promotion from qualified contacts.

---

## 6. Pipeline Flow Reference

```
┌─────────────────┐
│  Org Sourcing   │ [DONE] 77 orgs
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Org Scoring    │ [REVIEW] 0 qualified, 77 review
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Org Approval    │ [BLOCKED] All in review?
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│Contact Sourcing │ [DONE] 1153 contacts
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│Email Discovery  │ [PENDING] Status unknown
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│Lead Promotion   │ [BLOCKED] 0 leads created
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│Lead Approval    │ [WAITING]
└─────────────────┘
```

---

## 7. Files to Review (Sales-Engine Backend)

If the issue is in lead promotion logic, review these files in the `nsd-sales-engine` repository:

1. `src/pipelines/lead-promotion.ts` - Lead promotion criteria
2. `src/pipelines/org-scoring.ts` - Why 0 auto-approved
3. `src/services/contact-qualification.ts` - Contact → Lead promotion rules
4. `src/config/campaign-defaults.ts` - Default qualification thresholds

---

## 8. Audit Checklist

| Check | Query | Status |
|-------|-------|--------|
| Org qualification distribution | 2.1 | Pending |
| Org scores and reasons | 2.2 | Pending |
| Contact status distribution | 2.3 | Pending |
| Contact email status | 2.4 | Pending |
| Contact tier distribution | 2.5 | Pending |
| Lead qualification config | 2.6 | Pending |
| Lead-related execution logs | 2.7 | Pending |
| Blocking conditions | 2.8 | Pending |
| Contacts meeting lead criteria | 2.9 | Pending |
| Full pipeline state | 2.10 | Pending |

---

## 9. Contact

**Prepared by:** Platform Shell Team  
**For:** Sales Engine Investigation  
**Priority:** High - Campaign blocked at lead creation

---

*Run queries in order and update this document with findings.*
