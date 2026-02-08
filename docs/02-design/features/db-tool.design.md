# Design: DB Tool

> Plan Reference: `docs/01-plan/features/db-tool.plan.md`

---

## 1. Architecture Design

### 1.1 System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    Electron Main Process                        │
│                                                                 │
│  ┌──────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │   IPC    │  │   Services   │  │Infrastructure│              │
│  │ Handlers │→ │              │→ │              │              │
│  │          │  │ connection   │  │ localDb      │              │
│  │ connection│  │ schema      │  │ mysqlClient  │              │
│  │ schema   │  │ query       │  │ pgClient     │              │
│  │ query    │  │ diff        │  │ crypto       │              │
│  │ storage  │  │ export      │  │ filesystem   │              │
│  └────▲─────┘  └──────────────┘  └──────────────┘              │
│       │ IPC (invoke/handle)                                     │
├───────┼─────────────────────────────────────────────────────────┤
│       │          Preload (contextBridge)                        │
├───────┼─────────────────────────────────────────────────────────┤
│       ▼                                                         │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                 Renderer Process (React)                  │   │
│  │                                                          │   │
│  │  ┌─────────────────────────────────────────────────┐     │   │
│  │  │  app/   (Providers, Routes, Layout)             │     │   │
│  │  ├─────────────────────────────────────────────────┤     │   │
│  │  │  pages/  (db-package, db-connection, db-diagram,│     │   │
│  │  │          db-query, db-documenting, ...)          │     │   │
│  │  ├─────────────────────────────────────────────────┤     │   │
│  │  │  widgets/ (app-sidebar, db-top-nav,             │     │   │
│  │  │           diagram-canvas, sql-editor, ...)      │     │   │
│  │  ├─────────────────────────────────────────────────┤     │   │
│  │  │  features/ (package-mgmt, db-connection,        │     │   │
│  │  │            virtual-diagram, real-diagram, ...)   │     │   │
│  │  ├─────────────────────────────────────────────────┤     │   │
│  │  │  entities/ (package, connection, table,         │     │   │
│  │  │            column, query, document)             │     │   │
│  │  ├─────────────────────────────────────────────────┤     │   │
│  │  │  shared/  (ui, api, lib, hooks, config, types)  │     │   │
│  │  └─────────────────────────────────────────────────┘     │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 Data Flow

```
[User Action] → [Feature UI] → [Feature API (IPC call)]
     → [Main IPC Handler] → [Service] → [Repository / Infrastructure]
     → [Response via IPC] → [Zustand Store / React Query Cache]
     → [UI Re-render]
```

---

## 2. Directory Structure (Detailed)

### 2.1 Renderer Process (FSD)

