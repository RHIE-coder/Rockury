# Query Browser Service — Design Spec

## Overview

Live Console에 Query 네비게이션/서비스를 추가한다. SQL 쿼리를 폴더 구조로 관리하고, 실행하고, Collection으로 묶어 일괄 실행할 수 있는 기능이다.

## Design Decisions

| 항목 | 결정 | 이유 |
|------|------|------|
| 저장 방식 | DB 커넥션별 메타데이터 (localDb) | 커넥션마다 독립적인 쿼리 관리 |
| DML 트랜잭션 | 자동 BEGIN → Confirm(COMMIT) / Rollback(ROLLBACK) | 실제 DB 트랜잭션으로 안전성 보장 |
| 히스토리 관리 | 분리 저장 + 통합 뷰 | 출처별 독립 관리, 사용자에게는 통합 타임라인 |
| 히스토리 UI | History 탭 + 사이드 드로어 | 전체 탐색 + 작업 중 빠른 확인 |
| Collection → Query | 참조 방식 | Query 재사용, 삭제 시 참조 체크 |
| Collection 실패 처리 | 실패 시 중지 → 중단(ROLLBACK)/재시도 | 원자적 트랜잭션이므로 건너뛰기 없음 |
| Collection 트랜잭션 | 전체 하나의 트랜잭션 (원자성) | 단순하고 안전한 구조 |
| 트리 DnD | @dnd-kit 기반 직접 구현 | 프로젝트 기존 패턴 활용 |
| Feature 구조 | 독립 feature + data-browser UI 직접 import | 단일 책임 + 실용적 재사용 |

---

## 1. Data Model (localDb Schema)

> **Migration 통합:** 모든 CREATE TABLE은 `localDb.schema.ts`의 `ALL_MIGRATIONS` 배열에 추가.
> ALTER TABLE은 `alterMigrations` 배열에 추가 (try/catch로 안전 실행).

### 1.1 query_folders

폴더 트리 구조. `parent_id` 자기참조로 무한 중첩.

```sql
CREATE TABLE IF NOT EXISTS query_folders (
  id TEXT PRIMARY KEY,
  connection_id TEXT NOT NULL,
  parent_id TEXT,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (connection_id) REFERENCES connections(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_id) REFERENCES query_folders(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_query_folders_connection ON query_folders(connection_id);
CREATE INDEX IF NOT EXISTS idx_query_folders_parent ON query_folders(parent_id);
```

### 1.2 queries (기존 테이블 확장)

기존 `queries` 테이블에 `connection_id`, `folder_id`, `sort_order` 추가.

```sql
ALTER TABLE queries ADD COLUMN connection_id TEXT;
ALTER TABLE queries ADD COLUMN folder_id TEXT;
ALTER TABLE queries ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0;
```

> **기존 데이터 처리:** `connection_id`가 NULL인 기존 쿼리는 트리에 표시되지 않음 (orphan).
> 기존 `query-execution` feature의 CRUD는 그대로 유지되며, 새 query-browser는 별도 IPC 채널(`QB_*` prefix)을 사용하여 충돌 없음.

```sql
CREATE INDEX IF NOT EXISTS idx_queries_connection ON queries(connection_id);
CREATE INDEX IF NOT EXISTS idx_queries_folder ON queries(folder_id);
```

### 1.3 collection_folders

Collection 전용 폴더 트리.

```sql
CREATE TABLE IF NOT EXISTS collection_folders (
  id TEXT PRIMARY KEY,
  connection_id TEXT NOT NULL,
  parent_id TEXT,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (connection_id) REFERENCES connections(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_id) REFERENCES collection_folders(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_collection_folders_connection ON collection_folders(connection_id);
```

### 1.4 collections

```sql
CREATE TABLE IF NOT EXISTS collections (
  id TEXT PRIMARY KEY,
  connection_id TEXT NOT NULL,
  folder_id TEXT,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (connection_id) REFERENCES connections(id) ON DELETE CASCADE,
  FOREIGN KEY (folder_id) REFERENCES collection_folders(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_collections_connection ON collections(connection_id);
```

