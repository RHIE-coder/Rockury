# ERD Schema Visualizer Analysis Report

> **Analysis Type**: Gap Analysis (Design vs Implementation)
>
> **Project**: Rockury MVP (DB Tool)
> **Version**: 0.2.0
> **Analyst**: gap-detector
> **Date**: 2026-02-09
> **Design Doc**: [erd-schema-visualizer.design.md](../../02-design/features/erd-schema-visualizer.design.md)

---

## 1. Analysis Overview

### 1.1 Analysis Purpose

Compare the ERD Schema Visualizer design document (Section 11: 4-phase implementation order) against the current codebase to determine which items have been implemented, partially implemented, or not yet implemented.

### 1.2 Analysis Scope

- **Design Document**: `docs/02-design/features/erd-schema-visualizer.design.md`
- **Implementation Path**: `src/renderer/features/virtual-diagram/`, `src/renderer/features/real-diagram/`, `src/renderer/features/diagram-diff/`, `src/renderer/pages/db-diagram/`, `src/shared/types/db.ts`, `src/shared/ipc/`
- **Analysis Date**: 2026-02-09

---

## 2. Phase-by-Phase Gap Analysis

### 2.1 Phase 1: Canvas + Custom Node (FR-02, FR-06, FR-07)

**Goal**: Grid card layout -> React Flow Canvas

| # | Design Item | Implementation File | Status | Notes |
|---|-------------|---------------------|:------:|-------|
| 1.1 | `TableNode.tsx` - ITable rendering (header + columns + constraints) | `src/renderer/features/virtual-diagram/ui/TableNode.tsx` | ✅ | Header, columns, constraints all rendered |
| 1.2 | `TableNode.tsx` - IDiagramFilter application | `TableNode.tsx` L62-98 | ✅ | showColumns, showDataTypes, showKeyIcons, showNullable, showComments, showConstraints all applied |
| 1.3 | `TableNode.tsx` - Handle placement (FK source/target) | `TableNode.tsx` L47-51, L76-84, L101-108 | ✅ | Target handle on left, per-column source handles for FK, fallback source handle |
| 1.4 | `TableNode.tsx` - Selected/highlighted styling | `TableNode.tsx` L38-42 | ✅ | `border-primary ring-2` for selected, `ring-yellow-400` for highlighted |
| 1.5 | `RelationEdge.tsx` - smoothstep animated edge | `src/renderer/features/virtual-diagram/ui/RelationEdge.tsx` | ✅ | Uses `getSmoothStepPath`, animated via `strokeDasharray` |
| 1.6 | `RelationEdge.tsx` - FK label (column_name -> target_column) | `RelationEdge.tsx` L37-49 | ✅ | Label rendered via `EdgeLabelRenderer` |
| 1.7 | `RelationEdge.tsx` - Cardinality markers (1, N) | `RelationEdge.tsx` | ⚠ | Labels show FK column mapping but no explicit 1/N cardinality markers |
| 1.8 | `DiagramCanvas.tsx` - React Flow wrapper (ReactFlowProvider + ReactFlow) | `src/renderer/features/virtual-diagram/ui/DiagramCanvas.tsx` | ✅ | ReactFlowProvider wraps DiagramCanvasInner |
| 1.9 | `DiagramCanvas.tsx` - schemaToNodes() call -> nodes/edges | `DiagramCanvas.tsx` L50-58 | ✅ | useMemo with schemaToNodes, filter, highlights, selectedTableId |
| 1.10 | `DiagramCanvas.tsx` - onNodeDragStop -> layout save (debounce 1000ms) | `DiagramCanvas.tsx` L77-100 | ✅ | setTimeout 1000ms debounce, saves positions + zoom + viewport |
| 1.11 | `DiagramCanvas.tsx` - onConnect -> FK relation creation | `DiagramCanvas.tsx` L102-110 | ✅ | Calls onEdgeCreate with source/target |
| 1.12 | `DiagramCanvas.tsx` - MiniMap, Controls, Background | `DiagramCanvas.tsx` L153-160 | ✅ | All three rendered with options |
| 1.13 | `schemaToNodes.ts` - filter parameter (node height calculation) | `src/renderer/features/virtual-diagram/lib/schemaToNodes.ts` | ✅ | `estimateNodeHeight()` respects filter.showColumns, showConstraints |
| 1.14 | `schemaToNodes.ts` - highlighted node marking | `schemaToNodes.ts` L55, L75 | ✅ | `highlightedSet` used, `isHighlighted` in node data |
| 1.15 | `VirtualDiagramView.tsx` - Grid card removed -> DiagramCanvas integrated | `src/renderer/features/virtual-diagram/ui/VirtualDiagramView.tsx` | ✅ | DiagramCanvas used as center panel |
| 1.16 | `RealDiagramView.tsx` - Grid card removed -> DiagramCanvas(readOnly=true) | `src/renderer/features/real-diagram/ui/RealDiagramView.tsx` | ✅ | Uses `<DiagramCanvas readOnly ... />` |
| 1.17 | Layout save/restore - DIAGRAM_SAVE_LAYOUT / DIAGRAM_GET_LAYOUT IPC | `DiagramCanvas.tsx`, `diagramApi.ts`, `channels.ts` | ✅ | IPC channels exist, diagramApi.saveLayout/getLayout wired, VirtualDiagramView uses useDiagramLayout + useSaveDiagramLayout |

