import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Initial schema. Every statement is idempotent (IF NOT EXISTS) so tables that
 * already exist in the target database are reused instead of recreated.
 *
 * Conventions: uuid primary keys, timestamptz everywhere, money as bigint minor
 * units, enum-like columns are varchar + CHECK (easy to extend, no ALTER TYPE).
 */
export class InitialSchema1760000000000 implements MigrationInterface {
  name = 'InitialSchema1760000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const statements: string[] = [
      // ---------------------------------------------------------------- users
      `CREATE TABLE IF NOT EXISTS users (
        id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        name         varchar(200) NOT NULL,
        email        varchar(255) NOT NULL,
        password     text NOT NULL,
        role         varchar(20)  NOT NULL,
        company_name varchar(200) NOT NULL,
        phone        varchar(30),
        is_active    boolean NOT NULL DEFAULT true,
        created_at   timestamptz NOT NULL DEFAULT now(),
        updated_at   timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT chk_users_role CHECK (role IN ('BUYER', 'VENDOR'))
      )`,
      `CREATE UNIQUE INDEX IF NOT EXISTS uq_users_email ON users (email)`,

      `CREATE TABLE IF NOT EXISTS user_refresh_tokens (
        id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id      uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
        token_hash   char(64) NOT NULL,
        expires_at   timestamptz NOT NULL,
        is_revoked   boolean NOT NULL DEFAULT false,
        user_agent   varchar(500),
        ip_address   varchar(50),
        last_used_at timestamptz,
        created_at   timestamptz NOT NULL DEFAULT now()
      )`,
      `CREATE INDEX IF NOT EXISTS idx_user_refresh_tokens_user ON user_refresh_tokens (user_id)`,

      // --------------------------------------------------- admin access control
      `CREATE TABLE IF NOT EXISTS admin_roles (
        id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        name        varchar(100) NOT NULL,
        slug        varchar(150) NOT NULL,
        description text,
        is_system   boolean NOT NULL DEFAULT false,
        is_active   boolean NOT NULL DEFAULT true,
        created_at  timestamptz NOT NULL DEFAULT now(),
        updated_at  timestamptz NOT NULL DEFAULT now()
      )`,
      `CREATE UNIQUE INDEX IF NOT EXISTS uq_admin_roles_name ON admin_roles (name)`,
      `CREATE UNIQUE INDEX IF NOT EXISTS uq_admin_roles_slug ON admin_roles (slug)`,

      `CREATE TABLE IF NOT EXISTS admins (
        id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        name          varchar(200) NOT NULL,
        email         varchar(255) NOT NULL,
        password      text NOT NULL,
        role_id       uuid NOT NULL REFERENCES admin_roles (id) ON DELETE RESTRICT,
        phone         varchar(30),
        avatar_url    varchar(1000),
        date_of_birth date,
        joining_date  date,
        description   text,
        is_active     boolean NOT NULL DEFAULT true,
        created_at    timestamptz NOT NULL DEFAULT now(),
        updated_at    timestamptz NOT NULL DEFAULT now()
      )`,
      `CREATE UNIQUE INDEX IF NOT EXISTS uq_admins_email ON admins (email)`,
      `CREATE INDEX IF NOT EXISTS idx_admins_role ON admins (role_id)`,

      `CREATE TABLE IF NOT EXISTS permissions (
        id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        table_key  varchar(100) NOT NULL,
        action     varchar(10)  NOT NULL,
        label      varchar(255) NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT chk_permissions_action CHECK (action IN ('create', 'read', 'update', 'delete'))
      )`,
      `CREATE UNIQUE INDEX IF NOT EXISTS uq_permissions_table_action ON permissions (table_key, action)`,

      `CREATE TABLE IF NOT EXISTS role_permissions (
        id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        role_id       uuid NOT NULL REFERENCES admin_roles (id) ON DELETE CASCADE,
        permission_id uuid NOT NULL REFERENCES permissions (id) ON DELETE CASCADE,
        is_granted    boolean NOT NULL DEFAULT true,
        created_at    timestamptz NOT NULL DEFAULT now(),
        updated_at    timestamptz NOT NULL DEFAULT now()
      )`,
      `CREATE UNIQUE INDEX IF NOT EXISTS uq_role_permissions_role_permission
         ON role_permissions (role_id, permission_id)`,