### 1.5 collection_items

Collection ↔ Query 참조 테이블.

```sql
CREATE TABLE IF NOT EXISTS collection_items (
  id TEXT PRIMARY KEY,
  collection_id TEXT NOT NULL,
  query_id TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE CASCADE,
  FOREIGN KEY (query_id) REFERENCES queries(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_collection_items_collection ON collection_items(collection_id);
CREATE INDEX IF NOT EXISTS idx_collection_items_query ON collection_items(query_id);
```

`ON DELETE RESTRICT`: Query 삭제 시 Collection에 참조되어 있으면 삭제 실패.

### 1.6 query_history (기존 테이블 확장)

```sql
ALTER TABLE query_history ADD COLUMN connection_id TEXT;
ALTER TABLE query_history ADD COLUMN source TEXT NOT NULL DEFAULT 'query';
  -- 'query' | 'data' | 'collection'
ALTER TABLE query_history ADD COLUMN affected_tables TEXT NOT NULL DEFAULT '[]';
ALTER TABLE query_history ADD COLUMN affected_rows INTEGER NOT NULL DEFAULT 0;
ALTER TABLE query_history ADD COLUMN dml_type TEXT;
  -- 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | 'DDL' | null
```

> **SQLite 호환성:** `NOT NULL DEFAULT 'query'`는 상수 default이므로 기존 행이 있어도 안전.

---

## 2. UI Layout

### 2.1 탭 구조

```
[Query | Collection | History]                [clock History drawer toggle]
```

3개 탭 + 우상단에 History 사이드 드로어 토글 버튼.

### 2.2 Query 탭

```
┌─ [Query] [Collection] [History] ──────────── [History] ──┐
│                                                            │
│  ┌─ File Tree ──┐  ┌─ Toolbar ────────────────────────┐   │
│  │ Search       │  │ filename.sql                      │   │
│  │ [+folder][+] │  │ description (editable)            │   │
│  │              │  │     [Collection badges] [Run]     │   │
│  │ folder/file  │  ├──────────────────────────────────┤   │
│  │ tree with    │  │ SQL Editor (CodeMirror)           │   │
│  │ drag & drop  │  │                                   │   │
│  │              │  │            === (resize handle)     │   │
│  │              │  ├──────────────────────────────────┤   │
│  │              │  │ Result Table (DataGrid reuse)     │   │
│  │              │  │                                   │   │
│  │              │  ├──────────────────────────────────┤   │
│  └──────────────┘  │ Footer (pagination)               │   │
│                     └──────────────────────────────────┘   │
└────────────────────────────────────────────────────────────┘
```

**좌측 패널 — File Tree:**
- 검색, 새 폴더/새 쿼리 버튼
- 폴더 중첩 무제한, @dnd-kit 드래그 정렬
- 우클릭: 이름 변경 / 삭제
- 삭제 시 Collection 참조 체크 → 실패하면 참조 Collection 리스트 표시

**우측 상단 — Toolbar:**
- 파일명
- Description (한 줄 표시, 비어있으면 `+ Add description`, 연필 아이콘으로 인라인 편집)
- Collection 소속 배지 (보라색, 클릭 시 해당 Collection으로 이동)
- Run 버튼 (Cmd+Enter 단축키)

**우측 중앙 — SQL Editor:**
- CodeMirror with SQL 문법 하이라이팅
- 에디터/결과 영역 사이 드래그 리사이즈

**우측 하단 — Result:**
- SELECT → DataGrid 재사용 (data-browser에서 import) + DataFooter 페이지네이션
- DML → DmlResultPanel (아래 2.4 참조)

### 2.3 DML 실행 결과 (SELECT가 아닌 경우)

```
┌─ DML Result ─────────────────────────────────┐
│                                               │
│  Type: UPDATE                                 │
│  Affected Rows: 15                            │
│  Tables: users                                │
│                                               │
│  Transaction: BEGIN → awaiting decision...    │
│                                               │
│  [Confirm]              [Rollback]            │
│                                               │
└───────────────────────────────────────────────┘
```

