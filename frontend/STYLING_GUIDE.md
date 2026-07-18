# Frontend Styling Guide

## Goal
Make every stylable element easy to find and safe to change without side effects.

## Core Rule
Each important element should have:

1. A semantic structure class that says what it is.
2. An optional variant class that says which instance it is.
3. An optional tone/state class that says how it should look right now.

Example:

```tsx
<strong
  className={`${styles.contextCardValue} ${styles.contextCardValuePill} ${styles.contextCardSpreadRiskValue} ${styles.good}`}
>
  LOW
</strong>
```

In that example:

- `contextCardValue` = the element type
- `contextCardValuePill` = shared shape/layout
- `contextCardSpreadRiskValue` = this exact instance
- `good` = visual tone only

## Rules To Follow

### 1. Prefer explicit element classes over descendant selectors
Prefer this:

```css
.contextCardLabel {}
.contextCardValue {}
.contextCardMessage {}
```

Over this:

```css
.contextCard span {}
.contextCard strong {}
.contextCard p {}
```

Reason:
- It is faster to find.
- It is safer to override.
- It avoids styling every `span`, `strong`, or `p` inside a block by accident.

### 2. Keep structure and tone separate
Structure classes should control:

- layout
- spacing
- size
- alignment
- border radius when it belongs to the component shape

Tone/state classes should control:

- text color
- background color
- border color

Avoid making tone classes responsible for component spacing across the page.

### 3. Avoid mixed selectors across unrelated responsibilities
Do not do this:

```css
.contextCard,
.good,
.watch,
.risk {}
```

Reason:
- a layout change can unexpectedly affect a tone class
- a tone change can unexpectedly affect unrelated elements

### 4. Add instance-level hook classes for elements likely to be styled individually
Examples:

- `contextCardSpreadRiskValue`
- `contextCardBrentValue`
- `contextCardMomentumValue`
- `metricRowOpportunityValue`

Use these when a teammate may want to style one element without touching similar ones.

### 5. Keep CSS files organized in this order

1. Page/layout shells
2. Shared section containers
3. Element classes
4. Tone/state classes
5. Utility or hook classes
6. Responsive rules

## Recommended Pattern For New Work

For cards:

```tsx
<article className={`${styles.contextCard} ${styles.contextCardSpreadRisk}`}>
  <span className={styles.contextCardLabel}>Spread risk</span>
  <strong className={`${styles.contextCardValue} ${styles.contextCardValuePill} ${styles.contextCardSpreadRiskValue} ${styles.good}`}>
    LOW
  </strong>
  <p className={styles.contextCardMessage}>Spread is contained.</p>
</article>
```

## Refactor Standard
When touching an existing screen:

1. Do not change visuals unless the task is visual.
2. Add semantic classes before changing colors.
3. Remove mixed selectors that combine structure and tone.
4. Leave a direct class hook for any element a designer or teammate may reasonably target alone.
