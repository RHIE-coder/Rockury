# Diagram UX Improvement Planning Document

> **Summary**: Virtual Diagram 상단 툴바 전면 재배치, Description 추가, 버전 드롭다운 전환, Export 기능, 필터 버그 수정 등 11개 항목 개선
>
> **Project**: Rockury MVP (DB Tool)
> **Version**: 0.3.0
> **Author**: rhiemh
> **Date**: 2026-02-10
> **Status**: Draft

---

## 1. Overview

### 1.1 Purpose

Virtual Diagram 에디터의 상단 툴바와 패널 구조를 전면 개편하여 사용성과 시인성을 크게 향상시킨다. 현재 하나의 툴바에 모든 버튼이 밀집되어 있어 기능 그룹핑이 불명확하고, 몇몇 기능은 겹치거나 위치가 부자연스러운 상태이다.

### 1.2 Current State (As-Is)

**현재 툴바 레이아웃** (`DiagramToolbar.tsx`):
```
[📁 Diagrams][+ New] | [Diagram Name] [📋 Clone] [v1.0.0] [💾 Save] | [🔓 Lock] [↩ Undo] [↪ Redo]
                                    ── spacer ──
[+ Table] [⚡Layout] [🔍] [⚙Filter] [📷Snapshot] [↑Forward] [⇄Diff] [🔖SaveVer] [📜History] [◫Left] [◫Right] | [DDL/Canvas]
```

**문제점**:
1. 폴더 아이콘 옆 [+] 버튼과 DiagramListPanel 내부 [+] 기능이 중복
2. 다이어그램 이름 말줄임 없음 (긴 이름 시 레이아웃 깨짐)
3. 버전이 텍스트 직접입력 방식 (히스토리 탐색 불가)
4. Lock 아이콘 시인성 부족 (잠금/풀림 구분 어려움)
5. Save, Undo, Redo가 Lock과 혼재
6. 테이블 추가/정렬/검색/필터가 상단 툴바에 위치 (캔버스 관련인데 분리 안됨)
7. 카메라 아이콘이 Snapshot 저장용 (Export 기능 없음)
8. Forward Engineer, SaveVersion, History 아이콘이 자리 차지
9. 패널 토글과 DDL/Canvas 토글이 툴바에 위치 (DiagramTabBar 레이어가 더 적합)
10. Description 필드 없음
11. Layout(위치/색상) 변경이 Undo/Redo 대상이 아님

### 1.3 Related Documents

- Plan: `docs/01-plan/features/erd-schema-visualizer.plan.md`
- Design: `docs/02-design/features/erd-schema-visualizer.design.md`

---

## 2. Requirements

### 2.1 Feature List

| # | Feature | Priority | Complexity |
|---|---------|----------|------------|
| F1 | Diagram Description (Modal CRUD) | Medium | Low |
| F2 | 왼쪽 패널 Diagram/Table 전환 아이콘 | High | Medium |
| F3 | 다이어그램 이름 35자 말줄임 + Hover Popover | Medium | Low |
| F4 | 버전 드롭다운 + 버전별 다이어그램 로드 + 좌측패널 디렉토리 구조 | High | High |
| F5 | Lock 시인성 개선 + 위치 변경 | Medium | Low |
| F6 | Save/Undo/Redo 한 영역 그룹핑 + Layout도 Undo/Redo 대상 | High | High |
| F7 | 캔버스 도구버튼(테이블추가, 정렬, 검색, 필터) 캔버스 영역으로 이동 + 필터 버그/개선 | High | Medium |
| F8 | Export (CSV, SVG, PNG, PDF) | Medium | High |
| F9 | Forward Engineer, SaveVersion, History 아이콘 삭제 | Low | Low |
| F10 | Panel 토글 아이콘을 DiagramTabBar 레이어 왼쪽으로 이동 | Medium | Low |
| F11 | DDL/Canvas 토글을 DiagramTabBar 레이어 오른쪽으로 이동 | Medium | Low |

### 2.2 Detailed Requirements

#### F1: Diagram Description

