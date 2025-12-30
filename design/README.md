# NSD Design System

A minimalist, brand-aligned design system for the Neon Signs Depot Platform Shell.

## Overview

This design system provides:
- **Tokens**: Colors, typography, spacing primitives
- **Components**: Reusable UI building blocks
- **Patterns**: Higher-level UI compositions
- **Brand**: Usage rules and anti-patterns

## Philosophy

The NSD design system embodies a **calm, editorial aesthetic**:

- ✅ White-space-forward layouts
- ✅ Border over fill
- ✅ Typography as primary hierarchy tool
- ✅ Minimal, functional color usage
- ❌ No shadows on cards
- ❌ No glows or gradients
- ❌ No dense layouts
- ❌ No bold (700+) fonts

## Quick Start

### Import Tokens

```typescript
import { colors, typography, spacing } from '@/design/tokens';

// Use specific values
const styles = {
  color: colors.text.primary,
  fontFamily: typography.fontFamily.body,
  padding: spacing.space['6'],
};
```

### Use Components

```typescript
import { Button, StatusPill, Card } from '@/design/components';

// Button variants
<Button variant="primary">Primary CTA</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="ghost">Ghost</Button>

// Status indicators
<StatusPill variant="exceptional">Compliant</StatusPill>
<StatusPill variant="breach">Overdue</StatusPill>

// Cards
<Card variant="success" padding="md">
  Content here
</Card>
```

### Use Patterns

```typescript
import { MetadataPanel, Timeline, ExceptionPanel } from '@/design/patterns';

// Metadata display
<MetadataPanel
  data={[
    { label: 'Order ID', value: 'ORD-12345' },
    { label: 'Status', value: 'Processing' },
  ]}
/>

// Timeline
<Timeline
  events={[
    { id: '1', title: 'Order Created', timestamp: '2 hours ago' },
    { id: '2', title: 'Design Started', timestamp: '1 hour ago' },
  ]}
/>

// Exceptions
<ExceptionPanel
  items={[
    { id: '1', title: 'SLA Breach', severity: 'critical' },
  ]}
/>
```

## Directory Structure

```
/design
├── tokens/           # Design primitives
│   ├── colors.ts     # Color palette and semantic colors
│   ├── typography.ts # Font families, sizes, weights
│   ├── spacing.ts    # Spacing scale, radii, shadows
│   └── index.ts      # Token exports
│
├── components/       # UI building blocks
│   ├── Button.tsx
│   ├── StatusPill.tsx
│   ├── ReadOnlyBanner.tsx
│   ├── Card.tsx
│   ├── Table.tsx
│   └── index.ts
│
├── patterns/         # UI compositions
│   ├── MetadataPanel.tsx
│   ├── Timeline.tsx
│   ├── ExceptionPanel.tsx
│   └── index.ts
│
├── brand/            # Brand guidelines
│   ├── usage-rules.md
│   ├── anti-patterns.md
│   └── index.ts
│
└── README.md
```

## Design Tokens Reference

### Colors

| Token | Value | Usage |
|-------|-------|-------|
| `text.primary` | `#1e1e4a` | Main text (deep indigo) |
| `text.secondary` | `#525252` | Secondary text |
| `text.muted` | `#737373` | Tertiary text |
| `background.page` | `#fafafa` | Page background |
| `background.surface` | `#ffffff` | Card background |
| `border.default` | `#e5e5e5` | Standard borders |
| `violet.600` | `#7c3aed` | Primary accent |

### Typography

| Style | Font | Size | Weight |
|-------|------|------|--------|
| Display | Poppins | 36px | 600 |
| h1 | Poppins | 28px | 600 |
| h2 | Poppins | 24px | 600 |
| h3 | Poppins | 20px | 500 |
| body | Inter | 14px | 400 |
| label | Inter | 12px | 500 |

### Spacing

Base unit: 4px

| Token | Value |
|-------|-------|
| `space['1']` | 4px |
| `space['2']` | 8px |
| `space['3']` | 12px |
| `space['4']` | 16px |
| `space['6']` | 24px |
| `space['8']` | 32px |

## Brand Guidelines

See detailed documentation:
- [Usage Rules](./brand/usage-rules.md)
- [Anti-Patterns](./brand/anti-patterns.md)

### Key Rules

1. **Max font weight: 600** - No bold fonts
2. **No card shadows** - Use borders instead
3. **White-space-forward** - Generous padding/margins
4. **Read-only indicators** - Clear visual signals
5. **4px spacing grid** - Consistent rhythm

## Migration Notes

This design system is:
- ✅ Self-contained within `/design`
- ✅ GitHub-portable (no external dependencies)
- ✅ Extractable for OMS later
- ✅ Compatible with existing dashboard components

To adopt in existing components:
1. Import tokens: `import { colors, typography } from '@/design/tokens'`
2. Replace hardcoded values with token references
3. No structural changes required

## Contributing

When adding to this design system:

1. Extract tokens only from values used in 3+ places
2. Document new components with JSDoc
3. Include usage examples
4. Check against anti-patterns before merging
5. Maintain GitHub portability (no Replit-specific code)
