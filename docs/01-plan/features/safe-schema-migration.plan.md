# Safe Schema Migration Planning Document

> **Summary**: Virtual Diagram 설계부터 실제 DB 적용까지의 안전한 스키마 마이그레이션 워크플로우. Snapshot 기반 Validation, Diff 기반 Update/Rollback SQL 생성, 단계별 안전 적용 프로세스.
>
> **Project**: Rockury MVP (DB Tool)
> **Version**: 0.4.0
> **Author**: rhiemh
> **Date**: 2026-02-11
> **Status**: Draft

---

## 1. Overview

### 1.1 Purpose

DB 설계(Virtual Diagram)부터 실제 DB 적용까지 **안전하고 추적 가능한** 스키마 마이그레이션 워크플로우를 제공한다. 핵심은 **Snapshot 기반 Validation**과 **Diff 기반 점진적 적용**이다. 절대로 전체 DB를 덮어쓰지 않고, 변경분만 안전하게 적용한다.

### 1.2 Complete Workflow (10 Steps)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    Safe Schema Migration Workflow                            │
│                                                                             │
│  ① Virtual Diagram 버전별 설계                                              │
│     └─ 버전 생성/수정/관리                                                   │
│                                                                             │
│  ② Version Diff 확인                                                        │
│     └─ 버전 간 차이 비교 및 리뷰                                              │
│                                                                             │
│  ③ Real Diagram으로 현재 DB 상태 확인 (Reverse Engineering)                   │
│     └─ 실제 DB → Real Diagram 동기화                                         │
│                                                                             │
│  ④ Real Diagram → Schema Snapshot 생성 (백업)                                │
│     └─ 현재 실제 DB 상태를 불변 스냅샷으로 저장                                  │
│                                                                             │
│  ⑤ Snapshot Validation                                                      │
│     └─ 스냅샷 vs 실제 DB가 일치하는지 검증                                     │
│                                                                             │
│  ⑥ Migration Plan 생성                                                      │
│     └─ Virtual Version + Validated Snapshot → Diff → Update SQL + Rollback SQL │
│                                                                             │
│  ⑦ Update SQL 적용 (Forward Engineering)                                     │
│     └─ Statement-by-statement 안전 적용 (절대 전체 덮어쓰기 안함)               │
│                                                                             │
│  ⑧ Post-Apply: Real Diagram 갱신                                             │
│     └─ 적용 후 Real Diagram re-sync로 결과 확인                                │
│                                                                             │
│  ⑨ Post-Apply: Validation                                                    │
│     └─ New Snapshot 생성 → 실제 DB 일치 검증                                   │
│     └─ 문제 시 Rollback SQL 실행 + 이전 Snapshot 복원                          │
│                                                                             │
│  ⑩ Virtual Diagram 새 버전 생성                                               │
│     └─ 적용 완료된 Real Diagram 기준으로 Virtual Diagram 새 버전 생성            │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.3 Current State (As-Is)

| 기능 | 상태 | 설명 |
|------|------|------|
| Virtual Diagram 버전관리 | ✅ 있음 | IDiagramVersion, diagram_versions 테이블 |
| Version Diff (Virtual↔Virtual) | ✅ 있음 | SCHEMA_DIFF_VIRTUAL IPC |
| Real Diagram (Reverse Engineering) | ✅ 있음 | SCHEMA_SYNC_REAL IPC |
| Forward Engineer | ⚠️ 부분적 | ForwardEngineerPanel - DDL 전체 생성만 가능, Diff 기반 아님 |
| Migration 시스템 | ⚠️ 부분적 | IMigration 타입/테이블 있으나 워크플로우 미완 |
| Schema Snapshot (DB 백업) | ❌ 없음 | IViewSnapshot은 UI 뷰 스냅샷 (필터/레이아웃만) |
| Schema Validation | ❌ 없음 | 스냅샷 vs 실제 DB 일치 검증 없음 |
| Rollback 워크플로우 | ❌ 없음 | rollbackDdl 필드만 있고 UI/프로세스 없음 |
| Post-migration Validation | ❌ 없음 | 적용 후 검증 프로세스 없음 |
| Real → Virtual 새 버전 생성 | ❌ 없음 | SCHEMA_APPLY_REAL_TO_VIRTUAL은 덮어쓰기 |

