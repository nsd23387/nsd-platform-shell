# NSD Design System: Anti-Patterns

## ❌ Things We DON'T Do

This document catalogs common UI patterns that violate our design principles. Reference this when reviewing designs or code.

---

## Typography Anti-Patterns

### ❌ Bold Headers (700+ weight)

```css
/* BAD */
font-weight: 700;
font-weight: bold;

/* GOOD */
font-weight: 600; /* Maximum allowed */
```

### ❌ Tight Line Heights

```css
/* BAD */
line-height: 1.0;
line-height: 1.1;

/* GOOD */
line-height: 1.3; /* For headings */
line-height: 1.5; /* For body */
```

### ❌ Small Body Text

```css
/* BAD */
font-size: 11px; /* For body text */

/* GOOD */
font-size: 14px; /* Default body */
font-size: 13px; /* Compact tables */
font-size: 12px; /* Labels only */
```

### ❌ All Caps for Paragraphs

```css
/* BAD */
text-transform: uppercase; /* For body text */

/* GOOD - only for short labels */
text-transform: uppercase;
letter-spacing: 0.05em;
font-size: 12px;
```

---

## Color Anti-Patterns

### ❌ Pure Black Text

```css
/* BAD */
color: #000000;
color: black;

/* GOOD */
color: #1e1e4a; /* Deep indigo */
color: #171717; /* Near-black neutral */
```

### ❌ Saturated Background Colors

```css
/* BAD */
background-color: #3b82f6; /* Solid blue card */
background-color: #22c55e; /* Solid green section */

/* GOOD */
background-color: #f0f9ff; /* Subtle blue tint */
border-left: 4px solid #10b981; /* Accent border */
```

### ❌ Red for Non-Critical Items

```css
/* BAD - using red for neutral actions */
<button style={{ color: '#ef4444' }}>Cancel</button>

/* GOOD */
<button style={{ color: '#525252' }}>Cancel</button>
```

### ❌ Gradient Backgrounds

```css
/* BAD */
background: linear-gradient(to right, #8b5cf6, #ec4899);

/* GOOD */
background-color: #fafafa;
```

---

## Spacing Anti-Patterns

### ❌ Dense Layouts

```css
/* BAD */
padding: 8px;
gap: 4px;
margin-bottom: 8px;

/* GOOD - generous spacing */
padding: 24px;
gap: 24px;
margin-bottom: 32px;
```

### ❌ Inconsistent Spacing Values

```css
/* BAD - arbitrary values */
padding: 13px;
margin: 7px 19px;
gap: 11px;

/* GOOD - 4px grid */
padding: 12px;
margin: 8px 16px;
gap: 12px;
```

### ❌ No White Space Between Sections

```jsx
/* BAD */
<Section1 />
<Section2 />
<Section3 />

/* GOOD */
<Section1 />
<div style={{ marginBottom: '32px' }} />
<Section2 />
<div style={{ marginBottom: '32px' }} />
<Section3 />
```

---

## Shadow Anti-Patterns

### ❌ Heavy Shadows on Cards

```css
/* BAD */
box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);

/* GOOD */
border: 1px solid #e5e5e5;
```

### ❌ Glow Effects

```css
/* BAD */
box-shadow: 0 0 20px rgba(139, 92, 246, 0.3);

/* GOOD - no glows */
border: 1px solid #e5e5e5;
```

### ❌ Multiple Shadow Layers

```css
/* BAD */
box-shadow: 
  0 1px 2px rgba(0,0,0,0.1),
  0 4px 8px rgba(0,0,0,0.1),
  0 8px 16px rgba(0,0,0,0.05);

/* GOOD - single subtle shadow if needed */
box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
```

---

## Interactive Anti-Patterns

### ❌ Edit Affordances in Read-Only Views

```jsx
/* BAD */
<button>Edit</button>
<input type="text" value={data.name} />
<textarea onChange={handleChange} />

/* GOOD */
<span>{data.name}</span>
<ReadOnlyBanner />
```

### ❌ Checkboxes Without Action Context

```jsx
/* BAD - implies selection for bulk action */
<input type="checkbox" /> Select all

/* GOOD - no selection in read-only views */
{/* Just display the data */}
```

### ❌ Hover Effects That Imply Clickability

```css
/* BAD - on non-interactive elements */
cursor: pointer;
transform: translateY(-2px);

/* GOOD */
/* No transform, default cursor */
```

---

## Component Anti-Patterns

### ❌ Colored Filled Buttons as Default

```jsx
/* BAD */
<button style={{ backgroundColor: '#3b82f6', color: '#fff' }}>
  Secondary Action
</button>

/* GOOD */
<Button variant="secondary">Secondary Action</Button>
/* Renders with border, white background */
```

### ❌ Status Indicators Without Labels

```jsx
/* BAD - color only */
<span style={{ 
  width: 8, 
  height: 8, 
  borderRadius: '50%',
  backgroundColor: '#22c55e' 
}} />

/* GOOD - color with text */
<StatusPill variant="exceptional">Compliant</StatusPill>
```

### ❌ Dense Data Tables

```jsx
/* BAD */
<td style={{ padding: '4px 8px' }}>

/* GOOD */
<td style={{ padding: '12px 16px' }}>
```

---

## Animation Anti-Patterns

### ❌ Bouncy Animations

```css
/* BAD */
transition-timing-function: cubic-bezier(0.68, -0.55, 0.265, 1.55);
animation: bounce 0.5s;

/* GOOD */
transition: all 0.2s ease;
```

### ❌ Long Duration Transitions

```css
/* BAD */
transition-duration: 500ms;
transition-duration: 1s;

/* GOOD */
transition-duration: 200ms; /* Standard */
transition-duration: 300ms; /* Maximum */
```

### ❌ Attention-Grabbing Animations

```css
/* BAD */
animation: pulse 1s infinite;
animation: shake 0.5s;

/* GOOD */
/* Static display, no attention animations */
```

---

## Layout Anti-Patterns

### ❌ Full-Width Data Displays

```jsx
/* BAD - stretches data across full width */
<div style={{ maxWidth: '100%' }}>
  <DataTable />
</div>

/* GOOD - constrain width for readability */
<div style={{ maxWidth: '1200px' }}>
  <DataTable />
</div>
```

### ❌ Centered Body Text

```css
/* BAD - for paragraphs */
text-align: center;

/* GOOD */
text-align: left;
```

### ❌ Mixed Alignment Within Cards

```jsx
/* BAD */
<Card>
  <h3 style={{ textAlign: 'center' }}>Title</h3>
  <p style={{ textAlign: 'left' }}>Body</p>
  <span style={{ textAlign: 'right' }}>Footer</span>
</Card>

/* GOOD - consistent left alignment */
<Card>
  <h3>Title</h3>
  <p>Body</p>
  <span>Footer</span>
</Card>
```

---

## Summary Checklist

Before merging any UI code, verify:

- [ ] No font-weight > 600
- [ ] No shadows on cards
- [ ] No pure black (#000000)
- [ ] No edit affordances in read-only views
- [ ] Spacing follows 4px grid
- [ ] Generous white space between sections
- [ ] Colors include text labels (not color-only)
- [ ] Transitions ≤ 300ms
- [ ] No bouncy/attention animations