      `CREATE TABLE IF NOT EXISTS refresh_tokens (
        id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        admin_id    uuid NOT NULL REFERENCES admins (id) ON DELETE CASCADE,
        token_hash  char(64) NOT NULL,
        expires_at  timestamptz NOT NULL,
        is_revoked  boolean NOT NULL DEFAULT false,
        user_agent  varchar(500),
        ip_address  varchar(50),
        created_at  timestamptz NOT NULL DEFAULT now()
      )`,
      `CREATE INDEX IF NOT EXISTS idx_refresh_tokens_admin ON refresh_tokens (admin_id)`,

      `CREATE TABLE IF NOT EXISTS admin_audit_logs (
        id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        admin_id    uuid,
        admin_name  varchar(255) NOT NULL,
        admin_email varchar(255) NOT NULL,
        action      varchar(10)  NOT NULL,
        resource    varchar(100) NOT NULL,
        record_id   varchar(100),
        details     jsonb,
        created_at  timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT chk_admin_audit_logs_action CHECK (action IN ('CREATE', 'UPDATE', 'DELETE'))
      )`,
      `CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_resource ON admin_audit_logs (resource, created_at)`,
      `CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_created ON admin_audit_logs (created_at)`,

      // ------------------------------------------------------------------- rfqs
      `CREATE TABLE IF NOT EXISTS rfqs (
        id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        buyer_id         uuid NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
        title            varchar(200) NOT NULL,
        description      text NOT NULL,
        category         varchar(100) NOT NULL,
        delivery_address varchar(300),
        delivery_city    varchar(120) NOT NULL,
        delivery_state   varchar(120) NOT NULL,
        delivery_country varchar(120) NOT NULL,
        delivery_pincode varchar(20)  NOT NULL,
        budget_minor     bigint,
        currency         char(3) NOT NULL DEFAULT 'INR',
        deadline         timestamptz NOT NULL,
        status           varchar(20) NOT NULL DEFAULT 'DRAFT',
        awarded_quote_id uuid,
        published_at     timestamptz,
        awarded_at       timestamptz,
        created_at       timestamptz NOT NULL DEFAULT now(),
        updated_at       timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT chk_rfqs_status CHECK (status IN ('DRAFT', 'PUBLISHED', 'CLOSED', 'AWARDED')),
        CONSTRAINT chk_rfqs_budget CHECK (budget_minor IS NULL OR budget_minor >= 0)
      )`,
      `CREATE INDEX IF NOT EXISTS idx_rfqs_buyer_status ON rfqs (buyer_id, status)`,
      `CREATE INDEX IF NOT EXISTS idx_rfqs_status_deadline ON rfqs (status, deadline)`,
      `CREATE INDEX IF NOT EXISTS idx_rfqs_category ON rfqs (category)`,

      `CREATE TABLE IF NOT EXISTS rfq_line_items (
        id       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        rfq_id   uuid NOT NULL REFERENCES rfqs (id) ON DELETE CASCADE,
        position int NOT NULL,
        name     varchar(200) NOT NULL,
        quantity numeric(14, 3) NOT NULL,
        unit     varchar(30) NOT NULL,
        CONSTRAINT chk_rfq_line_items_quantity CHECK (quantity > 0),
        CONSTRAINT chk_rfq_line_items_position CHECK (position > 0)
      )`,
      `CREATE UNIQUE INDEX IF NOT EXISTS uq_rfq_line_items_position ON rfq_line_items (rfq_id, position)`,

      // ----------------------------------------------------------------- quotes
      `CREATE TABLE IF NOT EXISTS quotes (
        id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        rfq_id              uuid NOT NULL REFERENCES rfqs (id) ON DELETE CASCADE,
        vendor_id           uuid NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
        status              varchar(20) NOT NULL DEFAULT 'SUBMITTED',
        current_revision_no int NOT NULL DEFAULT 1,
        total_minor         bigint NOT NULL,
        delivery_days       int NOT NULL,
        submitted_at        timestamptz NOT NULL,
        last_revised_at     timestamptz NOT NULL,
        created_at          timestamptz NOT NULL DEFAULT now(),
        updated_at          timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT chk_quotes_status CHECK (status IN ('SUBMITTED', 'SHORTLISTED', 'ACCEPTED', 'REJECTED')),
        CONSTRAINT chk_quotes_total CHECK (total_minor >= 0),
        CONSTRAINT chk_quotes_delivery CHECK (delivery_days > 0)
      )`,
      `CREATE UNIQUE INDEX IF NOT EXISTS uq_quotes_rfq_vendor ON quotes (rfq_id, vendor_id)`,
      `CREATE INDEX IF NOT EXISTS idx_quotes_vendor ON quotes (vendor_id)`,
      `CREATE INDEX IF NOT EXISTS idx_quotes_rfq_total ON quotes (rfq_id, total_minor)`,

