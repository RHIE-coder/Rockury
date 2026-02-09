# ERD Schema Visualizer Design Document

> **Summary**: Canvas 기반 인터랙티브 ERD 편집기. Virtual/Real 양방향 CRUD, Diff 형상관리, DDL 자동 Sync, 3-Panel 레이아웃, 검색/필터/View Snapshot.
>
> **Project**: Rockury MVP (DB Tool)
> **Version**: 0.2.0
> **Author**: rhiemh
> **Date**: 2026-02-09
> **Status**: Draft
> **Planning Doc**: [erd-schema-visualizer.plan.md](../01-plan/features/erd-schema-visualizer.plan.md)

---

## 1. Overview

### 1.1 Design Goals

1. 현재 Grid 카드 레이아웃을 **React Flow Canvas 기반 인터랙티브 ERD**로 완전 교체
2. **3-Panel 레이아웃** (좌: 테이블 리스트, 중앙: Canvas, 우: 테이블 상세)
3. Virtual ↔ Real **양방향 CRUD** + Diff 기반 **Migration Version** 관리
4. DDL ↔ Diagram **양방향 자동 Sync**
5. **검색/필터/View Snapshot** 으로 대규모 스키마 탐색 지원

### 1.2 Design Principles

- **기존 아키텍처 패턴 유지**: FSD(Renderer) + Layered(Main) + Type-safe IPC
- **기존 코드 최대 재활용**: `schemaToNodes.ts`, `nodesToSchema.ts`, `diffService.ts` 등 확장
- **Zustand(UI) + React Query(Data)** 상태 관리 패턴 유지
- **단일 책임**: 각 컴포넌트/서비스는 하나의 역할만 수행

---

## 2. Architecture

### 2.1 Component Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         DbDiagramPage                                    │
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │ DiagramToolbar                                                       ││
│  │ [Diagram Select▼] [Name: ___] [v1.0.0] [Virtual|Real|Diff]         ││
│  │ [Search🔍] [Filter⚙] [Snapshot📸] [DDL Editor</>]                  ││
│  └─────────────────────────────────────────────────────────────────────┘│
│  ┌──────────┬──────────────────────────────────────┬───────────────────┐│
│  │          │                                      │                   ││
│  │  Table   │         DiagramCanvas                │   TableDetail     ││
│  │  List    │         (React Flow)                 │   Panel           ││
│  │  Panel   │                                      │                   ││
│  │          │   ┌────────┐     ┌────────┐         │   Table: users    ││
│  │  > users │   │ users  │────>│ orders │         │   Comment: ...    ││
│  │  > orders│   │ ──── ─ │     │ ────── │         │                   ││
│  │  > items │   │ 🔑 id  │     │ 🔑 id  │         │   Columns:        ││
│  │          │   │ ◇ name │     │ 🔗 uid │         │   ├ id INT PK     ││
│  │          │   │ ◇ email│     │ ◇ total│         │   ├ name VARCHAR  ││
│  │          │   └────────┘     └────────┘         │   └ email VARCHAR ││
│  │          │                                      │                   ││
│  │          │                  ┌────────┐         │   Constraints:     ││
│  │          │                  │ items  │         │   ├ PK: id         ││
│  │          │                  │ ────── │         │   └ UK: email      ││
│  │          │                  │ 🔑 id  │         │                   ││
│  │          │                  │ 🔗 oid │         │   [Edit] [Delete]  ││
│  │          │                  └────────┘         │                   ││
│  └──────────┴──────────────────────────────────────┴───────────────────┘│
└─────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Data Flow

```
┌─── Virtual Diagram 편집 ─────────────────────────────────────────────┐
│                                                                       │
│  Canvas Node 편집 ──→ nodesToSchema() ──→ useUpdateDiagram.mutate()  │
│       ↓                                                               │
│  diagramApi.update() ──→ IPC DIAGRAM_UPDATE ──→ diagramRepository    │
│       ↓                                                               │
│  React Query invalidate ──→ useDiagram() refetch ──→ UI re-render   │
│       ↓                                                               │
│  schemaToNodes() ──→ React Flow Canvas 갱신                          │
│       ↓                                                               │
│  ddlSync.generateDdl() ──→ DDL Editor 자동 갱신 (단방향)             │
│                                                                       │
└───────────────────────────────────────────────────────────────────────┘

┌─── Diff 형상관리 ────────────────────────────────────────────────────┐
│                                                                       │
│  Compare 실행 ──→ diffService.compareDiagrams()                      │
│       ↓                                                               │
│  IDiffResult 반환 ──→ DiffView 렌더링                                │
│       ↓                                                               │
│  ┌─── Virtual→Real ───────────────┐  ┌─── Real→Virtual ────────────┐│
│  │ Migration DDL 생성              │  │ Diagram 데이터 업데이트      ││
│  │ ↓                               │  │ ↓                            ││
│  │ IMigration 저장                 │  │ diagram.tables = realTables  ││
│  │ (diagram_migrations)            │  │ ↓                            ││
│  │ ↓                               │  │ useUpdateDiagram.mutate()    ││
│  │ 사용자가 DDL 복사/실행          │  │                              ││
│  │ ↓                               │  │                              ││
│  │ MIGRATION_APPLY 마킹            │  │                              ││
│  └─────────────────────────────────┘  └──────────────────────────────┘│
└───────────────────────────────────────────────────────────────────────┘
```

### 2.3 Dependencies

| Component | Depends On | Purpose |
|-----------|-----------|---------|
| DiagramCanvas | @xyflow/react, schemaToNodes | React Flow 렌더링 |
| TableNode | @xyflow/react (NodeProps) | Custom 노드 렌더링 |
| TableListPanel | useDiagramStore | 선택 상태 공유 |
| TableDetailPanel | useDiagramStore, useUpdateDiagram | 상세 표시 + 편집 |
| SearchOverlay | useSearch hook | 검색 UI |
| FilterPanel | useFilter hook | 필터 설정 UI |
| ViewSnapshotManager | useViewSnapshot hook | Snapshot CRUD |
| MigrationPanel | useMigration hook | Migration 히스토리 |
| migrationService (Main) | diagramRepository, migrationRepository | Migration CRUD |
| migrationRepository (Main) | localDb (SQLite) | Migration 저장 |

