# NSD Design System: Usage Rules

## Brand Philosophy

The NSD Platform Shell design system embodies a **calm, editorial aesthetic** aligned with neonsignsdepot.com. Our interface should feel:

- **Trustworthy**: Clear, honest presentation of data
- **Professional**: Editorial quality typography and spacing
- **Calm**: No visual noise, no urgency-inducing elements
- **Readable**: White-space-forward, generous margins

## Typography Rules

### Font Families

| Purpose | Font | Usage |
|---------|------|-------|
| Headers | Poppins | Page titles, section headers, card titles |
| Body/UI | Inter | Body text, labels, data, buttons |
| Code | JetBrains Mono | Monospace content (if needed) |

### Font Weights

**Only use weights 400–600.** No bold (700+) fonts.

- `400` (normal): Body text, descriptions
- `500` (medium): Labels, buttons, emphasis
- `600` (semibold): Headings, metrics (maximum emphasis)

### Size Hierarchy

```
Display: 36px - Hero sections only
h1:      28px - Page titles
h2:      24px - Section titles
h3:      20px - Subsection titles
h4:      18px - Card titles
body:    14px - Default text
small:   13px - Secondary text
caption: 12px - Labels, timestamps
xs:      11px - Fine print
```

## Color Rules

### Primary Palette

- **Deep Indigo** (`#1e1e4a`): Primary text color
- **Violet** (`#8b5cf6`): Subtle emphasis, interactive states
- **Magenta** (`#db2777`): CTAs only (use extremely sparingly)

### Background Hierarchy

1. Page background: `#fafafa` (soft white)
2. Surface (cards): `#ffffff` (pure white)
3. Muted areas: `#f5f5f5`
4. Hover states: `#f0f0f0`

### Semantic Colors

| Status | Color | Use Case |
|--------|-------|----------|
| Success | `#10b981` | Completed, compliant, positive metrics |
| Warning | `#eab308` | Needs attention, approaching limits |
| Danger | `#ef4444` | Breaches, errors, critical issues |
| Info | `#0ea5e9` | Informational, neutral status |

### Color Usage Restrictions

❌ **DO NOT** use pure black (`#000000`)
❌ **DO NOT** use saturated colors for large areas
❌ **DO NOT** use color as the only indicator (accessibility)
✅ **DO** use color with text labels or icons
✅ **DO** maintain sufficient contrast ratios (4.5:1 minimum)

## Spacing Rules

### Base Unit

All spacing is based on a **4px grid**. Use only these values:

```
4px, 8px, 12px, 16px, 20px, 24px, 32px, 48px, 64px
```

### Component Spacing

- Card padding: `24px`
- Card padding (compact): `16px`
- Grid gap: `24px`
- Section margin: `32px`
- Page padding: `32px`

### White Space Philosophy

**White space is a feature, not waste.** Generous spacing:
- Improves readability
- Creates visual hierarchy
- Reduces cognitive load
- Signals quality

## Border vs. Fill

### Prefer Borders Over Fills

Cards and containers should:
- Have white/light backgrounds
- Use subtle borders (`1px solid #e5e5e5`)
- Avoid colored fills for grouping

### Border Radius Scale

- Subtle: `4px`
- Default: `6px`
- Cards: `12px`
- Pills: `9999px`

## Shadow Rules

### Minimal Shadows

❌ **DO NOT** use shadows on cards
❌ **DO NOT** use glows or blurs
❌ **DO NOT** use multiple shadow layers

✅ **DO** use borders instead of shadows
✅ **DO** use subtle shadows only for elevated elements (modals, dropdowns)

### Shadow Scale (when needed)

```css
/* Dropdown menus */
box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);

/* Modals */
box-shadow: 0 10px 15px rgba(0, 0, 0, 0.05);
```

## Read-Only Indicators

All dashboards are read-only. Clearly communicate this:

1. Use the `ReadOnlyBanner` component in appropriate locations
2. Do not include:
   - Edit buttons
   - Save buttons
   - Form inputs that imply editing
   - Checkboxes that imply selection for action

## Interaction States

### Hover States

- Background change: `#f0f0f0`
- Transition duration: `200ms`
- No scale transforms
- No shadow additions

### Focus States

- Use visible focus rings (`2px solid violet`)
- Never remove focus indicators
- Maintain keyboard accessibility

### Disabled States

- Opacity: `0.5`
- Cursor: `not-allowed`
- No hover effects
