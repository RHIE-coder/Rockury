# Full DB Console Feature Matrix (DBeaver-level)

> Date: 2026-03-23
> Target Vendors: MySQL, MariaDB, PostgreSQL (+ SQLite readonly)
> Scope: DDL Objects + DBA Admin + Monitoring + Data Ops + Query Tools + Utility

---

## 1. Current Implementation Status

| Feature | Status | Notes |
|---------|--------|-------|
| Schema Introspection | Done | Tables, Views, Indexes, Functions, Procedures, Triggers, Events, Sequences, Types, Domains, Extensions, Policies, Roles, Grants |
| Object Browsing (SchemaPanel) | Done | Tree view, DDL retrieval, FK navigation |
| Query Execution | Done | Multi-statement, safety classification |
| Transactions | Done | BEGIN/COMMIT/ROLLBACK with timeout cleanup |
| Data Browsing (DataGrid) | Done | Preview, edit, FK lookup, export |
| Constraint Management | Partial | SQL generation ready, no UI execution yet |
| User/Role/Grant | Read-only | Introspection via IPC, no CRUD UI |
| Trigger/Function/Procedure | Read-only | DDL fetch only, no creation UI |
| Monitoring/Sessions | Minimal | Query history only |

---

## 2. DDL Objects CRUD (Read-only -> Full CRUD)

### 2.1 Triggers

| | MySQL/MariaDB | PostgreSQL |
|---|---|---|
| Body | Inline (CREATE TRIGGER 안에 바로 작성) | 별도 함수 필요 (`CREATE FUNCTION ... RETURNS trigger` -> `EXECUTE FUNCTION`) |
| Statement-level | FOR EACH ROW만 | FOR EACH ROW + FOR EACH STATEMENT |
| INSTEAD OF | X | View에서만 가능 |
| TRUNCATE event | X | O |
| Column-specific | X | `UPDATE OF col1, col2` |
| Disable | X (DROP 후 재생성) | `ALTER TABLE ... DISABLE TRIGGER` |
| Ordering | `FOLLOWS`/`PRECEDES` (MySQL) | 이름 알파벳순 |
| Create | `CREATE TRIGGER name {BEFORE\|AFTER} {INSERT\|UPDATE\|DELETE} ON table FOR EACH ROW body` | `CREATE TRIGGER name {BEFORE\|AFTER\|INSTEAD OF} {event} ON table [FOR EACH {ROW\|STATEMENT}] EXECUTE FUNCTION func()` |
| Drop | `DROP TRIGGER [IF EXISTS] schema.name` | `DROP TRIGGER [IF EXISTS] name ON table [CASCADE]` |
| List | `information_schema.TRIGGERS` | `pg_trigger` JOIN `pg_proc` |
| Priority | **High** | **High** |
| Complexity | Medium | Complex (2-step workflow) |

**UI Design Notes:**
- PG requires 2-step: create trigger function first, then trigger referencing it
- Console should present unified workflow (single modal with function body + trigger config)
- PG: DISABLE/ENABLE toggle button; MySQL: no disable (warn user)

### 2.2 Stored Procedures

| | MySQL/MariaDB | PostgreSQL |
|---|---|---|
| Language | SQL only | plpgsql, sql, plpython, plperl, C |
| Overloading | X (name unique per schema) | O (same name, different params) |
| Transaction control | X (no COMMIT inside) | O (COMMIT/ROLLBACK/SAVEPOINT) |
| CREATE OR REPLACE | X (MySQL) / O (MariaDB) | O |
| Parameters | IN, OUT, INOUT | IN, OUT, INOUT, VARIADIC |
| Security | `SQL SECURITY {DEFINER\|INVOKER}` | `SECURITY {DEFINER\|INVOKER}` |
| Drop | `DROP PROCEDURE [IF EXISTS] name` | `DROP PROCEDURE [IF EXISTS] name(param_types)` -- signature required |
| List | `information_schema.ROUTINES WHERE ROUTINE_TYPE='PROCEDURE'` | `pg_proc WHERE prokind = 'p'` |
| Priority | **High** | **High** |
| Complexity | Medium | Complex |

