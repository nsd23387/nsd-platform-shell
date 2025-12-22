# NSD Social Activity Taxonomy

> **Status:** Approved  
> **Classification:** Internal — Technical Reference  
> **Last Updated:** 2025-12-22  
> **Owner:** Platform Engineering Team  
> **Milestone:** M17-02

---

## Purpose

This document defines the **canonical taxonomy** for social activity events within the NSD platform. These events are append-only, immutable records designed for observation and analytics. They are consumed by the Activity Spine and downstream systems for situational awareness, reporting, and audit purposes.

### Core Principles

| Principle | Description |
|-----------|-------------|
| **Append-Only** | Events are immutable once written; no updates or deletions |
| **Observational** | Events describe what happened; they do not trigger mutations |
| **Canonical** | Single authoritative definition for each event type |
| **Platform-Agnostic** | Event structure is consistent across all social platforms |
| **Traceable** | Every event includes actor, timestamp, and content reference |

### What This Taxonomy Defines

| Scope | Description |
|-------|-------------|
| **Event Types** | Canonical names and definitions for social activity events |
| **Event Schema** | Required and optional fields for each event type |
| **Field Semantics** | Meaning and constraints for each field |
| **Consumption Patterns** | How events should be read and interpreted |

### What This Taxonomy Does NOT Define

| Excluded Scope | Rationale |
|----------------|-----------|
| **Mutation Operations** | Events are read-only observations |
| **Business Logic** | Events describe facts, not rules |
| **Publishing Workflows** | Operational procedures are separate |
| **Platform APIs** | Integration details are implementation-specific |
| **Retention Policies** | Data lifecycle is governed separately |

---

## Non-Negotiable Rules

1. **No Mutation Semantics:** Events describe observations. They do not create, update, or delete content.
2. **Immutability:** Once an event is written, it cannot be modified or deleted.
3. **Required Fields:** Every event must include `eventId`, `eventType`, `actor`, `timestamp`, `platform`, and `contentRef`.
4. **Idempotency:** Event consumers must handle duplicate events gracefully.
5. **No PII in Events:** Events must not contain personally identifiable information beyond actor references.
6. **UTC Timestamps:** All timestamps must be in ISO 8601 format with UTC timezone.

---

## Common Event Schema

All social activity events share a common base schema.

### Base Event Structure

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `eventId` | `string` | Yes | Unique identifier for this event (UUID v4) |
| `eventType` | `string` | Yes | Canonical event type name |
| `actor` | `Actor` | Yes | Who or what triggered this event |
| `timestamp` | `string` | Yes | When the event occurred (ISO 8601 UTC) |
| `platform` | `Platform` | Yes | Social platform where activity occurred |
| `contentRef` | `ContentRef` | Yes | Reference to the content involved |
| `metadata` | `object` | No | Event-type-specific additional data |
| `correlationId` | `string` | No | Links related events together |
| `orgId` | `string` | Yes | Organization identifier |

### Actor Object

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `actorId` | `string` | Yes | Unique identifier for the actor |
| `actorType` | `string` | Yes | Type of actor: `user`, `system`, `integration` |
| `displayName` | `string` | No | Human-readable name (for display only) |

### Platform Enumeration

| Value | Description |
|-------|-------------|
| `linkedin` | LinkedIn Company Page |
| `twitter` | X (Twitter) Brand Account |
| `instagram` | Instagram Business Account |
| `facebook` | Facebook Business Page |
| `youtube` | YouTube Brand Channel |
| `tiktok` | TikTok Business Account |

### ContentRef Object

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `contentId` | `string` | Yes | Unique identifier for the content |
| `contentType` | `string` | Yes | Type of content (see Content Types) |
| `version` | `number` | No | Content version number (if applicable) |
| `externalId` | `string` | No | Platform-specific content identifier |

### Content Types

| Value | Description |
|-------|-------------|
| `post` | Standard social media post |
| `story` | Ephemeral story content |
| `reel` | Short-form video content |
| `video` | Long-form video content |
| `article` | Long-form written content (LinkedIn articles) |
| `comment` | Reply or comment on existing content |
| `thread` | Multi-part threaded content |