### 1.4 Related Documents

- ERD Schema Visualizer: `docs/01-plan/features/erd-schema-visualizer.plan.md`
- Diagram UX Improvement: `docs/01-plan/features/diagram-ux-improvement.plan.md`

---

## 2. Requirements

### 2.1 Core Concepts

#### Schema Snapshot (NEW)

기존 `IViewSnapshot`(UI 뷰 스냅샷)과 구분되는 **DB 스키마 스냅샷**:

| 구분 | IViewSnapshot (기존) | ISchemaSnapshot (신규) |
|------|---------------------|----------------------|
| 용도 | UI 필터/레이아웃 저장 | DB 스키마 상태 백업 |
| 내용 | filter + layout | tables + metadata + connection |
| 시점 | 사용자 임의 | Real Diagram sync 직후 |
| 검증 | 불가 | Validation 가능 |

#### Migration Plan (NEW)

기존 `IMigration`을 확장한 **Migration Plan** 개념:
- Source: Validated Schema Snapshot (현재 DB 상태)
- Target: Virtual Diagram의 특정 버전
- Output: Update SQL + Rollback SQL + Diff Summary
- 적용 전 반드시 Preview/Confirm 단계

### 2.2 Feature List

| # | Feature | Priority | Complexity | Step |
|---|---------|----------|------------|------|
| F1 | Schema Snapshot 생성/관리 (Real Diagram 기반) | Critical | High | ④ |
| F2 | Schema Validation (Snapshot vs Real DB) | Critical | High | ⑤⑨ |
| F3 | Migration Plan 생성 (Diff 기반 Update + Rollback SQL) | Critical | High | ⑥ |
| F4 | Safe Apply (Statement-by-statement 적용) | Critical | High | ⑦ |
| F5 | Post-Apply Validation + Rollback | Critical | High | ⑧⑨ |
| F6 | Real → Virtual 새 버전 생성 | High | Medium | ⑩ |
| F7 | Version Diff 개선 (Virtual↔Virtual) | High | Medium | ② |
| F8 | Migration History 뷰 | Medium | Medium | - |
| F9 | Schema Snapshot History 뷰 | Medium | Low | - |
| F10 | Migration Wizard UI | High | High | ⑥⑦⑧⑨ |

### 2.3 Detailed Requirements

#### F1: Schema Snapshot 생성/관리

- Real Diagram sync 후 "Create Snapshot" 버튼으로 현재 DB 스키마를 스냅샷으로 저장
- 스냅샷 데이터: `ISchemaSnapshot { id, connectionId, name, tables: ITable[], metadata: { dbType, serverVersion, tableCount, createdAt }, checksum }`
- Checksum: 테이블/컬럼 구조를 정규화 후 해시 (구조 변경 감지용)
- 스냅샷 목록 조회/삭제/이름 변경 가능
- DB 테이블: `schema_snapshots`

#### F2: Schema Validation

- **Snapshot vs Real DB 비교**: 스냅샷의 tables와 실제 DB에서 가져온 tables를 Diff
- **Validation 결과**: `{ isValid: boolean, diffs: ITableDiff[], checkedAt: string }`
- `isValid = true`: 실제 DB가 스냅샷과 정확히 일치
- `isValid = false`: 차이 목록과 함께 경고 표시
- 용도 1 (Step ⑤): Migration 전 현재 DB 상태가 예상대로인지 확인
- 용도 2 (Step ⑨): Migration 후 결과가 기대대로인지 확인

#### F3: Migration Plan 생성

- **입력**: Virtual Diagram의 특정 버전 + Validated Schema Snapshot
- **처리**: 두 스키마의 Diff 계산 → Update SQL + Rollback SQL 생성
- **출력**: `IMigrationPlan { id, sourceSnapshotId, targetVersionId, diff: IDiffResult, updateSql: string, rollbackSql: string, status: 'draft' | 'reviewed' | 'applied' | 'rolled_back' }`
- Update SQL: 변경분만 반영하는 ALTER/CREATE/DROP 문
- Rollback SQL: Update SQL의 역연산 (원래 상태 복원)
- **중요**: 절대 DROP DATABASE / CREATE DATABASE 하지 않음. 테이블 단위 변경만.

