# Bidveda UI — design system

Written before any UI was built (rules.txt: "Before generating UI"). The product is a
procurement tool: people read tables, compare numbers and make one expensive decision.
So the interface is built like a well-set ledger — typography first, quiet chrome, no
decoration that does not carry information.

## 1. Visual hierarchy

Four levels, and nothing else competes with them:

| Level | What | How it is shown |
|-------|------|-----------------|
| 1 | The page's subject (RFQ title, "Compare quotes") | Serif, large, one per page |
| 2 | The decision data (totals, delivery days, deadline) | Mono, tabular numerals, ink colour, heavier weight |
| 3 | The primary action (Publish, Submit quote, Award) | The only filled pine-green button on the page |
| 4 | Everything else (labels, meta, history) | Small, muted, regular weight |

Rules of thumb used while building:
- One filled button per view. Secondary actions are outlined or text.
- Status is a small dot + word, never a coloured block. Colour is saved for meaning.
- Money and days are always right-aligned in mono with tabular figures so columns scan.
- Lists are rows with hairlines, not grids of cards. Cards are used only for the
  quote slides on mobile where a table cannot fit.

## 2. Spacing system

4px base. Only these steps are used: `4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 · 96`.

- Page gutter: 16 (mobile) / 24 (md) / 32 (lg). Content max width 1120, data tables 1280.
- Inside a section: 24 between groups, 8 between a label and its field.
- Table rows: 44px tall, 12px horizontal cell padding.
- Page sections inside an app screen: 40px between major sections (`mt-10`), 24px inside a form section.

## 3. Typography scale

| Token | Size / line-height | Family | Use |
|-------|--------------------|--------|-----|
| `display` | 56/58 (mobile 38/42), -0.03em | Newsreader | Reserved for a large headline (defined, not currently used) |
| `h1` | 32/38 (mobile 28/34), -0.02em | Newsreader | Page title |
| `h2` | 22/30, -0.01em | Newsreader | Section title inside a page |
| `h3` | 16/24, semibold | Geist | Sub-section, dialog title |
| `body` | 16/26 | Geist | Long text (the RFQ description) |
| `ui` | 14/22 | Geist | Default app text, inputs, table cells |
| `small` | 13/20 | Geist | Secondary table text, helper text |
| `caption` | 12/16, medium | Geist | Table headers, meta labels |
| `figure` | 14/22 tabular | Geist Mono | Money, days, quantities, ids |

The serif carries the "document" feel; the sans does the work; the mono keeps numbers honest.

## 4. Colour system

One neutral family (warm, paper-like), one accent, three semantic colours. Light theme only.

| Token | Hex | Use |
|-------|-----|-----|
| `paper` (background) | `#FBFAF7` | App background |
| `surface` | `#FFFFFF` | Tables, inputs, popovers |
| `sunken` | `#F4F2EC` | Sidebar, table headers, hover rows |
| `line` | `#E6E2D9` | 1px borders and dividers |
| `line-strong` | `#CFCABD` | Input borders, focused dividers |
| `ink` | `#1C1B18` | Primary text |
| `ink-2` | `#55524A` | Secondary text |
| `ink-3` | `#6E6A60` | Muted text, placeholders (about 5:1 on the paper background, so it passes WCAG AA) |
| `pine` (accent) | `#1F5A46` | Primary action, links, focus ring |
| `pine-dark` | `#174638` | Text on `pine-soft`, hover state |
| `pine-soft` | `#E6EFEA` | Selected nav item, soft highlights |
| `amber` / `amber-soft` | `#9A6700` / `#F9F1DC` | Closing-soon, warnings |
| `rust` / `rust-soft` | `#B42318` / `#FBEBE9` | Destructive, rejected, errors |
| `slate-blue` | `#2F5D8A` | "Shortlisted" and "Fastest" only |

No gradients, no glow, no blur, no shadows beyond a 1px border (popovers get one soft
`0 8px 24px rgba(28,27,24,.08)` so they separate from the page).

Status mapping (dot colour): Draft `ink-3`, Published (shown as "Open") `pine`, Closed `amber`, Awarded `ink`;
Submitted `ink-3`, Shortlisted `slate-blue`, Accepted `pine`, Rejected `rust`.

Implementation: the tokens live in `frontend/src/app/globals.css` (`@theme inline` for the named colours,
`:root` for the shadcn variables). Typography helpers are the `.t-display`, `.t-h1`, `.t-h2`, `.t-h3`, `.t-body`,
`.t-small`, `.t-caption` and `.t-figure` classes in the same file. Radius is overridden to 4px for every shadcn size.

Radius: `rounded-sm` (4px) for boxes, inputs and buttons everywhere (rules.txt). Avatars
and status dots are the only round things.

## 5. Why each section exists

### Sign-in and sign-up
| Part | Purpose |
|------|---------|
| Left panel (desktop only) | Three plain rules the product keeps (sealed quotes, server-side deadline, kept history). Builds trust at the moment someone hands over credentials. |
| Form | One column, nothing else on the page. |

### App shell
| Part | Purpose |
|------|---------|
| Sidebar (232px) | Stable wayfinding, role-specific items only. Collapses into a sheet on mobile. |
| Top bar (48px) | Where am I (breadcrumb) and who am I (user menu, sign out). |

### Portal pages
| Page | Purpose |
|------|---------|
| RFQ list | Find an RFQ. Buyer filters by status; vendor by keyword, category, location, deadline. Dense rows, pagination. The vendor's screen has a second tab, "My quotes", so the outcome of every bid stays one click away. |
| RFQ detail | Read everything about one RFQ. Main column for content, right rail for the facts that decide action (deadline, budget, location, status, actions). |
| RFQ form | One long, sectioned form (basics, line items, delivery, files). Line items are the heart so they get the most room. |
| Quote form | Price each line, see the live total, state delivery days. Shows the deadline prominently because it is the constraint. |
| Comparison | Vendors as columns, line items as rows, totals emphasised, sort by total or delivery. The decision screen. |

### Admin
| Page | Purpose |
|------|---------|
| Login | Separate entrance so admin sessions never mix with buyer/vendor sessions. |
| Dashboard | One request, counts for every resource the admin may read. |
| Resource tables/forms | Metadata-driven CRUD (admin.txt). One component renders every table. |
| Roles | Permission matrix per role: resources x create/read/update/delete. |

## 6. Intentional imperfections (so it does not look generated)

- The serif is used for titles only; numbers never use it.
- Status is a dot and a word, never a coloured block.
- Empty states are plain sentences with one next step, not illustrations.
- Lists are hairline rows with uneven column widths instead of grids of equal cards.