```
src/renderer/
├── app/
│   ├── main-window/
│   │   ├── App.tsx                      # Root: Layout + AppRouter
│   │   ├── index.tsx                    # React mount
│   │   └── index.html
│   ├── layouts/
│   │   ├── AppLayout.tsx                # 전체 앱 레이아웃 (sidebar + content)
│   │   └── DbLayout.tsx                 # DB 서비스 레이아웃 (top-nav + content)
│   ├── providers/
│   │   └── index.tsx                    # QueryClient, BrowserRouter
│   ├── routes/
│   │   └── index.tsx                    # 전체 라우트 정의
│   └── styles/
│       └── index.css
│
├── pages/
│   ├── db-package/
│   │   ├── ui/
│   │   │   └── DbPackagePage.tsx
│   │   └── index.ts
│   ├── db-connection/
│   │   ├── ui/
│   │   │   └── DbConnectionPage.tsx
│   │   └── index.ts
│   ├── db-diagram/
│   │   ├── ui/
│   │   │   └── DbDiagramPage.tsx        # 탭: Virtual / Real / Diff
│   │   └── index.ts
│   ├── db-query/
│   │   ├── ui/
│   │   │   └── DbQueryPage.tsx
│   │   └── index.ts
│   ├── db-documenting/
│   │   ├── ui/
│   │   │   └── DbDocumentingPage.tsx
│   │   └── index.ts
│   ├── db-validation/
│   │   ├── ui/
│   │   │   └── DbValidationPage.tsx
│   │   └── index.ts
│   ├── db-mocking/
│   │   ├── ui/
│   │   │   └── DbMockingPage.tsx
│   │   └── index.ts
│   └── not-found/
│       ├── ui/
│       │   └── NotFoundPage.tsx          # 404 / Placeholder
│       └── index.ts
│
├── widgets/
│   ├── app-sidebar/
│   │   ├── ui/
│   │   │   ├── AppSidebar.tsx           # 메인 사이드바 컴포넌트
│   │   │   └── SidebarItem.tsx          # 개별 항목 (API/CODE/DB/INFRA)
│   │   ├── model/
│   │   │   └── types.ts                 # TSidebarService 타입
│   │   └── index.ts
│   ├── db-top-nav/
│   │   ├── ui/
│   │   │   ├── DbTopNav.tsx             # DB 상단 네비게이션 바
│   │   │   └── NavTab.tsx               # 개별 탭 컴포넌트
│   │   ├── model/
│   │   │   └── types.ts                 # TDbNavItem 타입
│   │   └── index.ts
│   ├── diagram-canvas/
│   │   ├── ui/
│   │   │   ├── DiagramCanvas.tsx        # React Flow 래퍼
│   │   │   ├── TableNode.tsx            # 테이블 커스텀 노드
│   │   │   ├── RelationEdge.tsx         # 관계선 커스텀 엣지
│   │   │   └── DiagramToolbar.tsx       # 캔버스 도구 모음
│   │   ├── model/
│   │   │   └── types.ts                 # TTableNode, TRelationEdge
│   │   └── index.ts
│   ├── sql-editor/
│   │   ├── ui/
│   │   │   └── SqlEditor.tsx            # CodeMirror SQL 에디터
│   │   ├── model/
│   │   │   └── types.ts
│   │   └── index.ts
│   └── query-result-table/
│       ├── ui/
│       │   └── QueryResultTable.tsx     # 쿼리 결과 테이블
│       ├── model/
│       │   └── types.ts
│       └── index.ts
│
├── features/
│   ├── package-management/
│   │   ├── ui/
│   │   │   ├── PackageList.tsx          # 패키지 목록
│   │   │   ├── PackageForm.tsx          # 패키지 생성/수정 폼
│   │   │   ├── PackageCard.tsx          # 패키지 카드
│   │   │   └── ResourceLinker.tsx       # 리소스 연결 UI
│   │   ├── model/
│   │   │   ├── packageStore.ts          # Zustand store
│   │   │   └── types.ts
│   │   ├── api/
│   │   │   └── packageApi.ts            # IPC 호출
│   │   └── index.ts
│   │
│   ├── db-connection/
│   │   ├── ui/
│   │   │   ├── ConnectionList.tsx       # 연결 목록
│   │   │   ├── ConnectionForm.tsx       # 연결 정보 입력 폼
│   │   │   ├── ConnectionCard.tsx       # 연결 카드 (상태 표시)
│   │   │   └── ConnectionTestBtn.tsx    # 연결 테스트 버튼
│   │   ├── model/
│   │   │   ├── connectionStore.ts       # Zustand store
│   │   │   └── types.ts
│   │   ├── api/
│   │   │   └── connectionApi.ts         # IPC 호출
│   │   └── index.ts
│   │
│   ├── virtual-diagram/
│   │   ├── ui/
│   │   │   ├── VirtualDiagramView.tsx   # Virtual Diagram 뷰
│   │   │   ├── TableEditor.tsx          # 테이블 편집 패널
│   │   │   └── ColumnEditor.tsx         # 컬럼 편집 폼
│   │   ├── model/
│   │   │   ├── diagramStore.ts          # Zustand store (Virtual)
│   │   │   └── types.ts
│   │   ├── api/
│   │   │   └── diagramApi.ts            # IPC 호출
│   │   ├── lib/
│   │   │   ├── schemaToNodes.ts         # schema → React Flow 노드 변환
│   │   │   └── nodesToSchema.ts         # React Flow 노드 → schema 변환
│   │   └── index.ts
│   │
│   ├── real-diagram/
│   │   ├── ui/
│   │   │   └── RealDiagramView.tsx      # Real Diagram 뷰 (읽기 전용)
│   │   ├── model/
│   │   │   └── types.ts
│   │   ├── api/
│   │   │   └── realDiagramApi.ts        # IPC 호출 (스키마 조회)
│   │   └── index.ts
│   │
│   ├── diagram-diff/
│   │   ├── ui/
│   │   │   ├── DiffView.tsx             # Diff 비교 뷰
│   │   │   ├── DiffSummary.tsx          # Diff 요약 패널
│   │   │   └── MigrationDdlView.tsx     # Migration DDL 미리보기
│   │   ├── model/
│   │   │   └── types.ts                 # TDiffResult, TDiffItem
│   │   ├── api/
│   │   │   └── diffApi.ts
│   │   └── index.ts
│   │
│   ├── ddl-editor/
│   │   ├── ui/
│   │   │   ├── DdlEditorView.tsx        # DDL 에디터 뷰
│   │   │   └── VersionHistory.tsx       # DDL 버전 이력
│   │   ├── model/
│   │   │   └── types.ts
│   │   ├── api/
│   │   │   └── ddlApi.ts
│   │   ├── lib/
│   │   │   ├── ddlParser.ts             # DDL → Schema 파싱
│   │   │   └── schemaToddl.ts           # Schema → DDL 생성
│   │   └── index.ts
│   │
│   ├── query-execution/
│   │   ├── ui/
│   │   │   ├── QueryPanel.tsx           # 쿼리 실행 패널
│   │   │   ├── QueryTabs.tsx            # 다중 쿼리 탭
│   │   │   ├── SavedQueryList.tsx       # 저장된 쿼리 목록
│   │   │   └── QueryHistoryList.tsx     # 실행 이력 목록
│   │   ├── model/
│   │   │   ├── queryStore.ts            # Zustand store
│   │   │   └── types.ts
│   │   ├── api/
│   │   │   └── queryApi.ts
│   │   └── index.ts
│   │
│   ├── db-documenting/
│   │   ├── ui/
│   │   │   ├── DocumentEditor.tsx       # Markdown 에디터
│   │   │   ├── DocumentPreview.tsx      # 문서 미리보기
│   │   │   ├── AutoDocGenerator.tsx     # 자동 문서 생성 UI
│   │   │   └── ExportMenu.tsx           # Export 옵션
│   │   ├── model/
│   │   │   └── types.ts
│   │   ├── api/
│   │   │   └── documentApi.ts
│   │   └── index.ts
│   │
│   ├── schema-validation/
│   │   ├── ui/
│   │   │   ├── ValidationRunner.tsx     # 검증 실행 UI
│   │   │   └── ValidationReport.tsx     # 검증 결과 리포트
│   │   ├── model/
│   │   │   └── types.ts
│   │   ├── api/
│   │   │   └── validationApi.ts
│   │   └── index.ts
│   │
│   └── data-mocking/
│       ├── ui/
│       │   ├── MockingConfig.tsx         # Mock 설정 UI
│       │   ├── MockPreview.tsx           # 생성 데이터 미리보기
│       │   └── MockExport.tsx            # Export (SQL/CSV/JSON)
│       ├── model/
│       │   └── types.ts
│       ├── api/
│       │   └── mockingApi.ts
│       └── index.ts
│
├── entities/
│   ├── package/
│   │   ├── model/
│   │   │   └── types.ts                 # IPackage, IPackageResource
│   │   └── index.ts
│   ├── connection/
│   │   ├── model/
│   │   │   └── types.ts                 # IConnection, TDbType
│   │   ├── ui/
│   │   │   └── ConnectionBadge.tsx      # 연결 상태 뱃지
│   │   └── index.ts
│   ├── table/
│   │   ├── model/
│   │   │   └── types.ts                 # ITable, IColumn, TKeyType
│   │   ├── ui/
│   │   │   └── TableChip.tsx            # 테이블명 표시 칩
│   │   └── index.ts
│   ├── column/
│   │   ├── model/
│   │   │   └── types.ts                 # IColumn 상세 (entities/table과 공유 가능)
│   │   └── index.ts
│   ├── query/
│   │   ├── model/
│   │   │   └── types.ts                 # IQuery, IQueryHistory
│   │   └── index.ts
│   └── document/
│       ├── model/
│       │   └── types.ts                 # IDocument
│       └── index.ts
│
└── shared/
    ├── api/
    │   ├── electronApi.ts               # (기존) Electron API accessor
    │   └── index.ts
    ├── components/
    │   └── ui/                          # (기존) shadcn 컴포넌트
    │       ├── badge.tsx
    │       ├── button.tsx
    │       ├── card.tsx
    │       ├── input.tsx
    │       ├── select.tsx
    │       └── textarea.tsx
    ├── config/
    │   └── constants.ts                 # 앱 상수, 라우트 경로
    ├── hooks/
    │   ├── use-mobile.ts                # (기존)
    │   └── use-theme.ts                 # (기존)
    ├── lib/
    │   └── utils.ts                     # (기존) cn()
    └── types/
        └── index.ts                     # 공통 타입
```

### 2.2 Main Process (Layered Architecture)

```
src/main/
├── ipc/
│   ├── handlers/
│   │   ├── index.ts                     # 전체 핸들러 등록
│   │   ├── systemInfoHandlers.ts        # (기존)
│   │   ├── packageHandlers.ts           # Package CRUD IPC
│   │   ├── connectionHandlers.ts        # Connection CRUD + Test IPC
│   │   ├── schemaHandlers.ts            # Virtual/Real 스키마 IPC
│   │   ├── queryHandlers.ts             # 쿼리 실행 IPC
│   │   ├── documentHandlers.ts          # 문서 CRUD IPC
│   │   ├── validationHandlers.ts        # 검증 IPC
│   │   └── mockingHandlers.ts           # Mock 데이터 생성 IPC
│   └── index.ts
│
├── services/
│   ├── index.ts
│   ├── systemInfoService.ts             # (기존)
│   ├── packageService.ts                # 패키지 비즈니스 로직
│   ├── connectionService.ts             # DB 연결 관리 + 테스트
│   ├── schemaService.ts                 # 스키마 조회 (information_schema)
│   ├── virtualDiagramService.ts         # Virtual Diagram CRUD + DDL 동기화
│   ├── diffService.ts                   # Virtual ↔ Real Diff 엔진
│   ├── queryService.ts                  # 쿼리 실행 + 이력
│   ├── documentService.ts               # 문서 생성 + Export
│   ├── validationService.ts             # 스키마 검증 로직
│   └── mockingService.ts                # Mock 데이터 생성
│
├── repositories/
│   ├── index.ts
│   ├── packageRepository.ts
│   ├── connectionRepository.ts
│   ├── diagramRepository.ts
│   ├── diagramVersionRepository.ts
│   ├── queryRepository.ts
│   ├── queryHistoryRepository.ts
│   └── documentRepository.ts
│
└── infrastructure/
    ├── index.ts
    ├── filesystem.ts                    # (기존)
    ├── database/
    │   ├── localDb.ts                   # SQLite 초기화 + 마이그레이션
    │   ├── localDb.schema.ts            # 테이블 DDL 정의
    │   ├── mysqlClient.ts              # MySQL/MariaDB 연결 클라이언트
    │   └── pgClient.ts                 # PostgreSQL 연결 클라이언트
    └── crypto.ts                        # safeStorage 래퍼 (비밀번호 암호화)
```