#### F4: Safe Apply (Statement-by-statement)

- Migration Plan의 Update SQL을 문장별로 실행
- 각 문장 실행 결과를 기록 (성공/실패)
- 실패 시 즉시 중단 + 이미 실행된 문장의 Rollback 제안
- 진행률 표시 (n/total statements)
- 실행 로그 저장

#### F5: Post-Apply Validation + Rollback

- 적용 후 자동으로 Real Diagram re-sync
- New Schema Snapshot 자동 생성 (적용 후 상태)
- New Snapshot으로 Validation 실행 (Target Version과 일치하는지)
- **Rollback**: 문제 발견 시 Migration Plan의 Rollback SQL 실행 → 이전 Snapshot 상태로 복원
- Rollback도 statement-by-statement로 안전 실행

#### F6: Real → Virtual 새 버전 생성

- 적용 완료 후 Real Diagram 기준으로 Virtual Diagram에 새 버전 생성
- "Sync from Real" 버튼으로 현재 DB 상태를 Virtual Diagram의 새 버전으로 저장
- 이후 이 버전을 기반으로 다음 설계 진행

#### F7: Version Diff 개선

- Virtual Diagram의 두 버전 간 Diff를 시각적으로 표시
- Diff View: 테이블/컬럼별 added/removed/modified 하이라이트
- DDL diff 뷰도 제공 (SQL 기반 변경 확인)

#### F8: Migration History 뷰

- 과거 Migration Plan 목록 (적용 시각, 상태, 변경 내용)
- 각 Migration의 Update SQL / Rollback SQL 조회
- 실행 로그 조회

#### F9: Schema Snapshot History 뷰

- 스냅샷 목록 (시각, 이름, 테이블 수, 체크섬)
- 스냅샷 간 Diff 비교 가능
- 스냅샷 삭제/이름변경

#### F10: Migration Wizard UI

- Step-by-step 마법사 형태의 UI
- Step 1: Source 선택 (Schema Snapshot) + Target 선택 (Virtual Version)
- Step 2: Diff Preview + Update SQL / Rollback SQL 확인
- Step 3: Execute (진행률 + 실행 로그)
- Step 4: Validation 결과 + 후처리 (New Snapshot / New Version)

---

## 3. UI/UX Design

### 3.1 Overall Navigation

현재 DiagramTabBar: `[ Virtual | Real | Diff ]`

변경 후: `[ Virtual | Real | Diff | Migration ]` (새 탭 추가)

