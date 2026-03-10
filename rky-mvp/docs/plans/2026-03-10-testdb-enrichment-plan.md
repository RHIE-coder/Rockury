# TestDB Enrichment & DB Reference Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Enrich test databases with 28 tables covering all DB design elements, extend type system for categories 8-10, add services, and build Reference tab UI.

**Architecture:** Bottom-up approach — SQL scripts first, then types/services, then UI. Existing `schemaObjectsService` pattern extended with new cases. Reference tab is a new feature module with static JSON data.

**Tech Stack:** PostgreSQL 15+, MySQL 8+, MariaDB 10.6+, SQLite, TypeScript, React, React Router, Zustand, Lucide Icons

---

## Phase 1: TestDB SQL Scripts

### Task 1.1: PostgreSQL init.sql

**Files:**
- Rewrite: `scripts/test-db/init/postgresql/init.sql`

**Step 1: Write the full PostgreSQL init script**

The script follows this exact order (per design):
```sql
-- 0. Extensions
-- 1. Custom Types (Enum, Composite, Domain)
-- 2. Sequences
-- 3. Tables (28, topological FK order)
-- 4. Indexes (B-Tree, Hash, GIN, GiST, Partial, Expression, Covering, Composite, Unique)
-- 5. Views & Materialized Views
-- 6. Functions & Procedures (PL/pgSQL)
-- 7. Triggers (Row/Statement, BEFORE/AFTER/INSTEAD OF)
-- 8. Partitioning (Range, List, Hash — Declarative)
-- 9. Security (Roles, RLS Policy, Grants)
-- 10. Schemas & Advanced (namespace, tablespace, collation, FDW)
-- 11. Seed Data (~150 rows)
```

PostgreSQL covers ALL 10 categories. Key elements:

**0. Extensions:**
```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
```

**1. Custom Types:**
```sql
-- Enum types
CREATE TYPE order_status AS ENUM ('pending', 'confirmed', 'shipped', 'delivered', 'cancelled', 'refunded');
CREATE TYPE payment_status AS ENUM ('pending', 'processing', 'completed', 'failed', 'refunded');
CREATE TYPE payment_method AS ENUM ('credit_card', 'bank_transfer', 'paypal', 'crypto');
CREATE TYPE notification_type AS ENUM ('info', 'warning', 'error', 'success');
CREATE TYPE trigger_action AS ENUM ('INSERT', 'UPDATE', 'DELETE');

-- Composite type
CREATE TYPE address AS (
  street VARCHAR(200),
  city VARCHAR(100),
  state VARCHAR(100),
  postal_code VARCHAR(20),
  country VARCHAR(50)
);

-- Domain type
CREATE DOMAIN email_address AS VARCHAR(255)
  CHECK (VALUE ~ '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$');

CREATE DOMAIN positive_integer AS INTEGER
  CHECK (VALUE > 0);
```

**2. Sequences:**
```sql
CREATE SEQUENCE image_sort_seq START WITH 1 INCREMENT BY 10;
CREATE SEQUENCE audit_seq START WITH 1 INCREMENT BY 1 NO CYCLE;
```

**3. Tables (28):** Follow the exact table list from design. Key FK policy examples:

```sql
-- orders → users: ON DELETE RESTRICT ON UPDATE CASCADE
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  status order_status NOT NULL DEFAULT 'pending',
  total_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  shipping_address address,  -- composite type usage
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
) PARTITION BY RANGE (created_at);

-- order_items → orders: ON DELETE CASCADE ON UPDATE CASCADE
-- comments → posts: ON DELETE CASCADE ON UPDATE NO ACTION
-- comments → comments (self): ON DELETE SET NULL ON UPDATE NO ACTION
-- notifications → users: ON DELETE SET DEFAULT ON UPDATE CASCADE
-- payments → orders: ON DELETE RESTRICT ON UPDATE RESTRICT
-- products → categories: ON DELETE SET NULL ON UPDATE CASCADE
```

Generated column example:
```sql
CREATE TABLE users (
  ...
  full_name VARCHAR(200) GENERATED ALWAYS AS (first_name || ' ' || last_name) STORED,
  ...
);
```

EXCLUDE constraint example:
```sql
-- On scheduled_jobs or similar: prevent overlapping time ranges
ALTER TABLE scheduled_jobs
  ADD CONSTRAINT no_overlap EXCLUDE USING gist (
    job_name WITH =,
    tstzrange(start_time, end_time) WITH &&
  );
```

**4. Indexes:**
```sql
-- B-Tree (default)
CREATE INDEX idx_orders_user_id ON orders(user_id);

-- Hash
CREATE INDEX idx_settings_key_hash ON settings USING hash(key);

-- GIN (JSONB)
CREATE INDEX idx_products_metadata ON products USING gin(metadata);

-- GiST (for EXCLUDE constraint or spatial)
CREATE INDEX idx_warehouses_location ON warehouses USING gist(location);

-- Partial Index
CREATE INDEX idx_payments_pending ON payments(created_at) WHERE status = 'pending';

-- Expression Index
CREATE INDEX idx_api_keys_hash ON api_keys(encode(digest(key_value, 'sha256'), 'hex'));

-- Covering Index (INCLUDE)
CREATE INDEX idx_products_category_covering ON products(category_id) INCLUDE (name, price);

-- Composite Index
CREATE INDEX idx_inventory_warehouse_product ON inventory(warehouse_id, product_variant_id);

-- Unique Index (beyond UK constraint)
CREATE UNIQUE INDEX idx_users_email_lower ON users(LOWER(email));
```

**5. Views:**
```sql
-- Regular View
CREATE VIEW v_user_summary AS
  SELECT u.id, u.full_name, u.email, COUNT(o.id) AS order_count, COALESCE(SUM(o.total_amount), 0) AS total_spent
  FROM users u LEFT JOIN orders o ON o.user_id = u.id
  GROUP BY u.id;

-- Updatable View with CHECK OPTION
CREATE VIEW v_active_products AS
  SELECT * FROM products WHERE is_active = true
  WITH CHECK OPTION;

-- Materialized View
CREATE MATERIALIZED VIEW mv_product_stats AS
  SELECT p.id, p.name, COUNT(oi.id) AS times_ordered, COALESCE(SUM(oi.quantity), 0) AS total_sold
  FROM products p LEFT JOIN product_variants pv ON pv.product_id = p.id
  LEFT JOIN order_items oi ON oi.product_variant_id = pv.id
  GROUP BY p.id
  WITH DATA;

CREATE UNIQUE INDEX idx_mv_product_stats_id ON mv_product_stats(id);
```