### 2.3 Shared (Cross-Process)

```
src/shared/
├── ipc/
│   ├── channels.ts                      # IPC 채널 상수 (확장)
│   ├── events.ts                        # IPC 이벤트 타입 (확장)
│   └── preload.ts                       # TElectronAPI 타입
├── types/
│   ├── index.ts
│   ├── system-info.ts                   # (기존)
│   ├── db.ts                            # DB 관련 공유 타입
│   └── common.ts                        # 공통 유틸 타입
└── vite-env.d.ts
```

---

## 3. Type Definitions

### 3.1 Entity Types (`src/shared/types/db.ts`)

```typescript
// ─── DB Type ───
export type TDbType = 'mysql' | 'mariadb' | 'postgresql';

// ─── Key / Constraint Types ───
export type TKeyType = 'PK' | 'FK' | 'UK' | 'IDX';
export type TConstraintType = 'PK' | 'FK' | 'UK' | 'IDX' | 'CHECK' | 'NOT_NULL';

// ─── Package ───
export interface IPackage {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export type TResourceType = 'connection' | 'diagram' | 'query' | 'document';

export interface IPackageResource {
  id: string;
  packageId: string;
  resourceType: TResourceType;
  resourceId: string;
  isShared: boolean;
}

// ─── Connection ───
export interface IConnection {
  id: string;
  name: string;
  dbType: TDbType;
  host: string;
  port: number;
  database: string;
  username: string;
  // password는 렌더러에 전달하지 않음 (보안)
  sslEnabled: boolean;
  sslConfig?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface IConnectionFormData {
  name: string;
  dbType: TDbType;
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  sslEnabled: boolean;
  sslConfig?: Record<string, unknown>;
}

export type TConnectionStatus = 'connected' | 'disconnected' | 'error' | 'testing';

export interface IConnectionTestResult {
  success: boolean;
  message: string;
  latencyMs?: number;
  serverVersion?: string;
}

// ─── Column ───
export interface IColumn {
  id: string;
  name: string;
  dataType: string;
  keyType: TKeyType | null;
  defaultValue: string | null;
  nullable: boolean;
  comment: string;
  reference: IForeignKeyRef | null;
  constraints: IConstraint[];
  ordinalPosition: number;
}

export interface IForeignKeyRef {
  table: string;
  column: string;
  onDelete?: 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION';
  onUpdate?: 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION';
}

export interface IConstraint {
  type: TConstraintType;
  name: string;
  columns: string[];
  reference?: IForeignKeyRef;
  checkExpression?: string;
}

// ─── Table ───
export interface ITable {
  id: string;
  name: string;
  comment: string;
  columns: IColumn[];
  constraints: IConstraint[];
  engine?: string;       // MySQL/MariaDB
  charset?: string;      // MySQL/MariaDB
}

// ─── Diagram ───
export type TDiagramType = 'virtual' | 'real';

export interface IDiagram {
  id: string;
  name: string;
  type: TDiagramType;
  tables: ITable[];
  createdAt: string;
  updatedAt: string;
}

export interface IDiagramLayout {
  diagramId: string;
  positions: Record<string, { x: number; y: number }>;  // tableId → position
  zoom: number;
  viewport: { x: number; y: number };
}

export interface IDiagramVersion {
  id: string;
  diagramId: string;
  versionNumber: number;
  ddlContent: string;
  schemaSnapshot: IDiagram;
  createdAt: string;
}

// ─── Diff ───
export type TDiffAction = 'added' | 'removed' | 'modified';

export interface ITableDiff {
  tableName: string;
  action: TDiffAction;
  columnDiffs: IColumnDiff[];
  constraintDiffs: IConstraintDiff[];
}

export interface IColumnDiff {
  columnName: string;
  action: TDiffAction;
  virtualValue?: Partial<IColumn>;
  realValue?: Partial<IColumn>;
  changes?: string[];  // e.g. ['dataType', 'nullable']
}

export interface IConstraintDiff {
  constraintName: string;
  action: TDiffAction;
  virtualValue?: IConstraint;
  realValue?: IConstraint;
}

export interface IDiffResult {
  virtualDiagramId: string;
  realDiagramId: string;
  tableDiffs: ITableDiff[];
  hasDifferences: boolean;
  migrationDdl: string;
  comparedAt: string;
}

// ─── Query ───
export interface IQuery {
  id: string;
  name: string;
  description: string;
  sqlContent: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export type TQueryStatus = 'success' | 'error';

export interface IQueryHistory {
  id: string;
  queryId: string | null;
  sqlContent: string;
  executionTimeMs: number;
  rowCount: number;
  status: TQueryStatus;
  errorMessage: string | null;
  executedAt: string;
}

export interface IQueryResult {
  columns: string[];
  rows: Record<string, unknown>[];
  rowCount: number;
  executionTimeMs: number;
  affectedRows?: number;
}

// ─── Document ───
export interface IDocument {
  id: string;
  name: string;
  content: string;          // Markdown
  autoGenerated: boolean;
  createdAt: string;
  updatedAt: string;
}

export type TExportFormat = 'markdown' | 'pdf' | 'png' | 'svg';
```

### 3.2 IPC Channels (`src/shared/ipc/channels.ts` 확장)

