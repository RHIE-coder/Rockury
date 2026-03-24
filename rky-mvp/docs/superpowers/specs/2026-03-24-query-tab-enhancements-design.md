# Query Tab Enhancements — Design Spec

> Date: 2026-03-24
> Scope: SQL Formatter + EXPLAIN + EXPLAIN ANALYZE (always on Run)
> Target: 기존 Query 탭 (zero-breaking-change)

---

## 1. Features

| # | Feature | 위치 | 동작 |
|---|---------|------|------|
| 1 | SQL Formatter | 툴바 버튼 | 에디터 내 SQL 포매팅 (프론트엔드 완결) |
| 2 | EXPLAIN | 툴바 버튼 | 쿼리 실행 없이 예상 실행 계획 조회 |
| 3 | EXPLAIN ANALYZE | Run에 항상 포함 | Run 시 실행 계획 자동 수집, DataGrid 위에 요약 표시 |

---

## 2. SQL Formatter

### 동작
- 툴바 `[🎨 Format]` 버튼 클릭
- 에디터의 전체 SQL을 포매팅하여 교체
- IPC 불필요 (프론트엔드 완결)

### 의존성
- `sql-formatter` npm 패키지
- dialect 매핑: `dbType` → `sql-formatter` language

### 벤더 매핑
```typescript
const FORMATTER_DIALECT: Record<TDbType, string> = {
  postgresql: 'postgresql',
  mysql: 'mysql',
  mariadb: 'mariadb',
  sqlite: 'sqlite',
};
```

### 변경 파일
| File | Change |
|------|--------|
| `package.json` | `sql-formatter` 의존성 추가 |
| `SqlEditorPanel.tsx` | Format 버튼 추가, formatSql 핸들러 |

### 구현
```typescript
// SqlEditorPanel.tsx
import { format } from 'sql-formatter';

const handleFormat = useCallback(() => {
  const view = viewRef.current;
  if (!view) return;
  const raw = view.state.doc.toString();
  if (!raw.trim()) return;
  const formatted = format(raw, { language: FORMATTER_DIALECT[dbType ?? 'postgresql'] });
  view.dispatch({
    changes: { from: 0, to: view.state.doc.length, insert: formatted },
  });
}, [dbType]);
```

---

## 3. EXPLAIN 버튼

### 동작
- 툴바 `[⚡ Explain]` 버튼 클릭
- 쿼리 실행 없이 예상 실행 계획만 조회
- 결과를 기존 DataGrid에 표시 (EXPLAIN 결과도 columns + rows 구조)

### 벤더별 SQL
| Vendor | SQL |
|--------|-----|
| PostgreSQL | `EXPLAIN (FORMAT JSON) {sql}` |
| MySQL | `EXPLAIN FORMAT=JSON {sql}` |
| MariaDB | `EXPLAIN FORMAT=JSON {sql}` |
| SQLite | `EXPLAIN QUERY PLAN {sql}` |

### 구현 방식
- 기존 `QUERY_EXECUTE` IPC 채널 재사용
- 프론트엔드에서 SQL 앞에 EXPLAIN prefix를 붙여서 전송
- 별도 IPC 채널 불필요

### 변경 파일
| File | Change |
|------|--------|
| `SqlEditorPanel.tsx` | Explain 버튼 추가, `onExplain` prop 추가 |
| `QueryTab.tsx` | handleExplain 핸들러 — EXPLAIN prefix 붙여서 execute |
| `useQueryExecution.ts` | explain용 실행 함수 추가 (히스토리 source 구분) |

### Props 변경
```typescript
// SqlEditorPanel.tsx
interface SqlEditorPanelProps {
  // ... existing
  onExplain: (sql: string) => void;  // 추가
}
```

---

## 4. EXPLAIN ANALYZE (Run에 항상 포함)

### 동작
1. 유저가 Run 클릭
2. **Step 1**: EXPLAIN ANALYZE 실행 → 실행 계획 수집
3. **Step 2**: 원본 쿼리 실행 → 데이터 결과 반환
4. DataGrid **위에** 실행 계획 요약 한 줄 표시
5. History에 실행 계획 요약 함께 저장

### DML 안전 처리
EXPLAIN ANALYZE는 모든 벤더에서 실제로 쿼리를 실행하므로, DML은 트랜잭션으로 감싸서 ROLLBACK:

| Query Type | Step 1 (계획 수집) | Step 2 (실제 실행) |
|------------|-------------------|-------------------|
| **SELECT** | `EXPLAIN ANALYZE SELECT ...` | `SELECT ...` |
| **DML** (INSERT/UPDATE/DELETE) | `BEGIN → EXPLAIN ANALYZE INSERT ... → ROLLBACK` | 기존 트랜잭션 플로우 (BEGIN → INSERT → 유저 Commit/Rollback) |
| **DDL** (CREATE/ALTER/DROP) | `EXPLAIN {ddl}` (ANALYZE 없이, 예상만) | DDL 실행 |

### SQLite 예외
- SQLite는 EXPLAIN ANALYZE 미지원
- `EXPLAIN QUERY PLAN {sql}` (예상 계획만) 사용
- ANALYZE 실측 데이터 없음

### 벤더별 EXPLAIN ANALYZE SQL
| Vendor | SELECT/DML | DDL |
|--------|-----------|-----|
| PostgreSQL | `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) {sql}` | `EXPLAIN (FORMAT JSON) {sql}` |
| MySQL | `EXPLAIN ANALYZE {sql}` | `EXPLAIN FORMAT=JSON {sql}` |
| MariaDB | `ANALYZE FORMAT=JSON {sql}` | `EXPLAIN FORMAT=JSON {sql}` |
| SQLite | `EXPLAIN QUERY PLAN {sql}` | `EXPLAIN QUERY PLAN {sql}` |

### 실행 계획 요약 표시
DataGrid 위에 한 줄 배너:
```
✅ 12 rows · 45ms · Seq Scan on users · Rows Removed: 902
```

요약 파싱 로직 (벤더별):
- **PG JSON**: `plan[0]["Plan"]["Node Type"]`, `"Actual Rows"`, `"Actual Total Time"`
- **MySQL JSON**: `query_block.table.access_type`, `rows_examined_per_scan`
- **MariaDB JSON**: `query_block.table.access_type`
- **SQLite**: `detail` 컬럼 텍스트 그대로

### IPC 변경

#### 새 IPC 채널
```typescript
// channels.ts
QUERY_EXPLAIN_ANALYZE = 'query:explain-analyze'
```

#### 요청/응답 타입
```typescript
// Request
interface IExplainAnalyzeRequest {
  connectionId: string;
  sql: string;
  dbType: TDbType;
}

// Response (IQueryResult 확장 아님 — 별도 타입)
interface IExplainResult {
  planRows: Record<string, unknown>[];  // EXPLAIN 결과 행
  summary: string;                       // 파싱된 요약 문자열
  rawJson?: unknown;                     // PG/MySQL JSON 원본
}
```

#### 서비스 로직 (main process)
```typescript
// queryService.ts — 새 메서드
async explainAnalyze(connectionId: string, sql: string, dbType: TDbType): Promise<IExplainResult> {
  const queryType = classifyQuery(sql); // SELECT, DML, DDL

  let explainSql: string;
  let needsRollback = false;

  if (dbType === 'sqlite') {
    explainSql = `EXPLAIN QUERY PLAN ${sql}`;
  } else if (queryType === 'DDL') {
    // DDL은 ANALYZE 없이 예상만
    explainSql = buildExplainSql(dbType, sql, false);
  } else if (queryType === 'DML') {
    // DML은 트랜잭션으로 감싸서 ROLLBACK
    needsRollback = true;
    explainSql = buildExplainSql(dbType, sql, true);
  } else {
    // SELECT
    explainSql = buildExplainSql(dbType, sql, true);
  }

  if (needsRollback) {
    // BEGIN → EXPLAIN ANALYZE → ROLLBACK
    await executeRaw(connectionId, 'BEGIN');
    try {
      const result = await executeRaw(connectionId, explainSql);
      return parseExplainResult(result, dbType);
    } finally {
      await executeRaw(connectionId, 'ROLLBACK');
    }
  }

  const result = await executeRaw(connectionId, explainSql);
  return parseExplainResult(result, dbType);
}

function buildExplainSql(dbType: TDbType, sql: string, analyze: boolean): string {
  switch (dbType) {
    case 'postgresql':
      return analyze
        ? `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${sql}`
        : `EXPLAIN (FORMAT JSON) ${sql}`;
    case 'mysql':
      return analyze
        ? `EXPLAIN ANALYZE ${sql}`
        : `EXPLAIN FORMAT=JSON ${sql}`;
    case 'mariadb':
      return analyze
        ? `ANALYZE FORMAT=JSON ${sql}`
        : `EXPLAIN FORMAT=JSON ${sql}`;
    default:
      return `EXPLAIN QUERY PLAN ${sql}`;
  }
}
```

### History 변경

#### IQueryHistory 확장
```typescript
// db.ts — IQueryHistory에 필드 추가
interface IQueryHistory {
  // ... existing fields
  explainSummary?: string;  // "Seq Scan on users · Rows Removed: 902"
}
```