---

## Event Types

### ContentCreated

Emitted when new social content is created in the content management system.

#### Definition

| Attribute | Value |
|-----------|-------|
| **Event Type** | `social.content.created` |
| **Trigger** | Content is saved as draft or submitted for review |
| **Frequency** | Once per content item creation |
| **Correlation** | May be followed by `ContentApproved`, `ContentScheduled` |

#### Schema

```
{
  "eventId": "uuid-v4",
  "eventType": "social.content.created",
  "actor": {
    "actorId": "user-123",
    "actorType": "user",
    "displayName": "Jane Smith"
  },
  "timestamp": "2025-12-22T14:30:00.000Z",
  "platform": "linkedin",
  "contentRef": {
    "contentId": "content-456",
    "contentType": "post",
    "version": 1
  },
  "orgId": "org-789",
  "metadata": {
    "status": "draft",
    "contentCategory": "promotional",
    "hasMedia": true,
    "mediaCount": 2,
    "characterCount": 280,
    "hashtagCount": 3
  }
}
```

#### Metadata Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `status` | `string` | Yes | Initial status: `draft`, `pending_review` |
| `contentCategory` | `string` | No | Category per governance: `standard`, `promotional`, `announcement`, etc. |
| `hasMedia` | `boolean` | No | Whether content includes media attachments |
| `mediaCount` | `number` | No | Number of media attachments |
| `characterCount` | `number` | No | Character count of text content |
| `hashtagCount` | `number` | No | Number of hashtags included |

---

### ContentApproved

Emitted when content receives approval from an authorized approver.

#### Definition

| Attribute | Value |
|-----------|-------|
| **Event Type** | `social.content.approved` |
| **Trigger** | Approver grants approval for content |
| **Frequency** | Once per approval decision (may have multiple approvers) |
| **Correlation** | Preceded by `ContentCreated`; may be followed by `ContentScheduled` |

#### Schema

```
{
  "eventId": "uuid-v4",
  "eventType": "social.content.approved",
  "actor": {
    "actorId": "user-456",
    "actorType": "user",
    "displayName": "Marketing Director"
  },
  "timestamp": "2025-12-22T16:00:00.000Z",
  "platform": "linkedin",
  "contentRef": {
    "contentId": "content-456",
    "contentType": "post",
    "version": 1
  },
  "orgId": "org-789",
  "correlationId": "workflow-123",
  "metadata": {
    "approvalType": "content",
    "approverRole": "marketing_director",
    "approvalLevel": 1,
    "totalApprovalsRequired": 1,
    "totalApprovalsReceived": 1,
    "reviewDurationMinutes": 90,
    "comments": null
  }
}
```

#### Metadata Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `approvalType` | `string` | Yes | Type of approval: `content`, `brand`, `legal`, `executive` |
| `approverRole` | `string` | Yes | Role of the approver |
| `approvalLevel` | `number` | No | Approval level in multi-tier workflows |
| `totalApprovalsRequired` | `number` | No | Total approvals needed for this content |
| `totalApprovalsReceived` | `number` | No | Approvals received so far |
| `reviewDurationMinutes` | `number` | No | Time from submission to approval |
| `comments` | `string` | No | Approver comments (if any) |

---

### ContentScheduled

Emitted when approved content is scheduled for future publication.

#### Definition

| Attribute | Value |
|-----------|-------|
| **Event Type** | `social.content.scheduled` |
| **Trigger** | Content is assigned a publication time |
| **Frequency** | Once per scheduling action (may be rescheduled) |
| **Correlation** | Preceded by `ContentApproved`; followed by `ContentPublished` |

#### Schema