---

## 3. Data Model

### 3.1 Type 변경 및 추가 (`src/shared/types/db.ts`)

```typescript
// ─── IDiagram 확장 ───
export interface IDiagram {
  id: string;
  name: string;
  version: string;            // NEW: semver (e.g., "1.0.0")
  type: TDiagramType;
  tables: ITable[];
  createdAt: string;
  updatedAt: string;
}

// ─── NEW: Migration ───
export interface IMigration {
  id: string;
  diagramId: string;          // Virtual Diagram ID
  connectionId: string;       // Target Real DB Connection
  versionNumber: number;      // 순번 (auto-increment per diagram+connection pair)
  direction: TMigrationDirection;
  diffSnapshot: IDiffResult;  // Diff 원본
  migrationDdl: string;       // Virtual→Real: ALTER/CREATE/DROP SQL
  status: TMigrationStatus;
  appliedAt: string | null;   // 적용 시각 (null = 미적용)
  createdAt: string;
}

export type TMigrationDirection = 'virtual_to_real' | 'real_to_virtual';
export type TMigrationStatus = 'pending' | 'applied' | 'failed';

// ─── NEW: View Snapshot ───
export interface IViewSnapshot {
  id: string;
  diagramId: string;
  name: string;
  filter: IDiagramFilter;
  layout: IDiagramLayout;
  selectedTableIds: string[];
  createdAt: string;
}

// ─── NEW: Diagram Filter ───
export interface IDiagramFilter {
  showColumns: boolean;       // 컬럼 목록 표시
  showDataTypes: boolean;     // 데이터 타입 표시
  showKeyIcons: boolean;      // PK/FK/UK/IDX 아이콘 표시
  showNullable: boolean;      // nullable 마커 표시
  showComments: boolean;      // 컬럼 코멘트 표시
  showConstraints: boolean;   // 제약사항 섹션 표시
  preset: TFilterPreset;
}

export type TFilterPreset = 'compact' | 'full' | 'custom';

// ─── NEW: Search Result ───
export interface ISearchResult {
  type: 'table' | 'column' | 'constraint';
  tableId: string;
  tableName: string;
  columnId?: string;
  columnName?: string;
  constraintName?: string;
  matchedText: string;
}
```

### 3.2 SQLite Schema 변경

```sql
-- diagrams 테이블: version 컬럼 추가
ALTER TABLE diagrams ADD COLUMN version TEXT NOT NULL DEFAULT '1.0.0';

-- NEW: diagram_migrations 테이블
CREATE TABLE IF NOT EXISTS diagram_migrations (
  id TEXT PRIMARY KEY,
  diagram_id TEXT NOT NULL,
  connection_id TEXT NOT NULL,
  version_number INTEGER NOT NULL,
  direction TEXT NOT NULL CHECK(direction IN ('virtual_to_real', 'real_to_virtual')),
  diff_snapshot TEXT NOT NULL,         -- JSON: IDiffResult
  migration_ddl TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'applied', 'failed')),
  applied_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (diagram_id) REFERENCES diagrams(id) ON DELETE CASCADE,
  FOREIGN KEY (connection_id) REFERENCES connections(id) ON DELETE CASCADE,
  UNIQUE(diagram_id, connection_id, version_number)
);

CREATE INDEX IF NOT EXISTS idx_migrations_diagram ON diagram_migrations(diagram_id);
CREATE INDEX IF NOT EXISTS idx_migrations_connection ON diagram_migrations(connection_id);

-- NEW: view_snapshots 테이블
CREATE TABLE IF NOT EXISTS view_snapshots (
  id TEXT PRIMARY KEY,
  diagram_id TEXT NOT NULL,
  name TEXT NOT NULL,
  filter_config TEXT NOT NULL DEFAULT '{}',     -- JSON: IDiagramFilter
  layout_config TEXT NOT NULL DEFAULT '{}',     -- JSON: IDiagramLayout
  selected_table_ids TEXT NOT NULL DEFAULT '[]', -- JSON: string[]
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (diagram_id) REFERENCES diagrams(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_snapshots_diagram ON view_snapshots(diagram_id);
```

### 3.3 Entity Relationships

```
[IDiagram] 1 ──── N [IDiagramVersion]    (기존)
[IDiagram] 1 ──── 1 [IDiagramLayout]     (기존)
[IDiagram] 1 ──── N [IMigration]         (NEW)
[IDiagram] 1 ──── N [IViewSnapshot]      (NEW)
[IConnection] 1 ── N [IMigration]        (NEW)
```

---

## 4. IPC Specification

### 4.1 New Channels

```typescript
// src/shared/ipc/channels.ts 에 추가

// Diagram Meta
DIAGRAM_UPDATE_META: 'DIAGRAM_UPDATE_META',

// Migration
MIGRATION_LIST: 'MIGRATION_LIST',
MIGRATION_CREATE: 'MIGRATION_CREATE',
MIGRATION_APPLY: 'MIGRATION_APPLY',
MIGRATION_DELETE: 'MIGRATION_DELETE',

// View Snapshot
VIEW_SNAPSHOT_LIST: 'VIEW_SNAPSHOT_LIST',
VIEW_SNAPSHOT_CREATE: 'VIEW_SNAPSHOT_CREATE',
VIEW_SNAPSHOT_DELETE: 'VIEW_SNAPSHOT_DELETE',
VIEW_SNAPSHOT_LOAD: 'VIEW_SNAPSHOT_LOAD',
```

