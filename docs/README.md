# Bidveda: Mini RFQ Portal

A buyer publishes a **Request for Quotation**, vendors quote before a hard deadline, the buyer compares the quotes
side by side and awards exactly one vendor. Every revision and every status change is kept.

| | |
|---|---|
| Frontend | Next.js 16 (App Router) · TypeScript · Tailwind CSS v4 · shadcn/ui · lucide-react · Swiper · zod |
| Backend | NestJS 11 · TypeORM · PostgreSQL · JWT access + refresh sessions · Swagger |
| Design doc | [DESIGN.md](DESIGN.md) (all 10 sections, test cases included) |
| Design system | [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md) |
| API docs | Swagger UI at `/api/docs` when the API runs, static copy in [openapi.json](openapi.json) |

Environment files live only inside the two apps: `backend/.env` and `frontend/.env` (examples next to them).
There is no env file at the project root.

---

## Run it with Docker

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
docker compose up --build
```

| What | URL |
|------|-----|
| App | http://localhost:3000 |
| Admin panel | http://localhost:3000/admin |
| API + Swagger | http://localhost:5000/api/docs |

The first start creates the schema (migrations run automatically), the Super Admin and all permissions. Sign in as the
Super Admin at `/admin/login` with `SUPER_ADMIN_EMAIL` / `SUPER_ADMIN_PASSWORD` from `backend/.env`; buyers and vendors
sign up on the main site. The two `.env.example` files already hold working development values; only the
database host and password, `NODE_ENV` and the upload folder are overridden for the containers (see the
`environment:` blocks in `docker-compose.yml`). Change the secrets in `backend/.env` before any real deployment.

To start from an empty database again: `docker compose down -v && docker compose up --build`.

### Test accounts

| Role | Sign in at | Email | Password |
|------|-----------|-------|----------|
| Admin (Super Admin) | `/admin/login` | `superadmin@bidveda.test` | `SuperAdmin@123` (the values in `backend/.env.example`; set your own in `backend/.env`) |
| Buyer | `/login` | create one at `/signup` and choose "I am a buyer" | your choice: 8 or more characters with a letter and a number |
| Vendor | `/login` | create one at `/signup` and choose "I am a vendor" | the same |

Sign-up signs the person in straight away, so a buyer and a vendor can be created in two browser windows (or one normal
and one private window) to try the whole flow. There is no sample data yet (see the limitations below).

---

## Run it locally (without Docker)

Requirements: Node 22+, PostgreSQL 13+.

```bash
# 1. database
createdb bidveda            # or any name; then match DB_NAME below

# 2. backend  (http://localhost:5000, Swagger at /api/docs)
cd backend
cp .env.example .env        # set DB_PASSWORD and the two JWT secrets (see the file)
npm install
npm run start:dev           # runs migrations, creates the Super Admin

# 3. frontend (http://localhost:3000)
cd ../frontend
cp .env.example .env
npm install
npm run dev
```

Handy backend commands:

| Command | What it does |
|---------|--------------|
| `npm run migration:run` / `migration:revert` / `migration:show` | Manage migrations by hand (the app also runs them on boot) |
| `npm run openapi` | Re-export `docs/openapi.json` (builds the app; use a throw-away database) |

### Environment variables

**backend/.env** (full list with comments in `backend/.env.example`)

| Variable | Meaning |
|----------|---------|
| `PORT`, `CORS_ORIGIN`, `FRONTEND_URL` | API port and the web app's origin |
| `DB_HOST` `DB_PORT` `DB_USERNAME` `DB_PASSWORD` `DB_NAME` `DB_SSL` | PostgreSQL connection |
| `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` | Two different secrets, 32+ characters each. The app refuses to start otherwise |
| `ACCESS_TOKEN_TTL_MINUTES`, `REFRESH_TOKEN_TTL_DAYS` | 15 and 7 by default |
| `SUPER_ADMIN_EMAIL`, `SUPER_ADMIN_PASSWORD` | The Super Admin is created or synced from these on every boot |
| `UPLOAD_DIR`, `MAX_UPLOAD_MB` | Where files are stored, and the size limit |
| `SMTP_*`, `MAIL_FROM` | Optional. With `SMTP_HOST` empty, emails are only logged |
| `SWAGGER_ENABLED`, `THROTTLE_DISABLED` | Docs on/off; rate limit off (tests only) |

**frontend/.env**

| Variable | Meaning |
|----------|---------|
| `BACKEND_API_URL` | Where the Next.js server reaches the API. Server only, never sent to the browser |
| `NEXT_PUBLIC_APP_NAME`, `NEXT_PUBLIC_APP_URL` | Display name; the public URL (an `https://` value makes cookies `Secure`) |

---

## Tests

```bash
# backend: 16 unit tests + 28 API tests that run the real app against PostgreSQL
createdb bidveda_test                      # once; the API tests wipe this database each run
cd backend
npm test                                   # unit
npm run test:e2e                           # API level, uses backend/.env.test
npm run test:all                           # both

# frontend: 114 tests (form rules in zod, date picker maths, API client, proxy, sign-in redirects, component rendering)
cd frontend
npm test
npm run typecheck && npm run lint
```