**Phase 1 Score: 16/17 items fully implemented, 1 partial = 97%**

---

### 2.2 Phase 2: Name/Version + 3-Panel Layout (FR-01, FR-09, FR-10, FR-11)

**Goal**: 3-Panel layout with bidirectional sync

| # | Design Item | Implementation File | Status | Notes |
|---|-------------|---------------------|:------:|-------|
| 2.1 | `IDiagram.version` field added to `db.ts` | `src/shared/types/db.ts` L106-113 | ❌ | `IDiagram` has no `version` field. Design specifies `version: string` (semver). |
| 2.2 | `localDb.schema.ts` ALTER TABLE for version column | N/A | ❌ | No version column in schema; depends on 2.1 |
| 2.3 | `diagramRepository` modified for version | N/A | ❌ | Depends on 2.1 |
| 2.4 | `DIAGRAM_UPDATE_META` IPC channel | `src/shared/ipc/channels.ts` | ❌ | Channel not present |
| 2.5 | `DiagramToolbar.tsx` - Diagram select dropdown | `src/renderer/features/virtual-diagram/ui/DiagramToolbar.tsx` L72-81 | ✅ | Select element with diagram list |
| 2.6 | `DiagramToolbar.tsx` - Name inline edit (contentEditable/Input) | `DiagramToolbar.tsx` L47-66, L87-109 | ✅ | Double-click to edit with Input, Enter/Escape/Blur handling |
| 2.7 | `DiagramToolbar.tsx` - Version inline edit | `DiagramToolbar.tsx` | ❌ | No version display or editing; depends on IDiagram.version (2.1) |
| 2.8 | `DiagramToolbar.tsx` - Tab switch (Virtual/Real/Diff) | `DiagramToolbar.tsx` L116-131 | ✅ | Three tabs with active state |
| 2.9 | `DiagramToolbar.tsx` - Action buttons (Search, Filter, Snapshot, DDL, Migration) | `DiagramToolbar.tsx` L137-183 | ⚠ | Search toggle, DDL toggle, left/right panel toggle present. Filter button missing. Snapshot button missing. Migration button missing. |
| 2.10 | `TableListPanel.tsx` - Table list (name + column count) | `src/renderer/features/virtual-diagram/ui/TableListPanel.tsx` L69-72 | ✅ | Name + column count displayed |
| 2.11 | `TableListPanel.tsx` - Click -> fitView + selection | `TableListPanel.tsx`, `DiagramCanvas.tsx` L117-130 | ✅ | onTableSelect triggers fitView in DiagramCanvas via selectedTableId |
| 2.12 | `TableListPanel.tsx` - Selected state highlight (bg-primary/10) | `TableListPanel.tsx` L66 | ✅ | `bg-primary/10 font-semibold text-primary` |
| 2.13 | `TableListPanel.tsx` - scrollIntoView sync | `TableListPanel.tsx` L27-34 | ✅ | useEffect with `scrollIntoView({ behavior: 'smooth', block: 'nearest' })` |
| 2.14 | `TableDetailPanel.tsx` - Selected table detail (all properties) | `src/renderer/features/virtual-diagram/ui/TableDetailPanel.tsx` | ✅ | Name, comment, columns, constraints displayed |
| 2.15 | `TableDetailPanel.tsx` - Inline edit (TableEditor/ColumnEditor reuse) | `TableDetailPanel.tsx` L148-154 | ✅ | Uses ColumnEditor for each column |
| 2.16 | `TableDetailPanel.tsx` - Delete function | `TableDetailPanel.tsx` L66-73, L200-223 | ✅ | Delete with confirmation dialog |
| 2.17 | `VirtualDiagramView.tsx` - 3-Panel flex layout: left(200px) + center(flex-1) + right(320px) | `VirtualDiagramView.tsx` L131-174 | ✅ | `w-[200px]` left, `flex-1` center, `w-[320px]` right |
| 2.18 | `VirtualDiagramView.tsx` - Panel toggle buttons | `DiagramToolbar.tsx` L155-170 | ✅ | PanelLeft/PanelRight toggle buttons |
| 2.19 | `VirtualDiagramView.tsx` - diagramStore bidirectional sync | `VirtualDiagramView.tsx` L36-46, `diagramStore.ts` L91-92 | ✅ | setSelectedTableId also sets isRightPanelOpen |
| 2.20 | Canvas <-> Left panel bidirectional: Canvas node click -> left highlight | `VirtualDiagramView.tsx` L90-92, `TableListPanel.tsx` | ✅ | Both share selectedTableId from store |
| 2.21 | Canvas <-> Left panel bidirectional: Left click -> Canvas fitView | `DiagramCanvas.tsx` L117-130 | ✅ | fitView triggered by selectedTableId change |