**6. Functions & Procedures:**
```sql
-- Scalar function
CREATE OR REPLACE FUNCTION fn_calc_order_total(p_order_id UUID)
RETURNS NUMERIC AS $$
  SELECT COALESCE(SUM(quantity * unit_price), 0)
  FROM order_items WHERE order_id = p_order_id;
$$ LANGUAGE sql STABLE;

-- Table-returning function
CREATE OR REPLACE FUNCTION fn_get_category_tree(p_root_id UUID)
RETURNS TABLE(id UUID, name VARCHAR, depth INT) AS $$
  WITH RECURSIVE tree AS (
    SELECT id, name, 0 AS depth FROM categories WHERE id = p_root_id
    UNION ALL
    SELECT c.id, c.name, t.depth + 1 FROM categories c JOIN tree t ON c.parent_id = t.id
  )
  SELECT * FROM tree;
$$ LANGUAGE sql;

-- Procedure
CREATE OR REPLACE PROCEDURE proc_cleanup_expired_notifications(p_days INT DEFAULT 30)
LANGUAGE plpgsql AS $$
BEGIN
  DELETE FROM notifications WHERE created_at < NOW() - (p_days || ' days')::INTERVAL;
  RAISE NOTICE 'Cleaned up notifications older than % days', p_days;
END;
$$;

-- Procedure with OUT parameter
CREATE OR REPLACE PROCEDURE proc_recalc_inventory(
  IN p_warehouse_id UUID,
  INOUT p_updated_count INT DEFAULT 0
)
LANGUAGE plpgsql AS $$
BEGIN
  UPDATE inventory SET updated_at = NOW() WHERE warehouse_id = p_warehouse_id;
  GET DIAGNOSTICS p_updated_count = ROW_COUNT;
END;
$$;
```

**7. Triggers:**
```sql
-- BEFORE UPDATE row-level (auto updated_at)
CREATE OR REPLACE FUNCTION fn_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
-- (Apply to all tables with updated_at)

-- AFTER INSERT statement-level (audit log)
CREATE OR REPLACE FUNCTION fn_audit_log()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_logs(table_name, action, record_id, old_data, new_data, performed_by)
  VALUES (TG_TABLE_NAME, TG_OP,
    CASE WHEN TG_OP = 'DELETE' THEN OLD.id ELSE NEW.id END,
    CASE WHEN TG_OP IN ('UPDATE','DELETE') THEN to_jsonb(OLD) END,
    CASE WHEN TG_OP IN ('INSERT','UPDATE') THEN to_jsonb(NEW) END,
    current_setting('app.current_user_id', true)::UUID
  );
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_orders_audit
  AFTER INSERT OR UPDATE OR DELETE ON orders
  FOR EACH ROW EXECUTE FUNCTION fn_audit_log();

-- INSTEAD OF trigger (on updatable view)
CREATE OR REPLACE FUNCTION fn_v_active_products_insert()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO products(name, category_id, price, is_active, metadata)
  VALUES (NEW.name, NEW.category_id, NEW.price, true, NEW.metadata);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- AFTER INSERT row-level (inventory log)
CREATE OR REPLACE FUNCTION fn_inventory_log()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO inventory_log(inventory_id, old_quantity, new_quantity, changed_at)
  VALUES (NEW.id, OLD.quantity, NEW.quantity, NOW());
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_inventory_change
  AFTER UPDATE OF quantity ON inventory
  FOR EACH ROW
  WHEN (OLD.quantity IS DISTINCT FROM NEW.quantity)
  EXECUTE FUNCTION fn_inventory_log();
```

**8. Partitioning:**
```sql
-- orders is already PARTITION BY RANGE (created_at)
CREATE TABLE orders_2025h1 PARTITION OF orders
  FOR VALUES FROM ('2025-01-01') TO ('2025-07-01');
CREATE TABLE orders_2025h2 PARTITION OF orders
  FOR VALUES FROM ('2025-07-01') TO ('2026-01-01');
CREATE TABLE orders_2026h1 PARTITION OF orders
  FOR VALUES FROM ('2026-01-01') TO ('2026-07-01');
CREATE TABLE orders_default PARTITION OF orders DEFAULT;

-- notifications: RANGE partition
-- audit_logs: RANGE partition
-- inventory_log: RANGE partition

-- Example LIST partition (add a region column to warehouses or use a separate table)
CREATE TABLE products_by_category (
  LIKE products INCLUDING ALL
) PARTITION BY LIST (category_type);

-- Example HASH partition
CREATE TABLE api_keys_partitioned (
  LIKE api_keys INCLUDING ALL
) PARTITION BY HASH (id);
CREATE TABLE api_keys_p0 PARTITION OF api_keys_partitioned FOR VALUES WITH (MODULUS 4, REMAINDER 0);
CREATE TABLE api_keys_p1 PARTITION OF api_keys_partitioned FOR VALUES WITH (MODULUS 4, REMAINDER 1);
CREATE TABLE api_keys_p2 PARTITION OF api_keys_partitioned FOR VALUES WITH (MODULUS 4, REMAINDER 2);
CREATE TABLE api_keys_p3 PARTITION OF api_keys_partitioned FOR VALUES WITH (MODULUS 4, REMAINDER 3);
```

**9. Security:**
```sql
-- Roles
CREATE ROLE app_admin WITH LOGIN PASSWORD 'admin_pass';
CREATE ROLE app_readonly WITH LOGIN PASSWORD 'readonly_pass';
CREATE ROLE app_user WITH LOGIN PASSWORD 'user_pass';

-- Grants
GRANT SELECT ON ALL TABLES IN SCHEMA public TO app_readonly;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO app_admin;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO app_user;

-- RLS
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY audit_logs_admin_policy ON audit_logs
  FOR ALL TO app_admin USING (true);

CREATE POLICY audit_logs_user_policy ON audit_logs
  FOR SELECT TO app_user
  USING (performed_by = current_setting('app.current_user_id', true)::UUID);

ALTER TABLE org_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY org_members_own_org ON org_members
  FOR ALL TO app_user
  USING (user_id = current_setting('app.current_user_id', true)::UUID);
```

**10. Advanced:**
```sql
-- Schema/Namespace
CREATE SCHEMA IF NOT EXISTS audit;
-- Move audit_logs to audit schema (or create there initially)

-- Collation
CREATE COLLATION IF NOT EXISTS case_insensitive (
  provider = icu, locale = 'und-u-ks-level2', deterministic = false
);
```

**11. Seed Data:** Insert ~150 rows across all tables with diverse data.

