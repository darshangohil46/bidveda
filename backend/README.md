# Bidveda API (NestJS)

See the [README](../docs/README.md) for setup, credentials and the full picture, and
[DESIGN.md](../docs/DESIGN.md) for the design.

```bash
cp .env.example .env     # development defaults that work as they are
npm install
npm run start:dev        # migrations + Super Admin run on boot
npm test                 # unit tests
npm run test:e2e         # API tests (needs a bidveda_test database)
```

- Swagger: `http://localhost:5000/api/docs`
- Schema: `src/schema/` · migrations: `src/migrations/` · types: `src/types/` · email templates: `src/template/`
- Admin panel API is generated from `src/admin/admin-resource.registry.ts`.