- 자동 `BEGIN` → SQL 실행 → 결과 표시 → 사용자 Confirm(`COMMIT`) 또는 Rollback(`ROLLBACK`)
- DDL 감지 시: 트랜잭션 밖에서 즉시 실행 + "DDL은 롤백 불가" 경고 표시

### 2.4 Collection 탭

```
┌─ [Query] [Collection] [History] ──────────── [History] ──┐
│                                                            │
│  ┌─ File Tree ──┐  ┌─ Toolbar ────────────────────────┐   │
│  │ Search       │  │ Daily Check                       │   │
│  │ [+folder][+] │  │ description (editable)            │   │
│  │              │  │                       [Run All]   │   │
│  │ folder/file  │  ├──────────────────────────────────┤   │
│  │ tree         │  │ # │ Query         │ Status │ Run │   │
│  │              │  │───┼───────────────┼────────┼─────│   │
│  │              │  │ 1 │ get-active-*  │  done  │  >  │   │
│  │              │  │ 2 │ update-status │ waiting│  >  │   │
│  │              │  │ 3 │ cleanup-logs  │   —    │  >  │   │
│  │              │  │                                   │   │
│  │              │  │ [+ Add Query]                      │   │
│  └──────────────┘  └──────────────────────────────────┘   │
└────────────────────────────────────────────────────────────┘
```

**동작:**
- Query 리스트: 순서 표시, 드래그로 순서 변경
- 개별 실행 버튼 + 전체 실행(Run All)
- 전체 실행 시 하나의 트랜잭션 (원자적)
- SELECT 결과 → 클릭 시 모달(CollectionResultModal)로 표시
- DML 결과 → 전체 완료 후 Confirm/Rollback
- 실패 시 → 중단(전체 ROLLBACK) / 재시도 선택. 원자적 트랜잭션이므로 "건너뛰기"는 지원하지 않음 (부분 실행 커밋 방지)
- `+ Add Query` → Query 탭의 트리에서 선택하는 피커

### 2.5 History 탭

```
┌─ [Query] [Collection] [History] ─────────────────────────┐
│                                                            │
│  ┌─ Filter ──────────────────────────────────────────┐    │
│  │ [All] [Query] [Data] [Collection]    Search SQL   │    │
│  └───────────────────────────────────────────────────┘    │
│                                                            │
│  ┌──────┬──────────┬────────────┬──────┬──────┬──────┐   │
│  │ Time │ Source   │ SQL        │ Rows │Speed │Status│   │
│  ├──────┼──────────┼────────────┼──────┼──────┼──────┤   │
│  │14:23 │ Query    │ SELECT ... │  42  │ 23ms │  OK  │   │
│  │14:21 │ Data     │ UPDATE ... │   3  │ 15ms │  OK  │   │
│  │14:18 │ Collect. │ [Daily Ch] │  58  │102ms │  OK  │   │
│  │14:15 │ Query    │ DELETE ... │   0  │  8ms │ Err  │   │
│  └──────┴──────────┴────────────┴──────┴──────┴──────┘   │
│                                                            │
│  ┌─ Detail (선택 시) ────────────────────────────────┐    │
│  │ SQL: SELECT u.id, u.name FROM users WHERE ...      │    │
│  │ Error: (if failed) ...                              │    │
│  │ [Delete] [Copy SQL] [Re-run]                        │    │
│  └────────────────────────────────────────────────────┘    │
└────────────────────────────────────────────────────────────┘
```

- Source 필터: All / Query / Data / Collection
- SQL 텍스트 검색
- 클릭 시 하단 상세 패널 (SQL 전문, 에러 메시지)
- 액션: 삭제, SQL 복사, 재실행
- 시간순 정렬 (최신 위), 제한 없음

### 2.6 History 사이드 드로어

Query/Collection 탭에서 우상단 History 버튼 클릭 시 오른쪽에서 슬라이드.