- 각 `IDiagram`에 `description: string` 필드 추가
- 툴바의 다이어그램 이름 옆에 정보 아이콘 (ℹ️) → 클릭 시 팝업 모달
- 모달에서 description 조회/편집/저장
- DB 스키마: `diagrams` 테이블에 `description TEXT DEFAULT ''` 컬럼 추가

#### F2: 왼쪽 패널 Diagram/Table 전환

- 기존: 폴더 아이콘(📁) 클릭 → DiagramListPanel 오버레이 + 옆에 [+] 버튼 (중복)
- 변경:
  - 📁 아이콘: Diagram List View 활성화 (같은 왼쪽 패널 영역)
  - 📋 테이블 아이콘: Table List View 활성화 (같은 왼쪽 패널 영역)
  - 활성 패널에 따라 해당 아이콘 강조 (secondary variant)
  - [+] 버튼 제거 (DiagramListPanel 내부 [+]로 통합)
- 왼쪽 패널 너비: DiagramListPanel과 TableListPanel 동일 너비

#### F3: 다이어그램 이름 말줄임

- 35자 초과 시 `text-ellipsis overflow-hidden` 적용 (max-w 지정)
- 호버 시 Popover (Radix UI `HoverCard` 또는 커스텀) 표시
  - 전체 이름, 버전, Description, 테이블 개수
  - Elevation 효과 (shadow-xl + border)

#### F4: 버전 드롭다운 + 좌측패널 디렉토리 구조

**버전 드롭다운**:
- 기존: `v1.0.0` 텍스트 클릭 → 직접 입력
- 변경: 드롭다운으로 `useDiagramVersions` 목록 표시
  - 현재 (Working): 최상단 항목
  - 과거 버전: versionNumber + date 표시
  - 선택 시 해당 버전의 `schemaSnapshot`으로 localTables 교체 (읽기 전용)
  - 미저장 항목 존재 시 경고 팝업 후 진행/취소

**좌측 패널 디렉토리 구조**:
- DiagramListPanel에서 각 Diagram 아래에 버전 목록을 트리 형태로 노출
  - 📁 Diagram A
    - 📄 v1.0.0 (64 tables, 2026.02.10)
    - 📄 v0.9.0 (60 tables, 2026.02.09)
  - 📁 Diagram B
    - ...
- 각 버전 항목에 테이블 개수, 날짜 표시
- 클릭 시 해당 버전 로드

#### F5: Lock 시인성 개선

- 기존: Lock/LockOpen 아이콘이 모양이 비슷하여 구분 어려움
- 변경:
  - Lock 상태: 빨간색 배경 + Lock 아이콘 + 텍스트 "Locked"
  - Unlock 상태: ghost 버튼 + LockOpen 아이콘 (현재 위치에서 약한 표시)
- 위치 변경: 다이어그램 이름 바로 오른쪽 (기존 Clone 아이콘 위치)
  - Clone(복사) 아이콘 삭제 (불필요)

#### F6: Save/Undo/Redo 그룹핑 + Layout Undo/Redo

**그룹핑**:
- `[↩ Undo] [↪ Redo] | [💾 Save]`를 하나의 시각적 그룹으로
- 배경색 또는 border로 구분된 영역

**Layout도 Undo/Redo 대상**:
- 현재: `localTables`만 undo/redo 대상. Layout(position, color)은 별도 auto-save.
- 변경: undo 스택에 `{ tables: ITable[], layout?: LayoutSnapshot }` 형태로 확장
  - 노드 드래그, 색상 변경도 pushUndoState → 해당 layout 포함 저장
  - Save 시 tables + layout 함께 저장

#### F7: 캔버스 도구버튼 이동 + 필터 개선

**버튼 이동**: 다음 버튼들을 툴바에서 제거, 캔버스 오른쪽 상단 floating 영역으로 이동
- [+ Table] 테이블 추가
- [⚡Layout] 자동 정렬
- [🔍 Search] 검색
- [⚙ Filter] 필터

**필터 Bug Fix**:
- Comments: `filter.showComments`가 true일 때 `table.comment`이 빈 문자열이면 안 보임
  - 이는 정상 동작이나, UX상 "Comments 컬럼을 보여주는" 필터로 기대할 수 있음
  - → Comment 데이터가 없는 테이블에는 "(no comment)" placeholder 표시

