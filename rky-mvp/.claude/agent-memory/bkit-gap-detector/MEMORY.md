# Gap Detector Memory - Rockury MVP

## Project Context
- Electron app (Main + Renderer process) with FSD architecture in renderer
- Main process: layered (handlers -> services -> repositories -> infrastructure)
- Shared types in `src/shared/types/db.ts`, IPC in `src/shared/ipc/`
- SQLite (better-sqlite3) for local storage, mysql2/pg for external DB connections

## db-tool Analysis (2026-02-09)
- Match Rate: 92% (174/189 items)
- Key gaps: 3 missing widgets (diagram-canvas, sql-editor, query-result-table), crypto fallback, 3 IPC channels
- See: `docs/03-analysis/db-tool.analysis.md`
- Types 100% match, repos/services/handlers 100%, widgets 40% (lowest category)

## ERD Schema Visualizer Analysis (2026-02-09)
- Match Rate: 60% (36.5/61 items)
- Phase 1 (Canvas): 97% -- nearly complete
- Phase 2 (3-Panel): 74% -- missing IDiagram.version, DIAGRAM_UPDATE_META IPC
- Phase 3 (Migration/DDL Sync): 23% -- almost entirely unimplemented
- Phase 4 (Search/Filter/Snapshot): 5% -- not started
- Architecture + Convention: 100%
- State management (diagramStore): 100% -- all designed fields/actions present
- Key bug: NullableIcon inverted in TableNode.tsx L70
- See: `docs/03-analysis/features/erd-schema-visualizer.analysis.md`

## ERD Interaction Improvement Analysis (2026-02-10, v2)
- Match Rate: 98.3% (145.5/148 items)
- Phase 1-A (Global Tab Bar): 100%
- Phase 1-B (DDL View Toggle): 100%
- Phase 2 (Real Diagram Persistence): 97.2% -- hidden filter missing in virtualDiagramService.list()
- Phase 3 (Changelog UI): 100%
- Phase 4 (Safe Migration + Rollback): 96.9% -- CHECK constraint missing 'rolled_back'
- Architecture + Convention: 98%
- v1 gaps FIXED: migrationApi.create() rollbackDdl, useCreateMigration rollbackDdl, DiffView passthrough
- v2 gaps: CHECK constraint bug (HIGH), virtualDiagramService hidden filter (LOW)
- BUG: localDb.schema.ts L122 CHECK(status IN ('pending','applied','failed')) blocks 'rolled_back' writes
- Positive drift: DDL side-panel, changeSource tracking, Apply Real->Virtual in DiffView
- See: `docs/03-analysis/features/erd-interaction.analysis.md`

## ERD Diagram v2 Analysis (2026-02-10)
- Match Rate: 100% (138/138 items)
- Phase 1 (Bug Fixes): 100% -- canvas viewport fix + real tab state persistence
- Phase 2 (Core): 100% -- FK editor, dagre auto-layout, hide/show, color picker, diagram clone
- Phase 3 (Constraints): 100% -- ConstraintEditor + CompositeKeyBuilder
- Phase 4 (Advanced Diff): 100% -- virtual vs virtual diff + inline diff panel
- Architecture + Convention: 100%
- 6 positive drift items (lastRealChangelog, setTableColor, fallback FK columns, etc.)
- 1 intentional omission: Auto Layout not added to RealDiagramView (read-only view)
- New files: ForeignKeyEditor, ColorPicker, ConstraintEditor, CompositeKeyBuilder, autoLayout, InlineDiffPanel
- New IPC: DIAGRAM_CLONE, SCHEMA_DIFF_VIRTUAL
- New DB migrations: hidden_table_ids, table_colors columns on diagram_layouts
- See: `docs/03-analysis/features/erd-v2.analysis.md`

## Diagram UX Improvement Analysis (2026-02-10, v2)
- Weighted Match Rate: 92.5% (Design 88%, Arch 100%, Conv 98%)
- Phase 1 (Toolbar/Layout): 96.6% -- all buttons moved correctly
- Phase 2 (Left Panel): 85.7% -- onClose residue + leftPanelView default 'diagrams' (design says 'tables')
- Phase 3 (Name/Description): 94.4% -- missing HoverCard hover popover on name
- Phase 4 (Version): 88.9% -- missing dirty check on version switch
- Phase 5 (Filter): 100% -- comment placeholder + constraint badges
- Phase 6 (Export): 36.4% -- lowest; PDF missing, html2canvas instead of html-to-image, no diagramName prop
- Phase 7 (Layout Undo): 83.3% -- UndoState simplified (no tableColors)
- Architecture + Convention: 100% / 98%
- v2 corrections: leftPanelView default was GAP (v1 missed), export score stricter, 8 dead code items found
- Key gaps: No HoverCard popover, PDF export missing, leftPanelView default wrong
- Dead code: ForwardEngineerPanel, VersionHistory imports+renders, handleSaveVersion, onClose props
- Positive drift: version inline edit, viewingVersion indicator, isSaving feedback, useNavigationGuard
- See: `docs/03-analysis/features/diagram-ux-improvement.analysis.md`

## Patterns Observed
- Design uses `schema_data`, implementation uses `tables_json` (column naming drift)
- Design specifies CHECK constraints, implementation omits them (type safety via TS instead)
- Zustand stores enhanced beyond design (editingId, extra actions) -- positive drift
- DDL parse/generate logic in schemaHandlers.ts rather than separate service (architectural simplification)
- Preload API type is auto-derived from CHANNELS+IEvents -- stays in sync automatically

## Analysis Approach
1. Read design doc fully first
2. Check shared types -> IPC channels -> events -> preload (cross-process contract)
3. Check main process: schema -> repos -> services -> handlers (bottom-up)
4. Check renderer: entities -> features (ui/model/api/lib) -> widgets -> pages -> routes
5. Verify dependencies in package.json
6. Security checks last (crypto, password handling)