**Step 2: Test the script**
```bash
cd scripts/test-db && docker compose down -v && docker compose up -d
docker exec -it $(docker compose ps -q postgresql) psql -U test -d testdb -c '\dt'
docker exec -it $(docker compose ps -q postgresql) psql -U test -d testdb -c '\dT+'
docker exec -it $(docker compose ps -q postgresql) psql -U test -d testdb -c '\df'
docker exec -it $(docker compose ps -q postgresql) psql -U test -d testdb -c '\dv'
```
Expected: 28+ tables, types, functions, views listed.

**Step 3: Commit**
```bash
git add scripts/test-db/init/postgresql/init.sql
git commit -m "feat(testdb): rewrite postgresql init with 28 tables and all design elements"
```

---

### Task 1.2: MySQL init.sql

**Files:**
- Rewrite: `scripts/test-db/init/mysql/init.sql`

**Step 1: Write MySQL init script**

MySQL covers categories 1-6, 8, partial 7 and 9. Key differences from PostgreSQL:
- No custom types → use column-level ENUM/SET
- No sequences → use AUTO_INCREMENT
- No materialized views
- No RLS/Policy
- No EXCLUDE constraint
- No expression/partial indexes
- Has Events (scheduled tasks)
- Has Fulltext and Spatial indexes
- Routines use `DELIMITER //` pattern
- Partitioning syntax differs (inline, not declarative)

```sql
-- Column-level ENUM (instead of CREATE TYPE)
CREATE TABLE orders (
  ...
  status ENUM('pending','confirmed','shipped','delivered','cancelled','refunded') NOT NULL DEFAULT 'pending',
  ...
);

-- SET type
CREATE TABLE user_profiles (
  ...
  preferences SET('dark_mode','notifications','newsletter','two_factor') DEFAULT 'notifications',
  ...
);

-- Fulltext Index
CREATE FULLTEXT INDEX idx_products_fulltext ON products(name, description);

-- Spatial
CREATE TABLE warehouses (
  ...
  location POINT NOT NULL SRID 4326,
  SPATIAL INDEX idx_warehouses_location (location)
);

-- Event (MySQL-specific)
CREATE EVENT evt_cleanup_notifications
  ON SCHEDULE EVERY 1 DAY STARTS CURRENT_TIMESTAMP
  DO DELETE FROM notifications WHERE created_at < DATE_SUB(NOW(), INTERVAL 30 DAY);

CREATE EVENT evt_refresh_stats
  ON SCHEDULE EVERY 1 HOUR
  DO UPDATE settings SET value = (SELECT COUNT(*) FROM orders) WHERE `key` = 'total_orders';

-- Function with DELIMITER
DELIMITER //
CREATE FUNCTION fn_calc_order_total(p_order_id CHAR(36))
RETURNS DECIMAL(12,2) DETERMINISTIC READS SQL DATA
BEGIN
  DECLARE v_total DECIMAL(12,2);
  SELECT COALESCE(SUM(quantity * unit_price), 0) INTO v_total
  FROM order_items WHERE order_id = p_order_id;
  RETURN v_total;
END //
DELIMITER ;

-- Procedure
DELIMITER //
CREATE PROCEDURE proc_cleanup_expired_notifications(IN p_days INT)
BEGIN
  DELETE FROM notifications WHERE created_at < DATE_SUB(NOW(), INTERVAL p_days DAY);
END //
DELIMITER ;

-- Trigger (row-level only, BEFORE/AFTER)
CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW SET NEW.updated_at = NOW();

-- Partitioning (inline)
CREATE TABLE orders (
  ...
) PARTITION BY RANGE (YEAR(created_at)) (
  PARTITION p2025 VALUES LESS THAN (2026),
  PARTITION p2026 VALUES LESS THAN (2027),
  PARTITION p_future VALUES LESS THAN MAXVALUE
);

-- Roles & Grants
CREATE USER IF NOT EXISTS 'app_readonly'@'%' IDENTIFIED BY 'readonly_pass';
GRANT SELECT ON testdb.* TO 'app_readonly'@'%';
```

**Step 2: Test**
```bash
docker exec -it $(docker compose ps -q mysql) mysql -u test -ptest testdb -e "SHOW TABLES;"
docker exec -it $(docker compose ps -q mysql) mysql -u test -ptest testdb -e "SHOW EVENTS;"
docker exec -it $(docker compose ps -q mysql) mysql -u test -ptest testdb -e "SHOW FUNCTION STATUS WHERE Db='testdb';"
```

**Step 3: Commit**
```bash
git add scripts/test-db/init/mysql/init.sql
git commit -m "feat(testdb): rewrite mysql init with 28 tables and all design elements"
```

---

### Task 1.3: MariaDB init.sql

**Files:**
- Rewrite: `scripts/test-db/init/mariadb/init.sql`

**Step 1: Write MariaDB init script**

Nearly identical to MySQL with these additions:
- `CREATE SEQUENCE` support (MariaDB 10.3+)
- `CREATE OR REPLACE` syntax supported
- Slightly different partition syntax in edge cases

```sql
-- Sequence (MariaDB-specific, not in MySQL)
CREATE SEQUENCE image_sort_seq START WITH 1 INCREMENT BY 10;
CREATE SEQUENCE audit_seq START WITH 1 INCREMENT BY 1 NOCYCLE;

-- Usage
INSERT INTO product_images (sort_order, ...) VALUES (NEXT VALUE FOR image_sort_seq, ...);
```

**Step 2: Test**
```bash
docker exec -it $(docker compose ps -q mariadb) mariadb -u test -ptest testdb -e "SHOW TABLES;"
docker exec -it $(docker compose ps -q mariadb) mariadb -u test -ptest testdb -e "SELECT * FROM information_schema.SEQUENCES;"
```

**Step 3: Commit**
```bash
git add scripts/test-db/init/mariadb/init.sql
git commit -m "feat(testdb): rewrite mariadb init with 28 tables, sequences, and all design elements"
```

---

### Task 1.4: SQLite init.sql

**Files:**
- Create: `scripts/test-db/init/sqlite/init.sql`

**Step 1: Write SQLite init script**

SQLite supports: Table, View, Trigger, Index, PK, FK, UK, CHECK, NOT NULL, DEFAULT.
No: Routines, Events, Custom Types, Sequences, Partitioning, Security, Advanced.
~20 tables (skip spatial/partition-dependent tables).