```typescript
export const CHANNELS = {
  // App (기존)
  GET_APP_VERSION: 'GET_APP_VERSION',
  GET_SYSTEM_INFO: 'GET_SYSTEM_INFO',

  // Package
  PACKAGE_LIST: 'PACKAGE_LIST',
  PACKAGE_GET: 'PACKAGE_GET',
  PACKAGE_CREATE: 'PACKAGE_CREATE',
  PACKAGE_UPDATE: 'PACKAGE_UPDATE',
  PACKAGE_DELETE: 'PACKAGE_DELETE',
  PACKAGE_LINK_RESOURCE: 'PACKAGE_LINK_RESOURCE',
  PACKAGE_UNLINK_RESOURCE: 'PACKAGE_UNLINK_RESOURCE',
  PACKAGE_GET_RESOURCES: 'PACKAGE_GET_RESOURCES',

  // Connection
  CONNECTION_LIST: 'CONNECTION_LIST',
  CONNECTION_GET: 'CONNECTION_GET',
  CONNECTION_CREATE: 'CONNECTION_CREATE',
  CONNECTION_UPDATE: 'CONNECTION_UPDATE',
  CONNECTION_DELETE: 'CONNECTION_DELETE',
  CONNECTION_TEST: 'CONNECTION_TEST',
  CONNECTION_STATUS: 'CONNECTION_STATUS',

  // Diagram (Virtual)
  DIAGRAM_LIST: 'DIAGRAM_LIST',
  DIAGRAM_GET: 'DIAGRAM_GET',
  DIAGRAM_CREATE: 'DIAGRAM_CREATE',
  DIAGRAM_UPDATE: 'DIAGRAM_UPDATE',
  DIAGRAM_DELETE: 'DIAGRAM_DELETE',
  DIAGRAM_GET_LAYOUT: 'DIAGRAM_GET_LAYOUT',
  DIAGRAM_SAVE_LAYOUT: 'DIAGRAM_SAVE_LAYOUT',

  // Diagram Versions
  DIAGRAM_VERSION_LIST: 'DIAGRAM_VERSION_LIST',
  DIAGRAM_VERSION_CREATE: 'DIAGRAM_VERSION_CREATE',
  DIAGRAM_VERSION_RESTORE: 'DIAGRAM_VERSION_RESTORE',

  // Diagram (Real)
  SCHEMA_FETCH_REAL: 'SCHEMA_FETCH_REAL',

  // Diagram (Diff)
  SCHEMA_DIFF: 'SCHEMA_DIFF',
  SCHEMA_GENERATE_MIGRATION: 'SCHEMA_GENERATE_MIGRATION',

  // DDL
  DDL_PARSE: 'DDL_PARSE',
  DDL_GENERATE: 'DDL_GENERATE',

  // Query
  QUERY_EXECUTE: 'QUERY_EXECUTE',
  QUERY_LIST: 'QUERY_LIST',
  QUERY_GET: 'QUERY_GET',
  QUERY_SAVE: 'QUERY_SAVE',
  QUERY_UPDATE: 'QUERY_UPDATE',
  QUERY_DELETE: 'QUERY_DELETE',
  QUERY_HISTORY_LIST: 'QUERY_HISTORY_LIST',

  // Document
  DOCUMENT_LIST: 'DOCUMENT_LIST',
  DOCUMENT_GET: 'DOCUMENT_GET',
  DOCUMENT_CREATE: 'DOCUMENT_CREATE',
  DOCUMENT_UPDATE: 'DOCUMENT_UPDATE',
  DOCUMENT_DELETE: 'DOCUMENT_DELETE',
  DOCUMENT_AUTO_GENERATE: 'DOCUMENT_AUTO_GENERATE',
  DOCUMENT_EXPORT: 'DOCUMENT_EXPORT',

  // Validation
  VALIDATION_RUN: 'VALIDATION_RUN',

  // Mocking
  MOCK_GENERATE: 'MOCK_GENERATE',
  MOCK_EXPORT: 'MOCK_EXPORT',
} as const;
```

### 3.3 IPC Events (`src/shared/ipc/events.ts` 확장)

```typescript
// 기존 imports + 새 DB 타입 import
import type {
  IPackage, IPackageResource, TResourceType,
  IConnection, IConnectionFormData, IConnectionTestResult,
  IDiagram, IDiagramLayout, IDiagramVersion,
  IDiffResult, ITable,
  IQuery, IQueryResult, IQueryHistory,
  IDocument, TExportFormat,
} from '~/shared/types/db';

export interface IEvents {
  // ─── 기존 ───
  [CHANNELS.GET_APP_VERSION]: {
    args: void;
    response: { success: boolean; version: string };
  };
  [CHANNELS.GET_SYSTEM_INFO]: {
    args: void;
    response: { success: boolean; data: ISystemInfo };
  };

  // ─── Package ───
  [CHANNELS.PACKAGE_LIST]: {
    args: void;
    response: { success: boolean; data: IPackage[] };
  };
  [CHANNELS.PACKAGE_GET]: {
    args: { id: string };
    response: { success: boolean; data: IPackage };
  };
  [CHANNELS.PACKAGE_CREATE]: {
    args: { name: string; description: string };
    response: { success: boolean; data: IPackage };
  };
  [CHANNELS.PACKAGE_UPDATE]: {
    args: { id: string; name: string; description: string };
    response: { success: boolean; data: IPackage };
  };
  [CHANNELS.PACKAGE_DELETE]: {
    args: { id: string };
    response: { success: boolean };
  };
  [CHANNELS.PACKAGE_LINK_RESOURCE]: {
    args: { packageId: string; resourceType: TResourceType; resourceId: string };
    response: { success: boolean; data: IPackageResource };
  };
  [CHANNELS.PACKAGE_UNLINK_RESOURCE]: {
    args: { packageId: string; resourceType: TResourceType; resourceId: string };
    response: { success: boolean };
  };
  [CHANNELS.PACKAGE_GET_RESOURCES]: {
    args: { packageId: string };
    response: { success: boolean; data: IPackageResource[] };
  };

  // ─── Connection ───
  [CHANNELS.CONNECTION_LIST]: {
    args: void;
    response: { success: boolean; data: IConnection[] };
  };
  [CHANNELS.CONNECTION_GET]: {
    args: { id: string };
    response: { success: boolean; data: IConnection };
  };
  [CHANNELS.CONNECTION_CREATE]: {
    args: IConnectionFormData;
    response: { success: boolean; data: IConnection };
  };
  [CHANNELS.CONNECTION_UPDATE]: {
    args: { id: string } & Partial<IConnectionFormData>;
    response: { success: boolean; data: IConnection };
  };
  [CHANNELS.CONNECTION_DELETE]: {
    args: { id: string };
    response: { success: boolean };
  };
  [CHANNELS.CONNECTION_TEST]: {
    args: IConnectionFormData;
    response: { success: boolean; data: IConnectionTestResult };
  };
  [CHANNELS.CONNECTION_STATUS]: {
    args: { id: string };
    response: { success: boolean; data: { status: TConnectionStatus } };
  };

  // ─── Diagram ───
  [CHANNELS.DIAGRAM_LIST]: {
    args: { type?: TDiagramType };
    response: { success: boolean; data: IDiagram[] };
  };
  [CHANNELS.DIAGRAM_GET]: {
    args: { id: string };
    response: { success: boolean; data: IDiagram };
  };
  [CHANNELS.DIAGRAM_CREATE]: {
    args: { name: string; type: TDiagramType; tables?: ITable[] };
    response: { success: boolean; data: IDiagram };
  };
  [CHANNELS.DIAGRAM_UPDATE]: {
    args: { id: string; name?: string; tables?: ITable[] };
    response: { success: boolean; data: IDiagram };
  };
  [CHANNELS.DIAGRAM_DELETE]: {
    args: { id: string };
    response: { success: boolean };
  };
  [CHANNELS.DIAGRAM_GET_LAYOUT]: {
    args: { diagramId: string };
    response: { success: boolean; data: IDiagramLayout };
  };
  [CHANNELS.DIAGRAM_SAVE_LAYOUT]: {
    args: IDiagramLayout;
    response: { success: boolean };
  };

  // ─── Diagram Versions ───
  [CHANNELS.DIAGRAM_VERSION_LIST]: {
    args: { diagramId: string };
    response: { success: boolean; data: IDiagramVersion[] };
  };
  [CHANNELS.DIAGRAM_VERSION_CREATE]: {
    args: { diagramId: string; ddlContent: string };
    response: { success: boolean; data: IDiagramVersion };
  };
  [CHANNELS.DIAGRAM_VERSION_RESTORE]: {
    args: { versionId: string };
    response: { success: boolean; data: IDiagram };
  };

  // ─── Schema (Real) ───
  [CHANNELS.SCHEMA_FETCH_REAL]: {
    args: { connectionId: string };
    response: { success: boolean; data: ITable[] };
  };

  // ─── Diff ───
  [CHANNELS.SCHEMA_DIFF]: {
    args: { virtualDiagramId: string; connectionId: string };
    response: { success: boolean; data: IDiffResult };
  };
  [CHANNELS.SCHEMA_GENERATE_MIGRATION]: {
    args: { diffResult: IDiffResult; dbType: TDbType };
    response: { success: boolean; data: { ddl: string } };
  };

  // ─── DDL ───
  [CHANNELS.DDL_PARSE]: {
    args: { ddl: string; dbType: TDbType };
    response: { success: boolean; data: ITable[] };
  };
  [CHANNELS.DDL_GENERATE]: {
    args: { tables: ITable[]; dbType: TDbType };
    response: { success: boolean; data: { ddl: string } };
  };

  // ─── Query ───
  [CHANNELS.QUERY_EXECUTE]: {
    args: { connectionId: string; sql: string };
    response: { success: boolean; data: IQueryResult };
  };
  [CHANNELS.QUERY_LIST]: {
    args: void;
    response: { success: boolean; data: IQuery[] };
  };
  [CHANNELS.QUERY_GET]: {
    args: { id: string };
    response: { success: boolean; data: IQuery };
  };
  [CHANNELS.QUERY_SAVE]: {
    args: { name: string; description: string; sqlContent: string; tags: string[] };
    response: { success: boolean; data: IQuery };
  };
  [CHANNELS.QUERY_UPDATE]: {
    args: { id: string } & Partial<IQuery>;
    response: { success: boolean; data: IQuery };
  };
  [CHANNELS.QUERY_DELETE]: {
    args: { id: string };
    response: { success: boolean };
  };
  [CHANNELS.QUERY_HISTORY_LIST]: {
    args: { limit?: number };
    response: { success: boolean; data: IQueryHistory[] };
  };

  // ─── Document ───
  [CHANNELS.DOCUMENT_LIST]: {
    args: void;
    response: { success: boolean; data: IDocument[] };
  };
  [CHANNELS.DOCUMENT_GET]: {
    args: { id: string };
    response: { success: boolean; data: IDocument };
  };
  [CHANNELS.DOCUMENT_CREATE]: {
    args: { name: string; content: string };
    response: { success: boolean; data: IDocument };
  };
  [CHANNELS.DOCUMENT_UPDATE]: {
    args: { id: string; name?: string; content?: string };
    response: { success: boolean; data: IDocument };
  };
  [CHANNELS.DOCUMENT_DELETE]: {
    args: { id: string };
    response: { success: boolean };
  };
  [CHANNELS.DOCUMENT_AUTO_GENERATE]: {
    args: { diagramId: string };
    response: { success: boolean; data: IDocument };
  };
  [CHANNELS.DOCUMENT_EXPORT]: {
    args: { documentId: string; format: TExportFormat; outputPath?: string };
    response: { success: boolean; data: { filePath: string } };
  };

  // ─── Validation ───
  [CHANNELS.VALIDATION_RUN]: {
    args: { virtualDiagramId: string; connectionId: string };
    response: { success: boolean; data: IValidationReport };
  };

  // ─── Mocking ───
  [CHANNELS.MOCK_GENERATE]: {
    args: { tableIds: string[]; diagramId: string; rowCount: number };
    response: { success: boolean; data: IMockResult };
  };
  [CHANNELS.MOCK_EXPORT]: {
    args: { mockResult: IMockResult; format: 'sql' | 'csv' | 'json' };
    response: { success: boolean; data: { content: string } };
  };
}
```