The API tests refuse to run unless the database name ends in `_test`. They cover sign-up and roles, the RFQ lifecycle,
quote submit and revise, the deadline lock, vendor privacy, comparison sorting, award with history, a concurrent award
race, file validation and download rules, and admin permissions. The full list, with what is not automated, is in
[DESIGN.md section 9](DESIGN.md#9-test-cases).

---

## How it is built

```
backend/src
  schema/        TypeORM entities (one file per table)
  migrations/    SQL migration (IF NOT EXISTS, so existing tables are reused)
  types/         All shared types, enums, response shapes
  template/      Email templates
  auth/          Buyer and vendor sign-in, per-device sessions
  rfqs/ quotes/ attachments/ history/   The marketplace rules
  admin/         Metadata registry + generic CRUD, role matrix, audit log
  security/      Guards, token service, permission lookup
  bootstrap/     Boot-time roles, permissions, Super Admin
  storage/       Safe file storage: type and content checks, random file names

frontend/src
  app/           Server-component pages and route handlers (no logic in routes)
  components/    One component per file: ui/ common/ layout/ auth/ rfq/ quote/ admin/
  services/      Class-based services the UI calls (use clientApi)
  services-api/  Class-based server services behind the routes (use serverApi)
  lib/           API clients (baseApi, clientApi: 401 -> refresh -> retry, serverApi) and the logic of the forms
                 and the date picker, written without React so it can be tested (zod rules in rfq-form,
                 quote-form, auth-schemas)
  utils/         general.ts (dates, durations, money, debounce) and constant.ts
  types/         Frontend types, and enums.ts with every fixed set of values (roles, statuses...)
```

The frontend folders, its pages and how a form works are described in [frontend/README.md](../frontend/README.md).

Request path for every API call: `component -> services -> clientApi -> Next.js route -> services-api -> serverApi -> NestJS`.
The refresh token only ever lives in an `HttpOnly` cookie set by the Next.js server; the access token lives in memory.

### Two things worth knowing

- **The deadline is enforced on the server.** `PUT /rfqs/:id/my-quote` compares the deadline to the database clock inside
  the same transaction that writes the quote, under a row lock that also serialises awards. A late quote returns
  `409 DEADLINE_PASSED` and writes nothing.
- **The admin panel is generated from one registry.** `backend/src/admin/admin-resource.registry.ts` declares each
  table once; permissions, endpoints, FK search, audit logging and the UI come from it. To add a table: entity, registry
  entry, restart. See `admin.txt`'s "3 steps".

---

## Known limitations and next steps

Honest list, most important first.

1. **No browser-level tests.** The UI is covered by type-checking, lint, a production build, unit tests of the form rules and
   the API layer, and render tests of the main components, but there are no Playwright journeys. I would add buyer and
   vendor journeys first.
2. **The Docker images were not built on the machine I wrote this on.** `docker compose config` validates, the images follow
   the standard multi-stage pattern, and both apps were run in production mode against an empty database (migrations on boot,
   sign-up, the whole buyer, vendor and award flow, admin sign-in). Run `docker compose up --build` once and tell me if
   anything differs.
3. **No seed script with sample data.** The database starts with the Super Admin only (created on boot from `backend/.env`);
   buyers and vendors sign up on the site. A script that adds sample buyers, vendors and RFQs, including the assignment's
   chairs-and-desks example, is the first thing I would add so the app can be tried in one step.
4. **Files live on a local disk volume.** Fine for one server; for several, move to S3 behind `FileStorageService`
   and add virus scanning.
5. **Search is `ILIKE`.** Fast enough for thousands of RFQs; `pg_trgm` or a search engine for more.
6. **Sessions are checked in the database on every request** (this makes logout and deactivation instant). At scale,
   cache them in Redis.
7. **No password reset, email verification or 2FA.** Out of scope for this assignment.
8. **An open RFQ can be edited, but vendors are not told.** Line items lock at the first quote and nothing can change after the
   deadline. There is no "cancel RFQ" action and no email or notice to vendors who already looked at an RFQ that then changed;
   a real product would add both.
9. **Licence:** `country-state-city` (used for the country, state and city lists) is GPL-3.0. Replace it before a
   closed-source commercial release.
10. **Scale notes** (what breaks first at 100x, what I would change) are in
    [DESIGN.md section 10](DESIGN.md#10-scalability-and-next-steps).

### Differences from `admin.txt`

- Admin sign-in is under `/auth/admin/*` and the refresh cookie is set by the Next.js server (project rule), not by the backend.
- One Next.js app serves buyers, vendors and the admin panel (`/admin`), instead of a second app on port 4000. Sessions are
  kept apart by separate cookies, token audiences and routes.

---

## AI tools

Most of this repository (code, tests, migrations, documentation) was written with **Claude Code** (Anthropic's coding
agent) from the assignment brief, the project rules in `rules.txt` and the admin architecture in `admin.txt`. The agent
ran type checks, lint, the unit tests and the API tests against a local PostgreSQL while it worked. The person
submitting this repository is responsible for understanding every part of it.