**Phase 2 Score: 15/21 items fully implemented, 1 partial, 5 not implemented = 74%**

---

### 2.3 Phase 3: Virtual <-> Real CRUD + Diff (FR-03, FR-04, FR-05)

**Goal**: Bidirectional CRUD + Migration versioning

| # | Design Item | Implementation File | Status | Notes |
|---|-------------|---------------------|:------:|-------|
| 3.1 | Virtual Canvas CRUD - Double-click empty area -> new table | `DiagramCanvas.tsx` | ❌ | `onPaneDoubleClick` not implemented (only `onPaneClick` deselects). `onTableCreate` prop exists but not wired to pane double-click. |
| 3.2 | Virtual Canvas CRUD - Node double-click -> inline table name edit | `DiagramCanvas.tsx` / `TableNode.tsx` | ❌ | No onNodeDoubleClick handler; no inline editing in TableNode |
| 3.3 | Virtual Canvas CRUD - Edge drag -> FK creation | `DiagramCanvas.tsx` L102-110 | ✅ | onConnect handler calls onEdgeCreate |
| 3.4 | Virtual Canvas CRUD - Right panel detail edit | `TableDetailPanel.tsx` | ✅ | Full column/table editing in right panel |
| 3.5 | `migrationService.ts` + `migrationRepository.ts` | N/A | ❌ | Files do not exist |
| 3.6 | `diagram_migrations` SQLite table | N/A | ❌ | Table not created |
| 3.7 | IPC channels: MIGRATION_LIST, MIGRATION_CREATE, MIGRATION_APPLY, MIGRATION_DELETE | `src/shared/ipc/channels.ts` | ❌ | None of these channels exist |
| 3.8 | DiffView extended - "Apply to Virtual" button | `src/renderer/features/diagram-diff/ui/DiffView.tsx` | ❌ | Not checked in detail, but no migration-related IPC exists |
| 3.9 | DiffView extended - "Create Migration" button | N/A | ❌ | Depends on 3.5-3.7 |
| 3.10 | `MigrationPanel.tsx` (history + apply status) | N/A | ❌ | File does not exist |
| 3.11 | DDL Sync (`ddlSync.ts`) - Diagram change -> DDL auto-regeneration | N/A | ❌ | File does not exist |
| 3.12 | DDL Sync - DDL edit -> Diagram auto-apply | N/A | ❌ | Depends on 3.11 |
| 3.13 | DDL Sync - `changeSource` tracking for infinite loop prevention | `diagramStore.ts` L51, L88, L111 | ✅ | `changeSource` state exists in store with setter, but no consumer (ddlSync.ts) |