- 최근 20건 간략 표시 (시간 + SQL 미리보기 + 상태)
- "View All →" 링크로 History 탭 이동
- 바깥 클릭 시 닫힘

---

## 3. Component Structure

### 3.1 Feature Directory

```
src/renderer/features/query-browser/
├── index.ts
├── model/
│   ├── queryBrowserStore.ts       # Zustand — 선택 쿼리/컬렉션, 활성 탭
│   ├── useQueryTree.ts            # 폴더/파일 CRUD + 드래그 정렬
│   ├── useCollectionTree.ts       # Collection 폴더/파일 CRUD + 드래그 정렬
│   ├── useQueryExecution.ts       # SQL 실행 + 트랜잭션 관리
│   └── useCollectionRunner.ts     # Collection 순차 실행 (상태 추적, 실패 처리)
├── lib/
│   └── queryHistoryService.ts     # 히스토리 조회/삭제 (IPC 호출)
└── ui/
    ├── QueryTab.tsx               # Query 탭 전체 (트리 + 에디터 + 결과)
    ├── CollectionTab.tsx          # Collection 탭 전체
    ├── HistoryTab.tsx             # History 탭 전체
    ├── FileTreePanel.tsx          # 공용 폴더/파일 트리 (Query/Collection)
    ├── SqlEditorPanel.tsx         # CodeMirror SQL 에디터 + 리사이즈
    ├── DmlResultPanel.tsx         # DML 결과 (affected rows + Confirm/Rollback)
    ├── CollectionQueryList.tsx    # Collection 내 Query 리스트
    ├── CollectionResultModal.tsx  # SELECT 결과 모달
    ├── HistoryDrawer.tsx          # 사이드 드로어
    └── HistoryTable.tsx           # History 탭 테이블
```

### 3.2 Page Component

```
src/renderer/pages/db-query/
└── ui/QueryBrowserPage.tsx        # 탭 전환 + 드로어 상태 관리
```

### 3.3 Reused Components (from data-browser)

```
import from '@/features/data-browser':
- DataGrid           → 결과 테이블 렌더링
- DataFooter         → 페이지네이션
- ColumnVisibility   → 컬럼 표시 토글
- ExportMenu         → 결과 내보내기
- JsonEditorModal    → JSON 셀 보기
```

### 3.4 Existing feature reuse

```
import from '@/features/query-execution':
- queryApi.execute() → 단발 SQL 실행 (기존 그대로, SELECT 및 DDL에 사용)
```

> **query-execution 공존:** 기존 `query-execution` feature는 그대로 유지한다.
> 새 `query-browser`는 쿼리 관리(폴더/트리), 트랜잭션, 히스토리를 담당하며,
> 단발 SQL 실행은 기존 `queryApi.execute()`를 재사용한다.
> IPC 채널은 `QB_*` prefix로 분리되어 충돌 없음.

---

## 4. IPC Channels

> **IPC 채널 네이밍:** 기존 `query-execution` feature의 `QUERY_*` 채널과 충돌을 피하기 위해 `QB_*` (Query Browser) prefix를 사용한다.

### 4.1 Query/Folder CRUD

| Channel | Request | Response |
|---------|---------|----------|
| `QB_QUERY_TREE_LIST` | `{ connectionId }` | `{ folders, queries }` (트리 구조) |
| `QB_QUERY_FOLDER_SAVE` | `{ id?, connectionId, parentId?, name, sortOrder }` | `{ folder }` |
| `QB_QUERY_FOLDER_DELETE` | `{ id }` | `{ success }` |
| `QB_QUERY_SAVE` | `{ id?, connectionId, folderId?, name, description, sqlContent, sortOrder }` | `{ query }` |
| `QB_QUERY_GET` | `{ id }` | `{ query }` (sql_content 포함) |
| `QB_QUERY_DELETE` | `{ id }` | `{ success, error?, referencedCollections? }` |
| `QB_QUERY_BULK_MOVE` | `{ items: { id, folderId?, sortOrder }[] }` | `{ success }` |