**UI Design Notes:**
- PG: language selector dropdown required
- PG: dollar-quoting (`$$ body $$`) support in editor
- PG: overloading -> DROP/ALTER needs full param signature tracking
- MySQL: implement drop-and-recreate pattern (no CREATE OR REPLACE)

### 2.3 Stored Functions

| | MySQL/MariaDB | PostgreSQL |
|---|---|---|
| Return type | Single scalar | Scalar, composite, `SETOF`, `TABLE(col type, ...)` |
| Determinism | `DETERMINISTIC` / `NOT DETERMINISTIC` | `IMMUTABLE` / `STABLE` / `VOLATILE` |
| Aggregate | X | `CREATE AGGREGATE` |
| Window | X custom | O custom (C-level) |
| Drop | `DROP FUNCTION name` | `DROP FUNCTION name(param_types)` |
| List | `information_schema.ROUTINES WHERE ROUTINE_TYPE='FUNCTION'` | `pg_proc WHERE prokind = 'f'` |
| Priority | **High** | **High** |
| Complexity | Medium | Complex |

**UI Design Notes:**
- PG volatility selector (IMMUTABLE/STABLE/VOLATILE) - affects query optimizer
- PG `RETURNS TABLE(...)` needs table-return-type builder
- Share editor component with Procedure (code editor + param form)

### 2.4 Sequences

| | MySQL | MariaDB | PostgreSQL |
|---|---|---|---|
| Native | X (AUTO_INCREMENT) | O (10.3+) | O (first-class object) |
| Create | N/A | `CREATE SEQUENCE` | `CREATE SEQUENCE ... [OWNED BY table.col]` |
| Next value | AUTO_INCREMENT | `NEXT VALUE FOR seq` | `nextval('seq')` |
| Identity columns | X | X | `GENERATED {ALWAYS\|BY DEFAULT} AS IDENTITY` |
| List | N/A | `information_schema.SEQUENCES` | `pg_sequences` |

**UI Design Notes:**
- MySQL: manage AUTO_INCREMENT as part of table editor (not separate object)
- PG: show OWNED BY relationship linking sequences to columns
- Display: last_value, start, increment, min/max, cache, cycle

### 2.5 Events (MySQL/MariaDB only)

| | MySQL/MariaDB | PostgreSQL |
|---|---|---|
| Native | O | X (pg_cron extension) |
| Schedule types | AT (one-time) / EVERY (recurring) | cron expression |
| Status | ENABLED / DISABLED / SLAVESIDE_DISABLED | N/A |
| Scheduler toggle | `SET GLOBAL event_scheduler = ON\|OFF` | N/A |
| Create | `CREATE EVENT name ON SCHEDULE {AT ts \| EVERY interval} DO statement` | `SELECT cron.schedule('name', 'cron_expr', 'SQL')` |
| List | `information_schema.EVENTS` | `cron.job` (if extension installed) |
| Priority | Medium | Low |

**UI Design Notes:**
- Visual schedule builder (one-time vs recurring, interval picker, start/end)
- PG: optional, detect pg_cron via `pg_extension`

### 2.6 PG-Specific Objects

| Object | Create | Drop | List | Priority | Complexity |
|--------|--------|------|------|----------|-----------|
| Materialized View | `CREATE MATERIALIZED VIEW AS query [WITH [NO] DATA]` | `DROP MATERIALIZED VIEW` | `pg_matviews` | **High** | Medium |
| Extension | `CREATE EXTENSION name [WITH SCHEMA schema]` | `DROP EXTENSION name [CASCADE]` | `pg_extension` / `pg_available_extensions` | Medium | Simple |
| Custom Type (enum) | `CREATE TYPE name AS ENUM ('a','b')` | `DROP TYPE name` | `pg_type WHERE typtype='e'` | Medium | Medium |
| Custom Type (composite) | `CREATE TYPE name AS (col type, ...)` | `DROP TYPE name` | `pg_type WHERE typtype='c'` | Medium | Medium |
| Domain | `CREATE DOMAIN name AS type [CHECK(...)]` | `DROP DOMAIN name` | `pg_type WHERE typtype='d'` | Low | Medium |
| Rule | `CREATE RULE name AS ON event TO table DO ...` | `DROP RULE name ON table` | `pg_rules` | Low | Medium |
| RLS Policy | `CREATE POLICY name ON table [FOR cmd] [TO role] [USING (expr)] [WITH CHECK (expr)]` | `DROP POLICY name ON table` | `pg_policies` | Medium | Complex |