**Phase 3 Score: 3/13 items implemented (2 full + 1 store-only) = 23%**

---

### 2.4 Phase 4: Search + Filter + View Snapshot (FR-08, FR-12, FR-13)

**Goal**: Large-schema navigation efficiency

| # | Design Item | Implementation File | Status | Notes |
|---|-------------|---------------------|:------:|-------|
| 4.1 | `useSearch.ts` + `SearchOverlay.tsx` - Cmd+F shortcut | N/A | ❌ | Neither file exists. Store has `isSearchOpen`/`searchQuery`/`searchResults` but no hook or UI. |
| 4.2 | `useSearch.ts` - In-memory search (debounce 200ms) | N/A | ❌ | No search hook |
| 4.3 | `useSearch.ts` - Result click -> fitView + highlight | N/A | ❌ | Infrastructure exists (highlightedTableIds in canvas) but no search UI |
| 4.4 | `useFilter.ts` + `FilterPanel.tsx` - Preset compact/full/custom | N/A | ❌ | Neither file exists. Store has `setFilter`/`setFilterPreset` and `FILTER_PRESETS`, but no dedicated UI component. |
| 4.5 | `useFilter.ts` - Individual toggles (columns/dataTypes/keyIcons/nullable/comments/constraints) | N/A | ❌ | No filter UI component |
| 4.6 | `useFilter.ts` - Filter change -> TableNode re-render | `TableNode.tsx`, `schemaToNodes.ts` | ⚠ | Filter is passed through schemaToNodes -> TableNode and fully respected in rendering. However, there is no user-facing UI to change the filter. |
| 4.7 | `viewSnapshotService.ts` + `viewSnapshotRepository.ts` (Main) | N/A | ❌ | Files do not exist |
| 4.8 | `view_snapshots` SQLite table | N/A | ❌ | Table not created |
| 4.9 | IPC channels: VIEW_SNAPSHOT_LIST, VIEW_SNAPSHOT_CREATE, VIEW_SNAPSHOT_DELETE, VIEW_SNAPSHOT_LOAD | `src/shared/ipc/channels.ts` | ❌ | None of these channels exist |
| 4.10 | `ViewSnapshotManager.tsx` - Save/Load/Delete UI | N/A | ❌ | File does not exist |

**Phase 4 Score: 0/10 fully implemented, 1 partial = 5%**

---

## 3. Data Model Comparison

### 3.1 Type Definitions (`src/shared/types/db.ts`)

| Design Type | Status | Notes |
|-------------|:------:|-------|
| `IDiagram` with `version: string` field | ❌ | `version` field absent from implementation |
| `IMigration` interface | ❌ | Not defined |
| `TMigrationDirection` type | ❌ | Not defined |
| `TMigrationStatus` type | ❌ | Not defined |
| `IViewSnapshot` interface | ❌ | Not defined |
| `IDiagramFilter` interface | ✅ | Matches design exactly (7 fields) |
| `TFilterPreset` type | ✅ | `'compact' | 'full' | 'custom'` matches |
| `ISearchResult` interface | ✅ | All fields match (type, tableId, tableName, columnId, columnName, constraintName, matchedText) |

**Data Model Score: 3/8 = 38%**

### 3.2 SQLite Schema Changes

| Design Schema Change | Status | Notes |
|---------------------|:------:|-------|
| `diagrams` table: `version` column | ❌ | Not added |
| `diagram_migrations` table | ❌ | Not created |
| `view_snapshots` table | ❌ | Not created |

**Schema Score: 0/3 = 0%**

---

## 4. IPC Specification Comparison

### 4.1 New Channels

