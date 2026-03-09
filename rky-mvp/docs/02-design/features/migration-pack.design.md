# Migration Pack Design Document

> **Summary**: Version→Version Diff 기반 Migration Pack (DDL + Seed DML + Rollback DDL) 생성, Pre-Apply Validation으로 외부 DB 변경 감지, Statement-by-statement 안전 적용. Diff 탭 확장으로 UI 제공.
>
> **Plan Reference**: `docs/01-plan/features/safe-schema-migration.plan.md`
> **Version**: 0.5.0
> **Author**: rhiemh
> **Date**: 2026-02-12
> **Status**: Draft

---

## 1. Architecture Overview

### 1.1 Component Hierarchy

```
DbDiagramPage
├── DiagramTabBar                    [Virtual | Real | Diff]
│
├── VirtualDiagramView               ← 변경 없음 (기존 Compare 기능 유지)
│
├── RealDiagramView                  ← Phase 6: Snapshot Panel 추가
│   ├── RealDiagramToolbar
│   │   └── [Sync] [Create Snapshot] [Validate]   ← NEW
│   ├── SnapshotListPanel (Left)                    ← NEW
│   ├── DiagramCanvas (Center)
│   └── TableDetailPanel (Right)
│
└── DiffView                         ← Phase 7: Migrate 모드 추가
    ├── DiffToolbar
    │   └── Mode: [Compare ▼ | Migrate ▼]          ← NEW
    │
    ├── CompareMode (기존 Diff 기능)
    │   └── DiffSummary, TableDiffItem, MigrationDdlView
    │
    └── MigrateMode (NEW)
        └── MigrationWizard
            ├── Step 1: VersionSelector
            ├── Step 2: MigrationReview
            ├── Step 3: ExecutionView
            └── Step 4: VerificationView
```

### 1.2 Backend Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│ IPC Handlers                                                         │
│   schemaHandlers.ts (기존 + snapshot 추가)                            │
│   migrationPackHandlers.ts (NEW)                                     │
├─────────────────────────────────────────────────────────────────────┤
│ Services                                                             │
│   schemaSnapshotService (NEW)  │  migrationPackService (NEW)         │
│   - create(connectionId)       │  - create(diagramId, src, tgt)      │
│   - validate(snapshotId)       │  - updateSeedDml(id, dml)           │
│   - validateAgainstVersion()   │  - execute(id)                      │
│   - list(connectionId)         │  - rollback(id)                     │
│   - delete(id)                 │  - postValidate(id)                 │
│   - generateChecksum(tables)   │  - list(diagramId)                  │
├─────────────────────────────────────────────────────────────────────┤
│ Repositories                                                         │
│   schemaSnapshotRepository     │  migrationPackRepository (NEW)      │
│   (NEW)                        │                                     │
├─────────────────────────────────────────────────────────────────────┤
│ Reused Infrastructure                                                │
│   diffService (기존)            │  connectionService (기존)            │
│   schemaService (기존)          │  migrationService (참고용)           │
│   diagramVersionRepository     │  changelogRepository                │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 2. Data Model Changes

### 2.1 New Type: ISchemaSnapshot

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
  checksum: string;
  validatedAt?: string;
  isValid?: boolean;
  createdAt: string;
}
```

### 2.2 New Type: IMigrationPack

```ts
export type TMigrationPackStatus =
  | 'draft'       // 생성됨, 아직 리뷰 전
  | 'reviewed'    // Seed DML 편집 완료, 적용 준비
  | 'executing'   // 적용 중
  | 'applied'     // 성공적으로 적용됨
  | 'failed'      // 적용 실패 (부분 적용)
  | 'rolled_back'; // 롤백 완료

export interface IMigrationPack {
  id: string;
  connectionId: string;
  diagramId: string;
  sourceVersionId: string | null;  // null = empty schema
  targetVersionId: string;
  preSnapshotId?: string;          // 적용 전 DB 상태 백업
  diff: IDiffResult;
  updateDdl: string;
  seedDml: string;                 // 사용자 편집 가능
  rollbackDdl: string;
  status: TMigrationPackStatus;
  executionLog?: IMigrationLog[];
  appliedAt?: string;
  rolledBackAt?: string;
  postSnapshotId?: string;         // 적용 후 DB 상태
  createdAt: string;
}