**필터 Improve (Constraints)**:
- 현재: `{c.type}: {c.columns.join(', ')}` 형태로 컬럼 목록만 표시
- 변경: Constraint Name을 주로 표시, 유형별 아이콘/배지
  - `[PK] pk_users (id)` / `[FK] fk_orders_user (user_id → users.id)` / `[UQ] uq_email (email)`

#### F8: Export (CSV, SVG, PNG, PDF)

- 기존 카메라(Snapshot) 아이콘 → Export 아이콘으로 대체
- 클릭 시 드롭다운 메뉴:
  - Export as PNG
  - Export as SVG
  - Export as PDF
  - Export as CSV (테이블/컬럼 목록)
- PNG/SVG: React Flow의 `toImage()` / `toSVG()` API 활용
- PDF: html2canvas + jsPDF 또는 Electron의 `webContents.printToPDF`
- CSV: `table_name, column_name, data_type, key_type, nullable` 형식

#### F9: 아이콘 삭제

- Forward Engineer (ArrowUpFromLine): 삭제 (기능은 유지, 위치 미정)
- Save Version Snapshot (BookmarkPlus): 삭제
- Version History (History): 삭제 (F4에서 좌측패널 디렉토리로 대체)

#### F10: Panel 토글 → DiagramTabBar 레이어 왼쪽

- 기존: PanelLeft, PanelRight 버튼이 DiagramToolbar에 위치
- 변경: DiagramTabBar (Virtual | Real | Diff) 레이어의 **왼쪽**에 배치
  - `[◫Left] [◫Right] ─── [ Virtual | Real | Diff ] ─── [DDL/Canvas]`

#### F11: DDL/Canvas 토글 → DiagramTabBar 레이어 오른쪽

- 기존: `<Code> DDL/Canvas` 토글이 DiagramToolbar에 위치
- 변경: DiagramTabBar 레이어의 **오른쪽**에 배치

---

## 3. Target UI Layout

### 3.1 After: DiagramTabBar Layer

```
[◫L] [◫R]     ──── [ Virtual | Real | Diff ] ────     [Canvas ⇄ DDL]
```

### 3.2 After: DiagramToolbar (Simplified)

```
[📁] [📋]  |  [Diagram Name (truncated...)] [🔒]  [ℹ️]  [▼ v1.0.0]  |  [↩] [↪] | [💾 Save]
```

- `📁` = Diagram List 패널 전환
- `📋` = Table List 패널 전환  (활성중인 것 강조)
- `🔒` = Lock (시인성 개선)
- `ℹ️` = Description 모달
- `▼ v1.0.0` = 버전 드롭다운
- `↩↪💾` = Undo/Redo/Save 그룹

### 3.3 After: Canvas Floating Toolbar (우측 상단)

```
[+ Table] [⚡Auto Layout] [🔍 Search] [⚙ Filter] [📤 Export]
```

### 3.4 After: Left Panel (DiagramListPanel + Version Tree)

```
┌─────────────────────────┐
│ Diagrams            [+] │
├─────────────────────────┤
│ ▼ karif-deepvisions     │  ← 현재 선택
│   📄 Working (64 tbl)   │
│   📄 v1.0.0  (64 tbl)   │
│   📄 v0.9.0  (60 tbl)   │
│ ▶ Diagram 1770727...     │
│ ▶ Diagram 1770648...     │
└─────────────────────────┘
```

---

## 4. Implementation Phases

### Phase 1: Toolbar Cleanup & Layout Restructure
**Files**: `DiagramToolbar.tsx`, `DiagramTabBar.tsx`, `VirtualDiagramView.tsx`
- F9: Forward Engineer, SaveVersion, History 아이콘 삭제
- F10: Panel 토글을 DiagramTabBar 왼쪽으로 이동
- F11: DDL/Canvas 토글을 DiagramTabBar 오른쪽으로 이동
- F7 (partial): 테이블추가, AutoLayout, 검색, 필터 버튼을 캔버스 floating으로 이동
- F5: Lock 시인성 개선 + Clone 아이콘 삭제 + 위치 이동
- F6 (partial): Save/Undo/Redo 시각적 그룹핑

