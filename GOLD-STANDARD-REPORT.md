# hypercars.fyi, gold-standard audit

Every gate green, every text element WCAG AAA, meta Google-safe, schema and
ARIA complete, canonicals and internal links flawless, outbound rel hygiene
correct. Verification is exact (string counts, WCAG luminance, link resolution),
never eyeballed, and the invariants are locked behind gates so they cannot
regress.

## Gates (all green)

- `audit.py`: 270/270 pages pass every structural check.
- `formalities.py`: 0 issues (title/description length, canonical, OG, Twitter,
  theme-color, lang, single h1, img alt + loading, no placeholder hrefs).
- `goldcheck.py`: 0 issues (duplicate ids, aria-hidden focusables, accessible
  names, button type, link graph).
- `contrast_gate.py`: 34/34, every text token AAA (reads live tokens).
- `seo_gate.py`: 10/10, canonicals + backlinks + meta + schema + rel hygiene.
- `search_gate.js`: 60/60 trials (the zero-server search brain).

## Canonicals and backlinks (gold standard)

Checked on all 270 pages:

- Canonical present exactly once, absolute, self-referencing, and matching
  og:url. 0 missing, 0 relative, 0 duplicates, 0 path mismatches, 0 og:url
  mismatches.
- Internal links: 0 broken. Every internal href resolves to a real page.
- Outbound rel hygiene: 675 new-tab external links, all carry rel="noopener";
  same-tab network links (aircraft.fyi, ships.fyi, luck.fyi) stay dofollow to
  pass equity across the network; both affiliate links carry rel="sponsored".

## SEO and meta

- Titles: rendered length max 60 chars, none over 60.
- Descriptions: max 155 chars, none over 160.
- Every page: canonical, og:title/description/image/type/url, twitter:card,
  robots, exactly one h1, html lang.

## Schema

- 0 invalid JSON-LD blocks across 270 pages. Detail pages carry FAQPage,
  BreadcrumbList, Dataset and Car; hubs carry CollectionPage/ItemList.

## Accessibility

- 0 interactive elements without an accessible name (icon buttons and links
  carry aria-label; the Telegram and Amazon buttons expose their text labels).
- 0 selects without a label or id, 0 duplicate ids, 0 images without alt,
  landmarks and skip link present, nav has an aria-label.

## Contrast

- Every text colour clears 7:1 (AAA) against every surface it sits on; worst
  case across the palette is exactly 7.00. En-dashes and hyphens preserved.

## Housekeeping

- Em-dash purge holds: 0 across all served content; purge is idempotent and
  runs last in the build.
- Dead aircraft-fork CSS collisions removed (gear card, gear CTA); ranking
  bars and metric-card spacing fixed.