### 3.4 Validation & Mocking Types

```typescript
// ─── Validation ───
export type TValidationSeverity = 'error' | 'warning' | 'info';

export interface IValidationItem {
  severity: TValidationSeverity;
  category: string;        // 'type_mismatch' | 'missing_fk' | 'index_suggestion' ...
  tableName: string;
  columnName?: string;
  message: string;
  suggestion?: string;
}

export interface IValidationReport {
  items: IValidationItem[];
  summary: {
    errors: number;
    warnings: number;
    infos: number;
  };
  validatedAt: string;
}

// ─── Mocking ───
export interface IMockTableData {
  tableName: string;
  columns: string[];
  rows: Record<string, unknown>[];
}

export interface IMockResult {
  tables: IMockTableData[];
  generatedAt: string;
}
```

---

## 4. UI/UX Design

### 4.1 App Layout

```
┌──────────────────────────────────────────────────────────────────┐
│  ─ □ ✕  (Window Controls)                                       │
├──────┬───────────────────────────────────────────────────────────┤
│      │                                                           │
│  ┌─┐ │  ┌─────────┬────────┬────────┬───────┬────────┬───┬───┐ │
│  │A│ │  │ Package │Connect.│Diagram │ Query │Docum.  │Val│Mck│ │
│  │P│ │  └─────────┴────────┴────────┴───────┴────────┴───┴───┘ │
│  │I│ │  ┌───────────────────────────────────────────────────────┐│
│  └─┘ │  │                                                       ││
│  ┌─┐ │  │                                                       ││
│  │C│ │  │              Active Service Content                   ││
│  │O│ │  │                                                       ││
│  │D│ │  │                                                       ││
│  │E│ │  │                                                       ││
│  └─┘ │  │                                                       ││
│  ┌─┐ │  │                                                       ││
│  │D│*│  │                                                       ││
│  │B│ │  │                                                       ││
│  └─┘ │  └───────────────────────────────────────────────────────┘│
│  ┌─┐ │                                                           │
│  │I│ │                                                           │
│  │N│ │                                                           │
│  └─┘ │                                                           │
├──────┴───────────────────────────────────────────────────────────┤
│  Status Bar: [Connection: MySQL Dev (Connected)]  [v1.0.0]      │
└──────────────────────────────────────────────────────────────────┘

* = Active service
```

**사이드바 구성**:
- 아이콘 + 라벨 세로 나열
- Active 상태 시 배경 강조 + 좌측 인디케이터
- DB 외 항목은 클릭 시 "Coming Soon" placeholder

**상단 네비게이션**:
- 탭 형태, 가로 나열
- Active 탭 하단 인디케이터
- 아이콘 + 짧은 라벨

### 4.2 Connection 페이지

```
┌───────────────────────────────────────────────────────────────┐
│  Connections                                    [+ New]       │
├───────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌────────────────────────┐ ┌────────────────────────┐       │
│  │ 🟢 Dev MySQL           │ │ 🔴 Staging PostgreSQL  │       │
│  │ localhost:3306          │ │ staging.db.com:5432    │       │
│  │ mydb / dev_user         │ │ app_stg / stg_user    │       │
│  │ [Test] [Edit] [Delete]  │ │ [Test] [Edit] [Delete]│       │
│  └────────────────────────┘ └────────────────────────┘       │
│                                                               │
│  ┌────────────────────────┐                                   │
│  │ ⚪ Production MariaDB  │                                   │
│  │ prod.db.internal:3307   │                                  │
│  │ app_prod / readonly     │                                  │
│  │ [Test] [Edit] [Delete]  │                                  │
│  └────────────────────────┘                                   │
└───────────────────────────────────────────────────────────────┘

── Connection Form (Modal/Drawer) ──

┌─────────────────────────────────────────┐
│  New Connection                         │
├─────────────────────────────────────────┤
│  Name:     [Development MySQL        ]  │
│  DB Type:  [MySQL ▼]                    │
│  Host:     [localhost                ]  │
│  Port:     [3306                     ]  │
│  Database: [mydb                     ]  │
│  Username: [dev_user                 ]  │
│  Password: [••••••••                 ]  │
│  SSL:      [ ] Enable SSL              │
│                                         │
│  [Test Connection]  [Cancel]  [Save]    │
└─────────────────────────────────────────┘
```