**Materialized View UI Notes:**
- Show refresh status (`ispopulated` from `pg_matviews`)
- "Refresh" button with CONCURRENTLY toggle
- Show underlying query definition
- Display dependent indexes

**Extension UI Notes:**
- Two-panel: installed vs available
- Show current version + available upgrade
- Common extensions: pg_stat_statements, pgcrypto, uuid-ossp, postgis, pg_trgm, pg_cron

**RLS Policy UI Notes:**
- Show RLS status per table (enabled/forced)
- USING (read filter) vs WITH CHECK (write filter) separate editors
- PERMISSIVE (OR logic) vs RESTRICTIVE (AND logic) visual indicator

---

## 3. DBA / Administration

### 3.1 User Management

| | MySQL/MariaDB | PostgreSQL |
|---|---|---|
| Create | `CREATE USER 'name'@'host' IDENTIFIED BY 'pass'` | `CREATE USER name [WITH] PASSWORD 'pass' [VALID UNTIL 'ts']` |
| Host restriction | O (user@host granularity) | X (pg_hba.conf for host-based auth) |
| Account locking | `ALTER USER ... ACCOUNT LOCK\|UNLOCK` | X (connection limit 0 workaround) |
| Password expiry | `PASSWORD EXPIRE [INTERVAL n DAY]` | `VALID UNTIL 'timestamp'` |
| Auth methods | mysql_native_password, caching_sha2_password, auth_socket | pg_hba.conf: md5, scram-sha-256, cert, ldap, peer |
| List | `SELECT user, host FROM mysql.user` | `SELECT * FROM pg_roles` |
| Priority | **High** | **High** |

### 3.2 Role Management

| | MySQL 8.0+ | MariaDB | PostgreSQL |
|---|---|---|---|
| Create | `CREATE ROLE name` | `CREATE ROLE name` | `CREATE ROLE name [WITH options]` |
| Grant role | `GRANT role TO user` | same | `GRANT role TO user [WITH ADMIN OPTION]` |
| Default | `SET DEFAULT ROLE` | `SET DEFAULT ROLE` | Granted roles active by default |
| Users = Roles | Separate concepts | is_role flag | Unified (`pg_roles`) |
| List | `mysql.role_edges` | same | `pg_roles`, `pg_auth_members` |

### 3.3 Privileges / Grants

| | MySQL/MariaDB | PostgreSQL |
|---|---|---|
| Grant levels | Global, Database, Table, Column, Routine, Proxy | Database, Schema, Table, Column, Sequence, Function, Type, Domain |
| Default privileges | X | `ALTER DEFAULT PRIVILEGES [IN SCHEMA] GRANT ... ON ... TO role` |
| Column-level | O | O |
| Show | `SHOW GRANTS FOR user` | `information_schema.role_table_grants` |
| Priority | **High** | **High** |
| Complexity | Complex | Complex |

**UI Design Notes:**
- Privilege matrix grid: rows = objects, columns = privileges, checkboxes
- PG: separate section for ALTER DEFAULT PRIVILEGES
- Show effective privileges (inherited from roles + direct grants)

### 3.4 Database/Schema Management

| | MySQL/MariaDB | PostgreSQL |
|---|---|---|
| Hierarchy | DB = Schema (1-level) | DB > Schema (2-level) |
| Create DB | `CREATE DATABASE name [CHARSET cs] [COLLATE col]` | `CREATE DATABASE name [WITH OWNER=role TEMPLATE=t ENCODING=e]` |
| Create Schema | alias for CREATE DATABASE | `CREATE SCHEMA name [AUTHORIZATION role]` |
| Default schema | N/A | `public`; `search_path` controls resolution |
| Drop | `DROP DATABASE name` | `DROP DATABASE name [WITH (FORCE)]` (PG 13+) |