```
{
  "eventId": "uuid-v4",
  "eventType": "social.content.scheduled",
  "actor": {
    "actorId": "user-123",
    "actorType": "user",
    "displayName": "Jane Smith"
  },
  "timestamp": "2025-12-22T16:30:00.000Z",
  "platform": "linkedin",
  "contentRef": {
    "contentId": "content-456",
    "contentType": "post",
    "version": 1
  },
  "orgId": "org-789",
  "correlationId": "workflow-123",
  "metadata": {
    "scheduledTime": "2025-12-23T09:00:00.000Z",
    "timezone": "America/New_York",
    "isReschedule": false,
    "previousScheduledTime": null,
    "schedulingMethod": "manual"
  }
}
```

#### Metadata Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `scheduledTime` | `string` | Yes | Planned publication time (ISO 8601 UTC) |
| `timezone` | `string` | No | Timezone context for scheduling decision |
| `isReschedule` | `boolean` | Yes | Whether this is a rescheduling event |
| `previousScheduledTime` | `string` | No | Previous scheduled time if rescheduled |
| `schedulingMethod` | `string` | No | How scheduled: `manual`, `optimal_time`, `campaign` |

---

### ContentPublished

Emitted when content is published to the social platform.

#### Definition

| Attribute | Value |
|-----------|-------|
| **Event Type** | `social.content.published` |
| **Trigger** | Content is successfully posted to the platform |
| **Frequency** | Once per successful publication |
| **Correlation** | Preceded by `ContentScheduled` or direct publish after `ContentApproved` |

#### Schema

```
{
  "eventId": "uuid-v4",
  "eventType": "social.content.published",
  "actor": {
    "actorId": "system-publisher",
    "actorType": "system",
    "displayName": "Publishing Service"
  },
  "timestamp": "2025-12-23T09:00:15.000Z",
  "platform": "linkedin",
  "contentRef": {
    "contentId": "content-456",
    "contentType": "post",
    "version": 1,
    "externalId": "urn:li:share:7012345678901234567"
  },
  "orgId": "org-789",
  "correlationId": "workflow-123",
  "metadata": {
    "publishMethod": "scheduled",
    "scheduledTime": "2025-12-23T09:00:00.000Z",
    "actualPublishTime": "2025-12-23T09:00:15.000Z",
    "publishDelaySeconds": 15,
    "platformPostId": "7012345678901234567",
    "platformPostUrl": "https://linkedin.com/feed/update/urn:li:share:7012345678901234567",
    "visibility": "public"
  }
}
```

#### Metadata Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `publishMethod` | `string` | Yes | How published: `scheduled`, `immediate`, `manual` |
| `scheduledTime` | `string` | No | Originally scheduled time (if scheduled) |
| `actualPublishTime` | `string` | Yes | Actual time content went live |
| `publishDelaySeconds` | `number` | No | Delay from scheduled to actual publish |
| `platformPostId` | `string` | Yes | Platform's identifier for the published post |
| `platformPostUrl` | `string` | No | URL to the published content |
| `visibility` | `string` | No | Post visibility: `public`, `connections`, `private` |

---

### EngagementObserved

Emitted when engagement metrics are captured for published content.

#### Definition

| Attribute | Value |
|-----------|-------|
| **Event Type** | `social.engagement.observed` |
| **Trigger** | Periodic polling or webhook notification of engagement |
| **Frequency** | Multiple times per content item (snapshot-based) |
| **Correlation** | Preceded by `ContentPublished` |

#### Schema

```
{
  "eventId": "uuid-v4",
  "eventType": "social.engagement.observed",
  "actor": {
    "actorId": "system-analytics",
    "actorType": "system",
    "displayName": "Analytics Service"
  },
  "timestamp": "2025-12-23T15:00:00.000Z",
  "platform": "linkedin",
  "contentRef": {
    "contentId": "content-456",
    "contentType": "post",
    "version": 1,
    "externalId": "urn:li:share:7012345678901234567"
  },
  "orgId": "org-789",
  "correlationId": "workflow-123",
  "metadata": {
    "observationTime": "2025-12-23T15:00:00.000Z",
    "hoursSincePublish": 6,
    "impressions": 1250,
    "reach": 980,
    "engagements": {
      "likes": 45,
      "comments": 8,
      "shares": 12,
      "clicks": 67,
      "saves": 5
    },
    "engagementRate": 0.036,
    "isSnapshot": true,
    "snapshotSequence": 3
  }
}
```