### 4.3 Diagram 페이지

```
┌───────────────────────────────────────────────────────────────┐
│  [Virtual] [Real] [Diff]          [DDL Editor]  [Versions ▼] │
├───────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌─── React Flow Canvas ───────────────────────────────────┐ │
│  │                                                          │ │
│  │  ┌──────────────┐         ┌──────────────┐              │ │
│  │  │ users        │         │ orders       │              │ │
│  │  ├──────────────┤         ├──────────────┤              │ │
│  │  │🔑 id    INT  │────────>│🔑 id    INT  │              │ │
│  │  │  name  VCHAR │         │🔗 user_id INT│              │ │
│  │  │  email VCHAR │         │  total  DEC  │              │ │
│  │  │  created_at  │         │  status ENUM │              │ │
│  │  └──────────────┘         └──────────────┘              │ │
│  │                                                          │ │
│  │  ┌──────────────┐                                        │ │
│  │  │ order_items   │                                       │ │
│  │  ├──────────────┤                                        │ │
│  │  │🔑 id    INT  │                                        │ │
│  │  │🔗 order_id   │<──────── (from orders.id)             │ │
│  │  │  product  VC │                                        │ │
│  │  │  qty     INT │                                        │ │
│  │  └──────────────┘                                        │ │
│  │                          [+Table]  [Zoom: 100%]  [Fit]   │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                               │
│  ── Table Detail Panel (선택 시) ───                          │
│  ┌───────────────────────────────────────────────────────┐   │
│  │ Table: users                                           │   │
│  │ Comment: [사용자 테이블                              ] │   │
│  ├───────┬──────┬────┬─────────┬────────┬───────────────┤   │
│  │ Name  │ Type │Key │ Default │Nullable│ Comment       │   │
│  ├───────┼──────┼────┼─────────┼────────┼───────────────┤   │
│  │ id    │INT   │PK  │auto_inc │ No     │ 사용자 ID     │   │
│  │ name  │VCHAR │    │ NULL    │ Yes    │ 사용자명      │   │
│  │ email │VCHAR │UK  │ NULL    │ No     │ 이메일        │   │
│  ├───────┴──────┴────┴─────────┴────────┴───────────────┤   │
│  │ [+ Add Column]                         [Save] [Delete]│   │
│  └───────────────────────────────────────────────────────┘   │
└───────────────────────────────────────────────────────────────┘
```

**Diff 뷰 표시 규칙**:
- 추가 (Virtual에만 있음): 녹색 배경
- 삭제 (Real에만 있음): 빨간 배경
- 변경 (양쪽 다르게 있음): 노란 배경

### 4.4 Query 페이지

```
┌───────────────────────────────────────────────────────────────┐
│  Saved Queries          │  Query Editor                       │
│  ┌────────────────────┐ │  ┌─────────────────────────────────┐│
│  │ 📄 Get all users   │ │  │ Tab1 │ Tab2 │ + │              ││
│  │ 📄 User orders     │ │  ├─────────────────────────────────┤│
│  │ 📄 Revenue report  │ │  │ SELECT u.*, COUNT(o.id) AS     ││
│  │                    │ │  │ order_count                     ││
│  │                    │ │  │ FROM users u                    ││
│  │                    │ │  │ LEFT JOIN orders o              ││
│  │                    │ │  │   ON u.id = o.user_id           ││
│  │                    │ │  │ GROUP BY u.id;                  ││
│  │                    │ │  │                                 ││
│  │                    │ │  │  [▶ Run] [💾 Save] [Connection▼]││
│  ├────────────────────┤ │  └─────────────────────────────────┤│
│  │ History            │ │  ── Result ─────────────────────────│
│  │ 10:32 SELECT * ... │ │  │ id │ name  │ email  │ count    ││
│  │ 10:28 INSERT IN... │ │  │ 1  │ Alice │ a@e.co │ 5        ││
│  │ 10:15 UPDATE us... │ │  │ 2  │ Bob   │ b@e.co │ 3        ││
│  └────────────────────┘ │  │ 3 rows (12ms)                  ││
└─────────────────────────┴────────────────────────────────────┘
```

---

## 5. Routing Design

```typescript
// src/renderer/app/routes/index.tsx

const routes = {
  // Root redirect
  '/': redirect → '/db/package',

  // DB Service
  '/db': DbLayout (상단 네비게이션 포함)
    '/db/package':       DbPackagePage,
    '/db/connection':    DbConnectionPage,
    '/db/diagram':       DbDiagramPage,
    '/db/query':         DbQueryPage,
    '/db/documenting':   DbDocumentingPage,
    '/db/validation':    DbValidationPage,
    '/db/mocking':       DbMockingPage,

  // Placeholder services
  '/api':   PlaceholderPage (service="API"),
  '/code':  PlaceholderPage (service="Code"),
  '/infra': PlaceholderPage (service="Infra"),

  // 404
  '*': NotFoundPage,
};
```

**라우트 경로 상수** (`src/renderer/shared/config/constants.ts`):
```typescript
export const ROUTES = {
  ROOT: '/',
  DB: {
    ROOT: '/db',
    PACKAGE: '/db/package',
    CONNECTION: '/db/connection',
    DIAGRAM: '/db/diagram',
    QUERY: '/db/query',
    DOCUMENTING: '/db/documenting',
    VALIDATION: '/db/validation',
    MOCKING: '/db/mocking',
  },
  API: '/api',
  CODE: '/code',
  INFRA: '/infra',
} as const;
```

---

## 6. State Management Design

### 6.1 Strategy

| Data Category | Tool | Rationale |
|--------------|------|-----------|
| Server Data (CRUD) | TanStack React Query | 캐싱, 무효화, 로딩/에러 상태 자동 관리 |
| UI State (선택, 모달, 탭) | Zustand | 간결한 클라이언트 상태 관리 |
| Diagram Layout | Zustand + React Flow 내부 | React Flow 자체 상태 + 저장용 Zustand |
| Form State | React 내장 (useState) | 폼 상태는 컴포넌트 로컬 |

### 6.2 React Query Keys

```typescript
export const queryKeys = {
  packages: {
    all: ['packages'] as const,
    detail: (id: string) => ['packages', id] as const,
    resources: (id: string) => ['packages', id, 'resources'] as const,
  },
  connections: {
    all: ['connections'] as const,
    detail: (id: string) => ['connections', id] as const,
  },
  diagrams: {
    all: ['diagrams'] as const,
    byType: (type: TDiagramType) => ['diagrams', { type }] as const,
    detail: (id: string) => ['diagrams', id] as const,
    layout: (id: string) => ['diagrams', id, 'layout'] as const,
    versions: (id: string) => ['diagrams', id, 'versions'] as const,
  },
  queries: {
    all: ['queries'] as const,
    detail: (id: string) => ['queries', id] as const,
    history: (limit?: number) => ['queries', 'history', { limit }] as const,
  },
  documents: {
    all: ['documents'] as const,
    detail: (id: string) => ['documents', id] as const,
  },
};
```

