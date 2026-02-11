# Diagram UX Improvement Design Document

> **Summary**: Virtual Diagram 툴바 재배치, Description, 버전 드롭다운, Export, 필터 개선, 패널 구조 변경 등 11개 항목 설계
>
> **Plan Reference**: `docs/01-plan/features/diagram-ux-improvement.plan.md`
> **Version**: 0.3.0
> **Author**: rhiemh
> **Date**: 2026-02-10
> **Status**: Draft

---

## 1. Architecture Overview

### 1.1 Component Hierarchy (Current → Target)

```
DbDiagramPage
├── DiagramTabBar           ← F10, F11: Panel 토글 + DDL/Canvas 토글 이동
│
└── VirtualDiagramView      ← F1, F2, F4, F6, F7, F8, F9
    ├── DiagramToolbar      ← F1, F2, F3, F5, F6, F9 (대폭 간소화)
    │
    ├── [Left Panel Area]   ← F2: DiagramList/TableList 전환
    │   ├── DiagramListPanel  ← F4: 버전 디렉토리 트리
    │   └── TableListPanel
    │
    ├── [Center: Canvas]
    │   ├── CanvasToolbar (NEW)  ← F7: floating 도구버튼
    │   ├── FilterPanel
    │   ├── ExportMenu (NEW)     ← F8
    │   ├── DiagramCanvas
    │   │   └── TableNode       ← F7: Constraint 표시 개선
    │   └── SearchOverlay
    │
    └── [Right Panel: Detail]
        └── TableDetailPanel
```

### 1.2 Target UI Layout

**DiagramTabBar Layer**:
```
[◫L] [◫R]     ──── [ Virtual | Real | Diff ] ────     [Canvas ⇄ DDL]
```

**DiagramToolbar (Simplified)**:
```
[📁][📋] | [Diagram Name (truncated...)] [🔒 Locked] [ℹ️] [▼ v1.0.0] | [↩][↪] | [💾 Save]
```

**Canvas Floating Toolbar (우측 상단)**:
```
[+ Table] [⚡Auto Layout] [🔍 Search] [⚙ Filter] [📤 Export]
```

---

## 2. Data Model Changes

### 2.1 DB Schema Migration

```sql
-- F1: Description 필드 추가
ALTER TABLE diagrams ADD COLUMN description TEXT DEFAULT '';
```

**File**: `src/main/infrastructure/database/localDb.schema.ts`
- Add `SQL_ADD_DIAGRAMS_DESCRIPTION` constant
- Add to `alterMigrations[]` array in `runMigrations()`

### 2.2 Type Changes

**File**: `src/shared/types/db.ts` (IDiagram, line 106)
```ts
export interface IDiagram {
  id: string;
  name: string;
  version: string;
  type: TDiagramType;
  tables: ITable[];
  description?: string;  // NEW (F1)
  hidden?: boolean;
  connectionId?: string;
  createdAt: string;
  updatedAt: string;
}
```

### 2.3 IPC Event Changes

**File**: `src/shared/ipc/events.ts`
- `DIAGRAM_UPDATE` args: add `description?: string` to existing partial update type
- `DIAGRAM_UPDATE_META` args: add `description?: string`

**File**: `src/main/ipc/handlers/schemaHandlers.ts`
- `DIAGRAM_UPDATE` handler: persist `description` to DB
- `DIAGRAM_UPDATE_META` handler: persist `description`

**Repository**: Map `description` ↔ DB column in read/write

### 2.4 Undo/Redo Stack Extension (F6)

**File**: `src/renderer/features/virtual-diagram/model/diagramStore.ts`

```ts
// Current
undoStack: ITable[][];
redoStack: ITable[][];

// New
interface UndoState {
  tables: ITable[];
  layoutSnapshot?: {
    positions: Record<string, { x: number; y: number }>;
    tableColors: Record<string, string>;
  };
}
undoStack: UndoState[];
redoStack: UndoState[];
```

---

## 3. Phase-by-Phase Component Specification

---

### Phase 1: Toolbar Cleanup & Layout Restructure

**Scope**: F5, F6 (partial), F7 (partial), F9, F10, F11

#### 3.1.1 DiagramTabBar.tsx - Panel 토글 + DDL 토글 이동