#### Metadata Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `observationTime` | `string` | Yes | When metrics were captured |
| `hoursSincePublish` | `number` | Yes | Hours elapsed since publication |
| `impressions` | `number` | No | Number of times content was displayed |
| `reach` | `number` | No | Unique accounts that saw content |
| `engagements` | `object` | Yes | Breakdown of engagement types |
| `engagements.likes` | `number` | No | Like/reaction count |
| `engagements.comments` | `number` | No | Comment count |
| `engagements.shares` | `number` | No | Share/repost count |
| `engagements.clicks` | `number` | No | Click count (links, media) |
| `engagements.saves` | `number` | No | Save/bookmark count |
| `engagementRate` | `number` | No | Engagements / impressions ratio |
| `isSnapshot` | `boolean` | Yes | Whether this is a point-in-time snapshot |
| `snapshotSequence` | `number` | No | Sequence number of this snapshot |

#### Snapshot Frequency

| Time Since Publish | Observation Frequency |
|-------------------|----------------------|
| 0-24 hours | Every 2 hours |
| 24-72 hours | Every 6 hours |
| 72+ hours | Daily |

---

## Event Lifecycle

### Typical Content Lifecycle

```
ContentCreated
     │
     ▼
ContentApproved (may repeat for multi-tier approval)
     │
     ▼
ContentScheduled (optional, if not immediate publish)
     │
     ▼
ContentPublished
     │
     ▼
EngagementObserved (repeating snapshots)
```

### Correlation

Events in the same content lifecycle are linked via `correlationId`. This enables:

- Tracking content from creation to publication
- Calculating time-to-publish metrics
- Understanding approval workflow duration
- Correlating engagement with content attributes

---

## Consumption Patterns

### Read-Only Access

| Pattern | Description |
|---------|-------------|
| **Event Sourcing** | Reconstruct content state from event stream |
| **Analytics Aggregation** | Aggregate events for dashboard metrics |
| **Audit Trail** | Query events for compliance and investigation |
| **Real-Time Monitoring** | Stream events for operational awareness |

### Query Examples

| Use Case | Query Pattern |
|----------|---------------|
| **Content pending approval** | `eventType = 'social.content.created' AND NOT EXISTS (contentRef.contentId IN approved)` |
| **Average approval time** | `AVG(approved.timestamp - created.timestamp) WHERE correlationId matches` |
| **Engagement by platform** | `SUM(engagements) GROUP BY platform` |
| **Publishing delay** | `AVG(published.publishDelaySeconds)` |

### No Mutation Semantics

Events are observations, not commands:

| ❌ Events Do NOT | ✅ Events DO |
|------------------|--------------|
| Create content | Describe that content was created |
| Approve content | Describe that approval was granted |
| Schedule posts | Describe that scheduling occurred |
| Publish posts | Describe that publication succeeded |
| Update metrics | Describe observed engagement state |

---

## TypeScript Type Definitions

For implementation reference, the following TypeScript types represent this taxonomy:

```typescript
// Social Activity Event Types

type Platform = 'linkedin' | 'twitter' | 'instagram' | 'facebook' | 'youtube' | 'tiktok';

type ContentType = 'post' | 'story' | 'reel' | 'video' | 'article' | 'comment' | 'thread';

type ActorType = 'user' | 'system' | 'integration';

interface Actor {
  actorId: string;
  actorType: ActorType;
  displayName?: string;
}

interface ContentRef {
  contentId: string;
  contentType: ContentType;
  version?: number;
  externalId?: string;
}

interface BaseSocialEvent {
  eventId: string;
  eventType: string;
  actor: Actor;
  timestamp: string; // ISO 8601 UTC
  platform: Platform;
  contentRef: ContentRef;
  orgId: string;
  correlationId?: string;
  metadata?: Record<string, unknown>;
}

interface ContentCreatedEvent extends BaseSocialEvent {
  eventType: 'social.content.created';
  metadata: {
    status: 'draft' | 'pending_review';
    contentCategory?: string;
    hasMedia?: boolean;
    mediaCount?: number;
    characterCount?: number;
    hashtagCount?: number;
  };
}

interface ContentApprovedEvent extends BaseSocialEvent {
  eventType: 'social.content.approved';
  metadata: {
    approvalType: 'content' | 'brand' | 'legal' | 'executive';
    approverRole: string;
    approvalLevel?: number;
    totalApprovalsRequired?: number;
    totalApprovalsReceived?: number;
    reviewDurationMinutes?: number;
    comments?: string | null;
  };
}

interface ContentScheduledEvent extends BaseSocialEvent {
  eventType: 'social.content.scheduled';
  metadata: {
    scheduledTime: string; // ISO 8601 UTC
    timezone?: string;
    isReschedule: boolean;
    previousScheduledTime?: string | null;
    schedulingMethod?: 'manual' | 'optimal_time' | 'campaign';
  };
}

interface ContentPublishedEvent extends BaseSocialEvent {
  eventType: 'social.content.published';
  metadata: {
    publishMethod: 'scheduled' | 'immediate' | 'manual';
    scheduledTime?: string;
    actualPublishTime: string;
    publishDelaySeconds?: number;
    platformPostId: string;
    platformPostUrl?: string;
    visibility?: 'public' | 'connections' | 'private';
  };
}

interface EngagementMetrics {
  likes?: number;
  comments?: number;
  shares?: number;
  clicks?: number;
  saves?: number;
}

interface EngagementObservedEvent extends BaseSocialEvent {
  eventType: 'social.engagement.observed';
  metadata: {
    observationTime: string;
    hoursSincePublish: number;
    impressions?: number;
    reach?: number;
    engagements: EngagementMetrics;
    engagementRate?: number;
    isSnapshot: boolean;
    snapshotSequence?: number;
  };
}

type SocialActivityEvent =
  | ContentCreatedEvent
  | ContentApprovedEvent
  | ContentScheduledEvent
  | ContentPublishedEvent
  | EngagementObservedEvent;
```

---

## Integration with Activity Spine

### Event Ingestion

Social activity events are ingested into the Activity Spine via:

| Method | Description |
|--------|-------------|
| **Webhook** | Real-time event push from content management system |
| **Polling** | Scheduled fetch for engagement metrics |
| **Batch Import** | Historical data migration |

### Data Flow

```
Content Management System
         │
         ▼
   Event Producer
         │
         ▼
   Activity Spine (Ingestion)
         │
         ▼
   Activity Spine (Storage)
         │
         ├──► Dashboards (Read-Only)
         ├──► Analytics (Aggregation)
         └──► Audit (Query)
```

### Activity Spine Response Format

Events are returned in the standard Activity Spine wrapper:

```typescript
interface ActivitySpineResponse<T> {
  data: T;
  timestamp: string;
  orgId: string;
}

// Example: Fetching social events
type SocialEventsResponse = ActivitySpineResponse<SocialActivityEvent[]>;
```

---

## Versioning

### Event Schema Versioning

| Version | Description |
|---------|-------------|
| `1.0` | Initial schema (M17-02) |

### Backward Compatibility

- New optional fields may be added without version change
- Required field additions require version increment
- Field removals require deprecation period and version increment
- Event type names are stable and never changed

### Schema Evolution Rules

| Change Type | Backward Compatible | Action Required |
|-------------|---------------------|-----------------|
| Add optional field | Yes | None |
| Add required field | No | Version increment |
| Remove field | No | Deprecation + version increment |
| Change field type | No | Version increment |
| Rename field | No | Treat as remove + add |

---

## Document Control

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-12-22 | Platform Engineering | Initial specification (M17-02) |

---

*This document is governance-controlled. Changes require Platform Engineering review and approval.*
