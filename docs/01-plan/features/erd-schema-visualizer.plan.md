# ERD Schema Visualizer Planning Document

> **Summary**: Diagram(ERD Schema Visualizer)을 Canvas 기반 인터랙티브 편집기로 완전 개선. Virtual/Real Diagram 양방향 CRUD, Diff 기반 형상관리, DDL 자동생성, 검색/필터/View Snapshot 지원.
>
> **Project**: Rockury MVP (DB Tool)
> **Version**: 0.2.0
> **Author**: rhiemh
> **Date**: 2026-02-09
> **Status**: Draft

---

## 1. Overview

### 1.1 Purpose

현재 Diagram은 Grid 기반 카드 레이아웃으로 테이블을 나열하는 수준이며, 첨부된 Supabase Schema Visualizer처럼 인터랙티브한 Canvas 기반 ERD 편집 기능이 없다. 이 기능은 다음을 해결한다:

- **Canvas 기반 ERD 편집**: React Flow를 활용한 테이블 노드 드래그/연결/편집
- **Virtual ↔ Real 양방향 CRUD**: Diff를 통해 양방향으로 스키마를 동기화
- **형상관리(Migration)**: Diff 덩어리를 alembic_version처럼 관리하여 Real DB에 적용
- **DDL 자동생성 및 동기화**: Diagram 변경 시 DDL 자동 갱신
- **검색/필터/View Snapshot**: 대규모 스키마에서도 효율적 탐색 지원

### 1.2 Background

현재 구현체의 한계:
- `VirtualDiagramView.tsx`: Grid 카드 레이아웃 (React Flow 미사용)
- `RealDiagramView.tsx`: Grid 카드 레이아웃 (React Flow 미사용)
- `schemaToNodes.ts`: React Flow Node/Edge 변환 로직 존재하나 **미사용**
- Diagram 이름/버전 설정 UI 없음
- Virtual ↔ Real 간 양방향 반영 메커니즘 없음
- 좌측 패널(테이블 리스트), 우측 패널(테이블 상세), 검색, 필터 기능 없음
- View Snapshot 저장 기능 없음

### 1.3 Related Documents

- Plan: `docs/01-plan/features/db-tool.plan.md`
- Design: `docs/02-design/features/db-tool.design.md` (존재 시)
- References: Supabase Schema Visualizer UI (첨부 이미지)

---

## 2. Scope

### 2.1 In Scope

- [x] FR-01: Diagram 이름/버전 설정
- [x] FR-02: Canvas 기반 인터랙티브 ERD (React Flow)
- [x] FR-03: Virtual ↔ Real 양방향 CRUD
- [x] FR-04: Diff 기반 형상관리 (Migration Version)
- [x] FR-05: DDL 자동생성 및 Sync
- [x] FR-06: 테이블 제약사항/관계 시각화 및 편집
- [x] FR-07: 테이블 위치 저장(Layout Persistence)
- [x] FR-08: 검색 기능 (테이블, 컬럼, 제약사항)
- [x] FR-09: 좌측 패널 - 테이블 리스트 + 클릭 시 이동
- [x] FR-10: 우측 패널 - 테이블 상세 정보
- [x] FR-11: Canvas ↔ 좌측 패널 연동 (양방향 하이라이트)
- [x] FR-12: 디스플레이 필터 (테이블명 필수, 나머지 선택)
- [x] FR-13: View Snapshot 저장/불러오기

### 2.2 Out of Scope

- Real DB에 직접 Migration 자동 실행 (DDL 생성 + 수동 적용만)
- 다중 사용자 협업 편집
- NoSQL 스키마 시각화
- Diagram 간 Merge/Conflict 해결

---

## 3. Requirements