### 4.2 New Events

```typescript
// src/shared/ipc/events.ts 에 추가

[CHANNELS.DIAGRAM_UPDATE_META]: {
  args: { id: string; name?: string; version?: string };
  response: { success: boolean; data: IDiagram };
};

// ─── Migration ───
[CHANNELS.MIGRATION_LIST]: {
  args: { diagramId: string; connectionId?: string };
  response: { success: boolean; data: IMigration[] };
};
[CHANNELS.MIGRATION_CREATE]: {
  args: {
    diagramId: string;
    connectionId: string;
    direction: TMigrationDirection;
    diffSnapshot: IDiffResult;
    migrationDdl: string;
  };
  response: { success: boolean; data: IMigration };
};
[CHANNELS.MIGRATION_APPLY]: {
  args: { migrationId: string };
  response: { success: boolean; data: IMigration };
};
[CHANNELS.MIGRATION_DELETE]: {
  args: { migrationId: string };
  response: { success: boolean };
};

// ─── View Snapshot ───
[CHANNELS.VIEW_SNAPSHOT_LIST]: {
  args: { diagramId: string };
  response: { success: boolean; data: IViewSnapshot[] };
};
[CHANNELS.VIEW_SNAPSHOT_CREATE]: {
  args: {
    diagramId: string;
    name: string;
    filter: IDiagramFilter;
    layout: IDiagramLayout;
    selectedTableIds: string[];
  };
  response: { success: boolean; data: IViewSnapshot };
};
[CHANNELS.VIEW_SNAPSHOT_DELETE]: {
  args: { id: string };
  response: { success: boolean };
};
[CHANNELS.VIEW_SNAPSHOT_LOAD]: {
  args: { id: string };
  response: { success: boolean; data: IViewSnapshot };
};
```

### 4.3 Modified Events

```typescript
// DIAGRAM_CREATE: version 필드 추가
[CHANNELS.DIAGRAM_CREATE]: {
  args: { name: string; type: TDiagramType; version?: string; tables?: ITable[] };
  response: { success: boolean; data: IDiagram };
};

// DIAGRAM_UPDATE: version 필드 추가
[CHANNELS.DIAGRAM_UPDATE]: {
  args: { id: string; name?: string; version?: string; tables?: ITable[] };
  response: { success: boolean; data: IDiagram };
};
```

---

## 5. UI/UX Design

### 5.1 3-Panel Layout

```
┌─────────────────────────────────────────────────────────────────────────┐
│  DiagramToolbar (고정 상단)                                              │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │ [Diagram ▼] [📝 Name] [v1.0.0]  │  [Virtual|Real|Diff]  │       │  │
│  │ [🔍 Search] [⚙ Filter] [📸 Snap] │ [</> DDL] [📋 Migration]    │  │
│  └───────────────────────────────────────────────────────────────────┘  │
├──────────┬──────────────────────────────────────────┬───────────────────┤
│ 좌측 패널 │              중앙 Canvas                 │   우측 패널       │
│ (200px)  │           (flex-1, 가변)                  │   (320px)        │
│          │                                           │                  │
│ 테이블    │  React Flow Canvas                       │  선택 테이블     │
│ 리스트    │  - 노드 드래그/줌/패닝                    │  상세 정보       │
│          │  - Edge (FK 관계)                         │                  │
│ ┌──────┐ │  - 미니맵                                 │  Table: users   │
│ │>users│ │                                           │  Version: 1.0   │
│ │ order│ │  ┌────────┐      ┌────────┐              │  Comment: ...   │
│ │ items│ │  │ users  │─────>│ orders │              │                  │
│ └──────┘ │  │────────│      │────────│              │  Columns (3):   │
│          │  │🔑 id   │      │🔑 id   │              │  ┌─────────────┐│
│ 검색결과  │  │◇ name  │      │🔗 uid  │              │  │🔑 id   INT  ││
│ 하이라이트│  │◇ email │      │◇ total │              │  │◇ name VCHAR ││
│          │  └────────┘      └────────┘              │  │◇ email VCHAR││
│          │                                           │  └─────────────┘│
│          │                                           │                  │
│          │  [Zoom: 100%] [Fit All] [+ Add Table]     │  Constraints:   │
│          │                                           │  PK(id), UK(em) │
│          │                                           │                  │
│          │                                           │  [Edit] [Delete]│
├──────────┴──────────────────────────────────────────┴───────────────────┤
│ StatusBar: Tables: 12 | Selected: users | Layout saved                  │
└─────────────────────────────────────────────────────────────────────────┘
```

### 5.2 Custom TableNode 디자인

```
┌──────────────────────────┐    ← 테이블 헤더 (primary color bg)
│   users                  │       클릭 시 우측 패널 활성화
├──────────────────────────┤       더블클릭 시 인라인 이름 편집
│ 🔑 ◆ # id        int8   │    ← PK 아이콘 + NOT_NULL(◆) + 타입
│ ◆     inserted_at tstz   │    ← NOT_NULL(◆) + 타입
│ ◆ 🌐  slug       text   │    ← UNIQUE(🌐) + 타입
│ ◇     created_by uuid ──│──  ← nullable(◇) + FK edge handle
└──────────────────────────┘

아이콘 범례:
  🔑 = Primary Key
  🔗 = Foreign Key
  🌐 = Unique
  📇 = Index
  ◆  = NOT NULL
  ◇  = Nullable
```

**필터 적용 예시 (compact 모드):**
```
┌──────────────────┐
│   users          │    ← 테이블명만 표시
└──────────────────┘
```

**필터 적용 예시 (full 모드):**
```
┌──────────────────────────┐
│   users                  │
├──────────────────────────┤
│ 🔑 ◆ # id        int8   │
│ ◆     inserted_at tstz   │
│ ◆ 🌐  slug       text   │
│ ◇     created_by uuid ──│
├──────────────────────────┤
│ PK: id                   │  ← Constraints 섹션
│ UK: slug                 │
└──────────────────────────┘
```