### 4.2 Collection CRUD

| Channel | Request | Response |
|---------|---------|----------|
| `QB_COLLECTION_TREE_LIST` | `{ connectionId }` | `{ folders, collections }` |
| `QB_COLLECTION_FOLDER_SAVE` | `{ id?, connectionId, parentId?, name, sortOrder }` | `{ folder }` |
| `QB_COLLECTION_FOLDER_DELETE` | `{ id }` | `{ success }` |
| `QB_COLLECTION_SAVE` | `{ id?, connectionId, folderId?, name, description, sortOrder }` | `{ collection }` |
| `QB_COLLECTION_GET` | `{ id }` | `{ collection, items }` |
| `QB_COLLECTION_DELETE` | `{ id }` | `{ success }` |
| `QB_COLLECTION_ITEM_SAVE` | `{ collectionId, items: { queryId, sortOrder }[] }` | `{ success }` |

### 4.3 Transaction

| Channel | Request | Response |
|---------|---------|----------|
| `QB_TX_BEGIN` | `{ connectionId }` | `{ txId }` |
| `QB_TX_EXECUTE` | `{ txId, sql }` | `{ result }` |
| `QB_TX_COMMIT` | `{ txId }` | `{ success }` |
| `QB_TX_ROLLBACK` | `{ txId }` | `{ success }` |

### 4.4 History

| Channel | Request | Response |
|---------|---------|----------|
| `QB_HISTORY_LIST` | `{ connectionId?, source?, search?, page, pageSize }` | `{ items, total }` |
| `QB_HISTORY_DELETE` | `{ id }` | `{ success }` |

> **기존 `QUERY_HISTORY_LIST` 호환:** 기존 query-execution의 히스토리 API는 그대로 유지. 새 `QB_HISTORY_LIST`는 확장된 필터를 지원하는 별도 채널.

---

## 5. Main Process Services

### 5.1 queryBrowserService.ts

쿼리/폴더 CRUD. localDb 직접 접근.

- `listTree(connectionId)` → 폴더 + 쿼리를 트리로 반환
- `saveFolder(data)` → 폴더 생성/수정
- `deleteFolder(id)` → 하위 포함 삭제
- `saveQuery(data)` → 쿼리 생성/수정
- `getQuery(id)` → 단일 쿼리 (sql_content 포함)
- `deleteQuery(id)` → collection_items 참조 체크 후 삭제. 참조 있으면 실패 + 참조 Collection 리스트 반환

### 5.2 collectionService.ts

Collection/폴더/아이템 CRUD.

- `listTree(connectionId)` → 폴더 + 컬렉션 트리
- `saveFolder(data)` → 폴더 생성/수정
- `deleteFolder(id)` → 하위 포함 삭제
- `saveCollection(data)` → 생성/수정
- `getCollection(id)` → 컬렉션 + items (query 정보 JOIN)
- `deleteCollection(id)` → 삭제 (items CASCADE)
- `saveItems(collectionId, items)` → 아이템 목록 일괄 교체

### 5.3 transactionService.ts

커넥션별 트랜잭션 관리. 커넥션을 열어둔 채 유지.

```typescript
interface ActiveTransaction {
  connection: MysqlConnection | PgClient;
  dbType: 'mysql' | 'mariadb' | 'postgresql';
  connectionId: string;
  createdAt: number;
}

const activeTxMap = new Map<string, ActiveTransaction>();

- begin(connectionId) → 커넥션 생성 + BEGIN + txId 반환
- executeInTx(txId, sql) → 해당 커넥션에서 실행
- commit(txId) → COMMIT + 커넥션 닫기 + Map 제거
- rollback(txId) → ROLLBACK + 커넥션 닫기 + Map 제거
- cleanup() → 5분 초과 트랜잭션 자동 ROLLBACK (setInterval)
- cleanupAll() → 앱 종료 시 모든 활성 트랜잭션 ROLLBACK + 커넥션 닫기
```

