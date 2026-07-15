# yBOLD Lander Design System

Redesign this existing Next.js landing page for Yearn's yBOLD product.

## Context

Users arrive here from the Liquity V2 homepage. The page should feel visually
familiar to Liquity/BOLD users, but clearly belong to Yearn. Preserve all
existing functionality and deposit logic. Focus on layout, typography, color,
components, and responsive behavior.

## Design direction

Use a flat, geometric DeFi aesthetic with large modular sections, strong color
blocking, minimal decoration, and generous whitespace. Avoid gradients,
shadows, glass effects, and generic SaaS styling.

## Color system

```
--background: #f2efe9
--surface: #ffffff
--navy: #111b4d
--yearn-blue: #0657f9
--electric-blue: #405be5
--bold-green: #5fd67c
--yellow: #ffdc37
--muted-text: #858cae
--border: rgba(17, 27, 77, 0.12)
```

Use Yearn blue as the primary brand color. Use BOLD green sparingly as a
referral/familiarity cue, such as a small "Powered by BOLD" label, secondary
panel, rate indicator, or geometric accent. Navy should anchor text and
high-contrast panels.

## Typography

Use a clean geometric sans-serif such as Inter, Geist, or the existing project
font.

- Hero heading: 48–64px desktop, 38–44px mobile, regular or medium weight
- Section headings: 28–36px
- Body: 17–20px
- Labels and metrics: 14–16px
- Avoid overly bold typography and excessive uppercase text
- Use short, direct product language

## Layout

- Full-width page with a compact floating-style header
- Header includes Yearn logo, a small "yBOLD" product label, and minimal navigation
- Hero uses an asymmetric two-column layout
- Left side explains the product and its relationship to BOLD
- Right side contains the deposit box as the primary action
- Below the hero, use a modular grid of colored information panels
- Panels may explain yield, liquidity, underlying asset, risk, or how the strategy works
- Use oversized abstract geometric shapes derived from circles, half-circles, squares, and bars
- Do not copy Liquity's exact composition or illustrations

## Components

- Buttons are pill-shaped with solid fills and no shadow
- Primary button: Yearn blue background, white text
- Secondary button: navy or transparent with a thin navy border
- Cards use 6–10px corner radii, not heavily rounded containers
- Deposit box uses a white surface, subtle border, clear amount input, balance,
  expected yield, and one dominant action
- Metrics should be displayed in compact rows with aligned labels and values
- Use icons only when they improve comprehension
- Use thin dividers and strong spacing rather than nested cards

## Visual balance

The page should feel approximately 75% Yearn and 25% Liquity/BOLD.
Yearn identity comes from the primary blue, logo, product naming, and tone.
Liquity familiarity comes from the cream background, navy typography, flat
green accents, geometric artwork, modular color blocks, and restrained rounded
elements.

## Responsive behavior

- Collapse the hero to one column below 900px
- Keep the product explanation above the deposit box on mobile
- Convert the lower grid into stacked full-width panels
- Maintain large touch targets and at least 20px horizontal padding
- Avoid horizontal scrolling

## Implementation

- Use semantic React components
- Use CSS variables for the design tokens
- Reuse existing components where practical
- Preserve accessibility, keyboard navigation, focus states, and contrast
- Do not introduce unnecessary dependencies
- Do not alter wallet, deposit, approval, or transaction behavior