### 5.3 User Flows

**Canvas에서 테이블 선택:**
```
Canvas 테이블 클릭
  → useDiagramStore.setSelectedTableId(tableId)
  → 우측 패널: TableDetailPanel 활성화
  → 좌측 패널: 해당 항목 하이라이트 + scrollIntoView
  → Canvas: 노드 border 강조 (primary color)
```

**좌측 패널에서 테이블 선택:**
```
좌측 패널 항목 클릭
  → useDiagramStore.setSelectedTableId(tableId)
  → Canvas: reactFlowInstance.fitView({ nodes: [nodeId], duration: 300 })
  → 우측 패널: TableDetailPanel 활성화
  → Canvas: 노드 border 강조
```

**검색 Flow:**
```
Cmd+F (또는 Search 버튼)
  → SearchOverlay 오픈
  → 사용자 입력 (debounce 200ms)
  → useSearch: 테이블명/컬럼명/제약사항명 매칭
  → 매칭 결과 리스트 표시
  → 결과 클릭 → fitView to 해당 노드 + 하이라이트
  → Esc → SearchOverlay 닫기
```

**View Snapshot Flow:**
```
Snapshot 저장:
  📸 버튼 클릭 → 이름 입력 Dialog
  → 현재 { filter, layout(positions+zoom+viewport), selectedTableIds } 캡처
  → IPC VIEW_SNAPSHOT_CREATE
  → Snapshot 리스트에 추가

Snapshot 불러오기:
  Snapshot 드롭다운에서 선택
  → IPC VIEW_SNAPSHOT_LOAD
  → filter 적용 → 노드 재렌더링
  → layout 적용 → setNodes positions + setViewport
  → selectedTableIds 적용 → 선택 상태 복원
```

### 5.4 Component List

| Component | Location | Responsibility |
|-----------|----------|----------------|
| `DiagramCanvas` | `features/virtual-diagram/ui/` | React Flow 래퍼. 노드/엣지 렌더링, 줌/패닝, 이벤트 핸들링 |
| `TableNode` | `features/virtual-diagram/ui/` | Custom React Flow 노드. 테이블 구조 시각화 + 필터 적용 |
| `RelationEdge` | `features/virtual-diagram/ui/` | Custom Edge. FK 관계선 + 카디널리티 라벨 |
| `TableListPanel` | `features/virtual-diagram/ui/` | 좌측 패널. 테이블 리스트 + 검색 연동 + 클릭 시 fitView |
| `TableDetailPanel` | `features/virtual-diagram/ui/` | 우측 패널. 선택 테이블 상세 정보 + 인라인 편집 |
| `DiagramToolbar` | `features/virtual-diagram/ui/` | 상단 툴바. 이름/버전 편집, 탭 전환, 기능 버튼 |
| `SearchOverlay` | `features/virtual-diagram/ui/` | 검색 오버레이. Cmd+F 단축키, 결과 리스트 |
| `FilterPanel` | `features/virtual-diagram/ui/` | 필터 설정 패널. 프리셋(compact/full/custom) + 개별 토글 |
| `ViewSnapshotManager` | `features/virtual-diagram/ui/` | Snapshot 저장/불러오기/삭제 UI |
| `MigrationPanel` | `features/diagram-diff/ui/` | Migration 히스토리 + 적용 상태 표시 |
| `VirtualDiagramView` | `features/virtual-diagram/ui/` | 3-Panel 레이아웃 조합. Virtual 탭의 메인 컨테이너 |
| `RealDiagramView` | `features/real-diagram/ui/` | Real 탭. Canvas 기반 읽기 전용 표시 |
| `DiffView` | `features/diagram-diff/ui/` | Diff 탭. 비교 결과 + Migration 관리 |

---

## 6. State Management

### 6.1 Zustand Store 확장 (`diagramStore.ts`)

```typescript
export type TDiagramTab = 'virtual' | 'real' | 'diff';

interface DiagramStoreState {
  // 기존
  selectedDiagramId: string | null;
  selectedTableId: string | null;
  selectedColumnId: string | null;
  isDdlEditorOpen: boolean;
  activeTab: TDiagramTab;

  // NEW: Panel 상태
  isLeftPanelOpen: boolean;
  isRightPanelOpen: boolean;

  // NEW: 검색
  isSearchOpen: boolean;
  searchQuery: string;
  searchResults: ISearchResult[];

  // NEW: 필터
  filter: IDiagramFilter;

  // NEW: 변경 소스 추적 (DDL Sync 무한 루프 방지)
  changeSource: 'canvas' | 'ddl' | 'external' | null;
}

interface DiagramStoreActions {
  // 기존
  setSelectedDiagramId: (id: string | null) => void;
  setSelectedTableId: (id: string | null) => void;
  setSelectedColumnId: (id: string | null) => void;
  toggleDdlEditor: () => void;
  setDdlEditorOpen: (open: boolean) => void;
  setActiveTab: (tab: TDiagramTab) => void;

  // NEW
  toggleLeftPanel: () => void;
  toggleRightPanel: () => void;
  setSearchOpen: (open: boolean) => void;
  setSearchQuery: (query: string) => void;
  setSearchResults: (results: ISearchResult[]) => void;
  setFilter: (filter: Partial<IDiagramFilter>) => void;
  setFilterPreset: (preset: TFilterPreset) => void;
  setChangeSource: (source: DiagramStoreState['changeSource']) => void;
}
```