### 3.5 Session/Process Management

| | MySQL/MariaDB | PostgreSQL |
|---|---|---|
| View | `SHOW [FULL] PROCESSLIST` / `information_schema.PROCESSLIST` | `pg_stat_activity` |
| Columns | Id, User, Host, db, Command, Time, State, Info | pid, usename, client_addr, datname, state, query, query_start, wait_event |
| States | Sleep, Query, Connect, etc. | active, idle, idle in transaction, idle in transaction (aborted) |
| Kill | `KILL [CONNECTION\|QUERY] thread_id` | `pg_cancel_backend(pid)` (soft) / `pg_terminate_backend(pid)` (hard) |
| Priority | **High** | **High** |

**UI Design Notes:**
- Auto-refresh (configurable: 1s, 5s, 10s, 30s)
- Filter by user, database, state, duration
- PG: two-button "Cancel Query" (soft) / "Kill Connection" (hard)
- Show lock waits inline

### 3.6 Variable/Parameter Management

| | MySQL/MariaDB | PostgreSQL |
|---|---|---|
| View all | `SHOW [GLOBAL\|SESSION] VARIABLES` | `SHOW ALL` / `pg_settings` |
| Set session | `SET [SESSION] var = value` | `SET param = value` |
| Set global | `SET GLOBAL var = value` | `ALTER SYSTEM SET param = value` (persists) |
| Persist | `SET PERSIST var = value` (8.0+) | `ALTER SYSTEM SET` + `pg_reload_conf()` |
| Reload | Immediate for dynamic vars | `pg_reload_conf()` for sighup; restart for postmaster |
| Categories | No formal categories | `pg_settings.category` provides grouping |
| Context | Global vs Session | postmaster (restart), sighup (reload), superuser (session), user (session) |
| Count | ~500+ vars | ~350+ params |
| Priority | **High** | **High** |

**UI Design Notes:**
- Searchable, filterable list
- Group by category (PG native; MySQL manual grouping needed)
- Show: current value, default, min/max, unit, restart-required indicator
- Inline edit with validation
- PG: context badge (restart / reload / immediate)

### 3.7 Server Status

| | MySQL/MariaDB | PostgreSQL |
|---|---|---|
| Status | `SHOW [GLOBAL] STATUS` | `pg_stat_*` views |
| Uptime | `SHOW STATUS LIKE 'Uptime'` | `pg_postmaster_start_time()` |
| Version | `SELECT VERSION()` | `SELECT version()` |
| DB size | `SUM(data_length + index_length) FROM information_schema.TABLES` | `pg_database_size('dbname')` |
| Priority | **High** | **High** |

---

## 4. Monitoring & Performance

### 4.1 Active Queries

| | MySQL/MariaDB | PostgreSQL |
|---|---|---|
| Source | `information_schema.PROCESSLIST` / `performance_schema.threads` | `pg_stat_activity` |
| Filter active | `WHERE Command != 'Sleep'` | `WHERE state = 'active'` |
| Full query text | `SHOW FULL PROCESSLIST` | `query` column (subject to `track_activity_query_size`) |
| Wait info | `performance_schema.events_waits_current` | `wait_event_type`, `wait_event` |
| Priority | **High** | **High** |

### 4.2 EXPLAIN Visualizer

| | MySQL 8.0+ | PostgreSQL |
|---|---|---|
| Basic | `EXPLAIN SELECT ...` | `EXPLAIN SELECT ...` |
| Actual execution | `EXPLAIN ANALYZE` (8.0.18+) | `EXPLAIN ANALYZE` |
| Formats | `FORMAT={TRADITIONAL\|JSON\|TREE}` | `FORMAT {TEXT\|JSON\|XML\|YAML}` |
| IO metrics | X | `(ANALYZE, BUFFERS)` -- shared_blks_hit/read per node |
| WAL metrics | X | `(ANALYZE, WAL)` |
| Priority | **High** | **High** |

**UI Design Notes:**
- Visual plan tree (nodes for operations, arrows for data flow)
- Highlight expensive ops (large row estimates, seq scans on big tables)
- Actual vs estimated rows comparison
- "Explain" button in query editor toolbar