### 3.1 Functional Requirements

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-01 | Diagram 이름/버전 설정: 각 Diagram에 name, version(semver) 필드 추가. UI에서 인라인 편집 가능 | High | Pending |
| FR-02 | Canvas 기반 ERD: React Flow(@xyflow/react)로 테이블 노드를 캔버스에 렌더링. 드래그/줌/패닝 지원 | High | Pending |
| FR-03 | Virtual ↔ Real 양방향 CRUD: Virtual Diagram에서 테이블/컬럼 CRUD, Real Schema Fetch 후 Diagram 생성 가능 | High | Pending |
| FR-04 | Diff 기반 형상관리: Real→Virtual 반영 시 Diagram 데이터 업데이트, Virtual→Real 반영 시 Migration DDL 생성. 각 Diff 세트를 Migration Version으로 관리 (alembic_version 방식) | High | Pending |
| FR-05 | DDL 자동생성/Sync: Diagram 테이블 변경 시 DDL 자동 재생성. DDL 편집 시 Diagram 자동 반영 (양방향) | High | Pending |
| FR-06 | 제약사항/관계 시각화: PK, FK, UK, IDX, CHECK, NOT_NULL 아이콘 표시. FK는 Edge로 연결 (1:1, 1:N, N:M 카디널리티 표시). Canvas에서 Edge 드래그로 FK 생성 가능 | High | Pending |
| FR-07 | 위치 저장: 각 테이블 노드의 (x, y) 좌표를 IDiagramLayout으로 저장. 줌/뷰포트 상태도 함께 저장 | Medium | Pending |
| FR-08 | 검색 기능: 테이블명, 컬럼명, 제약사항명, 데이터타입으로 검색. 검색 결과 매칭 노드 하이라이트 + 자동 이동(fitView) | Medium | Pending |
| FR-09 | 좌측 패널 - 테이블 리스트: Diagram 내 모든 테이블 리스트 표시. 클릭 시 해당 노드 위치로 Canvas 이동(fitView) | Medium | Pending |
| FR-10 | 우측 패널 - 테이블 상세: 선택된 테이블의 전체 정보 (컬럼, 타입, 제약사항, FK 참조, 코멘트) 표시. 인라인 편집 지원 | Medium | Pending |
| FR-11 | Canvas ↔ 좌측 패널 양방향 연동: Canvas에서 테이블 클릭 → 좌측 패널 해당 항목 하이라이트(스크롤). 좌측 패널 클릭 → Canvas 해당 노드로 이동 | Medium | Pending |
| FR-12 | 디스플레이 필터: 테이블명(필수), 컬럼명, 데이터타입, Key 아이콘, Nullable, 코멘트 등 개별 ON/OFF. 필터 프리셋(Compact/Full/Custom) 지원 | Low | Pending |
| FR-13 | View Snapshot: 현재 필터 설정 + 줌 + 뷰포트 + 선택 테이블을 Snapshot으로 저장. 이름 지정하여 복수 Snapshot 관리 | Low | Pending |

### 3.2 Non-Functional Requirements

| Category | Criteria | Measurement Method |
|----------|----------|-------------------|
| Performance | 100개 테이블 렌더링 시 60fps 유지 | React Flow 내장 가상화 + Chrome DevTools |
| Performance | 검색 결과 반응 < 100ms | 인메모리 인덱싱 |
| UX | Diagram 변경 후 DDL Sync < 500ms | 타이머 측정 |
| Reliability | Layout 저장 시 데이터 무손실 | 저장/로드 E2E 테스트 |
| Accessibility | 키보드 네비게이션 지원 (Tab, Arrow) | 수동 테스트 |

---

## 4. Success Criteria

### 4.1 Definition of Done

- [ ] React Flow Canvas에서 테이블 노드 렌더링/드래그/줌 동작
- [ ] Virtual Diagram CRUD (테이블/컬럼/제약사항 추가/수정/삭제)
- [ ] Real Schema Fetch → Canvas 렌더링
- [ ] Virtual ↔ Real Diff 비교 → Migration DDL 자동 생성
- [ ] Migration Version 관리 (히스토리)
- [ ] DDL ↔ Diagram 양방향 동기화
- [ ] 좌측 패널(테이블 리스트) + Canvas 양방향 연동
- [ ] 우측 패널(테이블 상세) 표시 및 인라인 편집
- [ ] 검색 기능 동작 (테이블/컬럼/제약사항)
- [ ] 필터 기능 동작 + View Snapshot 저장/불러오기
- [ ] 모든 테스트 통과

### 4.2 Quality Criteria

- [ ] Core 서비스(Diff, DDL, Migration) 테스트 커버리지 90%+
- [ ] UI 컴포넌트 테스트 커버리지 70%+
- [ ] Zero lint errors
- [ ] Build 성공

---

## 5. Risks and Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| React Flow 대규모 노드 성능 저하 | High | Medium | 가상화 렌더링, 노드 간소화 모드(필터), fitView 최적화 |
| DDL 파싱 복잡도 (DB별 방언 차이) | High | High | 기존 ddl-editor 파서 확장. DB타입별 DDL 생성 전략 패턴 |
| 양방향 Sync 무한 루프 | High | Medium | 변경 소스(source) 추적으로 단방향 전파만 허용 |
| Migration 버전 충돌 | Medium | Low | 선형 버전 체인(linked list). 순서 강제 |
| Layout 저장 데이터 비대화 | Low | Medium | Position만 저장(x,y). 뷰포트/줌은 별도 필드 |
| View Snapshot 과다 생성 | Low | Low | Snapshot 상한 제한 (기본 20개) |