**File**: `src/renderer/pages/db-diagram/ui/DiagramTabBar.tsx` (34 lines → ~60 lines)

**Current**: Center-only tab bar with Virtual/Real/Diff buttons
**Target**: 3-section layout: [Left: Panel toggles] [Center: Tabs] [Right: DDL/Canvas toggle]

**New Props/Store access**:
```ts
// From useDiagramStore (already available):
const {
  activeTab, setActiveTab,
  isLeftPanelOpen, toggleLeftPanel,
  isRightPanelOpen, toggleRightPanel,
  viewMode, setViewMode,
} = useDiagramStore();
```

**Render structure**:
```tsx
<div className="flex items-center justify-between border-b border-border px-3 py-1">
  {/* Left: Panel toggles */}
  <div className="flex items-center gap-1">
    <Button variant={isLeftPanelOpen ? 'secondary' : 'ghost'} size="xs"
      onClick={toggleLeftPanel} title="Toggle left panel">
      <PanelLeft className="size-3.5" />
    </Button>
    <Button variant={isRightPanelOpen ? 'secondary' : 'ghost'} size="xs"
      onClick={toggleRightPanel} title="Toggle right panel">
      <PanelRight className="size-3.5" />
    </Button>
  </div>

  {/* Center: Tab selector (existing) */}
  <div className="flex rounded-md border border-border">
    {TABS.map(...)}
  </div>

  {/* Right: DDL/Canvas toggle */}
  <div>
    <Button variant={viewMode === 'ddl' ? 'secondary' : 'ghost'} size="xs"
      onClick={() => setViewMode(viewMode === 'ddl' ? 'canvas' : 'ddl')}
      title={viewMode === 'ddl' ? 'Switch to Canvas' : 'Switch to DDL'}>
      <Code className="size-3.5" />
      {viewMode === 'ddl' ? 'Canvas' : 'DDL'}
    </Button>
  </div>
</div>
```

#### 3.1.2 DiagramToolbar.tsx - 대폭 간소화

**File**: `src/renderer/features/virtual-diagram/ui/DiagramToolbar.tsx` (375 lines → ~250 lines)

**Removed buttons** (from current toolbar):
- `[+]` New Diagram button (F2: moved to DiagramListPanel only)
- `[🔍 Search]` (F7: moved to canvas floating)
- `[⚙ Filter]` (F7: moved to canvas floating)
- `[📷 Snapshot]` (replaced by F8 Export)
- `[↑ Forward Engineer]` (F9: deleted)
- `[⇄ Diff]` (already in tab bar)
- `[🔖 SaveVersion]` (F9: deleted)
- `[📜 History]` (F9: deleted, F4 replaces)
- `[◫ PanelLeft]` (F10: moved to DiagramTabBar)
- `[◫ PanelRight]` (F10: moved to DiagramTabBar)
- `[Code DDL/Canvas]` (F11: moved to DiagramTabBar)
- `[+ Table]` (F7: moved to canvas floating)
- `[⚡ AutoLayout]` (F7: moved to canvas floating)
- `[📋 Clone]` (F5: removed, unnecessary)

**Remaining buttons (new layout)**:

```
Left section:
[📁 DiagramList] [📋 TableList] | [Diagram Name (truncated)] [🔒 Lock] [ℹ️ Info] [▼ Version] | [↩ Undo] [↪ Redo] | [💾 Save]
```

**New interface**:
```ts
interface DiagramToolbarProps {
  currentDiagram: IDiagram | undefined;
  onDiagramNameChange?: (name: string) => void;
  // F2: Panel switching
  leftPanelView: 'diagrams' | 'tables';
  onLeftPanelViewChange: (view: 'diagrams' | 'tables') => void;
  // F1: Description
  onShowDescription?: () => void;
  // F3: (internal - truncation + popover are UI-only)
  // F4: Version dropdown
  versions: IDiagramVersion[];
  onVersionSelect: (version: IDiagramVersion | null) => void; // null = working
  // F5: Lock (existing)
  isDiagramLocked?: boolean;
  onToggleDiagramLock?: () => void;
  // F6: Save/Undo/Redo (existing, regrouped)
  onSave?: () => void;
  isDirty?: boolean;
  isSaving?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
}
```

