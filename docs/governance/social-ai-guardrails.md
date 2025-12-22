# NSD Social AI Guardrails

> **Status:** Approved  
> **Classification:** Internal — Governance  
> **Last Updated:** 2025-12-22  
> **Owner:** Platform Engineering & Marketing  
> **Milestone:** M17-03  
> **Parent Document:** [Social Content Governance](./social-content-governance.md)

---

## Purpose

This document defines **explicit prohibitions and constraints** on AI usage for social content within NSD. It serves as the authoritative reference for what AI systems may and may not do when involved in social content workflows.

### Why AI Guardrails Matter

| Concern | Risk Without Guardrails |
|---------|------------------------|
| **Brand Safety** | AI-generated content may not align with brand voice or values |
| **Legal Compliance** | Autonomous AI actions may violate regulations or platform policies |
| **Authenticity** | AI impersonation erodes trust with audiences |
| **Accountability** | Autonomous systems obscure human responsibility |
| **Quality Control** | AI may generate inaccurate, inappropriate, or off-brand content |

### Scope

This document applies to:

- All AI tools used in social content creation, review, or analysis
- All personnel using AI assistance for social content
- All systems integrating AI capabilities with social workflows
- All third-party AI services used for NSD social content

---

## Non-Negotiable Principles

1. **Human Authority:** Humans retain final authority over all social content decisions.
2. **No Autonomous Action:** AI may not take actions that affect published content without human authorization.
3. **Transparency:** AI involvement in content creation must be documented internally.
4. **Accountability:** A human is always accountable for published content, regardless of AI assistance.
5. **Reversibility:** AI-assisted drafts can always be discarded; AI never commits irreversible actions.

---

## AI Permitted Actions

The following actions are **explicitly permitted** for AI systems, subject to the constraints defined in this document.

### Drafting Assistance

| Permitted Action | Constraints | Human Requirement |
|------------------|-------------|-------------------|
| **Generate draft content** | Must be reviewed before use | Human edits and approves |
| **Suggest headlines/captions** | Multiple options required | Human selects final |
| **Expand bullet points** | Source material must be provided | Human verifies accuracy |
| **Adapt content for platforms** | Brand guidelines must be followed | Human reviews adaptation |
| **Translate content** | Native speaker review required | Human approves translation |

### Variant Suggestions

| Permitted Action | Constraints | Human Requirement |
|------------------|-------------|-------------------|
| **Generate A/B test variants** | Minimum 3 options | Human selects variants to test |
| **Suggest alternative phrasings** | Must preserve meaning | Human chooses final wording |
| **Propose hashtag sets** | Must be validated for appropriateness | Human approves hashtags |
| **Recommend emoji usage** | Brand guidelines apply | Human makes final decision |
| **Create shortened versions** | Must retain key message | Human verifies accuracy |

### Engagement Analysis

| Permitted Action | Constraints | Human Requirement |
|------------------|-------------|-------------------|
| **Analyze engagement patterns** | Historical data only | Human interprets findings |
| **Identify trending topics** | Relevance filtering required | Human decides participation |
| **Sentiment analysis** | Aggregate only, no individual profiling | Human reviews conclusions |
| **Optimal timing suggestions** | Based on historical performance | Human approves schedule |
| **Audience insights** | Anonymized and aggregated | Human applies insights |
| **Competitive landscape summary** | No disparagement generation | Human uses for strategy only |

### Content Quality Checks

| Permitted Action | Constraints | Human Requirement |
|------------------|-------------|-------------------|
| **Grammar and spelling review** | Suggestions only | Human accepts/rejects |
| **Brand voice consistency check** | Flag deviations | Human makes corrections |
| **Accessibility recommendations** | Alt text, readability | Human implements |
| **Link validation** | Check for broken links | Human fixes issues |
| **Compliance pre-screening** | Flag potential issues | Human reviews flags |

---

## AI Prohibited Actions

The following actions are **explicitly prohibited** for AI systems. Violations require immediate remediation and incident review.

### Content Publishing

| Prohibited Action | Rationale | Violation Severity |
|-------------------|-----------|-------------------|
| **Post content to any platform** | Human approval required for all publishing | Critical |
| **Schedule content for future posting** | Scheduling implies commitment to publish | Critical |
| **Modify scheduled content** | Changes to committed content require human review | Critical |
| **Delete published content** | Deletion decisions require human judgment | Critical |
| **Republish or boost content** | Amplification decisions require human approval | Critical |

### Approval and Authorization