| Design Channel | Status | Notes |
|---------------|:------:|-------|
| `DIAGRAM_UPDATE_META` | ❌ | Not in channels.ts |
| `MIGRATION_LIST` | ❌ | Not in channels.ts |
| `MIGRATION_CREATE` | ❌ | Not in channels.ts |
| `MIGRATION_APPLY` | ❌ | Not in channels.ts |
| `MIGRATION_DELETE` | ❌ | Not in channels.ts |
| `VIEW_SNAPSHOT_LIST` | ❌ | Not in channels.ts |
| `VIEW_SNAPSHOT_CREATE` | ❌ | Not in channels.ts |
| `VIEW_SNAPSHOT_DELETE` | ❌ | Not in channels.ts |
| `VIEW_SNAPSHOT_LOAD` | ❌ | Not in channels.ts |

**IPC Score: 0/9 = 0%**

### 4.2 Modified Events

| Design Modification | Status | Notes |
|--------------------|:------:|-------|
| `DIAGRAM_CREATE`: `version` field in args | ❌ | No version in args |
| `DIAGRAM_UPDATE`: `version` field in args | ❌ | No version in args |

**Modified Events Score: 0/2 = 0%**

---

## 5. State Management Comparison

### 5.1 Zustand Store (`diagramStore.ts`)

| Design State/Action | Status | Notes |
|--------------------|:------:|-------|
| `selectedDiagramId` | ✅ | |
| `selectedTableId` | ✅ | |
| `selectedColumnId` | ✅ | |
| `isDdlEditorOpen` | ✅ | |
| `activeTab: TDiagramTab` | ✅ | |
| `isLeftPanelOpen` | ✅ | |
| `isRightPanelOpen` | ✅ | |
| `isSearchOpen` | ✅ | |
| `searchQuery` | ✅ | |
| `searchResults: ISearchResult[]` | ✅ | |
| `filter: IDiagramFilter` | ✅ | |
| `changeSource` | ✅ | |
| All designed actions (18 total) | ✅ | All actions present and match signatures |
| `DEFAULT_FILTER` constant | ✅ | Values match design exactly |
| `FILTER_PRESETS` constant | ✅ | compact/full presets match design |

**State Management Score: 15/15 = 100%**

---

## 6. Component Structure Comparison

| Design Component | Location | Status | Notes |
|-----------------|----------|:------:|-------|
| `DiagramCanvas` | `features/virtual-diagram/ui/` | ✅ | Full implementation |
| `TableNode` | `features/virtual-diagram/ui/` | ✅ | Full implementation |
| `RelationEdge` | `features/virtual-diagram/ui/` | ✅ | Implemented, minor gap (cardinality) |
| `TableListPanel` | `features/virtual-diagram/ui/` | ✅ | Full implementation |
| `TableDetailPanel` | `features/virtual-diagram/ui/` | ✅ | Full implementation |
| `DiagramToolbar` | `features/virtual-diagram/ui/` | ✅ | Implemented, missing version/filter/snapshot/migration buttons |
| `SearchOverlay` | `features/virtual-diagram/ui/` | ❌ | File does not exist |
| `FilterPanel` | `features/virtual-diagram/ui/` | ❌ | File does not exist |
| `ViewSnapshotManager` | `features/virtual-diagram/ui/` | ❌ | File does not exist |
| `MigrationPanel` | `features/diagram-diff/ui/` | ❌ | File does not exist |
| `VirtualDiagramView` | `features/virtual-diagram/ui/` | ✅ | 3-Panel layout working |
| `RealDiagramView` | `features/real-diagram/ui/` | ✅ | Canvas-based readOnly working |
| `DiffView` | `features/diagram-diff/ui/` | ✅ | Existing, not migration-extended |
| `TableEditor` (KEEP) | `features/virtual-diagram/ui/` | ✅ | Exists |
| `ColumnEditor` (KEEP) | `features/virtual-diagram/ui/` | ✅ | Exists, reused by TableDetailPanel |

**Component Score: 11/15 = 73%**

---

## 7. Service Layer Comparison