**F3: Name truncation** (internal to DiagramToolbar):
```tsx
<span className="max-w-[250px] truncate ...">
  {currentDiagram.name}
</span>
```
- Hover: Radix `HoverCard` or `Tooltip` showing full name, version, description, table count

**F5: Lock visibility improvement**:
```tsx
{isDiagramLocked ? (
  <Button variant="destructive" size="xs" onClick={onToggleDiagramLock}>
    <Lock className="size-3.5" />
    Locked
  </Button>
) : (
  <Button variant="ghost" size="xs" className="opacity-50" onClick={onToggleDiagramLock}>
    <LockOpen className="size-3.5" />
  </Button>
)}
```

**F6: Save/Undo/Redo grouped** with border:
```tsx
<div className="flex items-center gap-0.5 rounded-md border border-border px-1">
  <Button variant="ghost" size="xs" onClick={onUndo} disabled={!canUndo}>
    <Undo2 className="size-3.5" />
  </Button>
  <Button variant="ghost" size="xs" onClick={onRedo} disabled={!canRedo}>
    <Redo2 className="size-3.5" />
  </Button>
  <div className="h-4 w-px bg-border" />
  <Button variant={isDirty ? 'default' : 'ghost'} size="xs"
    onClick={onSave} disabled={!isDirty || isSaving}>
    <Save className="size-3.5" />
    Save
  </Button>
</div>
```

#### 3.1.3 CanvasToolbar.tsx (NEW)

**File**: `src/renderer/features/virtual-diagram/ui/CanvasToolbar.tsx` (new, ~80 lines)

Floating toolbar rendered in the canvas area (top-right).

**Props**:
```ts
interface CanvasToolbarProps {
  onAddTable?: () => void;
  onAutoLayout?: () => void;
  onToggleSearch?: () => void;
  isSearchOpen?: boolean;
  onToggleFilter?: () => void;
  isFilterOpen?: boolean;
  onToggleExport?: () => void;
  isExportOpen?: boolean;
  disabled?: boolean; // from isDiagramLocked
}
```

**Render**:
```tsx
<div className="absolute right-2 top-2 z-40 flex items-center gap-1 rounded-lg border border-border bg-background/90 px-2 py-1 shadow-sm backdrop-blur-sm">
  <Button variant="ghost" size="xs" onClick={onAddTable} disabled={disabled}>
    <Plus className="size-3.5" /> Table
  </Button>
  <Button variant="ghost" size="xs" onClick={onAutoLayout}>
    <Workflow className="size-3.5" />
  </Button>
  <Button variant={isSearchOpen ? 'secondary' : 'ghost'} size="xs" onClick={onToggleSearch}>
    <Search className="size-3.5" />
  </Button>
  <Button variant={isFilterOpen ? 'secondary' : 'ghost'} size="xs" onClick={onToggleFilter}>
    <SlidersHorizontal className="size-3.5" />
  </Button>
  <Button variant={isExportOpen ? 'secondary' : 'ghost'} size="xs" onClick={onToggleExport}>
    <Download className="size-3.5" />
  </Button>
</div>
```

---

### Phase 2: Left Panel Redesign

**Scope**: F2

#### 3.2.1 diagramStore.ts - New State

```ts
// State
leftPanelView: 'diagrams' | 'tables';

// Action
setLeftPanelView: (view: 'diagrams' | 'tables') => void;
```

**Initial value**: `'tables'` (default to table list)

#### 3.2.2 DiagramToolbar.tsx - Panel Switch Icons

Replace `📁 FolderOpen` + `[+] New` buttons with:

```tsx
<div className="flex items-center gap-0.5 rounded-md border border-border px-0.5">
  <Button
    variant={leftPanelView === 'diagrams' ? 'secondary' : 'ghost'}
    size="xs"
    onClick={() => {
      onLeftPanelViewChange('diagrams');
      if (!isLeftPanelOpen) toggleLeftPanel();
    }}
  >
    <FolderOpen className="size-3.5" />
  </Button>
  <Button
    variant={leftPanelView === 'tables' ? 'secondary' : 'ghost'}
    size="xs"
    onClick={() => {
      onLeftPanelViewChange('tables');
      if (!isLeftPanelOpen) toggleLeftPanel();
    }}
  >
    <Table2 className="size-3.5" />
  </Button>
</div>
```