### 4.3 Lock Monitoring

| | MySQL/MariaDB | PostgreSQL |
|---|---|---|
| View locks | `performance_schema.data_locks` (8.0+) | `pg_locks` |
| Lock waits | `performance_schema.data_lock_waits` | `pg_locks WHERE granted = false` + `pg_stat_activity` |
| Deadlock | `SHOW ENGINE INNODB STATUS` -> LATEST DETECTED DEADLOCK | `log_lock_waits = on`, `deadlock_timeout` |
| Lock types | Row (S,X,IS,IX), Table, Gap, Next-key, Insert intention | AccessShare ~ AccessExclusive (8 levels) |
| Advisory locks | `GET_LOCK('name', timeout)` | `pg_advisory_lock(key)` |
| Priority | **High** | **High** |

**UI Design Notes:**
- Lock wait graph / blocking tree
- Highlight long-running lock waits
- "Kill blocking session" action

### 4.4 Performance Statistics

| | MySQL/MariaDB | PostgreSQL |
|---|---|---|
| Framework | `performance_schema` (built-in) | `pg_stat_statements` (extension) |
| Top queries | `events_statements_summary_by_digest ORDER BY SUM_TIMER_WAIT DESC` | `pg_stat_statements ORDER BY total_exec_time DESC` |
| Query digest | DIGEST + DIGEST_TEXT | queryid + query (parameterized) |
| Reset | `TRUNCATE events_statements_summary_by_digest` | `pg_stat_statements_reset()` |
| Priority | **High** | **High** |

### 4.5 Table Statistics

| | MySQL/MariaDB | PostgreSQL |
|---|---|---|
| Size | `information_schema.TABLES` (DATA_LENGTH, INDEX_LENGTH, DATA_FREE) | `pg_total_relation_size(oid)`, `pg_relation_size()`, `pg_indexes_size()` |
| Row count (est) | `TABLE_ROWS` (InnoDB estimate) | `pg_class.reltuples` |
| Fragmentation | `DATA_FREE` column | `pgstattuple` extension -> `dead_tuple_percent` |
| Optimize | `OPTIMIZE TABLE t` | `VACUUM [FULL] t` |
| Auto maintenance | Manual (`ANALYZE TABLE`) | `autovacuum` daemon |
| R/W stats | `performance_schema.table_io_waits_summary_by_table` | `pg_stat_user_tables` (seq_scan, idx_scan, n_tup_ins/upd/del, n_live/dead_tup) |
| Priority | **High** | **High** |

**UI Design Notes:**
- Table list: name, rows, total size, data size, index size, fragmentation
- PG: dead tuple count/%, last vacuum/analyze timestamps
- "Optimize/Vacuum" button per table

### 4.6 Index Statistics

| | MySQL/MariaDB | PostgreSQL |
|---|---|---|
| Usage | `performance_schema.table_io_waits_summary_by_index_usage` | `pg_stat_user_indexes` (idx_scan, idx_tup_read, idx_tup_fetch) |
| Unused | `WHERE COUNT_STAR = 0` | `WHERE idx_scan = 0` |
| Size | `innodb_index_stats` | `pg_relation_size(indexrelid)` |
| Cardinality | `SHOW INDEX FROM table` -> Cardinality | `pg_stats`, `pg_class.reltuples` |
| Priority | **High** | **High** |

**UI Design Notes:**
- Index list: name, table, columns, type, size, scan count, unused flag
- Highlight unused indexes (warning indicator)
- Suggest removal for zero-scan indexes

### 4.7 Other Monitoring (Medium/Low Priority)

| Feature | MySQL/MariaDB | PostgreSQL | Priority |
|---------|---------------|------------|----------|
| Slow query | `slow_query_log` / `mysql.slow_log` | `log_min_duration_statement` / `pg_stat_statements` | Medium |
| Replication | `SHOW REPLICA STATUS` | `pg_stat_replication` / `pg_stat_wal_receiver` | Low |
| Buffer/Cache | `SHOW STATUS LIKE 'Innodb_buffer%'` | `pg_buffercache` extension | Medium |
| Wait events | `performance_schema.events_waits_*` | `pg_stat_activity.wait_event_type` | Medium |