| Design Service | Status | Notes |
|---------------|:------:|-------|
| `migrationService.ts` (Main) | ❌ | Not created |
| `migrationRepository.ts` (Main) | ❌ | Not created |
| `viewSnapshotService.ts` (Main) | ❌ | Not created |
| `viewSnapshotRepository.ts` (Main) | ❌ | Not created |
| `virtualDiagramService` version support | ❌ | No version field in IDiagram |
| `diffService` applyRealToVirtual extension | ❌ | Not implemented |
| `diffService` generateMigrationDdl DB-type extension | ❌ | Not implemented |

**Service Layer Score: 0/7 = 0%**

---

## 8. Renderer File Structure Comparison

| Design File | Status | Notes |
|-------------|:------:|-------|
| `ui/VirtualDiagramView.tsx` (REFACTOR) | ✅ | 3-Panel layout |
| `ui/DiagramCanvas.tsx` (NEW) | ✅ | |
| `ui/TableNode.tsx` (NEW) | ✅ | |
| `ui/RelationEdge.tsx` (NEW) | ✅ | |
| `ui/TableListPanel.tsx` (NEW) | ✅ | |
| `ui/TableDetailPanel.tsx` (NEW) | ✅ | |
| `ui/DiagramToolbar.tsx` (NEW) | ✅ | |
| `ui/SearchOverlay.tsx` (NEW) | ❌ | |
| `ui/FilterPanel.tsx` (NEW) | ❌ | |
| `ui/ViewSnapshotManager.tsx` (NEW) | ❌ | |
| `ui/TableEditor.tsx` (KEEP) | ✅ | |
| `ui/ColumnEditor.tsx` (KEEP) | ✅ | |
| `model/diagramStore.ts` (EXTEND) | ✅ | All new fields/actions present |
| `model/useDiagrams.ts` (EXTEND) | ⚠ | Existing hooks present; migration/snapshot query keys and hooks NOT added |
| `model/useSearch.ts` (NEW) | ❌ | |
| `model/useFilter.ts` (NEW) | ❌ | |
| `model/useViewSnapshot.ts` (NEW) | ❌ | |
| `api/diagramApi.ts` (EXTEND) | ⚠ | Existing CRUD+layout+version; migration/snapshot API NOT added |
| `api/migrationApi.ts` (NEW) | ❌ | |
| `api/viewSnapshotApi.ts` (NEW) | ❌ | |
| `lib/schemaToNodes.ts` (EXTEND) | ✅ | Filter + highlight support added |
| `lib/nodesToSchema.ts` (KEEP) | ✅ | Plus extractPositions utility |
| `lib/ddlSync.ts` (NEW) | ❌ | |
| `index.ts` (EXTEND) | ✅ | All new components exported |

**Renderer Structure Score: 13/24 = 54%**

---

## 9. Convention Compliance

### 9.1 Naming Convention

| Category | Convention | Compliance | Violations |
|----------|-----------|:----------:|------------|
| Components | PascalCase | 100% | None |
| Functions | camelCase | 100% | None |
| Constants | UPPER_SNAKE_CASE | 100% | `DEFAULT_FILTER`, `FILTER_PRESETS`, `COLUMNS_PER_ROW`, etc. |
| Files (component) | PascalCase.tsx | 100% | None |
| Files (utility) | camelCase.ts | 100% | `schemaToNodes.ts`, `nodesToSchema.ts`, `diagramStore.ts`, etc. |
| Folders | kebab-case | 100% | `virtual-diagram`, `real-diagram`, `diagram-diff`, `db-diagram` |

### 9.2 Architecture Compliance

| Rule | Status | Notes |
|------|:------:|-------|
| FSD structure (features/ui, features/model, features/api, features/lib) | ✅ | Correct layer placement |
| Shared types in `src/shared/types/` | ✅ | `db.ts` is the single source |
| IPC in `src/shared/ipc/` | ✅ | channels.ts + events.ts |
| No direct infrastructure import from UI | ✅ | UI -> hooks -> api -> electronApi |
| Zustand (UI) + React Query (Data) pattern | ✅ | diagramStore for UI state, useDiagrams for server state |

**Convention Score: 100%**

---

