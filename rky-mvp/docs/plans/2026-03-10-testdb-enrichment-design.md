# TestDB Enrichment & DB Reference Design

## Status
Accepted (2026-03-10)

## Context
Current testdb only has 2 simple tables (sample_users, sample_posts). The app's type system and services already support 10 schema object types, but there's no test data to verify them. Additionally, categories 8-10 (Partitioning, Security, Advanced) have no type definitions at all.

### Goals
1. Enrich testdb with 25+ tables covering ALL DB design elements across PostgreSQL, MySQL, MariaDB, SQLite
2. Extend type system and services for missing categories (8-10)
3. Build an in-app Reference tab as a DB design element encyclopedia for beginners
4. Cover all FK referential actions (CASCADE, SET NULL, RESTRICT, NO ACTION, SET DEFAULT) on both DELETE and UPDATE

---

## Section 1: TestDB Schema Structure (28 Tables)

### Table List

| # | Table | Key Design Elements |
|---|-------|-------------------|
| 1 | users | PK, UK(email), CHECK(age), NOT NULL, DEFAULT, Comment, Generated Column |
| 2 | user_profiles | 1:1 (FK → users), JSONB/JSON column |
| 3 | roles | PK, UK(name), Enum reference |
| 4 | user_roles | M:N (Composite PK), FK × 2 |
| 5 | organizations | Self-referencing FK (parent_org_id) |
| 6 | org_members | M:N (users ↔ organizations), CHECK |
| 7 | categories | Self-referencing FK (parent_id), hierarchy |
| 8 | products | FK → categories, Fulltext Index, JSONB(metadata) |
| 9 | product_variants | FK → products, Composite UK(product_id + sku) |
| 10 | product_images | FK → products, DEFAULT ordering, Sequence(PG) |
| 11 | product_tags | M:N, Composite PK |
| 12 | tags | PK, UK(name) |
| 13 | orders | FK → users, Partition target (created_at) |
| 14 | order_items | FK → orders + product_variants, CHECK(quantity > 0) |
| 15 | payments | FK → orders, Enum(status), Partial Index |
| 16 | shipping_addresses | FK → users, DEFAULT flag |
| 17 | warehouses | PK, Spatial data (location) |
| 18 | inventory | FK → product_variants + warehouses, UK, CHECK(qty >= 0) |
| 19 | inventory_log | FK → inventory, Trigger auto-record, Partition(date) |
| 20 | posts | FK → users, Fulltext Index, Materialized View source |
| 21 | comments | FK → posts + users, Self-referencing (parent_comment_id) |
| 22 | notifications | FK → users, Partition(created_at) |
| 23 | audit_logs | Trigger auto-record, Partition, RLS target |
| 24 | settings | Key-Value pattern, Domain type(PG) |
| 25 | scheduled_jobs | Event(MySQL) / pg_cron reference |
| 26 | api_keys | FK → users, UK, Expression Index(hash) |
| 27 | file_uploads | FK → users, DEFAULT(uuid) |
| 28 | migrations | Version management, UK(version) |

### Relationship Patterns

| Pattern | Example |
|---------|---------|
| 1:1 | users ↔ user_profiles |
| 1:N | users → orders, categories → products |
| M:N | users ↔ roles (via user_roles), products ↔ tags |
| Self-referencing | categories.parent_id, comments.parent_comment_id, organizations.parent_org_id |

### FK Referential Actions Coverage

| Table.Column → Reference | ON DELETE | ON UPDATE |
|--------------------------|-----------|-----------|
| order_items → orders | CASCADE | CASCADE |
| products → categories | SET NULL | CASCADE |
| orders → users | RESTRICT | CASCADE |
| comments → posts | CASCADE | NO ACTION |
| org_members → organizations | CASCADE | CASCADE |
| payments → orders | RESTRICT | RESTRICT |
| shipping_addresses → users | CASCADE | NO ACTION |
| product_variants → products | CASCADE | CASCADE |
| inventory → warehouses | RESTRICT | CASCADE |
| notifications → users | SET DEFAULT | CASCADE |
| comments → comments (self) | SET NULL | NO ACTION |

All 5 actions (CASCADE, SET NULL, RESTRICT, NO ACTION, SET DEFAULT) covered on both DELETE and UPDATE at least once.