**Filter 기본값:**
```typescript
const DEFAULT_FILTER: IDiagramFilter = {
  showColumns: true,
  showDataTypes: true,
  showKeyIcons: true,
  showNullable: true,
  showComments: false,
  showConstraints: false,
  preset: 'full',
};

const FILTER_PRESETS: Record<TFilterPreset, Partial<IDiagramFilter>> = {
  compact: {
    showColumns: false,
    showDataTypes: false,
    showKeyIcons: false,
    showNullable: false,
    showComments: false,
    showConstraints: false,
  },
  full: {
    showColumns: true,
    showDataTypes: true,
    showKeyIcons: true,
    showNullable: true,
    showComments: true,
    showConstraints: true,
  },
  custom: {}, // 사용자 지정 (현재 상태 유지)
};
```

### 6.2 New React Query Hooks

```typescript
// features/virtual-diagram/model/useDiagrams.ts 에 추가

const diagramKeys = {
  // 기존...
  migrations: (diagramId: string) => [...diagramKeys.all, 'migrations', diagramId] as const,
  snapshots: (diagramId: string) => [...diagramKeys.all, 'snapshots', diagramId] as const,
};

// Migration Hooks
function useMigrations(diagramId: string, connectionId?: string);
function useCreateMigration();
function useApplyMigration();
function useDeleteMigration();

// View Snapshot Hooks
function useViewSnapshots(diagramId: string);
function useCreateViewSnapshot();
function useDeleteViewSnapshot();
function useLoadViewSnapshot();
```

### 6.3 Search Hook (`useSearch.ts`)

```typescript
function useSearch(tables: ITable[]): {
  query: string;
  setQuery: (q: string) => void;
  results: ISearchResult[];
  isActive: boolean;
  setActive: (active: boolean) => void;
};
```

**검색 알고리즘:**
1. `query`를 lowercase로 변환
2. 모든 테이블 순회:
   - `table.name.toLowerCase().includes(query)` → type: 'table'
   - 모든 컬럼: `column.name.toLowerCase().includes(query)` → type: 'column'
   - `column.dataType.toLowerCase().includes(query)` → type: 'column'
   - 모든 제약사항: `constraint.name.toLowerCase().includes(query)` → type: 'constraint'
3. 결과를 `ISearchResult[]`로 반환
4. debounce 200ms 적용

---

## 7. Key Component Specifications

### 7.1 DiagramCanvas (`features/virtual-diagram/ui/DiagramCanvas.tsx`)

```typescript
interface DiagramCanvasProps {
  diagram: IDiagram;
  layout?: IDiagramLayout;
  filter: IDiagramFilter;
  readOnly?: boolean;               // Real Diagram에서 true
  highlightedTableIds?: string[];   // 검색 하이라이트
  onTableSelect: (tableId: string) => void;
  onTableUpdate: (table: ITable) => void;
  onTableCreate: (position: { x: number; y: number }) => void;
  onTableDelete: (tableId: string) => void;
  onLayoutChange: (layout: IDiagramLayout) => void;
  onEdgeCreate: (source: string, target: string) => void;
}
```

**React Flow 설정:**
```typescript
const nodeTypes = { tableNode: TableNode };
const edgeTypes = { relationEdge: RelationEdge };

<ReactFlow
  nodes={nodes}
  edges={edges}
  nodeTypes={nodeTypes}
  edgeTypes={edgeTypes}
  onNodesChange={onNodesChange}
  onEdgesChange={onEdgesChange}
  onConnect={onConnect}
  onNodeClick={handleNodeClick}
  onNodeDragStop={handleNodeDragStop}
  onPaneClick={handlePaneClick}
  fitView
  minZoom={0.1}
  maxZoom={2}
  defaultEdgeOptions={{ type: 'smoothstep', animated: true }}
>
  <Background />
  <Controls />
  <MiniMap />
</ReactFlow>
```

**이벤트 핸들링:**
- `onNodeClick`: `onTableSelect(node.id)` 호출
- `onNodeDragStop`: 위치 변경 → `onLayoutChange` (debounce 1000ms)
- `onConnect`: FK 관계 생성 → `onEdgeCreate(source, target)`
- `onPaneDoubleClick`: 빈 영역 더블클릭 → `onTableCreate(position)`

### 7.2 TableNode (`features/virtual-diagram/ui/TableNode.tsx`)

```typescript
interface TableNodeProps extends NodeProps {
  data: {
    table: ITable;
    label: string;
    filter: IDiagramFilter;
    isHighlighted: boolean;
    isSelected: boolean;
  };
}
```

**렌더링 구조:**
```
<div className={cn("rounded-lg border shadow-sm", {
  "border-primary ring-2 ring-primary/30": isSelected,
  "ring-2 ring-yellow-400/50": isHighlighted,
})}>
  {/* Header */}
  <div className="rounded-t-lg bg-primary px-3 py-1.5 text-primary-foreground">
    <p className="text-sm font-semibold">{table.name}</p>
  </div>

  {/* Columns (filter.showColumns) */}
  {filter.showColumns && (
    <div className="divide-y divide-border">
      {table.columns.map(column => (
        <div className="flex items-center gap-1.5 px-2 py-0.5 text-xs">
          {filter.showKeyIcons && <KeyIcon keyType={column.keyType} />}
          {filter.showNullable && <NullableIcon nullable={column.nullable} />}
          <span className="flex-1 truncate">{column.name}</span>
          {filter.showDataTypes && (
            <span className="text-muted-foreground">{column.dataType}</span>
          )}
          {/* FK Edge Handle */}
          {column.reference && <Handle type="source" id={column.id} />}
        </div>
      ))}
    </div>
  )}

  {/* Constraints (filter.showConstraints) */}
  {filter.showConstraints && table.constraints.length > 0 && (
    <div className="border-t px-2 py-1 text-xs text-muted-foreground">
      {table.constraints.map(c => `${c.type}(${c.columns.join(',')})`).join(' | ')}
    </div>
  )}
</div>
```

### 7.3 TableListPanel (`features/virtual-diagram/ui/TableListPanel.tsx`)