### 6.3 Zustand Stores

```typescript
// features/virtual-diagram/model/diagramStore.ts
interface IDiagramUIState {
  selectedTableId: string | null;
  selectedColumnId: string | null;
  isDdlEditorOpen: boolean;
  activeTab: 'virtual' | 'real' | 'diff';
  setSelectedTable: (id: string | null) => void;
  setSelectedColumn: (id: string | null) => void;
  toggleDdlEditor: () => void;
  setActiveTab: (tab: 'virtual' | 'real' | 'diff') => void;
}

// features/query-execution/model/queryStore.ts
interface IQueryUIState {
  activeTabId: string | null;
  tabs: { id: string; name: string; sql: string }[];
  selectedConnectionId: string | null;
  addTab: () => void;
  removeTab: (id: string) => void;
  setActiveTab: (id: string) => void;
  updateTabSql: (id: string, sql: string) => void;
  setSelectedConnection: (id: string | null) => void;
}

// features/package-management/model/packageStore.ts
interface IPackageUIState {
  activePackageId: string | null;
  isFormOpen: boolean;
  setActivePackage: (id: string | null) => void;
  toggleForm: () => void;
}
```

---

## 7. Database Schema (Local SQLite)

### 7.1 DDL

```sql
-- 로컬 메타데이터 저장소 스키마

CREATE TABLE IF NOT EXISTS packages (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS package_resources (
  id TEXT PRIMARY KEY,
  package_id TEXT NOT NULL,
  resource_type TEXT NOT NULL CHECK (resource_type IN ('connection', 'diagram', 'query', 'document')),
  resource_id TEXT NOT NULL,
  is_shared INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (package_id) REFERENCES packages(id) ON DELETE CASCADE,
  UNIQUE (package_id, resource_type, resource_id)
);

CREATE TABLE IF NOT EXISTS connections (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  db_type TEXT NOT NULL CHECK (db_type IN ('mysql', 'mariadb', 'postgresql')),
  host TEXT NOT NULL,
  port INTEGER NOT NULL,
  database_name TEXT NOT NULL,
  username TEXT NOT NULL,
  encrypted_password TEXT NOT NULL,
  ssl_enabled INTEGER NOT NULL DEFAULT 0,
  ssl_config TEXT,  -- JSON
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS diagrams (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('virtual', 'real')),
  schema_data TEXT NOT NULL DEFAULT '[]',  -- JSON: ITable[]
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS diagram_layouts (
  diagram_id TEXT PRIMARY KEY,
  positions TEXT NOT NULL DEFAULT '{}',    -- JSON: Record<tableId, {x,y}>
  zoom REAL NOT NULL DEFAULT 1.0,
  viewport_x REAL NOT NULL DEFAULT 0,
  viewport_y REAL NOT NULL DEFAULT 0,
  FOREIGN KEY (diagram_id) REFERENCES diagrams(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS diagram_versions (
  id TEXT PRIMARY KEY,
  diagram_id TEXT NOT NULL,
  version_number INTEGER NOT NULL,
  ddl_content TEXT NOT NULL,
  schema_snapshot TEXT NOT NULL,           -- JSON: IDiagram
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (diagram_id) REFERENCES diagrams(id) ON DELETE CASCADE,
  UNIQUE (diagram_id, version_number)
);

CREATE TABLE IF NOT EXISTS queries (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  sql_content TEXT NOT NULL,
  tags TEXT NOT NULL DEFAULT '[]',         -- JSON: string[]
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS query_history (
  id TEXT PRIMARY KEY,
  query_id TEXT,
  sql_content TEXT NOT NULL,
  execution_time_ms INTEGER NOT NULL DEFAULT 0,
  row_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL CHECK (status IN ('success', 'error')),
  error_message TEXT,
  executed_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (query_id) REFERENCES queries(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  auto_generated INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_package_resources_package_id ON package_resources(package_id);
CREATE INDEX IF NOT EXISTS idx_package_resources_resource ON package_resources(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_diagram_versions_diagram_id ON diagram_versions(diagram_id);
CREATE INDEX IF NOT EXISTS idx_query_history_query_id ON query_history(query_id);
CREATE INDEX IF NOT EXISTS idx_query_history_executed_at ON query_history(executed_at DESC);
```

### 7.2 ID Generation
- UUID v4 사용 (`crypto.randomUUID()`)
- Node.js 내장 `crypto.randomUUID()` 활용

---

## 8. Key Service Logic

### 8.1 Connection Service (`main/services/connectionService.ts`)

```
연결 테스트 플로우:
1. IConnectionFormData 수신
2. dbType에 따라 mysqlClient 또는 pgClient 선택
3. 임시 연결 생성 → SELECT 1 실행 → 결과 확인
4. 연결 해제
5. IConnectionTestResult 반환 (success, message, latencyMs, serverVersion)

저장 플로우:
1. password → crypto.encrypt() → encrypted_password
2. connectionRepository.create() 호출
3. 응답에서 password 제외
```

### 8.2 Schema Service (`main/services/schemaService.ts`)

```
Real Schema 조회 플로우:
1. connectionId로 연결 정보 조회
2. 해당 DB에 연결
3. MySQL/MariaDB: information_schema.TABLES + COLUMNS + KEY_COLUMN_USAGE + TABLE_CONSTRAINTS
   PostgreSQL: information_schema.tables + columns + table_constraints + key_column_usage
4. ITable[] 형태로 정규화
5. 연결 해제
6. 결과 반환
```

### 8.3 Diff Service (`main/services/diffService.ts`)

```
Diff 비교 알고리즘:
1. Virtual Diagram의 ITable[] 로드
2. Real Schema 조회 (connectionId 사용)
3. 테이블 이름 기준 매칭:
   - Virtual에만 있는 테이블 → 'added'
   - Real에만 있는 테이블 → 'removed'
   - 양쪽 모두 있는 테이블 → 컬럼/제약조건 비교
4. 컬럼 비교 (이름 기준):
   - 추가/삭제/변경 (dataType, nullable, default, comment, keyType)
5. 제약조건 비교 (이름 기준):
   - 추가/삭제/변경
6. IDiffResult 생성
7. Migration DDL 자동 생성 (ALTER TABLE / CREATE TABLE / DROP TABLE)
```

### 8.4 DDL Parser/Generator (`features/ddl-editor/lib/`)

```
DDL → Schema (ddlParser.ts):
1. DDL 문자열 수신
2. CREATE TABLE 구문 파싱 (정규식 + 상태 머신)
3. 테이블명, 컬럼 정의, 제약조건 추출
4. ITable[] 형태로 변환
5. 지원 구문: CREATE TABLE, PRIMARY KEY, FOREIGN KEY, UNIQUE, INDEX, DEFAULT, NOT NULL, COMMENT

Schema → DDL (schemaToddl.ts):
1. ITable[] 수신
2. dbType에 따른 DDL 구문 생성
3. CREATE TABLE + 컬럼 정의 + 제약조건
4. DB 종류별 문법 차이 처리 (AUTO_INCREMENT vs SERIAL, ENUM 등)
```

### 8.5 Crypto Service (`main/infrastructure/crypto.ts`)

```
암호화 전략:
1. Electron safeStorage API 사용
  - safeStorage.isEncryptionAvailable() 확인
  - safeStorage.encryptString() / safeStorage.decryptString()
2. safeStorage 사용 불가 시 fallback:
  - Node.js crypto.createCipheriv (AES-256-GCM)
  - 머신별 고유 키 파생 (os.hostname + os.userInfo)
```