```
┌──────────────────────────────────────────────────────────────────────┐
│  [◫L] [◫R]  ── [ Virtual | Real | Diff | Migration ] ──  [Canvas⇄DDL] │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  (각 탭별 Content Area)                                               │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

### 3.2 Virtual Tab (Steps ①②)

기존 Virtual Diagram + 개선사항:
- 버전 드롭다운으로 버전 전환 (기존 diagram-ux-improvement에서 구현 예정)
- **추가**: 두 버전 선택 → "Compare Versions" → Diff View

### 3.3 Real Tab (Steps ③④)

기존 Real Diagram + 개선사항:

```
┌─────────────────────────────────────────────────────────────────────┐
│ Real Diagram Toolbar                                                │
│ [🔄 Sync] [📷 Create Snapshot] [✓ Validate] | Connection: [▼ dev-db] │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌───────────────────┐  ┌──────────────────────────────────────┐    │
│  │ Snapshots          │  │                                      │    │
│  │                    │  │     Real Diagram Canvas               │    │
│  │ ● Current (live)   │  │     (ReactFlow 기반)                  │    │
│  │ 📷 snap-2026-02-11 │  │                                      │    │
│  │   ✓ Validated      │  │                                      │    │
│  │ 📷 snap-2026-02-10 │  │                                      │    │
│  │   ✓ Validated      │  │                                      │    │
│  │ 📷 snap-2026-02-09 │  │                                      │    │
│  │   ⚠ Not validated  │  │                                      │    │
│  │                    │  │                                      │    │
│  └───────────────────┘  └──────────────────────────────────────┘    │
│                                                                     │
│ [Status Bar: Last synced: 2 min ago | 64 tables | checksum: a3f2...] │
└─────────────────────────────────────────────────────────────────────┘
```

#### Snapshot Panel (Left)
- 스냅샷 목록 (최신순)
- 각 스냅샷: 이름, 생성일, 테이블 수, Validation 상태 뱃지
- 클릭 시 해당 스냅샷의 스키마를 캔버스에 표시 (읽기전용)
- 우클릭/메뉴: Rename, Delete, Validate, Compare with...

#### Validation 결과 (Inline)
- Validate 클릭 시 하단 또는 오버레이로 결과 표시
- ✅ Valid: "Schema matches snapshot (64/64 tables identical)"
- ❌ Invalid: Diff 목록 표시 + "Database has changed since snapshot" 경고

### 3.4 Migration Tab (Steps ⑥⑦⑧⑨⑩) - NEW

```
┌─────────────────────────────────────────────────────────────────────┐
│ Migration Wizard                                                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Step [1] ───── [2] ───── [3] ───── [4]                             │
│  Source          Diff       Execute    Verify                        │
│                                                                     │
│ ┌─ Step 1: Select Source & Target ────────────────────────────────┐ │
│ │                                                                  │ │
│ │  Source (Current DB State)           Target (Design Goal)        │ │
│ │  ┌─────────────────────────┐       ┌─────────────────────────┐  │ │
│ │  │ Schema Snapshot:        │       │ Virtual Diagram:        │  │ │
│ │  │ [▼ snap-2026-02-11 ✓]  │       │ [▼ karif-deepvisions]   │  │ │
│ │  │                        │       │ Version:                │  │ │
│ │  │ 64 tables              │       │ [▼ v2.0.0 (72 tables)] │  │ │
│ │  │ ✓ Validated            │       │                        │  │ │
│ │  │ Checksum: a3f2...      │       │                        │  │ │
│ │  └─────────────────────────┘       └─────────────────────────┘  │ │
│ │                                                                  │ │
│ │                        [Generate Diff →]                         │ │
│ └──────────────────────────────────────────────────────────────────┘ │
│                                                                     │
│ ┌─ Step 2: Review Diff ──────────────────────────────────────────┐ │
│ │  Summary: +8 tables, -0 tables, ~12 modified                    │ │
│ │                                                                  │ │
│ │  ┌─ Table Changes ─────────┐  ┌─ SQL Preview ────────────────┐  │ │
│ │  │ + users_roles           │  │ -- Update SQL                │  │ │
│ │  │ + audit_logs            │  │ CREATE TABLE users_roles (   │  │ │
│ │  │ ~ users (3 col changed) │  │   ...                        │  │ │
│ │  │ ~ orders (1 col added)  │  │ );                           │  │ │
│ │  │ ~ products (2 modified) │  │ ALTER TABLE users            │  │ │
│ │  │ ...                     │  │   ADD COLUMN role_id INT;    │  │ │
│ │  └─────────────────────────┘  │ ...                          │  │ │
│ │                                │                              │  │ │
│ │  [Toggle: Update SQL ⇄ Rollback SQL]                          │  │ │
│ │                                │ -- Rollback SQL              │  │ │
│ │                                │ DROP TABLE users_roles;      │  │ │
│ │                                │ ALTER TABLE users            │  │ │
│ │                                │   DROP COLUMN role_id;       │  │ │
│ │                                └──────────────────────────────┘  │ │
│ │                                                                  │ │
│ │                    [← Back] [Apply Migration →]                  │ │
│ └──────────────────────────────────────────────────────────────────┘ │
│                                                                     │
│ ┌─ Step 3: Execute ──────────────────────────────────────────────┐ │
│ │                                                                  │ │
│ │  Executing migration...                                          │ │
│ │  ████████████░░░░░░░░  12/20 statements                         │ │
│ │                                                                  │ │
│ │  ✅ CREATE TABLE users_roles (...)              0.023s           │ │
│ │  ✅ CREATE TABLE audit_logs (...)               0.045s           │ │
│ │  ✅ ALTER TABLE users ADD COLUMN role_id INT    0.012s           │ │
│ │  ✅ ALTER TABLE users ADD INDEX idx_role (...)   0.034s          │ │
│ │  🔄 ALTER TABLE orders ADD COLUMN notes TEXT    executing...     │ │
│ │  ⬜ ALTER TABLE products MODIFY price DECIMAL   pending          │ │
│ │  ...                                                             │ │
│ │                                                                  │ │
│ │  [⏸ Pause] [🔴 Abort + Rollback]                                │ │
│ └──────────────────────────────────────────────────────────────────┘ │
│                                                                     │
│ ┌─ Step 4: Verify & Complete ────────────────────────────────────┐ │
│ │                                                                  │ │
│ │  ✅ Migration Applied Successfully                               │ │
│ │  20/20 statements executed in 0.89s                              │ │
│ │                                                                  │ │
│ │  Post-Apply Validation:                                          │ │
│ │  ✅ Real DB re-synced                                            │ │
│ │  ✅ New snapshot created: "post-migration-2026-02-11"            │ │
│ │  ✅ Validation passed (72/72 tables match target)                │ │
│ │                                                                  │ │
│ │  ┌─ Actions ─────────────────────────────────────────────────┐   │ │
│ │  │ [📷 View New Snapshot]                                     │   │ │
│ │  │ [🔄 Create Virtual Version from Real]                      │   │ │
│ │  │ [⚠️ Rollback to Previous Snapshot]                         │   │ │
│ │  └───────────────────────────────────────────────────────────┘   │ │
│ │                                                                  │ │
│ │                          [✓ Complete]                             │ │
│ └──────────────────────────────────────────────────────────────────┘ │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 3.5 Diff Tab (Step ②) - 개선