#### 3.2.3 VirtualDiagramView.tsx - Left Panel Rendering

**Current**: `isDiagramListOpen` state + `DiagramListPanel` overlay
**Target**: `leftPanelView` store state + conditional rendering in same slot

```tsx
{/* Left Panel */}
{isLeftPanelOpen && diagram && (
  leftPanelView === 'diagrams' ? (
    <DiagramListPanel
      diagrams={diagrams ?? []}
      selectedDiagramId={selectedDiagramId}
      onSelect={handleDiagramSelect}
      onCreate={handleCreateDiagram}
      onRename={handleDiagramRename}
      onDelete={handleDiagramDelete}
    />
  ) : (
    <TableListPanel
      tables={localTables}
      selectedTableId={selectedTableId}
      searchResults={searchResults}
      onTableSelect={handleTableSelect}
      hiddenTableIds={hiddenTableIds}
      onToggleVisibility={handleToggleVisibility}
      onShowAll={handleShowAll}
    />
  )
)}
```

#### 3.2.4 DiagramListPanel.tsx - Layout Change

**Current**: `absolute left-0 top-0 z-50 w-72` overlay
**Target**: `w-[200px] shrink-0` static panel (same width as TableListPanel)

- Remove `absolute`, `z-50`, `shadow-lg`
- Remove `onClose` button (panel close is via left panel toggle)
- Add bottom padding for scroll

#### 3.2.5 TableListPanel.tsx - Remove Close Button

- Remove `onClose` prop and close button (panel close via left panel toggle)
- Keep width at `w-[200px]`

---

### Phase 3: Name Truncation + Description

**Scope**: F1, F3

#### 3.3.1 DiagramToolbar.tsx - F3 Name Truncation

```tsx
{/* Name with truncation + hover popover */}
<HoverCard>
  <HoverCardTrigger asChild>
    <span className={`max-w-[250px] cursor-pointer truncate text-sm font-semibold
      hover:text-primary ${isDirty ? 'text-orange-400' : ''}`}
      onDoubleClick={handleNameDoubleClick}>
      {currentDiagram.name}
      {isDirty && <span className="ml-1 text-orange-400">●</span>}
    </span>
  </HoverCardTrigger>
  <HoverCardContent side="bottom" align="start" className="w-72">
    <div className="space-y-1.5">
      <p className="text-sm font-semibold">{currentDiagram.name}</p>
      <p className="text-xs text-muted-foreground">
        v{currentDiagram.version ?? '1.0.0'} · {localTables.length} tables
      </p>
      {currentDiagram.description && (
        <p className="text-xs">{currentDiagram.description}</p>
      )}
    </div>
  </HoverCardContent>
</HoverCard>
```

**Dependency**: `@radix-ui/react-hover-card` (already available via shadcn/ui pattern)

If HoverCard is not installed, use Radix `Tooltip` as fallback:
```tsx
<Tooltip>
  <TooltipTrigger asChild>...</TooltipTrigger>
  <TooltipContent>...</TooltipContent>
</Tooltip>
```

#### 3.3.2 DescriptionModal.tsx (NEW)

**File**: `src/renderer/features/virtual-diagram/ui/DescriptionModal.tsx` (~80 lines)

**Props**:
```ts
interface DescriptionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  description: string;
  onSave: (description: string) => void;
}
```

**Implementation**: Radix Dialog with textarea

```tsx
<Dialog open={open} onOpenChange={onOpenChange}>
  <DialogContent className="max-w-md">
    <DialogHeader>
      <DialogTitle>Diagram Description</DialogTitle>
    </DialogHeader>
    <Textarea
      value={localDescription}
      onChange={(e) => setLocalDescription(e.target.value)}
      placeholder="Describe this diagram..."
      rows={5}
    />
    <DialogFooter>
      <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
      <Button onClick={handleSave}>Save</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

#### 3.3.3 VirtualDiagramView.tsx - Description Handler

```ts
const [isDescriptionOpen, setIsDescriptionOpen] = useState(false);