```sql
-- Enable FK support
PRAGMA foreign_keys = ON;

-- Tables use INTEGER PRIMARY KEY AUTOINCREMENT (not UUID)
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  age INTEGER CHECK(age >= 0 AND age < 200),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Views
CREATE VIEW v_user_summary AS
  SELECT u.id, u.first_name || ' ' || u.last_name AS full_name, u.email,
    COUNT(o.id) AS order_count
  FROM users u LEFT JOIN orders o ON o.user_id = u.id
  GROUP BY u.id;

-- Triggers (BEFORE/AFTER only, no INSTEAD OF on tables)
CREATE TRIGGER trg_users_updated_at
  AFTER UPDATE ON users
  FOR EACH ROW
  BEGIN
    UPDATE users SET updated_at = datetime('now') WHERE id = NEW.id;
  END;

-- Indexes (B-Tree only)
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE UNIQUE INDEX idx_users_email ON users(email);
```

**Step 2: Test** (manual or via app's SQLite connection)

**Step 3: Commit**
```bash
git add scripts/test-db/init/sqlite/init.sql
git commit -m "feat(testdb): add sqlite init with 20 tables, views, triggers, and indexes"
```

---

## Phase 2: Type System + Service Extension

### Task 2.1: Extend types in db.ts

**Files:**
- Modify: `src/shared/types/db.ts`

**Step 1: Add new type values to TSchemaObjectType**

At line ~9, extend:
```typescript
export type TSchemaObjectType =
  | 'table' | 'view' | 'materialized_view'
  | 'function' | 'procedure' | 'trigger' | 'event'
  | 'type' | 'sequence' | 'index'
  // New categories 8-10
  | 'partition' | 'role' | 'policy' | 'grant'
  | 'extension' | 'schema' | 'foreign_table'
  | 'tablespace' | 'collation' | 'domain';
```

**Step 2: Add new interfaces after existing ones (~line 88)**

```typescript
// --- Category 8: Partitioning ---
export interface IPartitionEntry {
  name: string;
  bound?: string;
  values?: string[];
  modulus?: number;
  remainder?: number;
}

export interface IPartition {
  name: string;
  tableName: string;
  strategy: 'range' | 'list' | 'hash';
  expression: string;
  partitions: IPartitionEntry[];
  comment?: string;
}

// --- Category 9: Security ---
export interface IRole {
  name: string;
  isLogin: boolean;
  isSuperuser: boolean;
  inherits: boolean;
  memberOf: string[];
  comment?: string;
}

export interface IRlsPolicy {
  name: string;
  tableName: string;
  command: 'ALL' | 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE';
  roles: string[];
  using?: string;
  withCheck?: string;
  comment?: string;
}

export interface IGrant {
  objectType: 'table' | 'schema' | 'function' | 'sequence';
  objectName: string;
  grantee: string;
  privileges: string[];
  withGrantOption: boolean;
}

// --- Category 10: Advanced ---
export interface IExtension {
  name: string;
  version?: string;
  schema?: string;
  comment?: string;
}

export interface IForeignTable {
  name: string;
  serverName: string;
  columns: IColumn[];
  options: Record<string, string>;
  comment?: string;
}

export interface ISchemaNamespace {
  name: string;
  owner?: string;
  comment?: string;
}

export interface ITablespace {
  name: string;
  location?: string;
  options?: Record<string, string>;
  comment?: string;
}

export interface ICollationDef {
  name: string;
  provider: 'icu' | 'libc';
  locale?: string;
  comment?: string;
}
```

**Step 3: Extend ISchemaObjects**

```typescript
export interface ISchemaObjects {
  // Existing
  tables: ITable[];
  views: ISchemaView[];
  functions: IRoutine[];
  procedures: IRoutine[];
  triggers: ITrigger[];
  events: IDbEvent[];
  types: ICustomType[];
  sequences: ISequence[];
  indexes: ISchemaIndex[];
  // New
  partitions: IPartition[];
  roles: IRole[];
  policies: IRlsPolicy[];
  grants: IGrant[];
  extensions: IExtension[];
  schemas: ISchemaNamespace[];
  foreignTables: IForeignTable[];
  tablespaces: ITablespace[];
  collations: ICollationDef[];
}
```

**Step 4: Extend DIALECT_INFO**

```typescript
postgresql: {
  supportedObjects: [
    'table', 'view', 'materialized_view', 'index',
    'function', 'procedure', 'trigger', 'type', 'sequence',
    'partition', 'role', 'policy', 'grant',
    'extension', 'schema', 'foreign_table', 'tablespace', 'collation', 'domain',
  ],
},
mysql: {
  supportedObjects: [
    'table', 'view', 'index',
    'function', 'procedure', 'trigger', 'event',
    'partition', 'role', 'grant', 'collation',
  ],
},
mariadb: {
  supportedObjects: [
    'table', 'view', 'index',
    'function', 'procedure', 'trigger', 'event', 'sequence',
    'partition', 'role', 'grant', 'collation',
  ],
},
sqlite: {
  supportedObjects: ['table', 'view', 'index', 'trigger'],
},
```

**Step 5: Extend SCHEMA_OBJECT_CATEGORIES**

```typescript
export const SCHEMA_OBJECT_CATEGORIES = [
  { id: 'core', label: 'Core', types: ['table', 'view', 'materialized_view', 'index'] },
  { id: 'routines', label: 'Routines', types: ['procedure', 'function', 'trigger', 'event'] },
  { id: 'definitions', label: 'Definitions', types: ['type', 'sequence', 'domain'] },
  { id: 'partitioning', label: 'Partitioning', types: ['partition'] },
  { id: 'security', label: 'Security', types: ['role', 'policy', 'grant'] },
  { id: 'advanced', label: 'Advanced', types: ['extension', 'schema', 'foreign_table', 'tablespace', 'collation'] },
];
```

**Step 6: Run type check**
```bash
npx tsc --noEmit
```
Expected: Errors in schemaObjectsService.ts and ObjectTree.tsx (missing new type handling) — that's okay, fixed in next tasks.

**Step 7: Commit**
```bash
git add src/shared/types/db.ts
git commit -m "feat(types): extend schema object types for partitioning, security, and advanced categories"
```

---

### Task 2.2: Extend schemaObjectsService.ts

**Files:**
- Modify: `src/main/services/schemaObjectsService.ts`

**Step 1: Add PostgreSQL fetch functions for new types**

Follow existing pattern (e.g., `fetchPostgresqlViews`). Add after existing PG functions:

```typescript
// --- Partitions ---
async function fetchPostgresqlPartitions(conn: any): Promise<IPartition[]> {
  const result = await conn.query(`
    SELECT
      c.relname AS table_name,
      pt.partstrat AS strategy,
      pg_get_expr(pt.partexprs, pt.partrelid) AS expression,
      (
        SELECT json_agg(json_build_object(
          'name', child.relname,
          'bound', pg_get_expr(child_bound.relpartbound, child_bound.oid)
        ))
        FROM pg_class child
        JOIN pg_inherits inh ON inh.inhrelid = child.oid
        WHERE inh.inhparent = c.oid
      ) AS partitions
    FROM pg_partitioned_table pt
    JOIN pg_class c ON c.oid = pt.partrelid
    WHERE c.relnamespace = 'public'::regnamespace
  `);
  return result.rows.map((row: any) => ({
    name: row.table_name + '_partitioning',
    tableName: row.table_name,
    strategy: ({ r: 'range', l: 'list', h: 'hash' } as const)[row.strategy] ?? 'range',
    expression: row.expression ?? '',
    partitions: (row.partitions ?? []).map((p: any) => ({
      name: p.name,
      bound: p.bound,
    })),
  }));
}

// --- Roles ---
async function fetchPostgresqlRoles(conn: any): Promise<IRole[]> {
  const result = await conn.query(`
    SELECT rolname, rolcanlogin, rolsuper, rolinherit,
      ARRAY(SELECT b.rolname FROM pg_auth_members m JOIN pg_roles b ON m.roleid = b.oid WHERE m.member = r.oid) AS member_of
    FROM pg_roles r
    WHERE rolname NOT LIKE 'pg_%' AND rolname != 'postgres'
    ORDER BY rolname
  `);
  return result.rows.map((row: any) => ({
    name: row.rolname,
    isLogin: row.rolcanlogin,
    isSuperuser: row.rolsuper,
    inherits: row.rolinherit,
    memberOf: row.member_of ?? [],
  }));
}

// --- RLS Policies ---
async function fetchPostgresqlPolicies(conn: any): Promise<IRlsPolicy[]> {
  const result = await conn.query(`
    SELECT pol.polname AS name, cls.relname AS table_name,
      CASE pol.polcmd WHEN 'r' THEN 'SELECT' WHEN 'a' THEN 'INSERT' WHEN 'w' THEN 'UPDATE' WHEN 'd' THEN 'DELETE' ELSE 'ALL' END AS command,
      ARRAY(SELECT rolname FROM pg_roles WHERE oid = ANY(pol.polroles)) AS roles,
      pg_get_expr(pol.polqual, pol.polrelid) AS using_expr,
      pg_get_expr(pol.polwithcheck, pol.polrelid) AS with_check
    FROM pg_policy pol
    JOIN pg_class cls ON cls.oid = pol.polrelid
    WHERE cls.relnamespace = 'public'::regnamespace
  `);
  return result.rows.map((row: any) => ({
    name: row.name,
    tableName: row.table_name,
    command: row.command,
    roles: row.roles ?? [],
    using: row.using_expr,
    withCheck: row.with_check,
  }));
}

// --- Grants ---
async function fetchPostgresqlGrants(conn: any): Promise<IGrant[]> {
  const result = await conn.query(`
    SELECT table_schema || '.' || table_name AS object_name, grantee, privilege_type, is_grantable
    FROM information_schema.table_privileges
    WHERE table_schema = 'public' AND grantee NOT IN ('postgres', 'PUBLIC')
    ORDER BY grantee, table_name
  `);
  // Group by grantee + object
  const grouped = new Map<string, IGrant>();
  for (const row of result.rows) {
    const key = `${row.grantee}:${row.object_name}`;
    if (!grouped.has(key)) {
      grouped.set(key, {
        objectType: 'table',
        objectName: row.object_name,
        grantee: row.grantee,
        privileges: [],
        withGrantOption: false,
      });
    }
    const g = grouped.get(key)!;
    g.privileges.push(row.privilege_type);
    if (row.is_grantable === 'YES') g.withGrantOption = true;
  }
  return [...grouped.values()];
}

// --- Extensions ---
async function fetchPostgresqlExtensions(conn: any): Promise<IExtension[]> {
  const result = await conn.query(`
    SELECT extname, extversion, nspname AS schema_name, obj_description(e.oid, 'pg_extension') AS comment
    FROM pg_extension e JOIN pg_namespace n ON n.oid = e.extnamespace
    WHERE extname != 'plpgsql'
    ORDER BY extname
  `);
  return result.rows.map((row: any) => ({
    name: row.extname,
    version: row.extversion,
    schema: row.schema_name,
    comment: row.comment,
  }));
}

// --- Schemas ---
async function fetchPostgresqlSchemas(conn: any): Promise<ISchemaNamespace[]> {
  const result = await conn.query(`
    SELECT nspname, pg_get_userbyid(nspowner) AS owner, obj_description(oid, 'pg_namespace') AS comment
    FROM pg_namespace
    WHERE nspname NOT LIKE 'pg_%' AND nspname != 'information_schema'
    ORDER BY nspname
  `);
  return result.rows.map((row: any) => ({
    name: row.nspname,
    owner: row.owner,
    comment: row.comment,
  }));
}

// --- Foreign Tables ---
async function fetchPostgresqlForeignTables(conn: any): Promise<IForeignTable[]> {
  const result = await conn.query(`
    SELECT ft.foreign_table_name AS name, ft.foreign_server_name AS server_name
    FROM information_schema.foreign_tables ft
    WHERE ft.foreign_table_schema = 'public'
  `);
  return result.rows.map((row: any) => ({
    name: row.name,
    serverName: row.server_name,
    columns: [],
    options: {},
  }));
}

// --- Tablespaces ---
async function fetchPostgresqlTablespaces(conn: any): Promise<ITablespace[]> {
  const result = await conn.query(`
    SELECT spcname AS name, pg_tablespace_location(oid) AS location
    FROM pg_tablespace
    WHERE spcname NOT IN ('pg_default', 'pg_global')
  `);
  return result.rows.map((row: any) => ({
    name: row.name,
    location: row.location,
  }));
}

// --- Collations ---
async function fetchPostgresqlCollations(conn: any): Promise<ICollationDef[]> {
  const result = await conn.query(`
    SELECT collname AS name,
      CASE collprovider WHEN 'i' THEN 'icu' WHEN 'c' THEN 'libc' ELSE 'libc' END AS provider,
      colliculocale AS locale
    FROM pg_collation
    WHERE collnamespace = 'public'::regnamespace
  `);
  return result.rows.map((row: any) => ({
    name: row.name,
    provider: row.provider,
    locale: row.locale,
  }));
}
```

**Step 2: Add MySQL/MariaDB fetch functions**

```typescript
// --- MySQL Partitions ---
async function fetchMysqlPartitions(conn: any, dbName: string): Promise<IPartition[]> {
  const result = await conn.query(`
    SELECT TABLE_NAME, PARTITION_METHOD, PARTITION_EXPRESSION,
      PARTITION_NAME, PARTITION_DESCRIPTION
    FROM information_schema.PARTITIONS
    WHERE TABLE_SCHEMA = ? AND PARTITION_NAME IS NOT NULL
    ORDER BY TABLE_NAME, PARTITION_ORDINAL_POSITION
  `, [dbName]);
  const grouped = new Map<string, IPartition>();
  for (const row of result) {
    const key = row.TABLE_NAME;
    if (!grouped.has(key)) {
      grouped.set(key, {
        name: key + '_partitioning',
        tableName: key,
        strategy: (row.PARTITION_METHOD ?? 'RANGE').toLowerCase() as any,
        expression: row.PARTITION_EXPRESSION ?? '',
        partitions: [],
      });
    }
    grouped.get(key)!.partitions.push({
      name: row.PARTITION_NAME,
      bound: row.PARTITION_DESCRIPTION,
    });
  }
  return [...grouped.values()];
}

// --- MySQL Roles ---
async function fetchMysqlRoles(conn: any): Promise<IRole[]> {
  try {
    const result = await conn.query(`SELECT user AS name, host FROM mysql.user WHERE host = '%' AND user NOT LIKE 'mysql.%'`);
    return result.map((row: any) => ({
      name: row.name,
      isLogin: true,
      isSuperuser: false,
      inherits: true,
      memberOf: [],
    }));
  } catch { return []; }
}

// --- MySQL Grants ---
async function fetchMysqlGrants(conn: any, dbName: string): Promise<IGrant[]> {
  const result = await conn.query(`
    SELECT GRANTEE, TABLE_NAME, PRIVILEGE_TYPE, IS_GRANTABLE
    FROM information_schema.TABLE_PRIVILEGES
    WHERE TABLE_SCHEMA = ?
  `, [dbName]);
  const grouped = new Map<string, IGrant>();
  for (const row of result) {
    const key = `${row.GRANTEE}:${row.TABLE_NAME}`;
    if (!grouped.has(key)) {
      grouped.set(key, {
        objectType: 'table',
        objectName: row.TABLE_NAME,
        grantee: row.GRANTEE.replace(/'/g, ''),
        privileges: [],
        withGrantOption: false,
      });
    }
    const g = grouped.get(key)!;
    g.privileges.push(row.PRIVILEGE_TYPE);
    if (row.IS_GRANTABLE === 'YES') g.withGrantOption = true;
  }
  return [...grouped.values()];
}

// --- MySQL Collations ---
async function fetchMysqlCollations(conn: any): Promise<ICollationDef[]> {
  const result = await conn.query(`
    SELECT COLLATION_NAME AS name FROM information_schema.COLLATIONS
    WHERE IS_DEFAULT = 'Yes' AND COLLATION_NAME NOT LIKE 'utf8%'
    LIMIT 20
  `);
  return result.map((row: any) => ({
    name: row.name,
    provider: 'libc' as const,
  }));
}
```

**Step 3: Wire new functions into fetchObjects**

In the main `fetchObjects` function, add cases following the existing pattern:
```typescript
if (shouldFetch('partition')) {
  try { objects.partitions = await fetchPostgresqlPartitions(conn); }
  catch { objects.partitions = []; }
}
// ... repeat for each new type
```

**Step 4: Run type check and test**
```bash
npx tsc --noEmit
```

**Step 5: Commit**
```bash
git add src/main/services/schemaObjectsService.ts
git commit -m "feat(service): extend schemaObjectsService with partitioning, security, and advanced object fetching"
```

---

### Task 2.3: Update ObjectTree component

**Files:**
- Modify: `src/renderer/shared/ui/ObjectTree.tsx`

**Step 1: Add icons and labels for new types**

At line ~29, extend OBJECT_ICONS:
```typescript
import {
  Table2, Eye, Code, Workflow, Zap, Calendar, Type, Hash, List,
  // New icons
  Layers, Shield, Lock, Key, Puzzle, FolderOpen, Globe, HardDrive, Languages, CircleDot,
} from 'lucide-react';

const OBJECT_ICONS: Record<TSchemaObjectType, React.ElementType> = {
  // existing...
  partition: Layers,
  role: Shield,
  policy: Lock,
  grant: Key,
  extension: Puzzle,
  schema: FolderOpen,
  foreign_table: Globe,
  tablespace: HardDrive,
  collation: Languages,
  domain: CircleDot,
};

const TYPE_LABELS: Record<TSchemaObjectType, string> = {
  // existing...
  partition: 'Partitions',
  role: 'Roles',
  policy: 'Policies',
  grant: 'Grants',
  extension: 'Extensions',
  schema: 'Schemas',
  foreign_table: 'Foreign Tables',
  tablespace: 'Tablespaces',
  collation: 'Collations',
  domain: 'Domains',
};
```

**Step 2: Run type check**
```bash
npx tsc --noEmit
```

**Step 3: Commit**
```bash
git add src/renderer/shared/ui/ObjectTree.tsx
git commit -m "feat(ui): add icons and labels for new schema object types in ObjectTree"
```

---

## Phase 3: Reference Tab UI

### Task 3.1: Create Reference feature module structure

**Files:**
- Create: `src/renderer/features/db-reference/model/types.ts`
- Create: `src/renderer/features/db-reference/index.ts`

**Step 1: Create types**

```typescript
// src/renderer/features/db-reference/model/types.ts
import type { TDbType } from '~/shared/types/db';

export interface IReferenceItem {
  id: string;
  category: string;
  name: string;
  summary: string;
  description: string;
  syntax: Partial<Record<TDbType, string | null>>;
  vendorSupport: Record<TDbType, {
    supported: boolean;
    level: 'full' | 'partial' | 'none';
    notes?: string;
  }>;
  tips?: string[];
  relatedItems?: string[];
  seeAlso?: string[];
}

export interface IReferenceCategory {
  id: string;
  label: string;
  items: IReferenceItem[];
}
```

**Step 2: Create barrel export**

```typescript
// src/renderer/features/db-reference/index.ts
export { ReferencePage } from './ui/ReferencePage';
export type { IReferenceItem, IReferenceCategory } from './model/types';
```

**Step 3: Commit**
```bash
git add src/renderer/features/db-reference/
git commit -m "feat(reference): create db-reference feature module with types"
```

---

### Task 3.2: Create Reference JSON data files (10 files)

**Files:**
- Create: `src/renderer/features/db-reference/data/table-column.json`
- Create: `src/renderer/features/db-reference/data/constraints.json`
- Create: `src/renderer/features/db-reference/data/indexes.json`
- Create: `src/renderer/features/db-reference/data/views.json`
- Create: `src/renderer/features/db-reference/data/routines.json`
- Create: `src/renderer/features/db-reference/data/triggers-events.json`
- Create: `src/renderer/features/db-reference/data/types-sequences.json`
- Create: `src/renderer/features/db-reference/data/partitioning.json`
- Create: `src/renderer/features/db-reference/data/security.json`
- Create: `src/renderer/features/db-reference/data/advanced.json`

Each file contains an array of `IReferenceItem` objects. Example for constraints.json:

```json
[
  {
    "id": "pk",
    "category": "constraints",
    "name": "PRIMARY KEY",
    "summary": "Uniquely identifies each row in a table",
    "description": "A PRIMARY KEY constraint uniquely identifies each record in a table. It must contain UNIQUE values and cannot contain NULL. A table can have only one primary key, which can consist of single or multiple columns (composite key).",
    "syntax": {
      "postgresql": "CREATE TABLE users (\n  id UUID PRIMARY KEY DEFAULT uuid_generate_v4()\n);\n-- or\nALTER TABLE users ADD CONSTRAINT pk_users PRIMARY KEY (id);",
      "mysql": "CREATE TABLE users (\n  id INT AUTO_INCREMENT PRIMARY KEY\n);\n-- or\nALTER TABLE users ADD PRIMARY KEY (id);",
      "mariadb": "CREATE TABLE users (\n  id INT AUTO_INCREMENT PRIMARY KEY\n);\n-- or\nALTER TABLE users ADD PRIMARY KEY (id);",
      "sqlite": "CREATE TABLE users (\n  id INTEGER PRIMARY KEY AUTOINCREMENT\n);"
    },
    "vendorSupport": {
      "postgresql": { "supported": true, "level": "full" },
      "mysql": { "supported": true, "level": "full" },
      "mariadb": { "supported": true, "level": "full" },
      "sqlite": { "supported": true, "level": "full" }
    },
    "tips": [
      "Use surrogate keys (auto-increment or UUID) for most tables",
      "Composite primary keys are useful for M:N junction tables",
      "In PostgreSQL, UUID is preferred over SERIAL for distributed systems"
    ],
    "relatedItems": ["fk", "uk", "composite-key"]
  }
]
```

Write all ~66 items across the 10 files, each with beginner-friendly descriptions, vendor-specific syntax, and practical tips.

**Step 2: Commit**
```bash
git add src/renderer/features/db-reference/data/
git commit -m "feat(reference): add 66 reference items across 10 category data files"
```

---

### Task 3.3: Create Reference UI components

**Files:**
- Create: `src/renderer/features/db-reference/ui/ReferenceSidebar.tsx`
- Create: `src/renderer/features/db-reference/ui/ReferenceDetail.tsx`
- Create: `src/renderer/features/db-reference/ui/ReferencePage.tsx`

**Step 1: ReferenceSidebar**

Left panel with collapsible categories and item list:
```typescript
// src/renderer/features/db-reference/ui/ReferenceSidebar.tsx
import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import type { IReferenceCategory } from '../model/types';

interface ReferenceSidebarProps {
  categories: IReferenceCategory[];
  selectedItemId: string | null;
  onSelect: (itemId: string) => void;
}

export function ReferenceSidebar({ categories, selectedItemId, onSelect }: ReferenceSidebarProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(categories.map((c) => c.id))
  );

  function toggleCategory(id: string) {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="w-56 shrink-0 overflow-y-auto border-r border-border p-2">
      {categories.map((cat) => (
        <div key={cat.id} className="mb-1">
          <button
            type="button"
            className="flex w-full items-center gap-1 rounded px-2 py-1 text-xs font-semibold text-muted-foreground hover:bg-muted"
            onClick={() => toggleCategory(cat.id)}
          >
            {expandedCategories.has(cat.id) ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
            {cat.label}
            <span className="ml-auto text-[10px] text-muted-foreground/60">{cat.items.length}</span>
          </button>
          {expandedCategories.has(cat.id) && (
            <div className="ml-4">
              {cat.items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={cn(
                    'block w-full rounded px-2 py-0.5 text-left text-xs',
                    selectedItemId === item.id ? 'bg-accent text-accent-foreground' : 'text-foreground hover:bg-muted',
                  )}
                  onClick={() => onSelect(item.id)}
                >
                  {item.name}
                </button>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
```

**Step 2: ReferenceDetail**

Right panel showing description, syntax tabs per vendor, vendor support table, and tips:
```typescript
// src/renderer/features/db-reference/ui/ReferenceDetail.tsx
import { useState } from 'react';
import { Check, X, Minus } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import type { IReferenceItem } from '../model/types';
import type { TDbType } from '~/shared/types/db';

const DB_LABELS: Record<TDbType, string> = {
  postgresql: 'PostgreSQL',
  mysql: 'MySQL',
  mariadb: 'MariaDB',
  sqlite: 'SQLite',
};

const LEVEL_ICONS = {
  full: <Check className="size-3.5 text-green-500" />,
  partial: <Minus className="size-3.5 text-yellow-500" />,
  none: <X className="size-3.5 text-red-400" />,
};

interface ReferenceDetailProps {
  item: IReferenceItem;
}

export function ReferenceDetail({ item }: ReferenceDetailProps) {
  const dbTypes = Object.keys(item.syntax).filter((k) => item.syntax[k as TDbType] != null) as TDbType[];
  const [activeDb, setActiveDb] = useState<TDbType>(dbTypes[0] ?? 'postgresql');

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {/* Header */}
      <div>
        <h2 className="text-lg font-bold">{item.name}</h2>
        <p className="text-sm text-muted-foreground">{item.summary}</p>
      </div>

      {/* Description */}
      <div className="text-sm leading-relaxed whitespace-pre-wrap">{item.description}</div>

      {/* Syntax */}
      {dbTypes.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-1">Syntax</h3>
          <div className="flex gap-1 mb-2">
            {dbTypes.map((db) => (
              <button
                key={db}
                type="button"
                className={cn(
                  'px-2 py-0.5 text-xs rounded',
                  activeDb === db ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80',
                )}
                onClick={() => setActiveDb(db)}
              >
                {DB_LABELS[db]}
              </button>
            ))}
          </div>
          <pre className="rounded bg-muted p-3 text-xs overflow-x-auto">
            <code>{item.syntax[activeDb]}</code>
          </pre>
        </div>
      )}

      {/* Vendor Support */}
      <div>
        <h3 className="text-sm font-semibold mb-1">Vendor Support</h3>
        <table className="w-full text-xs">
          <tbody>
            {(Object.keys(DB_LABELS) as TDbType[]).map((db) => {
              const support = item.vendorSupport[db];
              return (
                <tr key={db} className="border-b border-border last:border-0">
                  <td className="py-1 font-medium w-28">{DB_LABELS[db]}</td>
                  <td className="py-1 w-8">{LEVEL_ICONS[support.level]}</td>
                  <td className="py-1 capitalize text-muted-foreground">{support.level}</td>
                  <td className="py-1 text-muted-foreground/60">{support.notes}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Tips */}
      {item.tips && item.tips.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-1">Tips</h3>
          <ul className="list-disc list-inside text-xs text-muted-foreground space-y-0.5">
            {item.tips.map((tip, i) => <li key={i}>{tip}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}
```

**Step 3: ReferencePage**

Main page composing sidebar + detail:
```typescript
// src/renderer/features/db-reference/ui/ReferencePage.tsx
import { useState, useMemo } from 'react';
import { ReferenceSidebar } from './ReferenceSidebar';
import { ReferenceDetail } from './ReferenceDetail';
import type { IReferenceCategory } from '../model/types';

// Import all data files
import tableColumnData from '../data/table-column.json';
import constraintsData from '../data/constraints.json';
import indexesData from '../data/indexes.json';
import viewsData from '../data/views.json';
import routinesData from '../data/routines.json';
import triggersEventsData from '../data/triggers-events.json';
import typesSequencesData from '../data/types-sequences.json';
import partitioningData from '../data/partitioning.json';
import securityData from '../data/security.json';
import advancedData from '../data/advanced.json';

const categories: IReferenceCategory[] = [
  { id: 'table-column', label: '1. Table & Column', items: tableColumnData },
  { id: 'constraints', label: '2. Constraints', items: constraintsData },
  { id: 'indexes', label: '3. Indexes', items: indexesData },
  { id: 'views', label: '4. Views', items: viewsData },
  { id: 'routines', label: '5. Routines', items: routinesData },
  { id: 'triggers-events', label: '6. Triggers & Events', items: triggersEventsData },
  { id: 'types-sequences', label: '7. Types & Sequences', items: typesSequencesData },
  { id: 'partitioning', label: '8. Partitioning', items: partitioningData },
  { id: 'security', label: '9. Security', items: securityData },
  { id: 'advanced', label: '10. Advanced', items: advancedData },
];

export function ReferencePage() {
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  const allItems = useMemo(() => categories.flatMap((c) => c.items), []);
  const selectedItem = allItems.find((item) => item.id === selectedItemId) ?? null;

  return (
    <div className="flex h-full">
      <ReferenceSidebar
        categories={categories}
        selectedItemId={selectedItemId}
        onSelect={setSelectedItemId}
      />
      {selectedItem ? (
        <ReferenceDetail item={selectedItem} />
      ) : (
        <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
          Select an item to view details
        </div>
      )}
    </div>
  );
}
```

**Step 4: Commit**
```bash
git add src/renderer/features/db-reference/ui/
git commit -m "feat(reference): create ReferencePage, ReferenceSidebar, ReferenceDetail UI components"
```

---

### Task 3.4: Add Reference route and tab

**Files:**
- Modify: `src/renderer/shared/config/constants.ts` (~line 20)
- Modify: `src/renderer/app/layouts/LiveConsoleLayout.tsx`
- Modify: `src/renderer/app/routes/index.tsx` (~line 49)
- Create: `src/renderer/pages/db-reference/index.ts`
- Create: `src/renderer/pages/db-reference/ui/DbReferencePage.tsx`

**Step 1: Add route constant**

In `constants.ts`, add to LIVE_CONSOLE:
```typescript
REFERENCE: '/db/console/reference',
```

**Step 2: Create page wrapper**

```typescript
// src/renderer/pages/db-reference/ui/DbReferencePage.tsx
import { ReferencePage } from '@/features/db-reference';

export function DbReferencePage() {
  return <ReferencePage />;
}
```

```typescript
// src/renderer/pages/db-reference/index.ts
export { DbReferencePage } from './ui/DbReferencePage';
```

**Step 3: Add route**

In `routes/index.tsx`, inside `<Route path="console">`:
```typescript
<Route path="reference" element={<DbReferencePage />} />
```

**Step 4: Add tab**

In `LiveConsoleLayout.tsx`, add to tabs array:
```typescript
import { BookOpen } from 'lucide-react';
// ...
{ id: 'reference', label: 'Reference', icon: BookOpen, path: ROUTES.DB.LIVE_CONSOLE.REFERENCE },
```

**Step 5: Run type check**
```bash
npx tsc --noEmit
```

**Step 6: Commit**
```bash
git add src/renderer/shared/config/constants.ts src/renderer/app/layouts/LiveConsoleLayout.tsx src/renderer/app/routes/index.tsx src/renderer/pages/db-reference/
git commit -m "feat(reference): add Reference tab to Live Console with routing"
```

---

## Phase 4: Integration

### Task 4.1: Verify end-to-end flow

**Step 1: Start test DBs**
```bash
cd scripts/test-db && docker compose down -v && docker compose up -d
```

**Step 2: Verify each DB script runs cleanly**
```bash
# PostgreSQL
docker exec -it $(docker compose ps -q postgresql) psql -U test -d testdb -c '\dt' -c '\dT+' -c '\df' -c '\dv' -c '\di'

# MySQL
docker exec -it $(docker compose ps -q mysql) mysql -u test -ptest testdb -e "SHOW TABLES; SHOW EVENTS; SHOW FUNCTION STATUS WHERE Db='testdb'; SHOW TRIGGERS;"

# MariaDB
docker exec -it $(docker compose ps -q mariadb) mariadb -u test -ptest testdb -e "SHOW TABLES; SELECT * FROM information_schema.SEQUENCES WHERE SEQUENCE_SCHEMA='testdb';"
```

**Step 3: Run app, connect to test DBs, verify:**
- Explorer tab shows all new schema object categories
- New objects (partitions, roles, policies, extensions, etc.) appear in ObjectTree
- Reference tab renders with all 66 items
- Vendor-specific syntax and support tables display correctly

**Step 4: Run type check**
```bash
npx tsc --noEmit
```

**Step 5: Final commit**
```bash
git add -A
git commit -m "feat(testdb): complete integration of enriched test databases and reference UI"
```

---

## Summary

| Phase | Tasks | New Files | Modified Files | Commits |
|-------|-------|-----------|----------------|---------|
| 1 | 4 (SQL scripts) | 1 | 3 | 4 |
| 2 | 3 (types + service + ObjectTree) | 0 | 3 | 3 |
| 3 | 4 (feature + data + UI + routing) | ~18 | 3 | 4 |
| 4 | 1 (integration) | 0 | 0 | 1 |
| **Total** | **12** | **~19** | **~9** | **12** |