> **DB 타입 지원:** mysql/mariadb는 동일 드라이버(mysql2), postgresql은 pg 드라이버.
> SQLite는 외부 DB 커넥션이 아니므로 트랜잭션 대상 아님.
> **앱 종료 처리:** Electron `before-quit` 이벤트에서 `cleanupAll()` 호출.

### 5.4 queryHistoryService.ts (확장)

기존 queryHistoryRepository 확장.

- `list(filter)` → connection_id, source, search, 페이지네이션
- `create(data)` → connection_id, source, dml_type 등 추가 필드
- `deleteById(id)`

### 5.5 IPC Handler

```
src/main/ipc/handlers/queryBrowserHandlers.ts
```

위 IPC 채널 전체를 등록.

---

## 6. Navigation Integration

### 6.1 Route 추가

```typescript
// constants.ts — ROUTES.DB.LIVE_CONSOLE
LIVE_CONSOLE: {
  ROOT: '/db/console',
  CONNECTION: '/db/console/connection',
  DIAGRAM: '/db/console/diagram',
  DATA: '/db/console/data',
  QUERY: '/db/console/query',       // NEW
}
```

### 6.2 LiveConsoleLayout 탭 추가

```typescript
{ id: 'query', label: 'Query', icon: Terminal, path: ROUTES.DB.LIVE_CONSOLE.QUERY }
```

### 6.3 Route 등록

```typescript
<Route path="query" element={<QueryBrowserPage />} />
```

---

## 7. DDL Detection

SQL 앞부분을 파싱하여 DDL 여부를 판별.

```typescript
function isDdl(sql: string): boolean {
  // Strip leading comments (-- and /* */)
  const stripped = sql.replace(/^\s*(--[^\n]*\n|\/\*[\s\S]*?\*\/\s*)*/g, '').trim();
  const normalized = stripped.toUpperCase();
  return /^(CREATE|ALTER|DROP|TRUNCATE|RENAME|GRANT|REVOKE|COMMENT\s+ON)\s/.test(normalized);
}
```

- DDL → 트랜잭션 없이 즉시 실행 (기존 queryApi.execute)
- 결과에 "This statement was executed immediately (not in transaction)" 경고 표시
- MySQL에서 DDL의 암묵적 COMMIT 문제 회피

---

## 8. Error Handling

| 상황 | 처리 |
|------|------|
| SQL 문법 오류 | 에러 배너 + 히스토리에 error 기록 |
| 트랜잭션 타임아웃 (5분) | 자동 ROLLBACK + 토스트 알림 |
| Query 삭제 시 Collection 참조 | 삭제 실패 + 참조 Collection 리스트 표시 |
| Collection 실행 중 실패 | 일시 중지 → 중단(전체 ROLLBACK)/재시도 선택. 원자적 트랜잭션이므로 건너뛰기 없음 |
| connectionId 미선택 | Query 탭 disabled (LiveConsoleLayout 패턴과 동일). "Connect first" 안내 표시 |
| 커넥션 끊김 (트랜잭션 중) | 자동 ROLLBACK + 에러 표시 |
| DDL 실행 감지 | 트랜잭션 밖 즉시 실행 + 롤백 불가 경고 |

---

## 9. Testing Strategy

| 대상 | 타입 | 커버리지 목표 |
|------|------|-------------|
| transactionService | Unit | 90%+ |
| collectionRunner | Unit | 90%+ |
| queryBrowserService | Unit | 90%+ |
| collectionService | Unit | 90%+ |
| queryHistoryService | Unit | 90%+ |
| isDdl | Unit | 90%+ |
| FileTreePanel | Unit | 70% |
| SqlEditorPanel | Unit | 70% |
| DmlResultPanel | Unit | 70% |
| CollectionQueryList | Unit | 70% |
| queryBrowserStore | Unit | 75% |

테스트 네이밍: `{name}.test.ts` (Unit).
AAA 패턴 준수. 외부 의존성(IPC, DB)은 Mock 처리.
