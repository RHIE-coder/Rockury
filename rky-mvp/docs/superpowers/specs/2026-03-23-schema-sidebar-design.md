# Schema Sidebar + SQL Autocomplete — Design Spec

## Overview

SQL 편집 시 테이블/컬럼 정보를 바로 참조할 수 있도록 Schema Sidebar를 추가한다.
Query Tab과 QueryEditModal 양쪽에서 동일한 `SchemaPanel` 컴포넌트를 재사용한다.

## Phase 1: Schema Sidebar (이번 구현)

### 데이터 소스

- 기존 `SCHEMA_FETCH_REAL` IPC 채널 재사용 → `IDiagram.tables: ITable[]`
- 새 hook `useSchemaData(connectionId)` → React Query로 캐싱
- Diagram 탭에서 Sync 시 자동 invalidation

### SchemaPanel 컴포넌트

```
src/renderer/features/query-browser/ui/SchemaPanel.tsx
```

**Props:**
- `tables: ITable[]` — 테이블 목록
- `isLoading: boolean`
- `onInsert?: (text: string) => void` — 에디터에 텍스트 삽입
- `onClose: () => void`

**기능:**
- 테이블 검색 필터 (테이블명 + 컬럼명)
- 테이블 접기/펼치기
- 컬럼 아이콘: 🔑 PK, → FK, 일반 컬럼
- 컬럼 타입 표시 (우측 정렬)
- 클릭 → `onInsert(name)` 호출
- FK 클릭 → 참조 테이블 자동 펼침 + 스크롤

### QueryTab 통합

- Toolbar 우측에 `📋 Schema` 토글 버튼 추가
- 에디터 영역 내부 우측에 SchemaPanel 배치 (width: 200px)
- `SqlEditorPanelHandle`에 `insertText(text)` 추가

### QueryEditModal 통합

- 모달 헤더에 `📋 Schema` 토글 버튼 추가
- Schema 열리면 모달 너비 확장 (700px → 960px)
- CodeMirror ref로 insertText 처리

### Store 확장

- `queryBrowserStore`에 `schemaPanelOpen: boolean` 추가
- localStorage 동기화로 상태 유지

## Phase 2: SQL Autocomplete (향후)

- CodeMirror SQL completion extension
- 같은 `useSchemaData` 데이터를 completion source로 등록
- `FROM ` 뒤에 테이블명, `table.` 뒤에 컬럼명 제안

## 파일 변경 목록

| 파일 | 변경 |
|------|------|
| `model/useSchemaData.ts` | **신규** — 스키마 fetch hook |
| `ui/SchemaPanel.tsx` | **신규** — 스키마 사이드바 컴포넌트 |
| `ui/QueryTab.tsx` | 수정 — SchemaPanel 통합 |
| `ui/SqlEditorPanel.tsx` | 수정 — insertText handle 추가 |
| `ui/QueryEditModal.tsx` | 수정 — SchemaPanel 통합 |
| `model/queryBrowserStore.ts` | 수정 — schemaPanelOpen 추가 |
