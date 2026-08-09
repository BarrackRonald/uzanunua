# UzaNunua — Blueprint Part 6
## I. Design System

Design principle: **premium and restrained**. African identity expressed through warmth of color and clarity of language, not decorative motif. The system must hold up at both extremes: a single product card in a dense grid, and a full-bleed hero — without ever feeling like a template.

### I.1 Color Tokens

Semantic tokens, not raw hex references, used throughout components. Light and dark values defined for every token.

```
--color-brand-primary        Deep jade green   (#0F6B4F light / #17A673 dark accent)
--color-brand-primary-hover
--color-brand-accent         Warm amber/gold   (#E5A93B) — used sparingly: CTAs, badges, price highlights
--color-surface-base          page background
--color-surface-raised        cards, panels
--color-surface-overlay       modals, drawers
--color-border-subtle
--color-border-strong
--color-text-primary
--color-text-secondary
--color-text-muted
--color-text-inverse
--color-status-success        (order delivered, payment success)
--color-status-warning        (low stock, pending)
--color-status-danger         (failed payment, out of stock)
--color-status-info           (processing, informational)
--color-price-discount        (strikethrough / savings)
```

Rationale: jade green reads as trustworthy, modern, and distinctly not the generic e-commerce orange/blue — while amber gold is reserved as an accent (deals, highlights) so it retains visual weight instead of being overused.

### I.2 Typography

- **Primary typeface:** a humanist grotesk (e.g., Inter or a comparable variable font) for UI text — excellent at small sizes on low-end Android screens, wide language support (Latin + Swahili diacritics).
- **Display typeface (optional, hero/marketing only):** a slightly warmer/rounder complementary display face for large headlines, used sparingly (homepage hero, campaign pages) — never in dense UI.
- Type scale (rem, mobile-first, fluid up on larger viewports): `xs 0.75 / sm 0.875 / base 1 / lg 1.125 / xl 1.25 / 2xl 1.5 / 3xl 1.875 / 4xl 2.25 / 5xl 3`.
- Weight usage: 400 body, 500 emphasis/labels, 600–700 headings and prices — prices always at least medium-weight to read as commercially significant at a glance.

### I.3 Spacing, Grid, Radius, Shadow

```
--space-scale: 4, 8, 12, 16, 24, 32, 48, 64, 96 (px) — all spacing derives from this scale, no arbitrary values.
--radius-sm: 6px   (inputs, badges)
--radius-md: 10px  (cards, buttons)
--radius-lg: 16px  (modals, large panels)
--radius-full: 999px (pills, avatars)
--shadow-sm / --shadow-md / --shadow-lg: restrained, low-opacity, used only to indicate elevation (dropdowns, modals, hover cards) — never decorative.
```

Grid: 12-column responsive grid, container max-widths at standard breakpoints (`sm 640 / md 768 / lg 1024 / xl 1280 / 2xl 1536`), 16px gutter on mobile scaling to 24px on desktop.

### I.4 Core Components (tokenized, themeable)

Buttons (primary/secondary/ghost/destructive, with loading state), Inputs (text/number/select/phone with country code/OTP input), Forms (with inline validation states), Badges (verified seller, discount %, new, low stock), Cards (product card, seller card, order summary card), Modals, Drawers (cart, filters — mobile-first pattern), Dropdowns/Selects, Tooltips, Navigation (header, mega-menu, mobile bottom nav, breadcrumbs), Tabs, Data Tables (admin/seller — sortable, filterable, bulk-select), Alerts/Toasts, Notification bell + panel, Skeleton loaders (per component type — card skeleton, table-row skeleton, text-line skeleton), Empty states (illustration slot + message + primary action), Error states (message + retry action), Confirmation states (success check animation, used sparingly).

All components consume tokens exclusively — a dark-mode toggle is a token swap, not a component rewrite.

### I.5 Dark Mode

Full parity, not an inverted afterthought: surfaces use true dark neutrals (not pure black, to keep product photography readable), brand jade shifts to a slightly higher-luminance variant for AA contrast on dark surfaces, and price/discount colors are re-tuned for contrast rather than reused verbatim.

### I.6 Motion

- Standard transition duration: 150–300ms, `ease-out` for entrances, `ease-in` for exits.
- Named motion patterns: variant image crossfade (200ms), cart-count bump (spring, ~250ms), add-to-cart mini-drawer slide-in (250ms), drawer/modal open (200ms scale+fade), skeleton→content crossfade (150ms), toast enter/exit (200ms slide+fade), button loading spinner fade-in after 150ms delay (avoids flicker on fast responses).
- `prefers-reduced-motion: reduce` disables non-essential transitions (crossfades, slides) in favor of instant state changes, while preserving functional feedback (e.g., loading spinners remain, but slides become fades or instant swaps).

### I.7 Imagery Guidelines

Product photography: consistent neutral/light background for catalogue grid consistency, real lifestyle/customer imagery encouraged on product pages. No generic African stock photography, no decorative tribal-pattern backgrounds, no unnecessary flag iconography — Kenyan identity is carried by language, currency, payment UI, and real seller/product content, not illustrative skin.

### I.8 Iconography

Single consistent icon set (line-style, consistent stroke width, e.g., a Lucide-based custom set) across buyer, seller, and admin surfaces — no mixing icon families.
