# Bidveda web app (Next.js)

See the [README](../docs/README.md) for setup and credentials, and
[DESIGN_SYSTEM.md](../docs/DESIGN_SYSTEM.md) for the visual system.

```bash
cp .env.example .env
npm install
npm run dev          # http://localhost:3000  (the API must be running on :5000)
npm test             # unit tests
npm run typecheck && npm run lint
```

API call path (rules.txt): `components -> src/services -> lib/clientApi -> src/app/api (no logic) -> src/services-api -> lib/serverApi -> NestJS`.

> Note for contributors: this is Next.js 16. Read `node_modules/next/dist/docs/` before changing framework-level code
> (for example `proxy.ts` replaces `middleware.ts`).

## How the frontend is organised

| Folder | What lives there |
| --- | --- |
| `src/app` | Pages (server components that only put components together). `(auth)` is the **signed-in area** (`buyer/`, `vendor/`); `login` and `signup` are public; `admin/` is the admin panel; `api/` holds the Next.js route handlers. |
| `src/components` | One component per file (small helpers may share their parent's file). Grouped by area: `rfq/`, `quote/`, `admin/`, `auth/`, `layout/`, `common/`, and `ui/` (shadcn). |
| `src/lib` | Logic **without React**, so it is easy to read and to test: `rfq-form.ts`, `quote-form.ts`, `auth-schemas.ts` (zod rules), `date-picker.ts`, `resource-form.ts`, `admin-sort.ts`, plus the API clients (`baseApi`, `clientApi`, `serverApi`). |
| `src/services` | Browser to API calls, one class per area. |
| `src/services-api` | The server-side half of those calls (cookies, refresh tokens, proxying). |
| `src/types/enums.ts` | Every fixed set of values (roles, statuses, field types, sort orders...). Use these, never loose strings. |
| `src/utils` | `general.ts` (dates, durations, money, debounce) and `constant.ts` (routes, labels). |

### Pages

| Who | Address | Page |
| --- | --- | --- |
| Anyone | `/login`, `/signup` | Sign in, create an account |
| Buyer | `/buyer/rfqs` | My RFQs. "New RFQ" and the pencil on a draft open the RFQ modal (create / edit) |
| Buyer | `/buyer/rfqs/:id`, `/buyer/rfqs/:id/compare` | One RFQ (its Edit button opens the same modal, for a draft or open RFQ), compare and award quotes |
| Vendor | `/vendor/rfqs` | Open RFQs |
| Vendor | `/vendor/quotes` | My quotes |
| Vendor | `/vendor/rfqs/:id`, `/vendor/rfqs/:id/quote` | One RFQ, send or revise a quote |
| Admin | `/admin/login`, `/admin/dashboard` | Admin sign-in and overview |
| Admin | `/admin/resources/:resource` | Every table (`admins`, `admin_roles`, `permissions`, ...) on one generic page |

There is no sidebar: a bar on top holds the logo, the role's links (a vendor has Open RFQs and My quotes) and the account menu. A **draft** and an **open** RFQ can be edited; closed and awarded ones cannot. Once a vendor has quoted, the line items are locked (their prices point at them) but everything else can still be changed.

`/` is not a page: the proxy sends a signed-out visitor to `/login` and a signed-in one to their buyer or vendor home.

### How a form works (RFQ form, quote form, sign-in, sign-up)

1. The **rules** are a zod schema in `src/lib` (`rfq-form.ts`, `quote-form.ts`, `auth-schemas.ts`). They have no React in them and have unit tests.
2. The **component** keeps what was typed in state, calls the rules on submit, shows one message per bad field, and then calls a service.
3. The **server** checks everything again; the browser rules are only there to help the person.

### Rules this code follows (`docs/rules.txt`)

- zod for validation; `useToast` for messages; shadcn components with Tailwind; `rounded-sm` boxes; lucide icons.
- `Link` and `next/image` `Image`; our own date picker; Swiper for swiping.
- One dropdown everywhere: `SearchSelect` (a button that opens a search box and a list). Use `allowCustom` when people may type a value that is not in the list, and `onSearch` for long server-side lists.
- Dates, durations and money are always shown through `utils/general.ts`.
- No `eslint-disable` anywhere.