---

## 5. Data Operations

| Feature | MySQL/MariaDB | PostgreSQL | Priority | Complexity |
|---------|---------------|------------|----------|-----------|
| CSV Export | `SELECT INTO OUTFILE` or app-side | `COPY TO` or app-side | **High** | Medium |
| CSV Import | `LOAD DATA INFILE` or app-side | `COPY FROM` or app-side | **High** | Medium |
| JSON Export | `SELECT JSON_OBJECT(...)` or app-side | `row_to_json()` or app-side | **High** | Medium |
| SQL Dump | `mysqldump --no-data` (schema) / full | `pg_dump -s` (schema) / full | Medium | Medium |
| Backup/Restore | `mysqldump`/`mysqlimport` | `pg_dump`/`pg_restore` | Medium | Complex |
| Data Compare | App-side implementation | App-side implementation | Low | Complex |
| Data Migration | Type mapping required between vendors | Type mapping required | Low | Complex |

**Implementation Approach:**
- Export: DataGrid "Export" button -> CSV/JSON/INSERT SQL format selector
- Import: File upload -> column mapping UI -> INSERT execution
- Dump/Restore: Electron `child_process` wrapping CLI tools
- Use client-side approach (app reads query results -> writes file) to avoid server filesystem issues

---

## 6. Query Tools (Partial -> Enhancement)

| Feature | Current Status | Priority | Complexity | Notes |
|---------|---------------|----------|-----------|-------|
| SQL Editor | Done | - | - | CodeMirror/Monaco |
| Query Execution | Done | - | - | Multi-statement, safety classification |
| Query History | Done | - | - | Client-side storage |
| Saved Queries | Done | - | - | Collection browser |
| Transaction Control | Done | - | - | BEGIN/COMMIT/ROLLBACK |
| **EXPLAIN Visualizer** | Not implemented | **High** | Medium | Visual plan tree |
| **SQL Autocomplete** | Designed (Phase 2) | **High** | Complex | Schema-aware completion |
| **SQL Formatter** | Not implemented | Medium | Simple | Use `sql-formatter` library |
| **Multi-result tabs** | Not implemented | Medium | Medium | Multiple result sets |

---

## 7. Utility

| Feature | Priority | Complexity | Notes |
|---------|----------|-----------|-------|
| DDL Export (bulk) | **High** | Medium | Already have individual DDL fetch -> add bulk export |
| Object Search (global) | **High** | Medium | Cmd+K search bar across all object types |
| ER Diagram | Exists (diagram feature) | - | May need enhancement for Live Console |
| Schema Diff | Low | Complex | Compare two schemas -> generate ALTER statements |

---

## 8. Implementation Roadmap

### Phase 1: DDL Object CRUD (High Impact, Introspection already done)
1. Function/Procedure editor (code editor modal with param form)
2. Trigger create/edit (PG: trigger function workflow)
3. Materialized View management (PG)
4. Event management (MySQL/MariaDB)
5. Sequence CRUD (PG + MariaDB)

### Phase 2: DBA Administration
1. User/Role CRUD UI
2. GRANT/REVOKE privilege matrix UI
3. Session management (active queries + Kill)
4. Database/Schema create/drop
5. Variable/Parameter viewer with inline edit

### Phase 3: Query Tools Enhancement
1. EXPLAIN visualizer (JSON plan -> tree view)
2. SQL Autocomplete (schema data integration)
3. SQL Formatter (library integration)

### Phase 4: Monitoring Dashboard
1. Active queries / Lock monitoring
2. Table/Index statistics with Optimize/Vacuum
3. Server status dashboard
4. Top SQL (performance_schema / pg_stat_statements)

### Phase 5: Data Operations
1. Export (CSV/JSON/SQL) from DataGrid
2. Import (CSV + column mapping wizard)
3. SQL Dump/Restore (CLI tool wrapper)

---

## 9. Catalog Query Reference