export interface IMigrationLog {
  statementIndex: number;
  sql: string;
  phase: 'ddl' | 'dml' | 'rollback';
  status: 'success' | 'failed' | 'skipped';
  durationMs: number;
  error?: string;
  executedAt: string;
}
```

### 2.3 New Type: IValidationResult

```ts
export interface IValidationResult {
  snapshotId: string;
  connectionId: string;
  isValid: boolean;
  matchedTables: number;
  totalTables: number;
  diffs: ITableDiff[];     // 기존 ITableDiff 재사용
  checkedAt: string;
}
```

### 2.4 Type Changes: IDiffResult 확장

기존 `IDiffResult`에 source/target version 정보 추가:

```ts
// 기존 필드 유지 + 추가
export interface IDiffResult {
  // ... existing fields ...
  sourceVersionId?: string;  // NEW (optional for backward compat)
  targetVersionId?: string;  // NEW
}
```

---

## 3. Database Schema

### 3.1 schema_snapshots (NEW)

```sql
CREATE TABLE IF NOT EXISTS schema_snapshots (
  id TEXT PRIMARY KEY,
  connection_id TEXT NOT NULL,
  name TEXT NOT NULL,
  tables_json TEXT NOT NULL,
  metadata_json TEXT NOT NULL,
  checksum TEXT NOT NULL,
  validated_at TEXT,
  is_valid INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (connection_id) REFERENCES connections(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_snapshots_connection
  ON schema_snapshots(connection_id);
```

### 3.2 migration_packs (NEW)

```sql
CREATE TABLE IF NOT EXISTS migration_packs (
  id TEXT PRIMARY KEY,
  connection_id TEXT NOT NULL,
  diagram_id TEXT NOT NULL,
  source_version_id TEXT,
  target_version_id TEXT NOT NULL,
  pre_snapshot_id TEXT,
  diff_json TEXT NOT NULL,
  update_ddl TEXT NOT NULL,
  seed_dml TEXT NOT NULL DEFAULT '',
  rollback_ddl TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK(status IN ('draft','reviewed','executing','applied','failed','rolled_back')),
  execution_log_json TEXT,
  applied_at TEXT,
  rolled_back_at TEXT,
  post_snapshot_id TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (connection_id) REFERENCES connections(id) ON DELETE CASCADE,
  FOREIGN KEY (diagram_id) REFERENCES diagrams(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_migration_packs_diagram
  ON migration_packs(diagram_id);
CREATE INDEX IF NOT EXISTS idx_migration_packs_connection
  ON migration_packs(connection_id);
```

### 3.3 Migration (localDb.schema.ts)

```ts
// alterMigrations[] 에 추가
export const SQL_CREATE_SCHEMA_SNAPSHOTS = `
  CREATE TABLE IF NOT EXISTS schema_snapshots ( ... );
`;
export const SQL_CREATE_MIGRATION_PACKS = `
  CREATE TABLE IF NOT EXISTS migration_packs ( ... );
`;
```

**Note**: `CREATE TABLE IF NOT EXISTS` 사용으로 안전 마이그레이션.

---

## 4. IPC Channels

### 4.1 New Channels (channels.ts)

```ts
// Schema Snapshot
SCHEMA_SNAPSHOT_LIST:      'schema-snapshot:list',
SCHEMA_SNAPSHOT_CREATE:    'schema-snapshot:create',
SCHEMA_SNAPSHOT_GET:       'schema-snapshot:get',
SCHEMA_SNAPSHOT_DELETE:    'schema-snapshot:delete',
SCHEMA_SNAPSHOT_RENAME:    'schema-snapshot:rename',
SCHEMA_SNAPSHOT_VALIDATE:  'schema-snapshot:validate',

// Migration Pack
MIGRATION_PACK_LIST:       'migration-pack:list',
MIGRATION_PACK_CREATE:     'migration-pack:create',
MIGRATION_PACK_GET:        'migration-pack:get',
MIGRATION_PACK_UPDATE_DML: 'migration-pack:update-dml',
MIGRATION_PACK_EXECUTE:    'migration-pack:execute',
MIGRATION_PACK_ROLLBACK:   'migration-pack:rollback',
MIGRATION_PACK_DELETE:     'migration-pack:delete',

// Composite
SCHEMA_VALIDATE_AGAINST_VERSION: 'schema:validate-against-version',
SYNC_REAL_TO_VIRTUAL_VERSION:    'schema:sync-real-to-virtual-version',
```

### 4.2 New IPC Events (events.ts)

```ts
[CHANNELS.SCHEMA_SNAPSHOT_LIST]: {
  args: { connectionId: string };
  response: { success: boolean; data: ISchemaSnapshot[] };
};
[CHANNELS.SCHEMA_SNAPSHOT_CREATE]: {
  args: { connectionId: string; name?: string };
  response: { success: boolean; data: ISchemaSnapshot };
};
[CHANNELS.SCHEMA_SNAPSHOT_VALIDATE]: {
  args: { snapshotId: string };
  response: { success: boolean; data: IValidationResult };
};

[CHANNELS.MIGRATION_PACK_CREATE]: {
  args: {
    connectionId: string;
    diagramId: string;
    sourceVersionId: string | null;
    targetVersionId: string;
  };
  response: { success: boolean; data: IMigrationPack };
};
[CHANNELS.MIGRATION_PACK_UPDATE_DML]: {
  args: { id: string; seedDml: string };
  response: { success: boolean; data: IMigrationPack };
};
[CHANNELS.MIGRATION_PACK_EXECUTE]: {
  args: { id: string };
  response: { success: boolean; data: IMigrationPack };
};
[CHANNELS.MIGRATION_PACK_ROLLBACK]: {
  args: { id: string };
  response: { success: boolean; data: IMigrationPack };
};

[CHANNELS.SCHEMA_VALIDATE_AGAINST_VERSION]: {
  args: { connectionId: string; versionId: string };
  response: { success: boolean; data: IValidationResult };
};
[CHANNELS.SYNC_REAL_TO_VIRTUAL_VERSION]: {
  args: { connectionId: string; diagramId: string; versionName?: string };
  response: { success: boolean; data: IDiagramVersion };
};
```

---

## 5. Service Layer Design

### 5.1 schemaSnapshotService

```
src/main/services/schemaSnapshotService.ts
```

| Method | Input | Output | Description |
|--------|-------|--------|-------------|
| `create` | `connectionId, name?` | `ISchemaSnapshot` | Real DB 스키마 가져오기 → checksum 생성 → 저장 |
| `validate` | `snapshotId` | `IValidationResult` | 스냅샷 vs 현재 Real DB 스키마 비교 |
| `validateAgainstVersion` | `connectionId, versionId` | `IValidationResult` | Real DB vs 특정 Version의 스키마 비교 |
| `list` | `connectionId` | `ISchemaSnapshot[]` | 연결별 스냅샷 목록 |
| `getById` | `id` | `ISchemaSnapshot` | 단건 조회 |
| `delete` | `id` | `void` | 삭제 |
| `rename` | `id, name` | `ISchemaSnapshot` | 이름 변경 |

**Checksum 알고리즘** (결정론적):

```ts
function generateChecksum(tables: ITable[]): string {
  const normalized = tables
    .map(t => ({
      name: t.name.toLowerCase(),
      columns: t.columns
        .sort((a, b) => a.name.localeCompare(b.name))
        .map(c => `${c.name}|${c.dataType}|${c.nullable}|${(c.keyTypes??[]).join(',')}|${c.defaultValue??''}`),
      constraints: (t.constraints ?? [])
        .sort((a, b) => a.name.localeCompare(b.name))
        .map(c => `${c.name}|${c.type}|${c.columns.join(',')}`),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return crypto.createHash('sha256').update(JSON.stringify(normalized)).digest('hex');
}
```

**validate 흐름**:

```
validate(snapshotId):
  1. snapshot = snapshotRepository.getById(snapshotId)
  2. liveTables = await schemaService.fetchRealSchema(snapshot.connectionId)
  3. diffs = diffService.compareTables(snapshot.tables, liveTables)
  4. isValid = diffs.length === 0
  5. snapshotRepository.updateValidation(snapshotId, isValid)
  6. return { snapshotId, connectionId, isValid, matchedTables, totalTables, diffs, checkedAt }
```

### 5.2 migrationPackService

```
src/main/services/migrationPackService.ts
```

| Method | Input | Output | Description |
|--------|-------|--------|-------------|
| `create` | `connectionId, diagramId, sourceVersionId, targetVersionId` | `IMigrationPack` | Version diff → DDL + Rollback DDL 생성 |
| `updateSeedDml` | `id, seedDml` | `IMigrationPack` | Seed DML 편집 저장 |
| `execute` | `id` | `IMigrationPack` | DDL → DML 순서로 적용 |
| `rollback` | `id` | `IMigrationPack` | Rollback DDL 적용 |
| `postValidate` | `id` | `IValidationResult` | 적용 후 검증 |
| `list` | `diagramId` | `IMigrationPack[]` | 다이어그램별 목록 |
| `getById` | `id` | `IMigrationPack` | 단건 조회 |
| `delete` | `id` | `void` | 삭제 |

**create 흐름** (핵심):

```
create(connectionId, diagramId, sourceVersionId, targetVersionId):
  1. sourceVersion = sourceVersionId
       ? diagramVersionRepository.getById(sourceVersionId)
       : null  // empty schema
  2. targetVersion = diagramVersionRepository.getById(targetVersionId)

  3. sourceTables = sourceVersion?.schemaSnapshot?.tables ?? []
  4. targetTables = targetVersion.schemaSnapshot.tables

  5. // 기존 diffService 로직 재사용
  6. diff = diffService.compareTableArrays(sourceTables, targetTables)
  7. updateDdl = diffService.generateMigrationDdl(diff, dbType)
  8. rollbackDdl = diffService.generateRollbackDdl(diff, dbType)

  9. pack = migrationPackRepository.create({
       connectionId, diagramId, sourceVersionId, targetVersionId,
       diff, updateDdl, seedDml: '', rollbackDdl, status: 'draft'
     })
  10. return pack
```

**execute 흐름**:

```
execute(packId):
  1. pack = migrationPackRepository.getById(packId)
  2. assert pack.status === 'draft' || pack.status === 'reviewed'

  3. // Pre-Apply: 스냅샷 생성 + 보관
  4. preSnapshot = schemaSnapshotService.create(pack.connectionId, `pre-${packId}`)
  5. migrationPackRepository.update(packId, { preSnapshotId: preSnapshot.id, status: 'executing' })

  6. logs: IMigrationLog[] = []

  7. // Phase 1: DDL
  8. ddlStatements = splitStatements(pack.updateDdl)
  9. for (i, stmt) of ddlStatements:
       try:
         await queryService.execute(pack.connectionId, stmt)
         logs.push({ statementIndex: i, sql: stmt, phase: 'ddl', status: 'success', ... })
       catch:
         logs.push({ statementIndex: i, sql: stmt, phase: 'ddl', status: 'failed', error, ... })
         migrationPackRepository.update(packId, { executionLog: logs, status: 'failed' })
         return pack  // Stop on first failure

  10. // Phase 2: Seed DML (only if DDL succeeded)
  11. if pack.seedDml:
       dmlStatements = splitStatements(pack.seedDml)
       for (j, stmt) of dmlStatements:
         try:
           await queryService.execute(pack.connectionId, stmt)
           logs.push({ ..., phase: 'dml', status: 'success' })
         catch:
           logs.push({ ..., phase: 'dml', status: 'failed', error })
           migrationPackRepository.update(packId, { executionLog: logs, status: 'failed' })
           return pack

  12. migrationPackRepository.update(packId, {
        executionLog: logs, status: 'applied', appliedAt: now()
      })
  13. return pack
```

**rollback 흐름**:

```
rollback(packId):
  1. pack = migrationPackRepository.getById(packId)
  2. assert pack.status === 'applied' || pack.status === 'failed'

  3. logs: IMigrationLog[] = pack.executionLog ?? []

  4. rollbackStatements = splitStatements(pack.rollbackDdl)
  5. for (i, stmt) of rollbackStatements:
       try:
         await queryService.execute(pack.connectionId, stmt)
         logs.push({ ..., phase: 'rollback', status: 'success' })
       catch:
         logs.push({ ..., phase: 'rollback', status: 'failed', error })
         // Continue (best-effort rollback)

  6. migrationPackRepository.update(packId, {
       executionLog: logs, status: 'rolled_back', rolledBackAt: now()
     })
  7. return pack
```

### 5.3 diffService 확장

기존 `diffService`에 테이블 배열 직접 비교 메서드 추가:

```ts
// 기존: compareDiagrams(virtualDiagramId, connectionId) - 다이어그램 ID 기반
// 기존: compareVirtualDiagrams(sourceId, targetId) - 다이어그램 ID 기반

// NEW: 테이블 배열을 직접 비교 (버전 스냅샷에서 추출한 tables)
compareTableArrays(
  sourceTables: ITable[],
  targetTables: ITable[],
  options?: { sourceName?: string; targetName?: string }
): IDiffResult

// NEW: dbType별 DDL 생성 (기존 내부 함수를 public으로 노출)
generateMigrationDdl(diff: IDiffResult, dbType: TDbType): string
generateRollbackDdl(diff: IDiffResult, dbType: TDbType): string
```

---

## 6. Repository Layer Design

### 6.1 schemaSnapshotRepository

```
src/main/repositories/schemaSnapshotRepository.ts
```

```ts
interface SchemaSnapshotRow {
  id: string;
  connection_id: string;
  name: string;
  tables_json: string;
  metadata_json: string;
  checksum: string;
  validated_at: string | null;
  is_valid: number;
  created_at: string;
}

export const schemaSnapshotRepository = {
  list(connectionId: string): ISchemaSnapshot[];
  getById(id: string): ISchemaSnapshot | null;
  create(data: Omit<ISchemaSnapshot, 'id' | 'createdAt'>): ISchemaSnapshot;
  updateValidation(id: string, isValid: boolean): void;
  rename(id: string, name: string): ISchemaSnapshot;
  deleteById(id: string): void;
};
```

### 6.2 migrationPackRepository

```
src/main/repositories/migrationPackRepository.ts
```

```ts
interface MigrationPackRow {
  id: string;
  connection_id: string;
  diagram_id: string;
  source_version_id: string | null;
  target_version_id: string;
  pre_snapshot_id: string | null;
  diff_json: string;
  update_ddl: string;
  seed_dml: string;
  rollback_ddl: string;
  status: string;
  execution_log_json: string | null;
  applied_at: string | null;
  rolled_back_at: string | null;
  post_snapshot_id: string | null;
  created_at: string;
}

export const migrationPackRepository = {
  list(diagramId: string): IMigrationPack[];
  getById(id: string): IMigrationPack | null;
  create(data: Omit<IMigrationPack, 'id' | 'createdAt'>): IMigrationPack;
  update(id: string, data: Partial<IMigrationPack>): IMigrationPack;
  deleteById(id: string): void;
};
```

---

## 7. Renderer Feature Design

### 7.1 Feature Folder Structure

```
src/renderer/features/
├── migration-pack/                    ← NEW feature
│   ├── api/
│   │   └── migrationPackApi.ts        ← IPC client
│   ├── model/
│   │   ├── useMigrationPacks.ts       ← React Query hooks
│   │   └── useSchemaSnapshots.ts      ← React Query hooks
│   ├── lib/
│   │   └── formatExecutionLog.ts      ← 실행 로그 포맷터
│   └── ui/
│       ├── MigrationWizard.tsx        ← Step orchestrator
│       ├── VersionSelector.tsx        ← Step 1
│       ├── MigrationReview.tsx        ← Step 2
│       ├── SeedDmlEditor.tsx          ← Step 2 하위 (DML 에디터)
│       ├── ExecutionView.tsx          ← Step 3
│       ├── VerificationView.tsx       ← Step 4
│       └── MigrationPackList.tsx      ← 기존 팩 목록/히스토리
│
├── schema-snapshot/                   ← NEW feature
│   ├── api/
│   │   └── snapshotApi.ts
│   ├── model/
│   │   └── useSnapshots.ts
│   └── ui/
│       ├── SnapshotListPanel.tsx      ← Real Tab 좌측 패널
│       └── ValidationBadge.tsx        ← 검증 상태 뱃지
│
├── diagram-diff/                      ← EXTEND (기존)
│   └── ui/
│       ├── DiffView.tsx               ← MODIFY: 모드 추가
│       └── DiffModeSelector.tsx       ← NEW: Compare/Migrate 토글
```

### 7.2 MigrationWizard Component

```tsx
// Step management
interface MigrationWizardProps {
  diagramId: string;
  connectionId: string;
  versions: IDiagramVersion[];
  onComplete?: () => void;
  onClose?: () => void;
}

type WizardStep = 'select' | 'review' | 'execute' | 'verify';

// State
const [step, setStep] = useState<WizardStep>('select');
const [sourceVersionId, setSourceVersionId] = useState<string | null>(null);
const [targetVersionId, setTargetVersionId] = useState<string | null>(null);
const [pack, setPack] = useState<IMigrationPack | null>(null);
const [preValidation, setPreValidation] = useState<IValidationResult | null>(null);
```

### 7.3 Step 1: VersionSelector

```
┌─────────────────────────────────────────────────────────────┐
│  Source Version              →            Target Version      │
│  ┌──────────────────┐                ┌──────────────────┐   │
│  │ [▼ v1.0.0 (64t)] │                │ [▼ v2.0.0 (72t)] │   │
│  │  or (empty)       │                │                   │   │
│  └──────────────────┘                └──────────────────┘   │
│                                                              │
│  Pre-Apply Validation:                                       │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ [Validate DB State]                                    │   │
│  │ ✅ DB matches source version (64/64 tables)            │   │
│  │ ⚠️ 2 tables differ (click to see details)              │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│                           [Generate Migration Pack →]        │
└─────────────────────────────────────────────────────────────┘
```

**Key behaviors**:
- Source 선택 시 자동으로 Pre-Apply Validation 트리거
- Validation 실패 시 Diff 상세 표시 + 경고 (force 진행 옵션)
- Source "(empty)" = 빈 DB에서 시작 (모든 테이블 CREATE)
- "Generate Migration Pack" 클릭 → `MIGRATION_PACK_CREATE` IPC 호출

### 7.4 Step 2: MigrationReview

```
┌─────────────────────────────────────────────────────────────┐
│  Summary: +8 tables, ~12 modified, -0 removed                │
│                                                              │
│  ┌── Table Changes ──────┐  ┌── SQL Tab: [DDL|DML|Rollback] │
│  │ + users_roles          │  │                                │
│  │ + audit_logs           │  │ -- Update DDL (auto-generated) │
│  │ ~ users (3 col)        │  │ CREATE TABLE users_roles (...);│
│  │ ~ orders (1 col)       │  │ ALTER TABLE users ADD ...;     │
│  │ = products             │  │                                │
│  └────────────────────────┘  │ -- Seed DML (editable)         │
│                               │ INSERT INTO users_roles ...;   │
│                               │                                │
│                               │ -- Rollback DDL (auto)         │
│                               │ DROP TABLE users_roles;        │
│                               └────────────────────────────────│
│                                                              │
│  [← Back]                              [Apply Migration →]   │
└─────────────────────────────────────────────────────────────┘
```

**Key behaviors**:
- DDL/Rollback DDL은 읽기전용 (자동 생성)
- Seed DML은 편집 가능 (textarea 또는 CodeMirror)
- Seed DML 변경 시 자동 저장 (`MIGRATION_PACK_UPDATE_DML`)
- Table Changes 목록은 기존 `TableDiffItem` 컴포넌트 재사용

### 7.5 Step 3: ExecutionView

```
┌─────────────────────────────────────────────────────────────┐
│  Phase 1: Update DDL                                         │
│  ████████████████░░░░  16/20 statements          0.45s       │
│                                                              │
│  ✅ CREATE TABLE users_roles (...)              23ms         │
│  ✅ CREATE TABLE audit_logs (...)               45ms         │
│  ✅ ALTER TABLE users ADD COLUMN role_id INT    12ms         │
│  🔄 ALTER TABLE orders ADD COLUMN notes TEXT    ...          │
│  ⬜ (4 more pending)                                         │
│                                                              │
│  Phase 2: Seed DML                                           │
│  ⬜ 5 statements pending                                     │
│                                                              │
│  [Abort + Rollback]                                          │
└─────────────────────────────────────────────────────────────┘
```

**Key behaviors**:
- 실시간 진행률 표시 (polling 또는 IPC streaming)
- 실패 시 자동 중단 + Rollback 버튼 표시
- Phase 1 (DDL) 완료 후 Phase 2 (DML) 시작
- Abort 시 확인 다이얼로그 후 Rollback 실행

**구현 방식**: `MIGRATION_PACK_EXECUTE` IPC는 동기적으로 실행하고 최종 결과 반환.
실시간 진행률이 필요하면 추후 IPC streaming 추가 가능 (v2).

### 7.6 Step 4: VerificationView

```
┌─────────────────────────────────────────────────────────────┐
│  ✅ Migration Pack Applied Successfully                      │
│  20 DDL + 5 DML in 0.89s                                    │
│                                                              │
│  Post-Apply Verification:                                    │
│  ✅ Real DB re-synced (72 tables)                            │
│  ✅ Snapshot created: "post-migration-2026-02-12"            │
│  ✅ Validation: 72/72 tables match target version            │
│                                                              │
│  Actions:                                                    │
│  [View Snapshot] [Create Virtual Version from Real] [Rollback]│
│                                                              │
│  [Complete]                                                  │
└─────────────────────────────────────────────────────────────┘
```

**Key behaviors**:
- 적용 완료 후 자동으로:
  1. Real Diagram re-sync (`SCHEMA_SYNC_REAL`)
  2. Post-snapshot 생성 (`SCHEMA_SNAPSHOT_CREATE`)
  3. Target version 대비 검증 (`SCHEMA_VALIDATE_AGAINST_VERSION`)
- "Create Virtual Version from Real" → `SYNC_REAL_TO_VIRTUAL_VERSION`
- Rollback 시 확인 다이얼로그 후 `MIGRATION_PACK_ROLLBACK`

### 7.7 DiffView 모드 확장

기존 `DiffView.tsx` 수정:

```tsx
// 기존 상태
const [diffMode, setDiffMode] = useState<TDiffMode>('virtual_vs_real');

// 추가
type TDiffViewMode = 'compare' | 'migrate';
const [viewMode, setViewMode] = useState<TDiffViewMode>('compare');

// Render
{viewMode === 'compare' ? (
  <CompareMode /> // 기존 DiffView 콘텐츠
) : (
  <MigrationWizard
    diagramId={selectedDiagramId}
    connectionId={selectedConnectionId}
    versions={versions}
  />
)}
```

### 7.8 SnapshotListPanel (Real Tab)

```tsx
interface SnapshotListPanelProps {
  connectionId: string;
  onSnapshotSelect?: (snapshot: ISchemaSnapshot) => void;
  onCreateSnapshot?: () => void;
  onValidateSnapshot?: (id: string) => void;
}
```

```
┌─ Snapshots ──────────────────┐
│ [+ Create Snapshot]           │
│                               │
│ ● Current (live)              │
│ 📷 snap-2026-02-12            │
│   ✅ Validated 2min ago       │
│   64 tables | a3f2...         │
│ 📷 snap-2026-02-11            │
│   ⚠️ Not validated            │
│   62 tables | b7c1...         │
└───────────────────────────────┘
```

---

## 8. React Query Hooks

### 8.1 useSchemaSnapshots

```ts
// src/renderer/features/schema-snapshot/model/useSnapshots.ts
const snapshotKeys = {
  all: ['snapshots'] as const,
  list: (connectionId: string) => [...snapshotKeys.all, 'list', connectionId] as const,
};

export function useSnapshots(connectionId: string);
export function useCreateSnapshot();
export function useValidateSnapshot();
export function useDeleteSnapshot();
export function useRenameSnapshot();
```

### 8.2 useMigrationPacks

```ts
// src/renderer/features/migration-pack/model/useMigrationPacks.ts
const packKeys = {
  all: ['migration-packs'] as const,
  list: (diagramId: string) => [...packKeys.all, 'list', diagramId] as const,
  detail: (id: string) => [...packKeys.all, 'detail', id] as const,
};

export function useMigrationPacks(diagramId: string);
export function useCreateMigrationPack();
export function useUpdateSeedDml();
export function useExecuteMigrationPack();
export function useRollbackMigrationPack();
export function useDeleteMigrationPack();
export function useValidateAgainstVersion();
export function useSyncRealToVirtualVersion();
```

---

## 9. Implementation Phases

### Phase 1: Schema Snapshot Infrastructure (Backend)

| # | Task | Files |
|---|------|-------|
| 1 | `ISchemaSnapshot`, `IValidationResult` 타입 추가 | `db.ts` |
| 2 | `schema_snapshots` 테이블 생성 | `localDb.schema.ts` |
| 3 | `schemaSnapshotRepository` 구현 | `repositories/schemaSnapshotRepository.ts` (NEW) |
| 4 | `schemaSnapshotService` 구현 | `services/schemaSnapshotService.ts` (NEW) |
| 5 | Checksum 생성 로직 (`crypto.createHash`) | `schemaSnapshotService.ts` |
| 6 | IPC channels + handlers 등록 | `channels.ts`, `events.ts`, `schemaHandlers.ts` |
| 7 | `repositories/index.ts` 업데이트 | `repositories/index.ts` |

### Phase 2: Schema Validation (Backend)

| # | Task | Files |
|---|------|-------|
| 1 | `diffService.compareTableArrays()` 추가 | `diffService.ts` |
| 2 | `schemaSnapshotService.validate()` 구현 | `schemaSnapshotService.ts` |
| 3 | `schemaSnapshotService.validateAgainstVersion()` 구현 | `schemaSnapshotService.ts` |
| 4 | `SCHEMA_SNAPSHOT_VALIDATE` IPC handler | `schemaHandlers.ts` |
| 5 | `SCHEMA_VALIDATE_AGAINST_VERSION` IPC handler | `schemaHandlers.ts` |

### Phase 3: Migration Pack (Backend)

| # | Task | Files |
|---|------|-------|
| 1 | `IMigrationPack`, `IMigrationLog`, `TMigrationPackStatus` 타입 추가 | `db.ts` |
| 2 | `migration_packs` 테이블 생성 | `localDb.schema.ts` |
| 3 | `migrationPackRepository` 구현 | `repositories/migrationPackRepository.ts` (NEW) |
| 4 | `diffService.generateMigrationDdl()`, `generateRollbackDdl()` public 노출 | `diffService.ts` |
| 5 | `migrationPackService` 구현 (create, updateSeedDml, list, get, delete) | `services/migrationPackService.ts` (NEW) |
| 6 | IPC channels + handlers 등록 | `channels.ts`, `events.ts`, `migrationPackHandlers.ts` (NEW) |

### Phase 4: Safe Apply + Rollback (Backend)

| # | Task | Files |
|---|------|-------|
| 1 | `migrationPackService.execute()` 구현 (DDL → DML 순차) | `migrationPackService.ts` |
| 2 | `migrationPackService.rollback()` 구현 | `migrationPackService.ts` |
| 3 | `migrationPackService.postValidate()` 구현 | `migrationPackService.ts` |
| 4 | `MIGRATION_PACK_EXECUTE`, `ROLLBACK` IPC handlers | `migrationPackHandlers.ts` |
| 5 | `SYNC_REAL_TO_VIRTUAL_VERSION` IPC handler | `schemaHandlers.ts` |

### Phase 5: Renderer - Snapshot Feature

| # | Task | Files |
|---|------|-------|
| 1 | `snapshotApi.ts` IPC client | `features/schema-snapshot/api/` (NEW) |
| 2 | `useSnapshots.ts` React Query hooks | `features/schema-snapshot/model/` (NEW) |
| 3 | `SnapshotListPanel.tsx` + `ValidationBadge.tsx` | `features/schema-snapshot/ui/` (NEW) |
| 4 | Real Tab에 SnapshotListPanel 통합 | `features/real-diagram/ui/RealDiagramView.tsx` |

### Phase 6: Renderer - Migration Wizard

| # | Task | Files |
|---|------|-------|
| 1 | `migrationPackApi.ts` IPC client | `features/migration-pack/api/` (NEW) |
| 2 | `useMigrationPacks.ts` React Query hooks | `features/migration-pack/model/` (NEW) |
| 3 | `MigrationWizard.tsx` Step orchestrator | `features/migration-pack/ui/` (NEW) |
| 4 | `VersionSelector.tsx` (Step 1) | `features/migration-pack/ui/` (NEW) |
| 5 | `MigrationReview.tsx` + `SeedDmlEditor.tsx` (Step 2) | `features/migration-pack/ui/` (NEW) |
| 6 | `ExecutionView.tsx` (Step 3) | `features/migration-pack/ui/` (NEW) |
| 7 | `VerificationView.tsx` (Step 4) | `features/migration-pack/ui/` (NEW) |
| 8 | `MigrationPackList.tsx` 히스토리 뷰 | `features/migration-pack/ui/` (NEW) |

### Phase 7: DiffView 확장

| # | Task | Files |
|---|------|-------|
| 1 | `DiffModeSelector.tsx` (Compare/Migrate 토글) | `features/diagram-diff/ui/` (NEW) |
| 2 | DiffView에 viewMode 상태 + MigrationWizard 통합 | `features/diagram-diff/ui/DiffView.tsx` |
| 3 | Compare 모드에 Snapshot 관련 diff 모드 추가 | `DiffView.tsx` |

---

## 10. Technical Considerations

### 10.1 connectionService 주의사항

- **풀링 없음**: 매번 새 커넥션 생성 → execute 시 같은 커넥션 재사용 필요
- `migrationPackService.execute()`에서 커넥션 1개를 생성하고 모든 statement를 순차 실행
- MySQL DDL은 implicit commit → statement 단위 rollback 불가
- PostgreSQL DDL은 transaction 내 rollback 가능

```ts
// execute 내부: 커넥션 재사용 패턴
const conn = await createConnection(connectionId);
try {
  for (const stmt of statements) {
    await conn.execute(stmt);
  }
} finally {
  await conn.close();
}
```

### 10.2 Statement Splitting

기존 `migrationService.ts`의 `splitStatements()` 로직 재사용:
- 세미콜론 기준 분리
- 문자열 리터럴 내 세미콜론 무시
- 괄호 중첩 처리
- 빈 문장 무시

### 10.3 Pre-Apply Validation 전략

```
validateAgainstVersion(connectionId, sourceVersionId):
  1. liveTables = await schemaService.fetchRealSchema(connectionId)
  2. versionTables = diagramVersionRepo.getById(sourceVersionId).schemaSnapshot.tables
  3. // 테이블 이름 기준 비교 (ID는 다를 수 있음)
  4. diffs = diffService.compareTableArrays(versionTables, liveTables)
  5. return { isValid: diffs.tableDiffs.length === 0, diffs: diffs.tableDiffs, ... }
```

**Note**: 테이블 비교 시 `name` 기준 (case-insensitive). 실제 DB의 table ID와 Version의 table ID가 다를 수 있으므로 ID 비교 불가.

### 10.4 IDiffResult 재사용

기존 `diffService`의 내부 비교 로직을 `compareTableArrays()`로 추출:

```ts
// 기존 (private): compareDiagrams 내부에서 table 비교
// 리팩터: table 비교 로직을 독립 함수로 분리

function compareTableArrays(source: ITable[], target: ITable[]): IDiffResult {
  // 기존 비교 로직 그대로 사용
  // source = "현재 상태", target = "목표 상태"
  // added = target에만 있는 테이블
  // removed = source에만 있는 테이블
  // modified = 양쪽에 있지만 컬럼/제약 조건이 다른 테이블
}
```

---

## 11. File Summary

| File | Action | Phase |
|------|--------|-------|
| `src/shared/types/db.ts` | MODIFY: +ISchemaSnapshot, +IMigrationPack, +IMigrationLog, +IValidationResult, +TMigrationPackStatus | P1,P3 |
| `src/shared/ipc/channels.ts` | MODIFY: +12 channels | P1,P3 |
| `src/shared/ipc/events.ts` | MODIFY: +12 event types | P1,P3 |
| `src/main/infrastructure/database/localDb.schema.ts` | MODIFY: +2 CREATE TABLE | P1,P3 |
| `src/main/repositories/schemaSnapshotRepository.ts` | NEW | P1 |
| `src/main/repositories/migrationPackRepository.ts` | NEW | P3 |
| `src/main/repositories/index.ts` | MODIFY: +2 exports | P1,P3 |
| `src/main/services/schemaSnapshotService.ts` | NEW | P1,P2 |
| `src/main/services/migrationPackService.ts` | NEW | P3,P4 |
| `src/main/services/diffService.ts` | MODIFY: +compareTableArrays, +public DDL generators | P2,P3 |
| `src/main/ipc/handlers/schemaHandlers.ts` | MODIFY: +snapshot handlers | P1,P2 |
| `src/main/ipc/handlers/migrationPackHandlers.ts` | NEW | P3,P4 |
| `src/renderer/features/schema-snapshot/**` | NEW (api, model, ui) | P5 |
| `src/renderer/features/migration-pack/**` | NEW (api, model, ui) | P6 |
| `src/renderer/features/diagram-diff/ui/DiffView.tsx` | MODIFY: +viewMode, +MigrationWizard | P7 |
| `src/renderer/features/diagram-diff/ui/DiffModeSelector.tsx` | NEW | P7 |
| `src/renderer/features/real-diagram/ui/RealDiagramView.tsx` | MODIFY: +SnapshotListPanel | P5 |
| `src/shared/ipc/preload.ts` | MODIFY: +new channel bindings | P1,P3 |