function handleDescriptionSave(description: string) {
  if (!diagram) return;
  updateDiagram.mutate({ id: diagram.id, description });
  setIsDescriptionOpen(false);
}
```

#### 3.3.4 DiagramToolbar.tsx - Info Icon

```tsx
{onShowDescription && (
  <Button variant="ghost" size="xs" onClick={onShowDescription} title="Description">
    <Info className="size-3.5" />
  </Button>
)}
```

---

### Phase 4: Version Dropdown + Directory Tree

**Scope**: F4

#### 3.4.1 DiagramToolbar.tsx - Version Dropdown

**Replace** version text input with dropdown:

```tsx
import { useDiagramVersions } from '../model/useDiagrams';

// Inside component:
const { data: versions } = useDiagramVersions(currentDiagram?.id ?? '');

<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <button className="flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px]
      font-medium text-muted-foreground hover:bg-muted/80">
      v{currentDiagram.version ?? '1.0.0'}
      <ChevronDown className="size-3" />
    </button>
  </DropdownMenuTrigger>
  <DropdownMenuContent align="start" className="w-56">
    <DropdownMenuLabel className="text-[10px]">Versions</DropdownMenuLabel>
    <DropdownMenuItem onClick={() => onVersionSelect(null)}>
      <span className="font-medium">Working</span>
      <span className="ml-auto text-[10px] text-muted-foreground">current</span>
    </DropdownMenuItem>
    <DropdownMenuSeparator />
    {(versions ?? []).map((v) => (
      <DropdownMenuItem key={v.id} onClick={() => onVersionSelect(v)}>
        <span>v{v.versionNumber}</span>
        <span className="ml-auto text-[10px] text-muted-foreground">
          {new Date(v.createdAt).toLocaleDateString()}
        </span>
      </DropdownMenuItem>
    ))}
  </DropdownMenuContent>
</DropdownMenu>
```

#### 3.4.2 VirtualDiagramView.tsx - Version Load Logic

```ts
const [viewingVersion, setViewingVersion] = useState<IDiagramVersion | null>(null);