```typescript
interface TableListPanelProps {
  tables: ITable[];
  selectedTableId: string | null;
  searchResults: ISearchResult[];
  onTableSelect: (tableId: string) => void;
}
```

**기능:**
- 테이블 리스트 (이름 + 컬럼 수 표시)
- 선택 상태 하이라이트 (bg-primary/10)
- 검색 결과 매칭 시 추가 하이라이트 (ring-yellow-400)
- 클릭 시 `onTableSelect` → Canvas fitView 트리거
- `selectedTableId` 변경 시 `scrollIntoView({ behavior: 'smooth', block: 'nearest' })` 실행
- ref로 각 항목 DOM 참조 유지 (`useRef<Record<string, HTMLButtonElement>>`)

### 7.4 TableDetailPanel (`features/virtual-diagram/ui/TableDetailPanel.tsx`)

```typescript
interface TableDetailPanelProps {
  table: ITable;
  allTables: ITable[];     // FK 참조 드롭다운용
  onChange: (updated: ITable) => void;
  onDelete: () => void;
  onClose: () => void;
}
```

**기능:**
- 테이블 이름/코멘트 인라인 편집
- 컬럼 리스트 (풀 속성 표시)
- 각 컬럼 클릭 → 인라인 편집 (기존 `ColumnEditor` 활용)
- 컬럼 추가/삭제 버튼
- 제약사항 리스트
- FK 참조 편집 (대상 테이블/컬럼 드롭다운)
- 테이블 삭제 버튼 (확인 Dialog)

---

## 8. Service Layer

### 8.1 migrationService (NEW: `main/services/migrationService.ts`)

```typescript
export const migrationService = {
  list(diagramId: string, connectionId?: string): IMigration[];
  create(data: {
    diagramId: string;
    connectionId: string;
    direction: TMigrationDirection;
    diffSnapshot: IDiffResult;
    migrationDdl: string;
  }): IMigration;
  apply(migrationId: string): IMigration;    // status → 'applied', appliedAt 설정
  delete(migrationId: string): void;
  getLatestVersion(diagramId: string, connectionId: string): number;
};
```

**Version Number 자동 증가:**
```typescript
function getLatestVersion(diagramId: string, connectionId: string): number {
  const result = db.prepare(
    'SELECT MAX(version_number) as max FROM diagram_migrations WHERE diagram_id = ? AND connection_id = ?'
  ).get(diagramId, connectionId);
  return (result?.max ?? 0) + 1;
}
```

### 8.2 viewSnapshotService (NEW: `main/services/viewSnapshotService.ts`)

```typescript
export const viewSnapshotService = {
  list(diagramId: string): IViewSnapshot[];
  create(data: {
    diagramId: string;
    name: string;
    filter: IDiagramFilter;
    layout: IDiagramLayout;
    selectedTableIds: string[];
  }): IViewSnapshot;
  getById(id: string): IViewSnapshot | null;
  delete(id: string): void;
};
```

### 8.3 virtualDiagramService 확장

```typescript
// 기존 메서드에 version 처리 추가:
update(id: string, data: { name?: string; version?: string; tables?: ITable[] }): IDiagram;

// 기존 create에 version 기본값:
create(data: { name: string; type: 'virtual'; version?: string; tables?: ITable[] }): IDiagram;
// version default: '1.0.0'
```

### 8.4 diffService 확장

```typescript
// 기존 compareDiagrams에 Real→Virtual 반영 메서드 추가:
export const diffService = {
  // 기존
  async compareDiagrams(virtualDiagramId: string, connectionId: string): Promise<IDiffResult>;

  // NEW: Real 스키마를 Virtual에 반영
  async applyRealToVirtual(virtualDiagramId: string, connectionId: string): Promise<IDiagram>;

  // NEW: DB 타입별 Migration DDL 생성 (기존 generateMigrationDdl 확장)
  generateMigrationDdl(tableDiffs: ITableDiff[], dbType: TDbType): string;
};
```

---

## 9. Renderer Layer - File Structure

```
src/renderer/features/virtual-diagram/
├── ui/
│   ├── VirtualDiagramView.tsx      ← REFACTOR: 3-Panel 레이아웃
│   ├── DiagramCanvas.tsx           ← NEW: React Flow Canvas 래퍼
│   ├── TableNode.tsx               ← NEW: Custom React Flow 노드
│   ├── RelationEdge.tsx            ← NEW: Custom FK Edge
│   ├── TableListPanel.tsx          ← NEW: 좌측 패널
│   ├── TableDetailPanel.tsx        ← NEW: 우측 패널 (기존 TableEditor 대체)
│   ├── DiagramToolbar.tsx          ← NEW: 상단 툴바
│   ├── SearchOverlay.tsx           ← NEW: 검색 UI
│   ├── FilterPanel.tsx             ← NEW: 필터 설정
│   ├── ViewSnapshotManager.tsx     ← NEW: Snapshot 관리
│   ├── TableEditor.tsx             ← KEEP: 우측 패널 내부에서 재활용
│   └── ColumnEditor.tsx            ← KEEP: 컬럼 편집 (기존 유지)
├── model/
│   ├── diagramStore.ts             ← EXTEND: 새 상태 필드 추가
│   ├── useDiagrams.ts              ← EXTEND: migration/snapshot hooks 추가
│   ├── useSearch.ts                ← NEW: 검색 Hook
│   ├── useFilter.ts                ← NEW: 필터 Hook
│   └── useViewSnapshot.ts          ← NEW: Snapshot Hook
├── api/
│   ├── diagramApi.ts               ← EXTEND: migration/snapshot API 추가
│   ├── migrationApi.ts             ← NEW: Migration IPC API
│   └── viewSnapshotApi.ts          ← NEW: Snapshot IPC API
├── lib/
│   ├── schemaToNodes.ts            ← EXTEND: filter 적용, 하이라이트 지원
│   ├── nodesToSchema.ts            ← KEEP: 기존 유지
│   └── ddlSync.ts                  ← NEW: DDL ↔ Diagram 동기화 유틸
└── index.ts                        ← EXTEND: 새 컴포넌트/hooks export

src/renderer/features/real-diagram/
├── ui/
│   └── RealDiagramView.tsx         ← REFACTOR: Grid → DiagramCanvas(readOnly)
└── ...

src/renderer/features/diagram-diff/
├── ui/
│   ├── DiffView.tsx                ← REFACTOR: Canvas 통합 + Migration 연동
│   ├── DiffSummary.tsx             ← KEEP
│   ├── MigrationDdlView.tsx        ← KEEP
│   └── MigrationPanel.tsx          ← NEW: Migration 히스토리 UI
├── model/
│   └── useMigration.ts             ← NEW: Migration hooks
├── api/
│   └── migrationApi.ts             ← NEW (또는 shared)
└── ...
```

