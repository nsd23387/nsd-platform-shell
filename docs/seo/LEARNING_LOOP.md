# SEO Intelligence - Learning Loop

This document describes how the SEO Intelligence system learns from human
decisions to improve future recommendations.

## Overview

The Learning Loop is a feedback mechanism that:

1. Captures human approval/rejection decisions
2. Analyzes patterns in accepted vs rejected recommendations
3. Feeds insights back to the AI recommendation engine
4. Continuously improves recommendation quality

## Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    Human Decision Point                          │
│                                                                   │
│   Recommendation  ──►  Human Reviews  ──►  Decision + Reason     │
│                                                                   │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Audit Log Storage                           │
│                                                                   │
│   • Recommendation ID                                            │
│   • Decision (approve/reject/defer)                              │
│   • Rejection reason (if rejected)                               │
│   • Confidence at decision time                                  │
│   • User who decided                                             │
│   • Timestamp                                                    │
│                                                                   │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Learning Pipeline                             │
│                                                                   │
│   1. Aggregate decision patterns                                 │
│   2. Analyze rejection reasons                                   │
│   3. Correlate with recommendation attributes                    │
│   4. Generate improvement signals                                │
│                                                                   │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                 Recommendation Engine Update                     │
│                                                                   │
│   • Adjust confidence calibration                                │
│   • Refine suggestion types                                      │
│   • Improve impact predictions                                   │
│   • Update rejection predictors                                  │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

## Learning Signals

### From Approvals

When recommendations are approved:

- **Positive Signal**: This type of recommendation is valuable
- **Confidence Calibration**: If high-confidence → approved, calibration is correct
- **Impact Validation**: Track actual vs predicted impact after implementation

### From Rejections

When recommendations are rejected:

- **Negative Signal**: This type might need refinement
- **Reason Analysis**: Why was it rejected?
  - Inaccurate assessment
  - Not relevant to business
  - Already implemented
  - Technical infeasibility
  - Timing issues
- **Pattern Detection**: Are certain types consistently rejected?

### From Deferrals

When recommendations are deferred:

- **Timing Signal**: Recommendation valid but timing wrong
- **Priority Signal**: Lower priority than queue position suggested
- **Context Signal**: External factors affecting decision

## Rejection Reason Categories

Standardized rejection reasons enable better learning:

| Category | Description | Learning Action |
|----------|-------------|-----------------|
| `inaccurate` | Assessment is wrong | Improve analysis model |
| `irrelevant` | Not valuable for business | Adjust priority scoring |
| `implemented` | Already done | Improve state detection |
| `infeasible` | Can't be implemented | Add feasibility checks |
| `timing` | Wrong time for this | Add timing awareness |
| `duplicate` | Similar to existing | Improve deduplication |
| `low_quality` | Suggestion is poor | Retrain generation |

## Metrics Tracked

### Decision Metrics

- **Approval Rate**: % of recommendations approved
- **Rejection Rate**: % of recommendations rejected
- **Deferral Rate**: % of recommendations deferred
- **Time to Decision**: How long until decision made

### Quality Metrics

- **Confidence Accuracy**: Did high-confidence get approved more?
- **Impact Accuracy**: Did predicted impact match actual impact?
- **Type Performance**: Which recommendation types perform best?
- **Reason Distribution**: What are common rejection reasons?

### Trend Metrics

- **Approval Rate Trend**: Is quality improving over time?
- **Rejection Reason Shift**: Are rejection patterns changing?
- **Confidence Calibration Drift**: Is confidence still accurate?

## Implementation Notes

### Required Data

For the learning loop to function, we need:

1. **Complete Audit History**: All decisions with metadata
2. **Rejection Reasons**: Mandatory for rejected recommendations
3. **Implementation Tracking**: Know when approved items are deployed
4. **Outcome Data**: SEO performance after implementation

### Privacy Considerations

- Learning happens on aggregate data
- Individual user patterns not used for training
- PII excluded from learning pipeline
- Data retention per policy

### Feedback Delay

- Approval/rejection feedback: Immediate
- Implementation feedback: Days to weeks
- SEO impact feedback: Weeks to months

### Graceful Degradation

If learning loop is unavailable:

- Recommendations continue with current model
- Audit logging continues
- Learning catches up when available

## Future Enhancements

### Planned

1. **Active Learning**: Prioritize uncertain cases for review
2. **Explanation Generation**: Show why recommendation was generated
3. **Reviewer Calibration**: Track individual reviewer patterns
4. **A/B Testing**: Test different recommendation strategies

### Potential

1. **Auto-Confidence Adjustment**: Calibrate confidence in real-time
2. **Rejection Prediction**: Flag likely-to-be-rejected recommendations
3. **Reviewer Routing**: Route recommendations to best-suited reviewers
4. **Impact Prediction Refinement**: Improve impact estimates

## Current Status

**Not Yet Implemented**

The learning loop requires:

- [ ] Audit log backend with queryable storage
- [ ] Analytics pipeline for pattern detection
- [ ] Recommendation engine with feedback API
- [ ] Outcome tracking system

This scaffolding provides the data contracts and documentation for future
implementation.
