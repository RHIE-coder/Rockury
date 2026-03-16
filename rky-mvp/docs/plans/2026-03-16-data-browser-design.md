# Data Browser Design

## Goal
Live Console의 Data 탭에서 DB 테이블 데이터를 조회하고 편집(추가/수정/삭제)할 수 있는 Data Browser를 구현한다.

## Architecture

### Layout
```
┌───────────┬─────────────────────────────────────────┐
│ Table     │ Toolbar                                  │
│ List      │ Refresh | + Row | - Row | Apply | ...    │
│ Panel     ├─────────────────────────────────────────┤
│           │ Filter Row (컬럼별 WHERE 입력)            │
│ - users   ├─────────────────────────────────────────┤
│ - orders  │                                          │
│ - products│ TanStack Table Grid                      │
│   (선택됨) │ - 인라인 셀 편집                          │
│ - ...     │ - 우클릭 컨텍스트 메뉴                    │
│           ├─────────────────────────────────────────┤
│ Tables(12)│ Footer: 행 수 | 실행시간 | [25▾50|100|200] | ◀ 1/3 ▶ │
│ Views (3) ├─────────────────────────────────────────┤
│           │ Pending Changes (변경 시에만 표시)         │
│           │ SQL 미리보기 + Apply/Discard              │
└───────────┴─────────────────────────────────────────┘
```

### Layer Structure
- **Page** (`DataBrowserPage`) — 레이아웃, 상태 조율
- **Feature** (`data-browser/`) — 비즈니스 로직, hooks, pending changes 관리
- **IPC** — 기존 `QUERY_EXECUTE` 채널 재사용
- **Main Process** — 기존 `queryService.executeQuery()` 재사용

## Tech Stack
- **@tanstack/react-table** — headless 그리드 (정렬, 필터, 컬럼 가시성, 페이지네이션)
- 기존: @tanstack/react-query, Radix UI, Tailwind CSS, Zustand

## Data Grid Behavior

### 조회
- 테이블 선택 시 `SELECT * FROM {table} LIMIT {pageSize} OFFSET {offset}` 자동 실행
- 컬럼 헤더 클릭 → ORDER BY 토글 (ASC → DESC → 없음)
- 필터 행 입력 → WHERE 조건 생성 (예: `%john%` → `LIKE '%john%'`)
- 컬럼 표시/숨기기 → TanStack Table column visibility (UI only)
- 페이지 사이즈: 25, 50 (기본), 100, 200

### 편집
- 셀 더블클릭 → 인라인 편집 모드
- 수정된 셀: 노란색 배경
- 새 행 추가: 그리드 하단에 빈 행, 초록색 표시
- 행 삭제: 빨간색 취소선, Apply 시 실행
- **PK 없는 테이블은 편집 비활성화** (WHERE 절 특정 불가)

### Pending Changes
- `Map<rowKey, { type: 'update'|'insert'|'delete', original, modified }>` 관리
- rowKey = PK 값 조합 (복합 PK 지원)
- Apply 흐름:
  1. SQL 미리보기 패널 표시 (INSERT/UPDATE/DELETE문)
  2. 확인 → 순차 실행 (개별 쿼리)
  3. 성공 시 데이터 리로드 + pending 초기화
- Discard → pending 전체 초기화

## Left Panel: DataTableListPanel
TableListPanel의 경량 버전:
- 테이블/뷰 그룹 분리 (접기/펼치기)
- 선택 하이라이트
- 컬럼 수 표시
- 테이블 이름 검색 필터
- drag 정렬, 삭제, 숨기기 등 제외

## Context Menu (우클릭)
- Copy Cell Value
- Copy Row as JSON
- ---
- Insert Row Above
- Insert Row Below
- Duplicate Row
- ---
- Delete Row

## Export
- 툴바 Export 버튼 → 포맷 선택 Popover
- CSV / JSON / SQL INSERT
- 필터/정렬 조건 유지한 전체 결과 내보내기
- Electron `dialog.showSaveDialog` 사용

## Column Management
- 툴바 Columns 버튼 → Popover 체크박스 리스트
- 전체 선택/해제
- 컬럼 순서는 DB 원본 유지

## Error Handling
- 쿼리 실패 → 그리드 상단 에러 배너 (에러 메시지 + 실패 SQL, dismiss 가능)
- 연결 끊김 → "Connection lost" 배너 + 편집 비활성화
- Apply 중 부분 실패 → 성공/실패 건수 + 실패 SQL 목록

## Safety Guards
- PK 없는 테이블 → Read-only, "Read-only (no PK)" 표시
- Apply 전 SQL 미리보기 필수 (스킵 불가)
- DELETE는 미리보기에서 빨간색 강조
- 페이지 이동/테이블 변경 시 pending changes → "Unsaved changes. Discard?" 확인

## SQL Injection Prevention
- 테이블명/컬럼명: 백틱(MySQL) 또는 쌍따옴표(PostgreSQL)로 감싸기
- 값: 이스케이프 유틸 (`'` → `''`, NULL 리터럴 처리)

## File Structure
```
src/renderer/features/data-browser/
├── ui/
│   ├── DataGrid.tsx           # TanStack Table 그리드
│   ├── DataToolbar.tsx        # 상단 툴바
│   ├── DataFooter.tsx         # 하단 (행수, 실행시간, 페이지네이션, page size)
│   ├── PendingChangesPanel.tsx # SQL 미리보기 + Apply/Discard
│   ├── DataTableListPanel.tsx # 좌측 테이블 리스트
│   ├── FilterRow.tsx          # 컬럼별 WHERE 필터 입력
│   ├── CellEditor.tsx         # 인라인 셀 편집
│   ├── ColumnVisibility.tsx   # 컬럼 표시/숨기기 Popover
│   ├── RowContextMenu.tsx     # 우클릭 메뉴
│   └── ExportMenu.tsx         # 내보내기 포맷 선택
├── model/
│   ├── useDataQuery.ts        # 데이터 조회 hook (정렬/필터/페이지 → SQL)
│   ├── usePendingChanges.ts   # 변경사항 관리 hook
│   └── sqlBuilder.ts          # SELECT/INSERT/UPDATE/DELETE SQL 생성
├── lib/
│   ├── exportData.ts          # CSV/JSON/SQL INSERT 변환
│   └── cellValueParser.ts     # 셀 값 파싱 (NULL, 날짜, 숫자 등)
└── index.ts

src/renderer/pages/db-data/ui/
└── DataBrowserPage.tsx        # 기존 파일 전면 리팩토링
```

## Dependencies
- 신규: `@tanstack/react-table`
- 재사용: `QUERY_EXECUTE` IPC, `queryService`, `useConnectionStore`, `useDiagramStore.realTables`