---

## Section 2: Vendor-Specific SQL Scripts

### File Structure

```
scripts/test-db/init/
├── postgresql/init.sql   ← Most comprehensive (all 10 categories)
├── mysql/init.sql        ← 8 categories (limited Type/Sequence/Advanced)
├── mariadb/init.sql      ← Similar to MySQL + Sequence
└── sqlite/init.sql       ← Basic only (Table, View, Trigger, Index)
```

### Vendor Coverage Matrix

| Category | PostgreSQL | MySQL | MariaDB | SQLite |
|----------|-----------|-------|---------|--------|
| 1. 28 Tables + Columns | All | All | All | 20 (no Partition/Spatial) |
| 2. Constraints (FK 5 actions) | All + EXCLUDE | All | All | PK, FK, UK, CHECK |
| 3. Index (9 types) | All | B-Tree, Hash, Fulltext, Spatial, Composite | Same as MySQL | B-Tree only |
| 4. View (4 types) | All | Regular, Updatable, CHECK OPTION | Same as MySQL | Regular only |
| 5. Routine | Function, Procedure (PL/pgSQL) | Function, Procedure (SQL) | Same as MySQL | None |
| 6. Trigger & Event | Row/Statement, BEFORE/AFTER/INSTEAD OF | Row, BEFORE/AFTER + Event | Same as MySQL | BEFORE/AFTER only |
| 7. Type & Sequence | Enum, Composite, Domain, Range, Sequence | Column-level ENUM, SET | ENUM, SET + Sequence | None |
| 8. Partitioning | Range, List, Hash (Declarative) | Range, List, Hash, Sub-partition | Same as MySQL | None |
| 9. Security | Role, RLS, Policy, Grant | Role, Grant | Same as MySQL | None |
| 10. Advanced | Schema, Extension, FDW, Tablespace, Collation | Plugin(ref only), Collation | Same as MySQL | None |

### SQL Script Internal Order

```sql
-- 0. Extensions / Plugins / Schema setup
-- 1. Custom Types (Enum, Composite, Domain)
-- 2. Sequences
-- 3. Tables (FK dependency order = topological sort)
-- 4. Indexes
-- 5. Views & Materialized Views
-- 6. Functions & Procedures
-- 7. Triggers
-- 8. Events / Scheduled Jobs
-- 9. Partitioning
-- 10. Security (Roles, RLS, Grants)
-- 11. Seed Data (INSERT)
```

### Seed Data Volume

| Table | Rows | Reason |
|-------|------|--------|
| users | 10 | Various role/org combinations |
| roles | 4 | admin, manager, user, readonly |
| organizations | 5 | 2-level hierarchy |
| categories | 8 | 3-level hierarchy |
| products | 15 | Various categories, JSONB metadata |
| product_variants | 25 | SKU combinations |
| orders | 20 | Date distribution for partition testing |
| order_items | 40 | Various quantity/price |
| payments | 20 | Cover all status enum values |
| comments | 15 | Self-referencing 2-3 levels |
| Others | 3-10 | Minimum functional verification |

---

## Section 3: Type System Extension

### New TSchemaObjectType Values

```
partition, role, policy, grant, extension, schema,
foreign_table, tablespace, collation, domain
```

### New Interfaces

- `IPartition` — strategy (range/list/hash), expression, entries
- `IPartitionEntry` — bound, values, modulus/remainder
- `IRole` — isLogin, isSuperuser, inherits, memberOf
- `IRlsPolicy` — command, roles, using/withCheck expressions
- `IGrant` — objectType, objectName, grantee, privileges
- `IExtension` — name, version, schema
- `IForeignTable` — serverName, columns, options
- `ISchemaNamespace` — name, owner
- `ITablespace` — name, location, options
- `ICollationDef` — name, provider (icu/libc), locale

### ISchemaObjects Extension

Add: partitions, roles, policies, grants, extensions, schemas, foreignTables, tablespaces, collations

### DIALECT_INFO Extension

- PostgreSQL: +partition, role, policy, grant, extension, schema, foreign_table, tablespace, collation, domain
- MySQL: +partition, role, grant, collation
- MariaDB: +partition, role, grant, sequence, collation
- SQLite: no additions

