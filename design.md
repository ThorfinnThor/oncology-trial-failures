# Clinical Trial Failures Design System

This document is the visual source of truth for ClinicalTrialFailures.com. New
pages should feel like part of one analytical product: precise, restrained,
data-led, and trustworthy. The interface may have a technical character, but it
must remain readable for researchers, analysts, investors, and life-science
teams who are not developers.

## Design principles

1. **Data before decoration.** Use hierarchy, spacing, typography, tables, and
   restrained semantic color to make evidence easier to scan.
2. **One product, one visual language.** Reuse the global navigation, footer,
   page widths, typography, borders, and interaction patterns on every route.
3. **Clinical, not promotional.** Avoid generic SaaS imagery, oversized
   marketing copy, decorative gradients, or visual effects that compete with
   the records.
4. **Dense but calm.** Reduce avoidable whitespace while preserving clear
   groups and comfortable reading widths.
5. **Meaningful color.** Indigo is the product accent. Other colors are used
   primarily to distinguish evidence categories, not as decoration.
6. **Source-aware language.** Labels and supporting copy should distinguish a
   stopped study, a classified signal, and a verified primary-source fact.

## Core color tokens

The global tokens live in `web/styles/globals.css`. The V2 landing page maps its
local variables to the same system in `web/pages/index.tsx`.

| Role | Value | Use |
| --- | --- | --- |
| Page background | `#f7f8fb` | Main application canvas |
| Surface | `#ffffff` | Cards, tables, navigation, panels |
| Primary text | `#0f172a` | Headings, labels, primary controls |
| Secondary text | `#334155` | Body copy |
| Muted text | `#64748b` | Metadata and supporting context |
| Product accent | `#4f46e5` | Primary actions, links, selected states |
| Accent soft | `#818cf8` | Data highlights on dark or neutral surfaces |
| Accent wash | `#eef2ff` | Method and trust sections, selected backgrounds |
| Information | `#38bdf8` | Informational classification cues |
| Safety | `#be123c` / `#fb7185` | Safety and toxicity signals |
| Funding / caution | `#f59e0b` | Funding or cautionary signals |
| Console background | `#111827` | Technical data preview only |
| Border | `rgba(15, 23, 42, 0.10)` | Default separators and card outlines |

Do not reintroduce lime, neon green, dominant yellow, or unrelated purple-blue
gradients as primary brand treatments. Full-page color fields should use the
page background, white, or the pale accent wash.

## Typography

- Use the global application sans-serif stack for all interface and editorial
  text. Do not introduce a second display font for individual pages.
- Use monospace only for NCT identifiers, code-like taxonomy values, dates in
  technical tables, and compact data readouts.
- Headings use the primary text color, strong weight, normal letter spacing,
  and tight but readable line height.
- Body copy uses secondary or muted text and a line height between `1.55` and
  `1.75`.
- Do not scale type directly with viewport width. Use explicit responsive sizes
  or `clamp()` with conservative minimum and maximum values.

## Layout and spacing

- Global application content may extend to approximately `1400px`; focused
  landing and editorial content should usually stay between `960px` and
  `1280px`.
- Align section headings, explanatory copy, cards, and tables to the same
  content grid. A narrower paragraph below a wide hero is acceptable only when
  the change in reading width is intentional and centered.
- Use a consistent spacing rhythm based on `4px`, with common gaps of `8px`,
  `12px`, `16px`, `24px`, `32px`, and `48px`.
- Repeated cards in one row must share stable grid tracks and equal heights.
- Avoid a final orphan card on a new desktop row. Reduce the number of featured
  cards, use a responsive grid, or move secondary links to a compact list.
- Do not place cards inside cards. Full-width sections are unframed bands;
  cards are reserved for individual records, metrics, tables, or actions.

## Components

### Navigation and footer

- Always use the shared `PrimaryNav` and the established global footer.
- Navigation labels, font size, spacing, hover states, and dropdown behavior
  must remain identical across all routes.
- Desktop dropdowns must leave a usable pointer path between trigger and menu.
- Mobile navigation must not rely on hover and must remain keyboard accessible.

### Cards and panels

- Use white surfaces, a subtle border, and restrained shadow.
- Corner radius should remain consistent with existing application cards; do
  not create pill-shaped content containers.
- Keep headings compact inside cards. Reserve hero-scale typography for page
  titles.
- Use hover elevation only for interactive cards.

### Buttons and links

- Primary action: dark primary text surface or product indigo, white label, and
  a clear focus state.
- Secondary action: white surface, visible border, primary text.
- Text links use the product accent and an underline on hover or keyboard focus.
- Use familiar icons for icon actions and visible labels for primary commands.

### Tables and data previews

- Keep row heights stable, headers clearly separated, and columns aligned.
- NCT IDs use monospace and link to the trial record page.
- Category color is a secondary signal; always include a readable text label.
- Truncated source text must expose the complete record through a clear link.

### Classification colors

- Efficacy / futility: indigo.
- Safety / toxicity: crimson or rose.
- Biological, unspecified: informational blue.
- Recruitment and operational causes: neutral slate unless a dedicated legend
  is present.
- Funding: amber.
- Unknown or review-gated: neutral gray, never a warning red.

## Responsive behavior

- Test at desktop, tablet, and narrow mobile widths, including approximately
  `1440px`, `1024px`, `768px`, `390px`, and `360px`.
- Multi-column layouts collapse before copy or controls become compressed.
- Buttons may stack on mobile and should remain full-label, easy tap targets.
- Tables may scroll horizontally only when a readable card or list alternative
  would lose important comparisons.
- No text, navigation item, badge, or data value may overlap or force horizontal
  page scrolling.
- Mobile content should use the available width without leaving artificial empty
  columns inherited from desktop.

## Accessibility and trust

- Maintain WCAG AA contrast for text and interactive controls. Current core
  combinations exceed AA, including white on `#4f46e5` and `#334155` on
  `#eef2ff`.
- All interactive elements need visible keyboard focus.
- Do not communicate a category through color alone.
- Use semantic headings in order, real buttons for actions, real links for
  navigation, and labels for form controls.
- Data claims should identify the dataset version or update date and link to the
  methodology and primary registry where appropriate.

## Content voice

- Clear, direct, analytical, and careful.
- Prefer concrete terms such as "stopped trial record", "biological failure
  signal", and "source reason" over dramatic claims.
- Explain what a number supports and what it does not support.
- Avoid implying that every terminated, suspended, or withdrawn study is a drug
  failure.
- Never present classification output as medical advice or a substitute for the
  ClinicalTrials.gov source record.

## Pre-merge visual checklist

- [ ] Shared navigation and footer match the rest of the application.
- [ ] Heading, text, cards, and tables align to one deliberate grid.
- [ ] Repeated cards have equal heights and no orphaned desktop row.
- [ ] The page uses the approved tokens and semantic colors.
- [ ] Typography matches the global application stack.
- [ ] Desktop and mobile contain no overflow, overlap, or excessive whitespace.
- [ ] Hover, focus, open, empty, and loading states are legible.
- [ ] Data counts, update date, source, and methodology links are present where relevant.
- [ ] The page has been checked at the five target viewport widths.