| Prohibited Action | Rationale | Violation Severity |
|-------------------|-----------|-------------------|
| **Approve content for publication** | Approval authority is human-only | Critical |
| **Bypass approval workflows** | All content must follow governance process | Critical |
| **Grant publishing permissions** | Access control is human-administered | Critical |
| **Override rejection decisions** | Rejection decisions are final unless human reverses | Critical |
| **Auto-approve based on criteria** | No algorithmic approval permitted | Critical |

### Identity and Impersonation

| Prohibited Action | Rationale | Violation Severity |
|-------------------|-----------|-------------------|
| **Impersonate specific individuals** | Authenticity and legal concerns | Critical |
| **Respond as if human without disclosure** | Deceptive practice | Severe |
| **Create content attributed to named persons** | Requires explicit consent | Severe |
| **Generate fake testimonials or quotes** | Fraudulent content | Critical |
| **Simulate employee communications** | Internal trust and authenticity | Severe |

### Autonomous Operations

| Prohibited Action | Rationale | Violation Severity |
|-------------------|-----------|-------------------|
| **Operate without human oversight** | Human-in-the-loop required at all times | Critical |
| **Make decisions based on real-time triggers** | No autonomous reactive behavior | Critical |
| **Self-modify behavior or rules** | AI configuration is human-controlled | Critical |
| **Chain actions without checkpoints** | Each action requires human authorization | Severe |
| **Retry failed operations automatically** | Failures require human investigation | Moderate |

### Audience Interaction

| Prohibited Action | Rationale | Violation Severity |
|-------------------|-----------|-------------------|
| **Respond to comments or messages** | All responses require human review | Critical |
| **Engage in conversations** | Conversation is human-led | Critical |
| **Send direct messages** | DMs require human authorization | Critical |
| **Follow or unfollow accounts** | Relationship management is human-controlled | Severe |
| **Like, share, or react to content** | Engagement actions are human-initiated | Severe |

### Data Handling

| Prohibited Action | Rationale | Violation Severity |
|-------------------|-----------|-------------------|
| **Process personal data for content** | Privacy and compliance concerns | Critical |
| **Store conversation or engagement data** | Data retention is governed separately | Severe |
| **Profile individual users** | Privacy violation | Critical |
| **Export or transmit audience data** | Data protection requirements | Critical |
| **Use customer data in prompts** | Confidentiality requirements | Critical |

---

## Human-in-the-Loop Requirements

### Mandatory Human Checkpoints

Every AI-assisted social content workflow must include human authorization at these points:

| Checkpoint | Requirement | Cannot Be Bypassed |
|------------|-------------|-------------------|
| **Content Brief** | Human defines objectives before AI assists | ✓ |
| **Draft Review** | Human reviews all AI-generated content | ✓ |
| **Fact Verification** | Human verifies all claims and data | ✓ |
| **Final Approval** | Human approver authorizes publication | ✓ |
| **Publish Action** | Human initiates the publish command | ✓ |
| **Response Review** | Human reviews any proposed responses | ✓ |

### Checkpoint Documentation

| Checkpoint | Documentation Required |
|------------|----------------------|
| **Content Brief** | Objective, constraints, target platform |
| **Draft Review** | AI tool used, prompts given, changes made |
| **Fact Verification** | Sources checked, claims validated |
| **Final Approval** | Approver identity, timestamp, approval type |
| **Publish Action** | Publisher identity, timestamp, platform |

### No Automation of Checkpoints

| Prohibited Pattern | Why Prohibited |
|-------------------|----------------|
| **Auto-advance after timeout** | Silence is not consent |
| **Bulk approval of AI content** | Each piece requires individual review |
| **Delegated approval to AI** | Approval authority cannot be transferred to AI |
| **Conditional auto-publish** | No conditions bypass human publish action |

---

## AI Tool Requirements

### Approved Tool Criteria

AI tools used for social content must meet these requirements:

| Requirement | Description |
|-------------|-------------|
| **IT Security Approval** | Tool must be vetted and approved by IT Security |
| **Data Handling Compliance** | Must not retain or train on NSD data without approval |
| **Audit Logging** | Must provide logs of all AI interactions |
| **Output Controls** | Must allow human review before any action |
| **No Autonomous Features** | Auto-post, auto-schedule features must be disabled |

### Tool Configuration Requirements

| Setting | Required Configuration |
|---------|----------------------|
| **Auto-publish** | Disabled / Not available |
| **Auto-schedule** | Disabled / Not available |
| **Auto-respond** | Disabled / Not available |
| **Bulk operations** | Disabled / Requires per-item confirmation |
| **API write access** | Disabled unless explicitly approved |

### Prohibited Tool Features