## 10. Overall Score Summary

### By Phase

| Phase | Implemented | Total | Score | Status |
|-------|:----------:|:-----:|:-----:|:------:|
| Phase 1: Canvas + Custom Node | 16.5 | 17 | 97% | ✅ |
| Phase 2: 3-Panel + Toolbar | 15.5 | 21 | 74% | ⚠ |
| Phase 3: CRUD + Migration + DDL Sync | 3 | 13 | 23% | ❌ |
| Phase 4: Search + Filter + Snapshot | 0.5 | 10 | 5% | ❌ |

### By Category

| Category | Score | Status |
|----------|:-----:|:------:|
| Design Match (all phases) | 58% | ⚠ |
| Architecture Compliance | 100% | ✅ |
| Convention Compliance | 100% | ✅ |
| State Management | 100% | ✅ |
| Data Model (types) | 38% | ❌ |
| IPC Specification | 0% | ❌ |
| Service Layer | 0% | ❌ |
| **Overall** | **58%** | **⚠** |

### Aggregate Match Rate

```
Total design items:       61
Fully implemented:        35
Partially implemented:     3  (counted as 0.5 each)
Not implemented:          23

Match Rate: (35 + 1.5) / 61 = 59.8% --> 60%
```

---

## 11. Differences Found

### 11.1 Missing Features (Design O, Implementation X)

| Item | Design Location | Description |
|------|-----------------|-------------|
| `IDiagram.version` field | design.md Section 3.1 | `version: string` (semver) not in IDiagram type |
| `IMigration` type + subtypes | design.md Section 3.1 | Migration interface/types not defined in db.ts |
| `IViewSnapshot` type | design.md Section 3.1 | View snapshot interface not defined in db.ts |
| `diagram_migrations` table | design.md Section 3.2 | SQLite table not created |
| `view_snapshots` table | design.md Section 3.2 | SQLite table not created |
| 9 IPC channels | design.md Section 4.1-4.2 | DIAGRAM_UPDATE_META, 4 MIGRATION_*, 4 VIEW_SNAPSHOT_* |
| `migrationService.ts` | design.md Section 8.1 | Service not created |
| `migrationRepository.ts` | design.md Section 10 | Repository not created |
| `viewSnapshotService.ts` | design.md Section 8.2 | Service not created |
| `viewSnapshotRepository.ts` | design.md Section 10 | Repository not created |
| `SearchOverlay.tsx` | design.md Section 5.4 | Component not created |
| `FilterPanel.tsx` | design.md Section 5.4 | Component not created |
| `ViewSnapshotManager.tsx` | design.md Section 5.4 | Component not created |
| `MigrationPanel.tsx` | design.md Section 5.4 | Component not created |
| `useSearch.ts` hook | design.md Section 6.3 | Hook not created |
| `useFilter.ts` hook | design.md Section 9 | Hook not created |
| `ddlSync.ts` | design.md Section 9 | DDL sync utility not created |
| Pane double-click -> new table | design.md Section 7.1 | onPaneDoubleClick not wired |
| Node double-click -> inline name edit | design.md Section 7.1 | Not implemented in TableNode |
| Version inline edit in toolbar | design.md Section 11 P2.2 | DiagramToolbar has no version field |
| Cardinality markers on edges | design.md Section 5.2 | RelationEdge shows FK label but no 1/N markers |
| Filter/Snapshot/Migration toolbar buttons | design.md Section 5.1 | DiagramToolbar missing these buttons |
| `diffService.applyRealToVirtual` | design.md Section 8.4 | Not implemented |
| Migration query keys/hooks in useDiagrams | design.md Section 6.2 | Not added |

### 11.2 Added Features (Design X, Implementation O)

| Item | Implementation Location | Description |
|------|------------------------|-------------|
| `TableNode` fallback source handle | `TableNode.tsx` L101-108 | Fallback source handle when no FK columns exist -- practical addition |
| `extractPositions()` utility | `nodesToSchema.ts` L21-27 | Standalone position extraction function -- not in design |
| `proOptions: hideAttribution` | `DiagramCanvas.tsx` L151 | Hides React Flow attribution badge |
| `setSelectedTableId` auto-opens right panel | `diagramStore.ts` L91-92 | `isRightPanelOpen: id !== null` -- ergonomic enhancement not in design |
| `TableListPanel` close button | `TableListPanel.tsx` L44-46, L19 | `onClose` prop with PanelLeftClose icon not in design spec |