### Phase 2: Left Panel Redesign
**Files**: `DiagramToolbar.tsx`, `DiagramListPanel.tsx`, `TableListPanel.tsx`, `VirtualDiagramView.tsx`
- F2: 📁/📋 아이콘으로 DiagramList/TableList 전환 (같은 왼쪽 패널 영역)

### Phase 3: Name Truncation + Description
**Files**: `DiagramToolbar.tsx`, diagramStore, DB migration
- F3: 35자 말줄임 + Hover Popover
- F1: Description 필드 추가 + 팝업 모달

### Phase 4: Version Dropdown + Directory Tree
**Files**: `DiagramToolbar.tsx`, `DiagramListPanel.tsx`, `VirtualDiagramView.tsx`, `diagramStore.ts`
- F4: 버전 드롭다운, 좌측패널 디렉토리 트리 구조, 미저장 경고

### Phase 5: Filter Bug Fix & Improvement
**Files**: `FilterPanel.tsx`, `TableNode.tsx`
- F7 (filter): Comments placeholder, Constraints 개선

### Phase 6: Export
**Files**: 새 `ExportMenu.tsx`, `DiagramCanvas.tsx`
- F8: PNG, SVG, PDF, CSV Export

### Phase 7: Layout Undo/Redo
**Files**: `diagramStore.ts`, `VirtualDiagramView.tsx`, `DiagramCanvas.tsx`
- F6 (undo/redo): Layout snapshot을 undo 스택에 포함

---

## 5. Technical Considerations

### 5.1 DB Schema Change
```sql
ALTER TABLE diagrams ADD COLUMN description TEXT DEFAULT '';
```

### 5.2 Type Changes
```ts
// ~/shared/types/db.ts
interface IDiagram {
  // ... existing fields
  description?: string;  // F1
}
```

### 5.3 Undo/Redo Stack Extension
```ts
// 현재
undoStack: ITable[][];

// 변경
interface UndoState {
  tables: ITable[];
  layoutSnapshot?: { positions: Record<string, {x:number,y:number}>; tableColors: Record<string,string> };
}
undoStack: UndoState[];
```

### 5.4 Export Libraries
- PNG/SVG: `@xyflow/react`의 `toImage()` 내장 메서드 또는 `html-to-image`
- PDF: `jspdf` + `html2canvas` 또는 Electron `printToPDF`
- CSV: 순수 문자열 생성 + Blob download

### 5.5 Dependency Additions
```
html-to-image  (PNG/SVG export)
jspdf          (PDF export)
```

---

## 6. Risk & Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| F4 버전 로드 시 대규모 데이터 | 느린 UI | schemaSnapshot을 lazy load |
| F6 Layout undo가 스택 크기 증가 | 메모리 | positions만 저장, deep clone 최소화 |
| F8 PDF 내보내기 품질 | 깨진 레이아웃 | html-to-image → jspdf 파이프라인 검증 |
| Phase 4 복잡도 | 일정 지연 | 최소 MVP: 드롭다운만 먼저, 디렉토리 트리는 후순위 |

---

## 7. Verification

1. **F1**: Description 모달 열기 → 텍스트 입력 → 저장 → 새로고침 후 유지
2. **F2**: 📁 클릭 → DiagramList 표시, 📋 클릭 → TableList 표시, 아이콘 강조 전환
3. **F3**: 35자 초과 이름 → 말줄임 표시 → 호버 시 전체 정보 Popover
4. **F4**: 버전 드롭다운 선택 → 해당 구조 로드, 미저장 시 경고, 좌측패널 트리
5. **F5**: Lock 상태에서 빨간 배경 + "Locked" 텍스트 확인, Unlock 시 약한 표시
6. **F6**: 노드 드래그 → Undo → 원래 위치 복원, Save 시 layout 함께 저장
7. **F7**: 캔버스 우상단에 floating 버튼 확인, Filter → Comments ON → placeholder 표시
8. **F8**: Export → PNG 다운로드, SVG 다운로드, CSV 다운로드 확인
9. **F9**: Forward Engineer, SaveVersion, History 아이콘 없음 확인
10. **F10/F11**: Panel 토글이 TabBar 왼쪽, DDL/Canvas가 TabBar 오른쪽 확인