#### History 저장
- `queryService.executeQuery()` 내에서 EXPLAIN 결과의 summary를 함께 저장
- History UI에서 summary 표시 (HistoryTable의 Speed 옆에)

---

## 5. UI 변경

### SqlEditorPanel 툴바 (변경 후)
```
┌──────────────────────────────────────────────────────────────┐
│ SQL Editor          ⌘+Enter to run  [🎨] [⚡] [▶ Run]       │
└──────────────────────────────────────────────────────────────┘
                                       │    │    │
                                Format─┘  Explain Run+ANALYZE
```

- `[🎨]`: 아이콘 버튼 (Paintbrush), tooltip "Format SQL"
- `[⚡]`: 아이콘 버튼 (Zap), tooltip "Explain Plan"
- `[▶ Run]`: 기존 버튼 (동작 변경: EXPLAIN ANALYZE 동반)

### EXPLAIN ANALYZE 요약 배너
```
┌──────────────────────────────────────────────────────────────┐
│ ⚡ Seq Scan on users · 12 rows · 45ms · Rows Removed: 902   │  ← 새로 추가
├──────────────────────────────────────────────────────────────┤
│ DataGrid (기존 그대로)                                        │
└──────────────────────────────────────────────────────────────┘
```

- 배경: `bg-muted/30`, 텍스트: `text-xs text-muted-foreground`
- 아이콘: Zap (size-3)
- EXPLAIN 실패 시 배너 미표시 (에러 무시, 결과는 정상 표시)

### 새 컴포넌트
```
ExplainSummaryBanner.tsx  — 실행 계획 요약 한 줄 표시
```

---

## 6. 실행 플로우 (변경 후)

```
User clicks [▶ Run]
  ↓
QueryTab.handleRun(sql)
  ↓
┌─ Step 1: EXPLAIN ANALYZE ──────────────────────────┐
│ queryApi.explainAnalyze(connectionId, sql, dbType)  │
│   → IPC: QUERY_EXPLAIN_ANALYZE                      │
│   → queryService.explainAnalyze()                   │
│   → DML인 경우 BEGIN/ROLLBACK 감싸기                  │
│   → IExplainResult 반환                              │
└─────────────────────────────────────────────────────┘
  ↓
┌─ Step 2: 실제 실행 (기존 플로우 그대로) ──────────────┐
│ SELECT/DDL: queryApi.execute(connectionId, sql)      │
│ DML: txBegin → txExecute → (유저 Commit/Rollback)    │
│   → IQueryResult 반환                                │
└─────────────────────────────────────────────────────┘
  ↓
useQueryExecution에서:
  - result (IQueryResult) → DataGrid
  - explainResult (IExplainResult) → ExplainSummaryBanner
  - history 저장 시 explainSummary 포함
```

---

## 7. 변경 파일 요약

### Frontend (renderer)
| File | Change |
|------|--------|
| `SqlEditorPanel.tsx` | Format/Explain 버튼 추가, `onExplain` prop |
| `QueryTab.tsx` | handleExplain, handleRun에 EXPLAIN ANALYZE 추가 |
| `useQueryExecution.ts` | explainResult 상태 추가, explain/explainAnalyze 실행 로직 |
| `ExplainSummaryBanner.tsx` | **신규** — 실행 계획 요약 배너 컴포넌트 |
| `queryApi.ts` (또는 queryBrowserApi.ts) | `explainAnalyze()` API 함수 추가 |

### Backend (main)
| File | Change |
|------|--------|
| `channels.ts` | `QUERY_EXPLAIN_ANALYZE` 채널 추가 |
| `queryHandlers.ts` | EXPLAIN_ANALYZE 핸들러 등록 |
| `queryService.ts` | `explainAnalyze()` 메서드 추가, `buildExplainSql()`, `parseExplainResult()` |

### Shared (types)
| File | Change |
|------|--------|
| `db.ts` | `IExplainResult` 인터페이스, `IQueryHistory.explainSummary` 필드 |

### Dependencies
| Package | Purpose |
|---------|---------|
| `sql-formatter` | SQL 포매팅 |

---

## 8. 에러 처리

| 상황 | 처리 |
|------|------|
| EXPLAIN ANALYZE 실패 | 배너 미표시, 원본 쿼리는 정상 실행 (EXPLAIN 실패가 Run을 막지 않음) |
| SQL Formatter 실패 | toast 에러 메시지, 에디터 내용 변경 없음 |
| EXPLAIN 버튼 실패 | DataGrid에 에러 표시 (기존 에러 처리와 동일) |
| DML ROLLBACK 실패 | 로그 기록, 배너 미표시 |