---

## 10. Main Process - File Structure

```
src/main/services/
├── virtualDiagramService.ts        ← EXTEND: version 지원
├── diffService.ts                  ← EXTEND: applyRealToVirtual, DB별 DDL
├── migrationService.ts             ← NEW: Migration CRUD
└── viewSnapshotService.ts          ← NEW: Snapshot CRUD

src/main/repositories/
├── diagramRepository.ts            ← EXTEND: version 컬럼
├── migrationRepository.ts          ← NEW: Migration 저장
└── viewSnapshotRepository.ts       ← NEW: Snapshot 저장

src/main/ipc/handlers/
├── schemaHandlers.ts               ← EXTEND: 새 채널 핸들러 등록
├── migrationHandlers.ts            ← NEW: Migration IPC 핸들러
└── viewSnapshotHandlers.ts         ← NEW: Snapshot IPC 핸들러

src/main/infrastructure/database/
└── localDb.schema.ts               ← EXTEND: 새 테이블 DDL 추가
```

---

## 11. Implementation Order

### Phase 1: Canvas 기반 전환 + Custom Node (FR-02, FR-06, FR-07)

**목표**: Grid 카드 → React Flow Canvas 전환

1. `TableNode.tsx` 구현
   - ITable 렌더링 (헤더 + 컬럼 리스트 + 제약사항)
   - IDiagramFilter 적용 로직
   - Handle 배치 (FK source/target)
   - 선택/하이라이트 스타일링

2. `RelationEdge.tsx` 구현
   - smoothstep animated edge
   - FK 라벨 (column_name → target_column)
   - 카디널리티 마커 (1, N)

3. `DiagramCanvas.tsx` 구현
   - React Flow 래퍼 (ReactFlowProvider + ReactFlow)
   - schemaToNodes() 호출 → nodes/edges 생성
   - onNodeDragStop → layout 저장 (debounce)
   - onConnect → FK 관계 생성
   - MiniMap, Controls, Background

4. `schemaToNodes.ts` 확장
   - filter 파라미터 추가 (노드 높이 계산에 반영)
   - highlighted 노드 마킹

5. `VirtualDiagramView.tsx` 리팩토링
   - Grid 카드 제거 → DiagramCanvas 통합
   - 기존 handleAddTable → Canvas 위에서 동작

6. `RealDiagramView.tsx` 리팩토링
   - Grid 카드 제거 → DiagramCanvas(readOnly=true) 통합

7. Layout 저장/복원
   - `DIAGRAM_SAVE_LAYOUT` / `DIAGRAM_GET_LAYOUT` IPC 연동
   - 줌/뷰포트 상태 포함

### Phase 2: 이름/버전 + 3-Panel 레이아웃 (FR-01, FR-09, FR-10, FR-11)

**목표**: 3-Panel 레이아웃 + 양방향 연동

1. `IDiagram.version` 필드 추가
   - `db.ts` 타입 수정
   - `localDb.schema.ts` ALTER TABLE
   - `diagramRepository` 수정
   - `DIAGRAM_UPDATE_META` IPC 채널 추가

2. `DiagramToolbar.tsx` 구현
   - Diagram 선택 드롭다운
   - 이름 인라인 편집 (contentEditable 또는 Input)
   - 버전 인라인 편집
   - 탭 전환 (Virtual/Real/Diff)
   - 기능 버튼 (Search, Filter, Snapshot, DDL, Migration)

3. `TableListPanel.tsx` 구현
   - 테이블 리스트 (이름 + 컬럼 수)
   - 클릭 시 fitView + 선택
   - 선택 상태 하이라이트
   - scrollIntoView 연동

4. `TableDetailPanel.tsx` 구현
   - 선택 테이블 상세 (모든 속성)
   - 인라인 편집 (기존 TableEditor/ColumnEditor 재활용)
   - 삭제 기능

5. `VirtualDiagramView.tsx` 3-Panel 조합
   - flex 레이아웃: left(200px) + center(flex-1) + right(320px)
   - 패널 토글 버튼
   - diagramStore 양방향 연동

6. Canvas ↔ 좌측 패널 양방향 연동
   - Canvas 노드 클릭 → 좌측 하이라이트
   - 좌측 클릭 → Canvas fitView

### Phase 3: Virtual ↔ Real CRUD + Diff 형상관리 (FR-03, FR-04, FR-05)

**목표**: 양방향 반영 + Migration Version

1. Virtual Diagram Canvas CRUD
   - 빈 영역 더블클릭 → 새 테이블 생성
   - 노드 더블클릭 → 인라인 테이블명 편집
   - Edge 드래그 → FK 생성
   - 우측 패널에서 상세 편집

2. `migrationService.ts` + `migrationRepository.ts` 구현
   - CRUD + version_number 자동 증가
   - status 관리 (pending/applied/failed)

3. `diagram_migrations` SQLite 테이블 생성
   - `localDb.schema.ts` 추가

