# Ruckus — Design Language

Single source of truth for Ruckus's visual design. Adapted from Parallel.ai's aesthetic, organized in the Frontier 4-layer format so the palette can be swapped by replacing only Layer 1.

**Origin:** Extracted from [parallel.ai](https://parallel.ai/) — clean, technical, light-mode with vibrant orange accent. Adapted for a React Native social app context.

---

# Layer 1 — Palette

> **To retheme Ruckus, replace this section only.** Layers 2–4 reference these tokens by name.

## Primary

| Token | Value | Role |
|-------|-------|------|
| `primary.base` | `#FB631B` | Brand accent — CTAs, active states, selected elements |
| `primary.dark` | `#D94E0F` | Focus rings, links, interactive hover accents |
| `primary.deep` | `#8B3209` | Text on primary-tinted backgrounds |
| `primary.hover` | `#FF590A` | Filled CTA hover state |
| `primary.light` | `#FFF0E8` | Primary tinted background |

## Neutral

| Token | Value | Role |
|-------|-------|------|
| `neutral.900` | `#181818` | Primary text, headings |
| `neutral.700` | `#434343` | Secondary text, card body |
| `neutral.600` | `#666666` | Tertiary text, detail values |
| `neutral.500` | `#858483` | Muted text, metadata, timestamps |
| `neutral.400` | `#ADADAC` | Labels, disabled text |
| `neutral.300` | `#C8C7C3` | Placeholder text, ghost controls |
| `neutral.200` | `#E5E5E5` | Default borders, dividers |
| `neutral.150` | `#EEEEEE` | Subtle dividers, muted backgrounds |
| `neutral.100` | `#F5F5F5` | Hover backgrounds, chip fills |
| `neutral.75` | `#F5F4F1` | Warm surface tint |
| `neutral.50` | `#FAFAF8` | Page background |
| `neutral.0` | `#FFFFFF` | Surface — cards, inputs, modals |

**Neutral hue tint:** Neutrals carry a slight warm tint (2–4% saturation toward orange) sampled from the primary. This creates cohesion between the brand orange and the gray scale. `neutral.75` and `neutral.50` show this most visibly.

## Status — Ruckus Core

| Token | Value | Role |
|-------|-------|------|
| `status.rucked.base` | `#FF4458` | Rucked status — primary red |
| `status.rucked.bg` | `#FFE8EA` | Rucked pill/badge background |
| `status.rucked.text` | `#9B1B2B` | Rucked pill text |
| `status.ricked.base` | `#9C27B0` | Ricked status — purple |
| `status.ricked.bg` | `#F3E5F5` | Ricked pill/badge background |
| `status.ricked.text` | `#6A1B7B` | Ricked pill text |
| `status.idle.base` | `#ADADAC` | No active status |
| `status.idle.bg` | `#F5F5F5` | Idle background |
| `status.idle.text` | `#666666` | Idle text |

## Feedback

| Token | Value | Role |
|-------|-------|------|
| `feedback.success.base` | `#69BE78` | Success indicator (joined group, etc.) |
| `feedback.success.bg` | `#E8F5E9` | Success background |
| `feedback.success.text` | `#1B5E20` | Success text |
| `feedback.error.base` | `#E13F44` | Error indicator |
| `feedback.error.bg` | `#FFE8E8` | Error background |
| `feedback.error.text` | `#7B0000` | Error text |
| `feedback.info.base` | `#6FA2E8` | Info indicator |
| `feedback.info.bg` | `#E9F0F5` | Info background |
| `feedback.info.text` | `#1A4B7A` | Info text |

## Decorative

| Token | Value | Role |
|-------|-------|------|
| `avatar.cycle` | `#FB631B, #6FA2E8, #69BE78, #9C27B0, #FF4458, #D94E0F, #858483, #E13F44` | Avatar background rotation for group members |
| `group.accent` | `#FB631B` | Group card left border accent |

---

# Layer 2 — Application Mapping

> Maps palette tokens to UI roles. Every value references Layer 1 by name — never a raw hex.

## Backgrounds

| Role | Token |
|------|-------|
| `page-bg` | `neutral.50` |
| `surface` | `neutral.0` |
| `surface-hover` | `neutral.100` |
| `surface-active` | `neutral.75` |
| `surface-muted` | `neutral.150` |
| `toolbar-bg` | `neutral.0` |
| `banner-bg` | `primary.base` |

## Text

| Role | Token |
|------|-------|
| `text-primary` | `neutral.900` |
| `text-secondary` | `neutral.700` |
| `text-tertiary` | `neutral.600` |
| `text-muted` | `neutral.500` |
| `text-label` | `neutral.400` |
| `text-placeholder` | `neutral.300` |
| `text-inverse` | `neutral.0` |

## Borders

| Role | Token |
|------|-------|
| `border-default` | `neutral.200` |
| `border-subtle` | `neutral.150` |
| `border-focus` | `primary.dark` |
| `border-active` | `primary.base` |

## Interactive

| Role | Token | Usage |
|------|-------|-------|
| `accent-active` | `primary.base` | Active tab, selected card border, CTA fill |
| `accent-focus` | `primary.dark` | Focus rings, link hover |
| `accent-hover` | `primary.hover` | Filled CTA hover |
| `accent-tint` | `primary.light` | Tinted backgrounds on active elements |

## Shadows

All shadows use `neutral.900` as the base color at varying opacities:

| Role | Spec | Usage |
|------|------|-------|
| `shadow-card` | `0 1px 3px rgba(24,24,24,0.04), 0 6px 6px rgba(24,24,24,0.03), 0 13px 8px rgba(24,24,24,0.02)` | Card rest state |
| `shadow-card-hover` | `0 2px 8px rgba(24,24,24,0.08)` | Card hover |
| `shadow-modal` | `0 16px 16px rgba(0,0,0,0.4)` | Modal overlays |
| `shadow-border` | `0 0 0 1px neutral.200` | Border-as-shadow technique |
| `backdrop` | `rgba(24,24,24,0.42)` | Modal backdrops |

## Status Mapping

| Role | Token |
|------|-------|
| `rucked-fill` | `status.rucked.base` |
| `rucked-bg` | `status.rucked.bg` |
| `rucked-text` | `status.rucked.text` |
| `ricked-fill` | `status.ricked.base` |
| `ricked-bg` | `status.ricked.bg` |
| `ricked-text` | `status.ricked.text` |

## Progress

| Role | Token |
|------|-------|
| `cooldown-track` | `neutral.200` |
| `cooldown-fill-rucked` | `status.rucked.base` |
| `cooldown-fill-ricked` | `status.ricked.base` |

---

# Layer 3 — System Rules

> Palette-independent. Structural and rhythmic properties that remain stable across rethemes.

## Typography

| Property | Value |
|----------|-------|
| **Heading font** | `system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif` |
| **Body font** | `system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif` |
| **Mono font** | `ui-monospace, 'SF Mono', monospace` |
| **Base size** | `16px` |
| **Line height** | `1.5` global |

> **Note:** Parallel uses `gerstnerProgramm` — a proprietary geometric sans. For React Native, we use system fonts which provide a similar clean, geometric feel across platforms.

### Type Scale

| Role | Size | Weight | Usage |
|------|------|--------|-------|
| Display | 36px | 500 | Screen titles (Home, Group name) |
| Heading | 26px | 500 | Section headers |
| Subheading | 16px | 500 | Card titles, group names |
| Body | 16px | 400 | Default text |
| Caption | 14px | 400 | Timestamps, secondary info |
| Label | 12px | 500 | Uppercase labels, badges |
| Small | 11px | 400 | Helper text, fine print |
| Mono | 13px | 400 | Invite codes |

### Label Treatment

Uppercase labels: `textTransform: 'uppercase'`, `letterSpacing: 1.2` (React Native points).

## Spacing

4px-based rhythm, consistent with Parallel's tight spacing:

| Token | Value |
|-------|-------|
| `space-xs` | 4px |
| `space-sm` | 8px |
| `space-md` | 12px |
| `space-lg` | 16px |
| `space-xl` | 20px |
| `space-2xl` | 24px |
| `space-3xl` | 32px |
| `page-padding` | 20px horizontal |
| `card-padding` | 16px |
| `list-item-padding-y` | 12px |
| `section-gap` | 24px |

## Radii

| Token | Value | Usage |
|-------|-------|-------|
| `radius-sm` | 4px | Small buttons, badges |
| `radius-md` | 8px | Cards, inputs, list items |
| `radius-lg` | 12px | Large cards, modals |
| `radius-pill` | 9999px | Pills, status badges, FABs |
| `radius-avatar` | 50% | All avatars |

## Elevation

Shadow sizes only — color and opacity come from Layer 2:

| Level | Usage |
|-------|-------|
| 0 | Flat — bordered cards |
| 1 | Subtle — resting cards, inputs |
| 2 | Hover — card hover, dropdowns |
| 3 | Modal — modal overlays |

## Motion

| Token | Value |
|-------|-------|
| `duration-fast` | 100ms |
| `duration-default` | 150ms |
| `duration-slow` | 200ms |

### Animation Patterns (React Native)

| Pattern | Spec |
|---------|------|
| **Button press** | `activeOpacity: 0.7` or `scale(0.95)` via `Animated` |
| **Status button press** | `scale(0.88)` — match Frontier's `Button press` |
| **Cooldown bar** | Linear width animation over 60s |
| **Screen transitions** | Default React Navigation slide |

---

# Layer 4 — Component Catalog

> Every component uses tokens from Layers 1–3. No raw hex.

## Screen Container

| Property | Token |
|----------|-------|
| Background | `page-bg` |
| Padding | `page-padding` horizontal |
| SafeAreaView | Yes — top and bottom |

## Navigation Header

| Property | Token |
|----------|-------|
| Background | `surface` |
| Title color | `text-primary` |
| Title weight | 500 |
| Border bottom | 1px `border-subtle` |
| Shadow | none — use border instead |

## Group Card

| Property | Token |
|----------|-------|
| Background | `surface` |
| Border | 1px solid `border-default` |
| Radius | `radius-md` |
| Padding | `card-padding` |
| Shadow | `shadow-card` |
| Left accent | 4px solid `primary.base` |
| Title | `text-primary`, Subheading scale |
| Subtitle (member count) | `text-muted`, Caption scale |
| Hover/Press | `surface-hover` bg |

## Status Button

| Variant | Background | Text | Border |
|---------|-----------|------|--------|
| Rucked (default) | `surface` | `status.rucked.base` | 2px solid `status.rucked.base` |
| Rucked (active) | `status.rucked.base` | `text-inverse` | 2px solid `status.rucked.base` |
| Ricked (default) | `surface` | `status.ricked.base` | 2px solid `status.ricked.base` |
| Ricked (active) | `status.ricked.base` | `text-inverse` | 2px solid `status.ricked.base` |
| Disabled | `surface-muted` | `text-label` | 2px solid `border-default` |

Height: 100px. Radius: `radius-md`. Press: `scale(0.88)`.

## Activity Item

| Property | Token |
|----------|-------|
| Padding | `list-item-padding-y` vertical, `card-padding` horizontal |
| Border bottom | 1px solid `border-subtle` |
| Avatar | `avatar.cycle` bg, `text-inverse` text |
| Name | `text-primary`, Body scale, weight 500 |
| Status text | `status.*.text` color, Caption scale |
| Status dot | 8px circle, `status.*.base` fill |
| Timestamp | `text-muted`, Small scale |

## Member Item

| Property | Token |
|----------|-------|
| Padding | `list-item-padding-y` vertical |
| Avatar | 36px, `avatar.cycle` bg |
| Name | `text-primary`, Body scale |
| Status badge | Pill shape, `status.*.bg` bg, `status.*.text` text, Label scale |
| Admin badge | `feedback.success.bg` bg, `feedback.success.text` text |

## Cooldown Progress Bar

| Property | Token |
|----------|-------|
| Track height | 6px |
| Track bg | `cooldown-track` |
| Track radius | 3px |
| Fill (rucked) | `cooldown-fill-rucked` |
| Fill (ricked) | `cooldown-fill-ricked` |

## Action Button (Primary CTA)

| State | Background | Text |
|-------|-----------|------|
| Default | `accent-active` | `text-inverse` |
| Hover/Press | `accent-hover` | `text-inverse` |
| Disabled | `surface-muted` | `text-label` |

Height: 50px. Radius: `radius-sm`. Full width. Weight: 500.

## Action Button (Secondary)

| State | Background | Text | Border |
|-------|-----------|------|--------|
| Default | `surface` | `text-primary` | 1px `border-default` |
| Hover/Press | `surface-hover` | `text-primary` | 1px `border-default` |

Same dimensions as Primary CTA.

## Text Input

| Property | Token |
|----------|-------|
| Background | `surface` |
| Border | 1px solid `border-default` |
| Focus border | 1px solid `border-focus` |
| Radius | `radius-md` |
| Padding | 12px 16px |
| Text | `text-primary`, Body scale |
| Placeholder | `text-placeholder` |
| Height | 50px |

## Avatar

| Size | Diameter | Font |
|------|----------|------|
| Large | 44px | 16px / 500 |
| Medium | 36px | 14px / 500 |
| Small | 24px | 10px / 500 |

Radius: `radius-avatar`. Text: `text-inverse`. Bg: from `avatar.cycle` by index.

## Empty State

| Property | Token |
|----------|-------|
| Icon | 48px, `text-label` color |
| Title | `text-primary`, Heading scale |
| Body | `text-muted`, Body scale |
| Alignment | Center |
| Padding | `space-3xl` vertical |

## Loading Indicator

| Property | Token |
|----------|-------|
| Color | `primary.base` |
| Size | Large (36px) |
| Background | `page-bg` |
| Centered | Yes — full screen |

## Tab Bar (Bottom Navigation)

| Property | Token |
|----------|-------|
| Background | `surface` |
| Border top | 1px solid `border-subtle` |
| Active icon | `primary.base` |
| Inactive icon | `text-muted` |
| Active label | `primary.deep`, Label scale |
| Inactive label | `text-muted`, Label scale |

## Invite Code Display

| Property | Token |
|----------|-------|
| Font | Mono font, Mono scale |
| Background | `surface-muted` |
| Border | 1px solid `border-default` |
| Radius | `radius-sm` |
| Padding | 8px 16px |
| Letter spacing | 2px |
| Color | `text-primary` |

---

# Design Principles (Ruckus-Specific)

1. **Light and clean** — White surfaces, warm-tinted backgrounds. No dark mode (yet).
2. **Orange accent, status colors** — `primary.base` for CTAs and brand. Red (rucked) and purple (ricked) are sacred status colors that never change with rethemes.
3. **Restrained weight** — Only 400 and 500. Never bold. Parallel's confidence comes from restraint.
4. **Tight radii** — 4px and 8px. No excessively rounded corners. Precise, not playful.
5. **Border-first elevation** — Cards use borders, not shadows, at rest. Shadows appear on interaction.
6. **System fonts** — Native feel on every platform. No custom font loading.
7. **4px rhythm** — All spacing derives from a 4px base. Tight, considered gaps.
8. **Status as identity** — Rucked (red) and ricked (purple) are the app's visual vocabulary. They appear as dots, fills, borders, and tinted backgrounds consistently.