### 11.3 Changed Features (Design != Implementation)

| Item | Design | Implementation | Impact |
|------|--------|----------------|--------|
| `NullableIcon` logic | `nullable=true` -> `◇` | `nullable=!column.nullable` passed (inverted) | Low -- renders `◆` for nullable fields |
| `DiagramCanvasProps` | Callbacks required (no `?`) | Callbacks optional (`?`) | Low -- flexible but could miss expected behavior |
| `handlePaneClick` | Not specified in design | Deselects table (passes null) | Low -- reasonable UX |
| `TableListPanel.onClose` | Not in design interface | Added to props | Low -- practical addition |

---

## 12. Recommended Actions

### 12.1 Current State Assessment

Phase 1 and the core of Phase 2 are fully implemented and working. The project has a solid Canvas-based ERD viewer with a 3-Panel layout, bidirectional table selection between the left panel and canvas, and full right-panel table editing. The architecture and conventions are impeccable.

Phase 3 and Phase 4 are almost entirely unimplemented. This is expected per the user-provided context noting these as "NOT YET implemented."

### 12.2 Immediate Actions (for Phase 2 completion)

| Priority | Item | File(s) | Description |
|----------|------|---------|-------------|
| 1 | Add `version` field to `IDiagram` | `src/shared/types/db.ts` | Add `version: string` field |
| 2 | Add `DIAGRAM_UPDATE_META` IPC channel | `src/shared/ipc/channels.ts`, `events.ts` | New channel for name+version update |
| 3 | Add version display/edit in toolbar | `DiagramToolbar.tsx` | Show version badge, inline edit |
| 4 | Fix NullableIcon inversion | `TableNode.tsx` L70 | `nullable={column.nullable}` (remove `!`) |

### 12.3 Phase 3 Implementation (next priority)

| Priority | Item | Scope |
|----------|------|-------|
| 1 | Add `IMigration`, `TMigrationDirection`, `TMigrationStatus` types | `db.ts` |
| 2 | Create `diagram_migrations` SQLite table | `localDb.schema.ts` |
| 3 | Create `migrationRepository.ts` + `migrationService.ts` | Main process |
| 4 | Add 4 MIGRATION_* IPC channels + events + handlers | Shared IPC + Main handlers |
| 5 | Create `ddlSync.ts` | Renderer lib |
| 6 | Wire pane double-click for table creation | `DiagramCanvas.tsx` |
| 7 | Wire node double-click for inline table name edit | `TableNode.tsx` + `DiagramCanvas.tsx` |
| 8 | Create `MigrationPanel.tsx` | Renderer UI |

### 12.4 Phase 4 Implementation (final priority)

| Priority | Item | Scope |
|----------|------|-------|
| 1 | Add `IViewSnapshot` type | `db.ts` |
| 2 | Create `useSearch.ts` + `SearchOverlay.tsx` | Renderer model + UI |
| 3 | Create `useFilter.ts` + `FilterPanel.tsx` | Renderer model + UI |
| 4 | Create view_snapshots infrastructure (table + repo + service + IPC) | Main + Shared |
| 5 | Create `ViewSnapshotManager.tsx` | Renderer UI |
| 6 | Add Filter/Snapshot/Migration buttons to `DiagramToolbar.tsx` | Renderer UI |

---

## 13. Design Document Updates Needed

The following implementation additions should be reflected back to the design:

- [ ] Document `extractPositions()` utility in `nodesToSchema.ts`
- [ ] Document fallback source handle behavior in `TableNode`
- [ ] Document `setSelectedTableId` auto-opening right panel behavior
- [ ] Document `TableListPanel.onClose` prop
- [ ] Clarify NullableIcon intended behavior (current implementation inverts the value)

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-02-09 | Initial analysis | gap-detector |