---

## Section 4: Service/IPC Extension

### Approach
Extend existing `schemaObjectsService.ts` with new cases (no new service files).

### PostgreSQL Query Sources

| Element | Source |
|---------|--------|
| partitions | pg_partitioned_table + pg_class + pg_get_expr() |
| roles | pg_roles |
| policies | pg_policy + pg_class |
| grants | information_schema.table_privileges / role_table_grants |
| extensions | pg_extension |
| schemas | pg_namespace (exclude system) |
| foreignTables | information_schema.foreign_tables + pg_foreign_table |
| tablespaces | pg_tablespace |
| collations | pg_collation (user-defined only) |

### MySQL / MariaDB Query Sources

| Element | Source |
|---------|--------|
| partitions | information_schema.PARTITIONS |
| roles | mysql.user / SHOW ROLES |
| grants | information_schema.TABLE_PRIVILEGES / SHOW GRANTS |
| collations | information_schema.COLLATIONS |

### Error Handling
Unsupported features return empty arrays (try/catch per fetch function).

### IPC Channels
No changes needed — existing SCHEMA_OBJECTS_FETCH and SCHEMA_OBJECT_DDL channels already accept `types?: TSchemaObjectType[]`.

---

## Section 5: Reference Tab UI

### Location
New tab in Live Console: `Connection | Diagram | Data | SQL | Explorer | ... | Reference`

### Layout
Left sidebar (collapsible category tree) + Right detail panel (description, syntax, vendor support, tips)

### Data Structure

```typescript
interface IReferenceItem {
  id: string;
  category: string;
  name: string;
  summary: string;
  description: string;           // markdown
  syntax: Record<TDbType, string | null>;
  vendorSupport: Record<TDbType, {
    supported: boolean;
    level: 'full' | 'partial' | 'none';
    notes?: string;
  }>;
  tips?: string[];
  relatedItems?: string[];
  seeAlso?: string[];
}
```

### Data Storage
Static JSON files bundled with app:

```
src/renderer/features/db-reference/
├── data/ (10 JSON files, ~66 items total)
├── model/types.ts
├── ui/ReferencePage.tsx, ReferenceSidebar.tsx, ReferenceDetail.tsx
└── index.ts
```

### Item Count by Category

| Category | Items |
|----------|-------|
| 1. Table & Column | ~12 |
| 2. Constraints | ~7 |
| 3. Index | ~10 |
| 4. View | ~4 |
| 5. Routine | ~5 |
| 6. Trigger & Event | ~5 |
| 7. Type & Sequence | ~7 |
| 8. Partitioning | ~5 |
| 9. Security | ~5 |
| 10. Advanced | ~6 |
| **Total** | **~66** |

---

## Section 6: Implementation Phases

### Phase 1: TestDB SQL Scripts
- Rewrite postgresql/init.sql, mysql/init.sql, mariadb/init.sql
- Create sqlite/init.sql
- Include seed data (~150 rows total)
- Dependency: None
- Verify: Docker execution

### Phase 2: Type System + Service Extension
- Extend src/shared/types/db.ts
- Extend src/main/services/schemaObjectsService.ts
- Dependency: Phase 1 (for verification)
- Verify: Fetch new elements from real DB

### Phase 3: Reference Tab UI
- Create src/renderer/features/db-reference/
- Create 10 JSON data files (~66 items)
- Add routing + LiveConsoleLayout tab
- Dependency: None (static data, independent)
- Verify: UI rendering + navigation

### Phase 4: Integration + ObjectTree
- Add new category icons to ObjectTree
- Enable Explorer tab for new elements
- End-to-end verification
- Dependency: Phase 2 + Phase 3

### Parallelism
Phase 1, 2, 3 can run concurrently, but Phase 1 → 2 order is recommended for verification. Phase 4 requires 2 + 3 completion.

### File Impact

| Phase | New | Modified | Key Files |
|-------|-----|----------|-----------|
| 1 | 1 | 3 | scripts/test-db/init/*.sql |
| 2 | 0 | 2 | shared/types/db.ts, schemaObjectsService.ts |
| 3 | ~15 | 3 | features/db-reference/*, routing, layout |
| 4 | 0 | ~3 | ObjectTree, Explorer |