4. IPC 채널/이벤트/핸들러 등록
   - `MIGRATION_LIST`, `MIGRATION_CREATE`, `MIGRATION_APPLY`, `MIGRATION_DELETE`

5. DiffView 확장
   - "Apply to Virtual" 버튼 → Real 스키마를 Virtual에 반영
   - "Create Migration" 버튼 → IMigration 생성
   - `MigrationPanel.tsx` (히스토리 + 적용 상태)

6. DDL Sync (`ddlSync.ts`)
   - Diagram 변경 시 → DDL 자동 재생성 (schemaToDdl)
   - DDL 편집 시 → Diagram 자동 반영 (parseDdl)
   - `changeSource` 추적으로 무한 루프 방지

### Phase 4: 검색 + 필터 + View Snapshot (FR-08, FR-12, FR-13)

**목표**: 탐색 효율성 향상

1. `useSearch.ts` + `SearchOverlay.tsx` 구현
   - Cmd+F 단축키 (useEffect + keydown)
   - 인메모리 검색 (debounce 200ms)
   - 결과 클릭 → fitView + 하이라이트

2. `useFilter.ts` + `FilterPanel.tsx` 구현
   - 프리셋: compact/full/custom
   - 개별 토글 (columns/dataTypes/keyIcons/nullable/comments/constraints)
   - 필터 변경 → TableNode 재렌더링

3. `viewSnapshotService.ts` + `viewSnapshotRepository.ts` 구현
   - CRUD

4. `view_snapshots` SQLite 테이블 생성

5. IPC 채널/이벤트/핸들러 등록
   - `VIEW_SNAPSHOT_LIST`, `VIEW_SNAPSHOT_CREATE`, `VIEW_SNAPSHOT_DELETE`, `VIEW_SNAPSHOT_LOAD`

6. `ViewSnapshotManager.tsx` 구현
   - 저장: 현재 상태 캡처 → 이름 입력 → IPC
   - 불러오기: 드롭다운 선택 → filter/layout/selection 복원
   - 삭제: 확인 Dialog → IPC

---

## 12. Test Plan

### 12.1 Unit Tests (90%+)

| Target | Key Test Cases |
|--------|---------------|
| `schemaToNodes` | 빈 테이블, 다수 FK, filter 적용, 저장된 positions 사용 |
| `nodesToSchema` | 역변환 정확도, position 추출 |
| `ddlSync` | Diagram→DDL, DDL→Diagram, 양방향 일관성 |
| `migrationService` | CRUD, version 자동 증가, status 변경 |
| `viewSnapshotService` | CRUD, filter/layout 직렬화/역직렬화 |
| `diffService.applyRealToVirtual` | 전체 교체, 부분 교체 |
| `diffService.generateMigrationDdl` | MySQL/PG 문법 차이 |
| `useSearch` | 테이블명 매칭, 컬럼명 매칭, 빈 쿼리, 특수문자 |

### 12.2 Integration Tests (75%+)

| Target | Key Test Cases |
|--------|---------------|
| Diagram CRUD → Layout 저장 | 테이블 추가 → 노드 위치 변경 → 저장 → 복원 |
| Migration 생성 → 적용 | Diff → Migration 생성 → 상태 변경 |
| Snapshot 저장 → 불러오기 | filter + layout 캡처 → 복원 정확도 |
| DDL Sync 양방향 | DDL 편집 → Diagram 반영 → DDL 재생성 일치 |

### 12.3 E2E Tests

| Scenario | Description |
|----------|-------------|
| Canvas 기본 조작 | 테이블 추가/삭제, 드래그, 줌, FK 연결 |
| 3-Panel 연동 | 좌측 클릭 → Canvas 이동 → 우측 표시 |
| Diff → Migration | Virtual/Real 비교 → Migration 생성 → DDL 확인 |
| 검색 → 이동 | Cmd+F → 검색어 입력 → 결과 클릭 → 노드 포커스 |
| Snapshot 라운드트립 | 필터 설정 → Snapshot 저장 → 필터 변경 → Snapshot 복원 |

---

## 13. Error Handling

| Scenario | Error | Handling |
|----------|-------|----------|
| Diagram 로딩 실패 | IPC 응답 success=false | React Query error state → 재시도 버튼 |
| Layout 저장 실패 | SQLite write error | 자동 재시도 (3회) → 사용자 알림 |
| Migration 생성 실패 | Diff 데이터 불일치 | Error toast + 로그 |
| DDL 파싱 실패 | 잘못된 SQL 구문 | Error badge on DDL Editor + 파싱 에러 메시지 |
| Canvas 렌더링 오류 | React Flow 내부 오류 | ErrorBoundary → 캔버스 재초기화 |
| Snapshot 저장 한도 초과 | 20개 초과 | 경고 + 가장 오래된 Snapshot 삭제 제안 |

---

## 14. Security Considerations

- [x] 기존 contextIsolation/nodeIntegration 설정 유지
- [x] DB 비밀번호 Main Process에서만 처리 (기존)
- [x] Migration DDL은 생성만 (자동 실행 없음) → 사용자가 직접 적용
- [x] SQLite parameterized query 사용 (기존)
- [x] IPC 응답에 민감 정보 미포함

---

## 15. Performance Considerations

| Concern | Strategy |
|---------|----------|
| 100+ 테이블 렌더링 | React Flow 내장 가상화 + compact 필터 모드 |
| 노드 위치 저장 빈도 | debounce 1000ms (드래그 완료 후) |
| 검색 성능 | 인메모리 Map (debounce 200ms) |
| DDL Sync 빈도 | changeSource 추적 → 단방향 전파만 |
| Layout JSON 크기 | positions만 저장 (x, y) → 테이블당 ~50bytes |
| Snapshot 저장 한도 | 다이어그램당 최대 20개 |

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-02-09 | Initial draft | rhiemh |