| Feature | Status | Rationale |
|---------|--------|-----------|
| **Autonomous posting** | Must be disabled | Violates human-in-the-loop |
| **Smart scheduling** | Must require human confirmation | No autonomous scheduling |
| **Auto-reply bots** | Prohibited | No autonomous audience interaction |
| **Bulk content generation** | Requires per-item review | No mass auto-generation |
| **Continuous monitoring with actions** | Monitoring OK, actions prohibited | Read-only observation only |

---

## Incident Classification

### Violation Severity Levels

| Severity | Definition | Examples |
|----------|------------|----------|
| **Critical** | Autonomous action affecting published content or audience | AI posted content, AI responded to user, AI approved content |
| **Severe** | Violation of human-in-the-loop requirements | Bypassed approval, impersonation attempt, data misuse |
| **Moderate** | Process violation without external impact | Skipped documentation, used unapproved tool |
| **Minor** | Administrative violation | Incomplete logging, delayed documentation |

### Incident Response

| Severity | Immediate Action | Follow-Up |
|----------|-----------------|-----------|
| **Critical** | Halt AI operations, remove content if posted, notify Legal | Full incident review, remediation plan, potential disciplinary action |
| **Severe** | Suspend AI tool access for user, review all recent AI-assisted content | Incident review, retraining, process update |
| **Moderate** | Document incident, correct process | Coaching, process reminder |
| **Minor** | Document incident | Process reminder |

### Incident Reporting

All AI guardrail incidents must be reported to:

1. Immediate supervisor
2. Marketing Director
3. IT Security (for tool-related incidents)
4. Legal (for Critical severity)

---

## Monitoring and Enforcement

### Continuous Monitoring

| Monitoring Area | Method | Frequency |
|-----------------|--------|-----------|
| **AI tool usage** | Audit logs review | Weekly |
| **Content attribution** | AI-assistance tracking | Per content item |
| **Tool configuration** | Settings verification | Monthly |
| **Checkpoint compliance** | Workflow audit | Monthly |

### Enforcement Mechanisms

| Mechanism | Description |
|-----------|-------------|
| **Technical Controls** | AI tools configured to prevent prohibited actions |
| **Process Controls** | Workflow checkpoints require human action |
| **Audit Controls** | Regular review of AI usage patterns |
| **Training Controls** | Mandatory training before AI tool access |

### Compliance Verification

| Verification | Frequency | Owner |
|--------------|-----------|-------|
| **Tool configuration audit** | Quarterly | IT Security |
| **Workflow compliance review** | Monthly | Marketing Director |
| **Incident trend analysis** | Quarterly | Platform Engineering |
| **Training completion check** | Annually | HR |

---

## Training Requirements

### Mandatory Training

| Audience | Training | Frequency |
|----------|----------|-----------|
| **All AI tool users** | AI Guardrails Fundamentals | Before access, then annually |
| **Content creators** | AI-Assisted Content Creation | Before access, then annually |
| **Content approvers** | AI Content Review | Before access, then annually |
| **Administrators** | AI Tool Administration | Before access, then annually |

### Training Content

| Topic | Coverage |
|-------|----------|
| **Permitted actions** | What AI may assist with |
| **Prohibited actions** | What AI must never do |
| **Checkpoint requirements** | Human-in-the-loop obligations |
| **Incident reporting** | How to report violations |
| **Tool configuration** | Ensuring safe settings |

---

## Exceptions

### Exception Process

No exceptions to Critical prohibitions are permitted. For other guardrails:

1. Submit exception request to Marketing Director
2. Document business justification
3. Legal review required
4. IT Security review required
5. Time-limited approval only (maximum 90 days)
6. Enhanced monitoring during exception period

### Exception Documentation

| Required Element | Description |
|------------------|-------------|
| **Business justification** | Why exception is necessary |
| **Risk assessment** | What could go wrong |
| **Mitigation measures** | How risks will be controlled |
| **Duration** | Start and end date |
| **Monitoring plan** | How compliance will be verified |
| **Rollback plan** | How to revert if issues arise |

### Non-Exceptionable Rules

The following rules **cannot be excepted** under any circumstances:

- AI may not post content
- AI may not approve content
- AI may not impersonate individuals
- AI may not respond to audience without human review
- Human-in-the-loop checkpoints are mandatory

---

## Relationship to Other Documents

| Document | Relationship |
|----------|--------------|
| [Social Content Governance](./social-content-governance.md) | Parent governance document; this document provides AI-specific detail |
| [Social Activity Taxonomy](../taxonomy/social-activity-taxonomy.md) | Events generated by AI-assisted workflows follow this taxonomy |
| [Secrets Registry](../security/secrets.md) | AI tool credentials must be registered |

---

## Document Control

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-12-22 | Platform Engineering | Initial specification (M17-03) |

---

*This document is governance-controlled. Changes require Platform Engineering and Marketing Director review and approval.*