---

## 6. Architecture Considerations

### 6.1 Project Level Selection

| Level | Characteristics | Recommended For | Selected |
|-------|-----------------|-----------------|:--------:|
| **Starter** | Simple structure | Static sites | |
| **Dynamic** | Feature-based modules, BaaS integration | Web apps with backend | **X** |
| **Enterprise** | Strict layer separation, DI, microservices | High-traffic systems | |

### 6.2 Key Architectural Decisions

| Decision | Options | Selected | Rationale |
|----------|---------|----------|-----------|
| Canvas Library | @xyflow/react (React Flow) / D3.js / Konva | @xyflow/react | 이미 의존성 설치됨, Node/Edge 추상화 최적 |
| 테이블 노드 | Custom React Flow Node | Custom TableNode | 컬럼/Key/타입 표시 + 인라인 편집 필요 |
| Edge 타입 | smoothstep / bezier / straight | smoothstep(animated) | FK 관계 가시성 우수 |
| Migration Store | SQLite (diagram_migrations 테이블) | SQLite | 기존 localDb 인프라 활용 |
| State 관리 | Zustand + React Query | Zustand + React Query | 기존 패턴 유지 |
| 검색 인덱스 | 인메모리 Map | 인메모리 Map | 테이블 수 < 500 가정, 복잡한 검색엔진 불필요 |

### 6.3 Clean Architecture Approach

```
Selected Level: Dynamic (FSD + Layered)

변경 영역:
┌─────────────────────────────────────────────────────────┐
│ Renderer (FSD)                                          │
│                                                         │
│ features/virtual-diagram/                               │
│   ├── ui/                                               │
│   │   ├── DiagramCanvas.tsx      ← React Flow Canvas    │
│   │   ├── TableNode.tsx          ← Custom Node          │
│   │   ├── TableListPanel.tsx     ← 좌측 패널            │
│   │   ├── TableDetailPanel.tsx   ← 우측 패널            │
│   │   ├── DiagramToolbar.tsx     ← 이름/버전/필터/검색  │
│   │   ├── SearchOverlay.tsx      ← 검색 UI              │
│   │   ├── FilterPanel.tsx        ← 필터 설정            │
│   │   ├── ViewSnapshotManager.tsx← Snapshot 관리        │
│   │   └── VirtualDiagramView.tsx ← 기존 리팩토링        │
│   ├── model/                                            │
│   │   ├── diagramStore.ts        ← Zustand 확장         │
│   │   ├── useSearch.ts           ← 검색 Hook            │
│   │   ├── useFilter.ts           ← 필터 Hook            │
│   │   └── useViewSnapshot.ts     ← Snapshot Hook        │
│   └── lib/                                              │
│       ├── schemaToNodes.ts       ← 기존 (확장)          │
│       ├── nodesToSchema.ts       ← 기존 (확장)          │
│       └── ddlSync.ts             ← DDL ↔ Diagram Sync   │
│                                                         │
│ features/real-diagram/                                  │
│   ├── ui/                                               │
│   │   └── RealDiagramView.tsx    ← Canvas 기반으로 개선  │
│   └── lib/                                              │
│       └── realSchemaAdapter.ts   ← Real → Canvas 변환    │
│                                                         │
│ features/diagram-diff/                                  │
│   ├── ui/                                               │
│   │   ├── DiffView.tsx           ← 기존 (Canvas 통합)   │
│   │   └── MigrationPanel.tsx     ← Migration 관리 UI    │
│   └── model/                                            │
│       └── useMigration.ts        ← Migration CRUD Hook   │
│                                                         │
├─────────────────────────────────────────────────────────┤
│ Main Process (Layered)                                  │
│                                                         │
│ services/                                               │
│   ├── virtualDiagramService.ts   ← 버전 필드 추가       │
│   ├── diffService.ts             ← Migration 생성 로직   │
│   └── migrationService.ts        ← NEW: Migration 관리   │
│                                                         │
│ repositories/                                           │
│   ├── diagramRepository.ts       ← 확장                 │
│   ├── migrationRepository.ts     ← NEW: Migration 저장   │
│   └── viewSnapshotRepository.ts  ← NEW: Snapshot 저장    │
│                                                         │
│ infrastructure/database/                                │
│   └── localDb.schema.ts          ← 테이블 추가          │
│       ├── diagram_migrations     ← Migration 히스토리    │
│       └── view_snapshots         ← View Snapshot 저장    │
└─────────────────────────────────────────────────────────┘
```