      `CREATE TABLE IF NOT EXISTS quote_revisions (
        id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        quote_id      uuid NOT NULL REFERENCES quotes (id) ON DELETE CASCADE,
        revision_no   int NOT NULL,
        total_minor   bigint NOT NULL,
        delivery_days int NOT NULL,
        notes         text,
        created_at    timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT chk_quote_revisions_no CHECK (revision_no > 0)
      )`,
      `CREATE UNIQUE INDEX IF NOT EXISTS uq_quote_revisions_no ON quote_revisions (quote_id, revision_no)`,

      `CREATE TABLE IF NOT EXISTS quote_revision_items (
        id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        revision_id      uuid NOT NULL REFERENCES quote_revisions (id) ON DELETE CASCADE,
        line_item_id     uuid NOT NULL REFERENCES rfq_line_items (id) ON DELETE RESTRICT,
        unit_price_minor bigint NOT NULL,
        line_total_minor bigint NOT NULL,
        CONSTRAINT chk_quote_revision_items_price CHECK (unit_price_minor >= 0 AND line_total_minor >= 0)
      )`,
      `CREATE UNIQUE INDEX IF NOT EXISTS uq_quote_revision_items_line
         ON quote_revision_items (revision_id, line_item_id)`,

      // ----------------------------------------------------------- status history
      `CREATE TABLE IF NOT EXISTS status_history (
        id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        rfq_id      uuid NOT NULL REFERENCES rfqs (id) ON DELETE CASCADE,
        quote_id    uuid REFERENCES quotes (id) ON DELETE CASCADE,
        from_status varchar(20),
        to_status   varchar(20) NOT NULL,
        actor_type  varchar(10) NOT NULL,
        actor_id    uuid,
        actor_name  varchar(200),
        note        text,
        created_at  timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT chk_status_history_actor CHECK (actor_type IN ('USER', 'ADMIN', 'SYSTEM'))
      )`,
      `CREATE INDEX IF NOT EXISTS idx_status_history_rfq ON status_history (rfq_id, created_at)`,

      // -------------------------------------------------------------- attachments
      `CREATE TABLE IF NOT EXISTS attachments (
        id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        rfq_id        uuid REFERENCES rfqs (id) ON DELETE CASCADE,
        quote_id      uuid REFERENCES quotes (id) ON DELETE CASCADE,
        uploaded_by   uuid NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
        original_name varchar(255) NOT NULL,
        stored_name   varchar(100) NOT NULL,
        mime_type     varchar(150) NOT NULL,
        size_bytes    int NOT NULL,
        created_at    timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT chk_attachments_one_parent CHECK ((rfq_id IS NULL) <> (quote_id IS NULL)),
        CONSTRAINT chk_attachments_size CHECK (size_bytes > 0)
      )`,
      `CREATE INDEX IF NOT EXISTS idx_attachments_rfq ON attachments (rfq_id)`,
      `CREATE INDEX IF NOT EXISTS idx_attachments_quote ON attachments (quote_id)`,
      `CREATE UNIQUE INDEX IF NOT EXISTS uq_attachments_stored_name ON attachments (stored_name)`,

      // rfqs.awarded_quote_id <-> quotes is circular, so the FK is added last.
      `DO $$
       BEGIN
         IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_rfqs_awarded_quote') THEN
           ALTER TABLE rfqs
             ADD CONSTRAINT fk_rfqs_awarded_quote
             FOREIGN KEY (awarded_quote_id) REFERENCES quotes (id) ON DELETE SET NULL;
         END IF;
       END
       $$`,
    ];

    for (const statement of statements) {
      await queryRunner.query(statement);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const tables = [
      'attachments',
      'status_history',
      'quote_revision_items',
      'quote_revisions',
      'quotes',
      'rfq_line_items',
      'rfqs',
      'admin_audit_logs',
      'refresh_tokens',
      'role_permissions',
      'permissions',
      'admins',
      'admin_roles',
      'user_refresh_tokens',
      'users',
    ];
    await queryRunner.query(
      'ALTER TABLE IF EXISTS rfqs DROP CONSTRAINT IF EXISTS fk_rfqs_awarded_quote',
    );
    for (const table of tables) {
      await queryRunner.query(`DROP TABLE IF EXISTS ${table} CASCADE`);
    }
  }
}