function handleVersionSelect(version: IDiagramVersion | null) {
  if (isDirty) {
    if (!window.confirm('You have unsaved changes. Discard and load version?')) return;
  }
  if (version === null) {
    // Return to working state
    setViewingVersion(null);
    if (diagram) {
      resetLocalTables(diagram.tables);
      clearHistory();
    }
  } else {
    // Load version's schema snapshot (read-only)
    setViewingVersion(version);
    const snapshot = version.schemaSnapshot;
    if (snapshot?.tables) {
      resetLocalTables(snapshot.tables);
      clearHistory();
    }
  }
}
```

**Read-only indicator**: When `viewingVersion !== null`, show banner + disable edits:
```tsx
{viewingVersion && (
  <div className="flex items-center justify-between bg-amber-500/10 px-3 py-1 text-xs text-amber-700">
    <span>Viewing version {viewingVersion.versionNumber} (read-only)</span>
    <Button size="xs" variant="outline" onClick={() => handleVersionSelect(null)}>
      Back to Working
    </Button>
  </div>
)}
```

#### 3.4.3 DiagramListPanel.tsx - Version Directory Tree

**New state**: `expandedDiagramIds: Set<string>`

Each diagram item becomes expandable:

```tsx
<div key={d.id}>
  <div className="flex items-center gap-1 px-2 py-1.5 ...">
    <button onClick={() => toggleExpanded(d.id)}>
      {isExpanded ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
    </button>
    <span className="flex-1 truncate font-medium">{d.name}</span>
    {/* hover actions */}
  </div>

  {/* Version subtree */}
  {isExpanded && (
    <div className="ml-4 border-l border-border/50">
      {/* Working version */}
      <button className="flex w-full items-center gap-1 px-2 py-1 text-[10px] ...">
        <FileText className="size-3" />
        Working ({d.tables.length} tbl)
      </button>

      {/* Saved versions (from useDiagramVersions) */}
      {versions.map((v) => (
        <button key={v.id} onClick={() => onVersionSelect(d.id, v)}
          className="flex w-full items-center gap-1 px-2 py-1 text-[10px] ...">
          <FileText className="size-3" />
          v{v.versionNumber} ({tableCount} tbl, {date})
        </button>
      ))}
    </div>
  )}
</div>
```

**Data fetching**: `useDiagramVersions` per expanded diagram. Use React Query's `enabled` option to only fetch when expanded.

---

### Phase 5: Filter Bug Fix & Improvement

**Scope**: F7 (filter part)

#### 3.5.1 TableNode.tsx - Comment Placeholder

**File**: `src/renderer/features/virtual-diagram/ui/TableNode.tsx` (line 120-122)

**Current**:
```tsx
{filter.showComments && table.comment && (
  <p className="truncate text-xs opacity-75">{table.comment}</p>
)}
```

**Target**:
```tsx
{filter.showComments && (
  <p className="truncate text-xs opacity-75">
    {table.comment || '(no comment)'}
  </p>
)}
```

#### 3.5.2 TableNode.tsx - Constraint Display Improvement

**File**: `src/renderer/features/virtual-diagram/ui/TableNode.tsx` (lines 155-163)

**Current**:
```tsx
<span className="font-medium">{c.type}</span>: {c.columns.join(', ')}
```

**Target**:
```tsx
<div key={c.name} className="flex items-center gap-1">
  <span className={`rounded px-1 py-0.5 text-[9px] font-bold leading-none
    ${c.type === 'PRIMARY KEY' ? 'bg-amber-500/20 text-amber-700' :
      c.type === 'FOREIGN KEY' ? 'bg-blue-500/20 text-blue-700' :
      c.type === 'UNIQUE' ? 'bg-green-500/20 text-green-700' :
      'bg-muted text-muted-foreground'}`}>
    {c.type === 'PRIMARY KEY' ? 'PK' :
     c.type === 'FOREIGN KEY' ? 'FK' :
     c.type === 'UNIQUE' ? 'UQ' : c.type}
  </span>
  <span className="truncate font-medium">{c.name}</span>
  <span className="text-muted-foreground">({c.columns.join(', ')})</span>
</div>
```

---

### Phase 6: Export

**Scope**: F8

#### 3.6.1 ExportMenu.tsx (NEW)

**File**: `src/renderer/features/virtual-diagram/ui/ExportMenu.tsx` (~120 lines)

**Props**:
```ts
interface ExportMenuProps {
  open: boolean;
  onClose: () => void;
  tables: ITable[];
  diagramName: string;
}
```

**Render**: Dropdown/Popover with 4 export options:

```tsx
<div className="w-48 rounded-lg border border-border bg-popover shadow-lg">
  <div className="border-b border-border px-3 py-2">
    <span className="text-xs font-semibold">Export</span>
  </div>
  <div className="p-1">
    <button onClick={handleExportPng} className="...">
      <Image className="size-3.5" /> Export as PNG
    </button>
    <button onClick={handleExportSvg} className="...">
      <FileCode className="size-3.5" /> Export as SVG
    </button>
    <button onClick={handleExportPdf} className="...">
      <FileText className="size-3.5" /> Export as PDF
    </button>
    <button onClick={handleExportCsv} className="...">
      <Sheet className="size-3.5" /> Export as CSV
    </button>
  </div>
</div>
```

#### 3.6.2 Export Implementation

**PNG/SVG**: Use `@xyflow/react`'s built-in `toImage()` API or `html-to-image` library:

```ts
import { toPng, toSvg } from 'html-to-image';

async function handleExportPng() {
  const rfElement = document.querySelector('.react-flow') as HTMLElement;
  if (!rfElement) return;
  const dataUrl = await toPng(rfElement, { backgroundColor: '#fff' });
  downloadFile(dataUrl, `${diagramName}.png`);
}

async function handleExportSvg() {
  const rfElement = document.querySelector('.react-flow') as HTMLElement;
  if (!rfElement) return;
  const dataUrl = await toSvg(rfElement);
  downloadFile(dataUrl, `${diagramName}.svg`);
}
```

**PDF**: Electron's `webContents.printToPDF` (preferred over jspdf for accuracy):

```ts
async function handleExportPdf() {
  const api = getElectronApi();
  // New IPC: EXPORT_PDF
  const result = await api.invoke('export:pdf', { filename: `${diagramName}.pdf` });
}
```

Alternative: `html-to-image` → `jspdf` pipeline (no IPC needed).

**CSV**: Pure string generation:

```ts
function handleExportCsv() {
  const header = 'table_name,column_name,data_type,key_type,nullable,comment';
  const rows = tables.flatMap((t) =>
    t.columns.map((c) =>
      [t.name, c.name, c.dataType, c.keyType ?? '', c.nullable, c.comment ?? '']
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(',')
    )
  );
  const csv = [header, ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  downloadBlob(blob, `${diagramName}.csv`);
}
```

#### 3.6.3 Dependencies

```
html-to-image  (PNG/SVG export from DOM)
jspdf          (PDF export - optional, can use Electron printToPDF instead)
```

Only `html-to-image` is required. PDF can use Electron's native API.

---

### Phase 7: Layout Undo/Redo

**Scope**: F6 (layout part)

#### 3.7.1 diagramStore.ts - Stack Type Change

**Change undo/redo stack type from `ITable[][]` to `UndoState[]`**:

```ts
interface UndoState {
  tables: ITable[];
  layoutSnapshot?: {
    positions: Record<string, { x: number; y: number }>;
    tableColors: Record<string, string>;
  };
}

// State
undoStack: UndoState[];
redoStack: UndoState[];
```

**pushUndoState**: Accept optional layout snapshot:
```ts
pushUndoState: (tables: ITable[], layout?: UndoState['layoutSnapshot']) => void;
```

**undo/redo**: Restore both `localTables` and layout (if snapshot exists):
```ts
undo: () => set((state) => {
  if (state.undoStack.length === 0) return state;
  const newUndo = [...state.undoStack];
  const prev = newUndo.pop()!;
  return {
    undoStack: newUndo,
    redoStack: [...state.redoStack, {
      tables: deepCloneTables(state.localTables),
      layoutSnapshot: /* current layout from external source */
    }],
    localTables: prev.tables,
    isDirty: true,
  };
}),
```

#### 3.7.2 VirtualDiagramView.tsx - Layout Capture

Before edit operations that affect layout (drag, color change), capture current positions:

```ts
function getCurrentLayoutSnapshot() {
  return {
    positions: layout?.positions ?? {},
    tableColors: useDiagramStore.getState().tableColors,
  };
}

// On node drag stop (from DiagramCanvas callback)
function handleNodeDragComplete() {
  // Layout is auto-saved by DiagramCanvas, but we push undo state
  pushUndoState(localTables, getCurrentLayoutSnapshot());
}

// On color change
function handleTableColorChange(color: string | null) {
  pushUndoState(localTables, getCurrentLayoutSnapshot());
  // ... existing color change logic
}
```

#### 3.7.3 DiagramCanvas.tsx - Drag Complete Callback

Add new prop `onNodeDragComplete` that fires after node drag (before auto-save):

```ts
interface DiagramCanvasProps {
  // ... existing
  onNodeDragComplete?: () => void;
}
```

In `handleNodeDragStop`, call `onNodeDragComplete?.()` before starting the save timer.

#### 3.7.4 Layout Restore on Undo

When undo/redo restores a `layoutSnapshot`, `VirtualDiagramView` must apply it:

```ts
// Watch for undo/redo layout changes
useEffect(() => {
  // After undo/redo, if the new top state has a layoutSnapshot,
  // save it via saveLayout.mutate()
  // This is triggered by localTables changes from undo/redo
}, [localTables]);
```

**Note**: This is the most complex aspect. A simpler MVP approach is to only undo/redo tables (not layout), then add layout undo/redo as a follow-up improvement.

---

## 4. State Management Summary

### 4.1 diagramStore.ts Changes

| Field | Type | Phase | Feature |
|-------|------|-------|---------|
| `leftPanelView` | `'diagrams' \| 'tables'` | P2 | F2 |
| `undoStack` | `UndoState[]` (was `ITable[][]`) | P7 | F6 |
| `redoStack` | `UndoState[]` (was `ITable[][]`) | P7 | F6 |

**Removed fields**: None (F10/F11 use existing `isLeftPanelOpen`, `isRightPanelOpen`, `viewMode`)

**Removed from DiagramToolbar usage** (store values still exist, just accessed elsewhere):
- `viewMode`, `setViewMode` → moved to DiagramTabBar
- `isLeftPanelOpen`, `toggleLeftPanel` → moved to DiagramTabBar
- `isRightPanelOpen`, `toggleRightPanel` → moved to DiagramTabBar
- `isSearchOpen`, `setSearchOpen` → moved to CanvasToolbar (via VirtualDiagramView)

### 4.2 VirtualDiagramView.tsx Local State Changes

| State | Type | Phase | Feature |
|-------|------|-------|---------|
| `isDiagramListOpen` | REMOVED | P2 | F2 (replaced by leftPanelView) |
| `isDescriptionOpen` | `boolean` | P3 | F1 |
| `viewingVersion` | `IDiagramVersion \| null` | P4 | F4 |
| `isExportOpen` | `boolean` | P6 | F8 |

---

## 5. New Files Summary

| File | Phase | Feature | Lines (est) |
|------|-------|---------|-------------|
| `ui/CanvasToolbar.tsx` | P1 | F7 | ~80 |
| `ui/DescriptionModal.tsx` | P3 | F1 | ~80 |
| `ui/ExportMenu.tsx` | P6 | F8 | ~120 |

---

## 6. Modified Files Summary

| File | Phases | Changes |
|------|--------|---------|
| `DiagramTabBar.tsx` | P1 | +PanelLeft/Right, +DDL/Canvas toggle, 3-section layout |
| `DiagramToolbar.tsx` | P1,P2,P3,P4 | Remove 14 buttons, add F2/F3/F4/F5 features |
| `VirtualDiagramView.tsx` | P1,P2,P3,P4,P6,P7 | Remove isDiagramListOpen, add canvas toolbar, description modal, version load, export, layout undo |
| `DiagramListPanel.tsx` | P2,P4 | Remove overlay→static panel, add version tree |
| `TableListPanel.tsx` | P2 | Remove onClose |
| `TableNode.tsx` | P5 | Comment placeholder, constraint display |
| `FilterPanel.tsx` | - | No changes (relocated by parent) |
| `DiagramCanvas.tsx` | P7 | Add onNodeDragComplete prop |
| `diagramStore.ts` | P2,P7 | Add leftPanelView, change undo stack type |
| `localDb.schema.ts` | P3 | Add description migration |
| `db.ts` (types) | P3 | Add description to IDiagram |
| `events.ts` (IPC) | P3 | Add description to update events |
| `schemaHandlers.ts` | P3 | Persist description |

---

## 7. Dependencies

| Package | Purpose | Phase |
|---------|---------|-------|
| `html-to-image` | PNG/SVG export from DOM | P6 |
| `jspdf` (optional) | PDF export | P6 |

**Already available**: `@radix-ui/react-hover-card` or `@radix-ui/react-tooltip` (for F3), `@radix-ui/react-dialog` (for F1), `@radix-ui/react-dropdown-menu` (for F4).

---

## 8. Verification Checklist

| # | Test | Phase |
|---|------|-------|
| 1 | Panel 토글이 DiagramTabBar 왼쪽에 위치 | P1 |
| 2 | DDL/Canvas 토글이 DiagramTabBar 오른쪽에 위치 | P1 |
| 3 | Forward Engineer, SaveVersion, History 아이콘 제거됨 | P1 |
| 4 | 캔버스 우상단에 floating toolbar 표시 | P1 |
| 5 | Lock ON → 빨간 배경 + "Locked" 텍스트, OFF → 약한 표시 | P1 |
| 6 | Undo/Redo/Save가 border 그룹으로 묶여 표시 | P1 |
| 7 | 📁 클릭 → DiagramList, 📋 클릭 → TableList 전환 | P2 |
| 8 | 35자 초과 이름 → 말줄임 → 호버 시 전체 정보 | P3 |
| 9 | ℹ️ 클릭 → Description 모달 → 저장 → DB 반영 | P3 |
| 10 | 버전 드롭다운 → 과거 버전 선택 → 읽기전용 로드 | P4 |
| 11 | DiagramListPanel에서 다이어그램 아래 버전 트리 표시 | P4 |
| 12 | Filter ON: Comments → comment 없는 테이블에 "(no comment)" | P5 |
| 13 | Constraint → `[PK] pk_users (id)` 형태로 표시 | P5 |
| 14 | Export → PNG/SVG/CSV 다운로드 성공 | P6 |
| 15 | 노드 드래그 → Undo → 원래 위치 복원 | P7 |
| 16 | TypeCheck: `npx tsc --noEmit` 통과 | All |