기존 Diff View 확장:
- **Mode 1**: Virtual vs Real (기존)
- **Mode 2**: Virtual Version vs Virtual Version (기존)
- **Mode 3**: Snapshot vs Snapshot (NEW)
- **Mode 4**: Snapshot vs Virtual Version (NEW) - Migration Plan 미리보기

```
┌─────────────────────────────────────────────────────────┐
│ Diff Mode: [Virtual↔Real | Version↔Version |           │
│             Snapshot↔Snapshot | Snapshot↔Version]        │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Source: [▼ ...] ────── vs ────── Target: [▼ ...]       │
│                                                         │
│  (Diff Result Area)                                     │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## 4. Data Model

### 4.1 New Type: ISchemaSnapshot

```ts
// ~/shared/types/db.ts
export interface ISchemaSnapshot {
  id: string;
  connectionId: string;
  name: string;
  tables: ITable[];
  metadata: {
    dbType: TDbType;
    serverVersion?: string;
    tableCount: number;
    database: string;
  };
  checksum: string;        // normalized schema hash for quick comparison
  validatedAt?: string;    // last validation timestamp
  isValid?: boolean;       // last validation result
  createdAt: string;
}
```

### 4.2 New Type: IMigrationPlan

```ts
export type TMigrationPlanStatus = 'draft' | 'reviewed' | 'executing' | 'applied' | 'failed' | 'rolled_back';

export interface IMigrationPlan {
  id: string;
  connectionId: string;
  sourceSnapshotId: string;    // Validated Schema Snapshot
  targetDiagramId: string;     // Virtual Diagram ID
  targetVersionId?: string;    // specific version (null = working)
  diff: IDiffResult;
  updateSql: string;
  rollbackSql: string;
  status: TMigrationPlanStatus;
  executionLog?: IMigrationLog[];
  appliedAt?: string;
  rolledBackAt?: string;
  postSnapshotId?: string;     // snapshot after apply
  createdAt: string;
}