---

## 9. New Dependencies

| Package | Version | Purpose | Install Location |
|---------|---------|---------|-----------------|
| `@xyflow/react` | ^12 | React Flow (Diagram 캔버스) | dependencies |
| `mysql2` | ^3 | MySQL/MariaDB 드라이버 | dependencies |
| `pg` | ^8 | PostgreSQL 드라이버 | dependencies |
| `@uiw/react-codemirror` | ^4 | CodeMirror React 래퍼 | dependencies |
| `@codemirror/lang-sql` | ^6 | CodeMirror SQL 언어 지원 | dependencies |
| `better-sqlite3` | ^11 | 로컬 SQLite DB | dependencies |
| `@types/better-sqlite3` | ^7 | SQLite 타입 정의 | devDependencies |
| `@types/pg` | ^8 | PostgreSQL 타입 정의 | devDependencies |
| `jspdf` | ^2 | PDF 생성 | dependencies |
| `html2canvas` | ^1 | DOM → Canvas (이미지 Export) | dependencies |
| `sql-formatter` | ^15 | SQL 포맷팅 | dependencies |

---

## 10. Implementation Order

### Phase 1: App Layout + Navigation (P0)
1. `shared/config/constants.ts` - 라우트 상수 정의
2. `widgets/app-sidebar/` - 앱 사이드바 위젯
3. `widgets/db-top-nav/` - DB 상단 네비게이션 위젯
4. `app/layouts/AppLayout.tsx` - 전체 레이아웃
5. `app/layouts/DbLayout.tsx` - DB 서비스 레이아웃
6. `app/routes/index.tsx` - 라우팅 설정
7. 각 서비스 빈 페이지 생성 (placeholder)

### Phase 2: Infrastructure + Package + Connection (P0)
1. `better-sqlite3` 설치 + `main/infrastructure/database/localDb.ts`
2. `main/infrastructure/database/localDb.schema.ts` - DDL 실행
3. `main/infrastructure/crypto.ts` - 암호화 유틸
4. `shared/types/db.ts` - 공유 타입 정의
5. `shared/ipc/channels.ts` - IPC 채널 확장
6. `shared/ipc/events.ts` - IPC 이벤트 확장
7. Package: Repository → Service → Handler → Feature → Page
8. Connection: Repository → Service → Handler → Feature → Page
9. `mysql2`, `pg` 설치 + Infrastructure 클라이언트

### Phase 3: Virtual Diagram (P0)
1. `@xyflow/react` 설치
2. `entities/table/`, `entities/column/` 타입 정의
3. `widgets/diagram-canvas/` - React Flow 래퍼 + 커스텀 노드/엣지
4. `features/virtual-diagram/` - Virtual Diagram CRUD
5. `@uiw/react-codemirror` + `@codemirror/lang-sql` 설치
6. `features/ddl-editor/` - DDL 파서 + 생성기 + 에디터
7. `pages/db-diagram/` - Diagram 페이지 (Virtual 탭)
8. Diagram Version Repository + Service

### Phase 4: Real Diagram + Diff (P0)
1. `main/services/schemaService.ts` - information_schema 조회
2. `features/real-diagram/` - Real Diagram 뷰
3. `main/services/diffService.ts` - Diff 엔진
4. `features/diagram-diff/` - Diff 뷰 + Migration DDL
5. `pages/db-diagram/` - Real/Diff 탭 추가

### Phase 5: Query (P1)
1. `widgets/sql-editor/` - CodeMirror SQL 에디터
2. `widgets/query-result-table/` - 결과 테이블
3. `main/services/queryService.ts` - 쿼리 실행
4. `features/query-execution/` - 쿼리 패널 + 탭 + 이력
5. `pages/db-query/` - Query 페이지

### Phase 6: Documenting (P1)
1. `main/services/documentService.ts` - 자동 문서 생성 로직
2. `main/services/exportService.ts` - PDF/이미지 Export
3. `jspdf`, `html2canvas` 설치
4. `features/db-documenting/` - 에디터 + 미리보기 + Export
5. `pages/db-documenting/` - Documenting 페이지

### Phase 7: Validation + Mocking (P2)
1. `main/services/validationService.ts` - 검증 로직
2. `features/schema-validation/` - 검증 UI
3. `main/services/mockingService.ts` - Mock 생성 로직
4. `features/data-mocking/` - Mock UI
5. `pages/db-validation/`, `pages/db-mocking/`

---

## 11. Testing Strategy

### 11.1 Unit Tests (90%+ Coverage)

| Target | Test File Location | Key Scenarios |
|--------|-------------------|---------------|
| `diffService` | Colocated `.test.ts` | 테이블 추가/삭제/변경 감지, 빈 스키마 비교 |
| `ddlParser` | Colocated `.test.ts` | MySQL/MariaDB/PG DDL 파싱, 잘못된 DDL 처리 |
| `schemaToddl` | Colocated `.test.ts` | ITable → DDL 변환, DB별 문법 차이 |
| `schemaToNodes` | Colocated `.test.ts` | Schema → React Flow 노드 변환 |
| `crypto` | Colocated `.test.ts` | 암호화/복호화, safeStorage fallback |
| `connectionService` | Colocated `.test.ts` | 연결 테스트, 연결 생성/삭제 |
| `queryService` | Colocated `.test.ts` | 쿼리 실행, 이력 저장 |
| `validationService` | Colocated `.test.ts` | 각 검증 규칙별 테스트 |
| `mockingService` | Colocated `.test.ts` | 타입별 Mock 데이터 생성 |
| All Repositories | Colocated `.test.ts` | CRUD 동작 |

### 11.2 Integration Tests (75%+ Coverage)

| Target | Test File | Key Scenarios |
|--------|----------|---------------|
| Package ↔ Resource 연결 | `tests/integration/package-resource.int.ts` | 패키지에 리소스 연결/해제, 공유 리소스 |
| Connection → Schema 조회 | `tests/integration/connection-schema.int.ts` | 연결 후 스키마 조회 (Mock DB) |
| DDL ↔ Diagram 동기화 | `tests/integration/ddl-diagram-sync.int.ts` | DDL 파싱 → Diagram 반영 → DDL 재생성 |
| Virtual ↔ Real Diff | `tests/integration/diagram-diff.int.ts` | Diff 결과 정확성, Migration DDL |

### 11.3 E2E Tests

| Scenario | Test File |
|----------|----------|
| 패키지 생성 → 연결 추가 → 패키지에 연결 | `tests/e2e/package-flow.e2e.ts` |
| Diagram 테이블 생성 → DDL 확인 | `tests/e2e/diagram-flow.e2e.ts` |
| 쿼리 작성 → 실행 → 결과 확인 | `tests/e2e/query-flow.e2e.ts` |

---

## 12. Security Considerations

| Area | Measure |
|------|---------|
| DB 비밀번호 | Electron `safeStorage` 암호화, Renderer에 평문 전달 안 함 |
| SQL Injection | parameterized query 사용 (mysql2 prepared statement, pg parameterized) |
| IPC 보안 | contextIsolation: true, nodeIntegration: false (기존 설정 유지) |
| 연결 정보 | Main Process에서만 DB 접속, Renderer는 IPC만 사용 |
| 로컬 SQLite | 앱 데이터 디렉토리에 저장 (app.getPath('userData')) |