---

## 7. Data Model Changes

### 7.1 Type 변경 (db.ts)

```typescript
// IDiagram 확장
export interface IDiagram {
  id: string;
  name: string;
  version: string;          // NEW: semver (e.g., "1.0.0")
  type: TDiagramType;
  tables: ITable[];
  createdAt: string;
  updatedAt: string;
}

// NEW: Migration Version
export interface IMigration {
  id: string;
  diagramId: string;        // Virtual Diagram ID
  connectionId: string;     // Real DB Connection ID
  versionNumber: number;    // 순서 번호
  direction: 'virtual_to_real' | 'real_to_virtual';
  diffSnapshot: IDiffResult;
  migrationDdl: string;     // Virtual→Real 시 SQL문
  appliedAt: string | null; // 적용 시각 (null = 미적용)
  createdAt: string;
}

// NEW: View Snapshot
export interface IViewSnapshot {
  id: string;
  diagramId: string;
  name: string;
  filter: IDiagramFilter;
  layout: IDiagramLayout;
  selectedTableIds: string[];
  createdAt: string;
}

// NEW: Diagram Filter
export interface IDiagramFilter {
  showColumns: boolean;
  showDataTypes: boolean;
  showKeyIcons: boolean;
  showNullable: boolean;
  showComments: boolean;
  showConstraints: boolean;
  preset: 'compact' | 'full' | 'custom';
}
```

### 7.2 SQLite 스키마 추가

```sql
-- diagram_migrations
CREATE TABLE diagram_migrations (
  id TEXT PRIMARY KEY,
  diagram_id TEXT NOT NULL REFERENCES diagrams(id),
  connection_id TEXT NOT NULL REFERENCES connections(id),
  version_number INTEGER NOT NULL,
  direction TEXT NOT NULL CHECK(direction IN ('virtual_to_real','real_to_virtual')),
  diff_snapshot TEXT NOT NULL,       -- JSON
  migration_ddl TEXT NOT NULL,
  applied_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(diagram_id, version_number)
);

-- view_snapshots
CREATE TABLE view_snapshots (
  id TEXT PRIMARY KEY,
  diagram_id TEXT NOT NULL REFERENCES diagrams(id),
  name TEXT NOT NULL,
  filter_config TEXT NOT NULL,       -- JSON (IDiagramFilter)
  layout_config TEXT NOT NULL,       -- JSON (IDiagramLayout)
  selected_table_ids TEXT NOT NULL,  -- JSON (string[])
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- diagrams 테이블에 version 컬럼 추가
ALTER TABLE diagrams ADD COLUMN version TEXT DEFAULT '1.0.0';
```

---

## 8. Implementation Phases

### Phase 1: Canvas 기반 전환 + 테이블 노드 (FR-02, FR-06, FR-07)
- [ ] Custom `TableNode` 컴포넌트 구현 (컬럼/Key/타입/제약사항 표시)
- [ ] React Flow Canvas 통합 (`DiagramCanvas.tsx`)
- [ ] `VirtualDiagramView.tsx` Grid → Canvas 전환
- [ ] `RealDiagramView.tsx` Grid → Canvas 전환
- [ ] Edge 렌더링 (FK 관계, smoothstep animated)
- [ ] 카디널리티 표시 (1:1, 1:N)
- [ ] 노드 위치 저장/복원 (`IDiagramLayout`)
- [ ] 줌/뷰포트 상태 저장/복원

### Phase 2: Diagram 이름/버전 + 좌측/우측 패널 (FR-01, FR-09, FR-10, FR-11)
- [ ] `IDiagram.version` 필드 추가 (타입 + SQLite 스키마)
- [ ] Diagram 이름/버전 인라인 편집 UI (`DiagramToolbar.tsx`)
- [ ] 좌측 패널 `TableListPanel.tsx` (테이블 리스트 + 클릭 시 fitView)
- [ ] 우측 패널 `TableDetailPanel.tsx` (선택 테이블 상세 + 인라인 편집)
- [ ] Canvas ↔ 좌측 패널 양방향 연동
  - Canvas 노드 클릭 → 좌측 패널 해당 항목 하이라이트 + 스크롤
  - 좌측 패널 클릭 → Canvas 해당 노드 fitView + 선택