export interface IMigrationLog {
  statementIndex: number;
  sql: string;
  status: 'success' | 'failed' | 'skipped';
  durationMs: number;
  error?: string;
  executedAt: string;
}
```

### 4.3 New Type: IValidationResult

```ts
export interface IValidationResult {
  snapshotId: string;
  connectionId: string;
  isValid: boolean;
  matchedTables: number;
  totalTables: number;
  diffs: ITableDiff[];
  checkedAt: string;
}
```

### 4.4 DB Schema (schema_snapshots)

```sql
CREATE TABLE IF NOT EXISTS schema_snapshots (
  id TEXT PRIMARY KEY,
  connection_id TEXT NOT NULL,
  name TEXT NOT NULL,
  tables_json TEXT NOT NULL,       -- JSON: ITable[]
  metadata_json TEXT NOT NULL,     -- JSON: { dbType, serverVersion, tableCount, database }
  checksum TEXT NOT NULL,
  validated_at TEXT,
  is_valid INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_snapshots_connection ON schema_snapshots(connection_id);
```

### 4.5 DB Schema (migration_plans)

```sql
CREATE TABLE IF NOT EXISTS migration_plans (
  id TEXT PRIMARY KEY,
  connection_id TEXT NOT NULL,
  source_snapshot_id TEXT NOT NULL,
  target_diagram_id TEXT NOT NULL,
  target_version_id TEXT,
  diff_json TEXT NOT NULL,           -- JSON: IDiffResult
  update_sql TEXT NOT NULL,
  rollback_sql TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  execution_log_json TEXT,           -- JSON: IMigrationLog[]
  applied_at TEXT,
  rolled_back_at TEXT,
  post_snapshot_id TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (source_snapshot_id) REFERENCES schema_snapshots(id),
  FOREIGN KEY (target_diagram_id) REFERENCES diagrams(id)
);

CREATE INDEX idx_migration_plans_connection ON migration_plans(connection_id);
```

---

## 5. IPC Channels (New)

```ts
// src/shared/ipc/channels.ts - 추가분

// Schema Snapshot
SCHEMA_SNAPSHOT_LIST:    'schema-snapshot:list',
SCHEMA_SNAPSHOT_CREATE:  'schema-snapshot:create',
SCHEMA_SNAPSHOT_GET:     'schema-snapshot:get',
SCHEMA_SNAPSHOT_DELETE:  'schema-snapshot:delete',
SCHEMA_SNAPSHOT_RENAME:  'schema-snapshot:rename',

// Schema Validation
SCHEMA_VALIDATE:         'schema:validate',

// Migration Plan
MIGRATION_PLAN_LIST:     'migration-plan:list',
MIGRATION_PLAN_CREATE:   'migration-plan:create',
MIGRATION_PLAN_GET:      'migration-plan:get',
MIGRATION_PLAN_EXECUTE:  'migration-plan:execute',
MIGRATION_PLAN_ROLLBACK: 'migration-plan:rollback',
MIGRATION_PLAN_DELETE:   'migration-plan:delete',

// Composite: Real → Virtual New Version
SYNC_REAL_TO_VIRTUAL_VERSION: 'schema:sync-real-to-virtual-version',
```

---

## 6. Architecture (Backend)

### 6.1 Service Layer

```
┌───────────────────────────────────────────────────┐
│ IPC Handlers (schemaHandlers.ts, migrationHandlers.ts)
├───────────────────────────────────────────────────┤
│ schemaSnapshotService    │  migrationPlanService   │
│ - create(connectionId)   │  - create(source,target)│
│ - validate(snapshotId)   │  - execute(planId)      │
│ - list(connectionId)     │  - rollback(planId)     │
│ - delete(id)             │  - list(connectionId)   │
├───────────────────────────────────────────────────┤
│ schemaSnapshotRepository │  migrationPlanRepository│
├───────────────────────────────────────────────────┤
│ connectionService (기존)  │  schemaDiffService (기존)│
│ - 실제 DB 연결/조회       │  - Diff 계산            │
└───────────────────────────────────────────────────┘
```

### 6.2 Key Services

#### schemaSnapshotService
- `create(connectionId)`: Real DB에서 스키마 가져오기 → ISchemaSnapshot 저장
- `validate(snapshotId)`: 스냅샷 vs 실제 DB 비교 → IValidationResult
- `generateChecksum(tables)`: ITable[] → 정규화 → SHA256 hash

#### migrationPlanService
- `create(sourceSnapshotId, targetDiagramId, targetVersionId?)`: Diff 계산 → Update/Rollback SQL 생성
- `execute(planId)`: Statement-by-statement 실행 + 로그 기록
- `rollback(planId)`: Rollback SQL 실행 + 상태 복원
- `postApplyValidation(planId)`: Re-sync → New Snapshot → Validate

---

## 7. Implementation Phases

### Phase 1: Schema Snapshot Infrastructure
**Scope**: F1, F9 (partial)
**Files**: New services, repositories, IPC handlers, types

1. `ISchemaSnapshot` 타입 추가 (`db.ts`)
2. `schema_snapshots` DB 테이블 생성 (`localDb.schema.ts`)
3. `schemaSnapshotRepository` 구현
4. `schemaSnapshotService` 구현 (create, list, delete, rename)
5. IPC channels + handlers 등록
6. Checksum 생성 로직 구현

### Phase 2: Schema Validation
**Scope**: F2
**Files**: schemaSnapshotService (validate), validation UI

1. `IValidationResult` 타입 추가
2. `schemaSnapshotService.validate()` 구현 - 스냅샷 vs 실제 DB Diff
3. `SCHEMA_VALIDATE` IPC handler
4. Validation 상태 업데이트 (validatedAt, isValid)

### Phase 3: Migration Plan
**Scope**: F3
**Files**: New migration plan service, repository, types

1. `IMigrationPlan`, `IMigrationLog` 타입 추가
2. `migration_plans` DB 테이블 생성
3. `migrationPlanRepository` 구현
4. `migrationPlanService.create()` 구현 - Diff 기반 SQL 생성
5. IPC channels + handlers 등록

### Phase 4: Safe Apply + Post-Apply Validation
**Scope**: F4, F5
**Files**: migrationPlanService (execute, rollback, postApplyValidation)

1. `migrationPlanService.execute()` - Statement-by-statement 실행
2. 실행 로그 기록 (IMigrationLog[])
3. `migrationPlanService.rollback()` - Rollback 실행
4. `migrationPlanService.postApplyValidation()` - Re-sync + New Snapshot + Validate
5. 실패 시 자동 Rollback 옵션

### Phase 5: Real → Virtual Version
**Scope**: F6
**Files**: virtualDiagramService, schemaHandlers

1. `SYNC_REAL_TO_VIRTUAL_VERSION` IPC handler
2. Real Diagram 최신 상태 → Virtual Diagram 새 버전 생성
3. 기존 `SCHEMA_APPLY_REAL_TO_VIRTUAL`과 구분 (덮어쓰기 vs 새 버전)

### Phase 6: Migration Tab UI
**Scope**: F10
**Files**: New feature folder `src/renderer/features/migration-wizard/`

1. `MigrationWizardView.tsx` - Step-by-step 마법사 메인 컴포넌트
2. Step 1: `SourceTargetSelector.tsx` - Snapshot + Version 선택
3. Step 2: `DiffPreview.tsx` - Diff + SQL Preview (Update/Rollback 토글)
4. Step 3: `ExecutionView.tsx` - 진행률 + 실행 로그
5. Step 4: `VerificationView.tsx` - Validation 결과 + 후처리 액션
6. DiagramTabBar에 Migration 탭 추가

### Phase 7: Real Tab Snapshot Panel
**Scope**: F1 (UI), F9
**Files**: RealDiagramView 확장

1. Real Diagram 좌측에 Snapshot Panel 추가
2. Snapshot 목록, Validation 상태 뱃지
3. "Create Snapshot", "Validate" 버튼
4. Snapshot 선택 시 해당 스키마 읽기전용 표시

### Phase 8: Diff Tab 확장
**Scope**: F7
**Files**: DiffView 확장

1. Diff Mode 선택 UI (4가지 모드)
2. Snapshot↔Snapshot Diff
3. Snapshot↔Virtual Version Diff
4. 기존 Virtual↔Real, Version↔Version 유지

---

## 8. Technical Considerations

### 8.1 Checksum Generation

테이블/컬럼 구조를 정규화하여 결정론적 해시 생성:

```ts
function generateSchemaChecksum(tables: ITable[]): string {
  const normalized = tables
    .map(t => ({
      name: t.name,
      columns: t.columns
        .sort((a, b) => a.ordinalPosition - b.ordinalPosition)
        .map(c => `${c.name}:${c.dataType}:${c.nullable}:${c.keyType}:${c.defaultValue}`),
      constraints: (t.constraints ?? [])
        .sort((a, b) => a.name.localeCompare(b.name))
        .map(c => `${c.name}:${c.type}:${c.columns.join(',')}`),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return sha256(JSON.stringify(normalized));
}
```

### 8.2 Statement-by-Statement Execution

```ts
async function executeStatements(connectionId: string, sql: string): Promise<IMigrationLog[]> {
  const statements = parseSqlStatements(sql); // semicolon-based split
  const logs: IMigrationLog[] = [];

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i].trim();
    if (!stmt) continue;

    const start = Date.now();
    try {
      await queryService.execute(connectionId, stmt);
      logs.push({ statementIndex: i, sql: stmt, status: 'success', durationMs: Date.now() - start, executedAt: new Date().toISOString() });
    } catch (error) {
      logs.push({ statementIndex: i, sql: stmt, status: 'failed', durationMs: Date.now() - start, error: String(error), executedAt: new Date().toISOString() });
      break; // Stop on first failure
    }
  }

  return logs;
}
```

### 8.3 SHA256 in Electron

Node.js `crypto` 모듈 사용 (main process):

```ts
import crypto from 'node:crypto';
function sha256(data: string): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}
```

### 8.4 connectionService 주의사항

- connectionService는 풀링 없이 매번 새 커넥션 생성
- Statement-by-statement 실행 시 **같은 커넥션** 유지 필요 → Transaction 활용 고려
- MySQL/PostgreSQL 모두 Transaction 내에서 DDL이 auto-commit될 수 있음에 주의
  - MySQL: DDL은 implicit commit → Statement 단위 rollback 불가
  - PostgreSQL: DDL은 Transaction 내에서 rollback 가능

---

## 9. Risk & Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| DDL 실행 중 연결 끊김 | 부분 적용 | 실행 로그 기록 + 재시도/수동 Rollback 가이드 |
| MySQL DDL auto-commit | Rollback 불가 | Statement 별 Rollback SQL 개별 생성 |
| 대규모 스키마 Diff 계산 비용 | 느린 응답 | Worker thread 또는 progressive rendering |
| 스냅샷 데이터 크기 | 저장 공간 | JSON 압축 또는 스냅샷 개수 제한 (기본 20개) |
| Rollback SQL이 완벽하지 않을 수 있음 | 복원 실패 | Rollback 전 반드시 Preview + 수동 편집 가능 |

---

## 10. Verification

| # | Test | Phase |
|---|------|-------|
| 1 | Real DB sync → Create Snapshot → 스냅샷 목록에 표시 | P1 |
| 2 | Snapshot checksum 일관성 (같은 스키마 → 같은 checksum) | P1 |
| 3 | Validate Snapshot → Valid (변경 없을 때) | P2 |
| 4 | DB 수동 변경 후 Validate → Invalid + Diff 목록 | P2 |
| 5 | Migration Plan 생성 → Update SQL + Rollback SQL 확인 | P3 |
| 6 | Execute Migration → Statement-by-statement 성공 | P4 |
| 7 | Execute 중 실패 → 중단 + 로그 기록 + Rollback 제안 | P4 |
| 8 | Post-Apply Validation → New Snapshot + Validate 통과 | P4 |
| 9 | Rollback → 이전 상태 복원 → Validate 통과 | P4 |
| 10 | Real → Virtual 새 버전 생성 → 버전 목록에 표시 | P5 |
| 11 | Migration Wizard Step 1~4 완료 | P6 |
| 12 | Real Tab에 Snapshot Panel 표시 | P7 |
| 13 | Diff Tab에서 Snapshot↔Version 비교 | P8 |
| 14 | TypeCheck: `npx tsc --noEmit` 통과 | All |

---

## 11. Dependency on Other Features

| Feature | 의존성 | 설명 |
|---------|--------|------|
| diagram-ux-improvement | Optional | 버전 드롭다운(F4) 구현 시 활용 가능 |
| 기존 schemaDiffService | Required | Diff 계산 로직 재사용 |
| 기존 connectionService | Required | 실제 DB 연결 및 쿼리 실행 |
| 기존 ForwardEngineerPanel | Replace | Migration Wizard로 대체 |