| Object | MySQL/MariaDB | PostgreSQL |
|--------|---------------|------------|
| Tables | `information_schema.TABLES` | `pg_class WHERE relkind = 'r'` |
| Views | `information_schema.VIEWS` | `pg_class WHERE relkind = 'v'` |
| Materialized Views | N/A | `pg_class WHERE relkind = 'm'` / `pg_matviews` |
| Columns | `information_schema.COLUMNS` | `information_schema.columns` / `pg_attribute` |
| Indexes | `information_schema.STATISTICS` | `pg_indexes` |
| Constraints | `information_schema.TABLE_CONSTRAINTS` + `KEY_COLUMN_USAGE` | `pg_constraint` |
| Triggers | `information_schema.TRIGGERS` | `pg_trigger` JOIN `pg_proc` |
| Functions | `information_schema.ROUTINES WHERE ROUTINE_TYPE='FUNCTION'` | `pg_proc WHERE prokind='f'` |
| Procedures | `information_schema.ROUTINES WHERE ROUTINE_TYPE='PROCEDURE'` | `pg_proc WHERE prokind='p'` |
| Sequences | N/A (MySQL) / `information_schema` (MariaDB) | `pg_sequences` |
| Events | `information_schema.EVENTS` | N/A (pg_cron: `cron.job`) |
| Custom Types | N/A | `pg_type WHERE typtype IN ('c','e','r','d')` |
| Extensions | N/A | `pg_extension` / `pg_available_extensions` |
| RLS Policies | N/A | `pg_policies` |
| Users/Roles | `mysql.user` | `pg_roles` |
| Grants | `SHOW GRANTS FOR user` | `information_schema.role_table_grants` |
| Active Sessions | `information_schema.PROCESSLIST` | `pg_stat_activity` |
| Locks | `performance_schema.data_locks` | `pg_locks` |
| Table Stats | `information_schema.TABLES` (size, rows) | `pg_stat_user_tables` + `pg_total_relation_size()` |
| Index Stats | `performance_schema.table_io_waits_summary_by_index_usage` | `pg_stat_user_indexes` |
| DDL Extract | `SHOW CREATE {TABLE\|VIEW\|FUNCTION\|...}` | `pg_get_viewdef()`, `pg_get_functiondef()`, `pg_get_triggerdef()` |
| DB Size | `SUM(data_length+index_length) FROM information_schema.TABLES` | `pg_database_size()` |
| Variables | `SHOW [GLOBAL] VARIABLES` | `pg_settings` |
| Server Status | `SHOW [GLOBAL] STATUS` | `pg_stat_database`, `pg_stat_bgwriter` |

---

## 10. Vendor-Specific Feature Summary

| Feature | MySQL | MariaDB | PostgreSQL |
|---------|-------|---------|------------|
| Sequence | AUTO_INCREMENT | Native (10.3+) | Native (first-class) |
| Materialized View | X | X | O |
| Extension | X | X | O |
| Custom Type | ENUM (column-level) | ENUM (column-level) | O (enum, composite, range) |
| Event Scheduler | O | O | X (pg_cron extension) |
| RLS Policy | X | X | O |
| Domain | X | X | O |
| Rule | X | X | O |
| Partitioning | RANGE/LIST/HASH/KEY | RANGE/LIST/HASH/KEY/SYSTEM | RANGE/LIST/HASH (declarative) |
| Kill Session | `KILL {id}` | `KILL {id}` | `pg_terminate_backend(pid)` / `pg_cancel_backend(pid)` |
| EXPLAIN Format | TRADITIONAL/JSON/TREE | TRADITIONAL/JSON | TEXT/JSON/XML/YAML |
| DB/Schema hierarchy | 1-level (DB=Schema) | 1-level (DB=Schema) | 2-level (DB > Schema) |
| CREATE OR REPLACE (routines) | X | O | O |
| Function overloading | X | X | O |
| Dollar-quoting | X | X | O |
| Trigger disable | X | X | O |
| INSTEAD OF trigger | X | X | O (views only) |
| Statement-level trigger | X | X | O |
| Transaction in procedure | X | Partial | O |
| Default privileges | X | X | O (`ALTER DEFAULT PRIVILEGES`) |