### Phase 3: Virtual ↔ Real 양방향 CRUD + Diff 형상관리 (FR-03, FR-04, FR-05)
- [ ] Virtual Diagram: Canvas에서 테이블/컬럼 CRUD
  - 노드 더블클릭 → 테이블 편집
  - 빈 영역 더블클릭 → 새 테이블 생성
  - Edge 드래그 → FK 생성
- [ ] Real→Virtual 반영: Diff 결과에서 "Apply to Virtual" → Diagram 데이터 업데이트
- [ ] Virtual→Real 반영: Diff 결과에서 Migration DDL 생성 → 사용자 복사/실행
- [ ] `migrationService.ts` 구현 (Migration CRUD)
- [ ] `diagram_migrations` SQLite 테이블 생성
- [ ] Migration Version 히스토리 UI (`MigrationPanel.tsx`)
- [ ] DDL 자동생성/Sync 연동 (`ddlSync.ts`)

### Phase 4: 검색 + 필터 + View Snapshot (FR-08, FR-12, FR-13)
- [ ] 검색 기능 (`SearchOverlay.tsx` + `useSearch.ts`)
  - 테이블명/컬럼명/제약사항명/데이터타입 검색
  - 매칭 노드 하이라이트 + fitView
- [ ] 필터 기능 (`FilterPanel.tsx` + `useFilter.ts`)
  - 테이블명(필수) + 개별 항목 ON/OFF
  - 프리셋: Compact(이름만), Full(전부), Custom(사용자 지정)
- [ ] View Snapshot 저장/불러오기 (`ViewSnapshotManager.tsx` + `useViewSnapshot.ts`)
  - `view_snapshots` SQLite 테이블 생성
  - Snapshot CRUD UI
- [ ] 검색/필터 상태 → Snapshot에 포함

---

## 9. IPC Channel 추가

| Channel | Direction | Args | Response |
|---------|-----------|------|----------|
| `DIAGRAM_UPDATE_META` | Renderer→Main | `{ id, name?, version? }` | `IDiagram` |
| `MIGRATION_LIST` | Renderer→Main | `{ diagramId }` | `IMigration[]` |
| `MIGRATION_CREATE` | Renderer→Main | `{ diagramId, connectionId, direction, diffSnapshot, migrationDdl }` | `IMigration` |
| `MIGRATION_APPLY` | Renderer→Main | `{ migrationId }` | `{ success, appliedAt }` |
| `VIEW_SNAPSHOT_LIST` | Renderer→Main | `{ diagramId }` | `IViewSnapshot[]` |
| `VIEW_SNAPSHOT_CREATE` | Renderer→Main | `IViewSnapshot` (sans id) | `IViewSnapshot` |
| `VIEW_SNAPSHOT_DELETE` | Renderer→Main | `{ id }` | `{ success }` |
| `VIEW_SNAPSHOT_LOAD` | Renderer→Main | `{ id }` | `IViewSnapshot` |
| `DIAGRAM_LAYOUT_SAVE` | Renderer→Main | `IDiagramLayout` | `{ success }` |
| `DIAGRAM_LAYOUT_LOAD` | Renderer→Main | `{ diagramId }` | `IDiagramLayout` |

---

## 10. Convention Prerequisites

### 10.1 Existing Project Conventions

- [x] FSD (Feature-Sliced Design) 아키텍처
- [x] Layered Architecture (Main Process)
- [x] Type-safe IPC 패턴 (channels → events → preload → handlers)
- [x] Zustand + React Query 상태 관리
- [x] Tailwind CSS 스타일링
- [x] Radix UI 컴포넌트

### 10.2 New Conventions for This Feature

| Category | Rule | Rationale |
|----------|------|-----------|
| React Flow Node | `{Feature}Node.tsx` 명명 | 노드 타입 구분 명확화 |
| Panel 컴포넌트 | `{Feature}Panel.tsx` 명명 | 좌/우측 패널 구분 |
| Hook 네이밍 | `use{Feature}.ts` | 기존 패턴 유지 |
| Migration ID | UUID v4 | 충돌 방지 |
| Version Format | semver (`x.y.z`) | 직관적 버전 관리 |

---

## 11. Next Steps

1. [ ] Design 문서 작성 (`erd-schema-visualizer.design.md`)
2. [ ] Custom TableNode 컴포넌트 프로토타입
3. [ ] Implementation 시작 (Phase 1부터)

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-02-09 | Initial draft | rhiemh |
