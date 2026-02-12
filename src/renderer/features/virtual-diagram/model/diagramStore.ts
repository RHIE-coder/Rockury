import { create } from 'zustand';
import type { IDiagramFilter, ISearchResult, ITable, IColumn, ISchemaChangelog } from '~/shared/types/db';
import type { ICascadeResult } from '../lib/cascadeTraversal';

export type TDiagramTab = 'virtual' | 'real' | 'diff';
export type TViewMode = 'canvas' | 'ddl';

const ALL_EDGE_ACTIONS = { CASCADE: true, 'SET NULL': true, RESTRICT: true, 'NO ACTION': true };

export const DEFAULT_FILTER: IDiagramFilter = {
  showColumns: true,
  showDataTypes: true,
  showKeyIcons: true,
  showNullable: true,
  showComments: false,
  showConstraints: false,
  showEdgePolicies: true,
  preset: 'full',
  edgeOnDelete: { ...ALL_EDGE_ACTIONS },
  edgeOnUpdate: { ...ALL_EDGE_ACTIONS },
};

export const FILTER_PRESETS: Record<string, Partial<IDiagramFilter>> = {
  compact: {
    showColumns: false,
    showDataTypes: false,
    showKeyIcons: false,
    showNullable: false,
    showComments: false,
    showConstraints: false,
    showEdgePolicies: false,
    edgeOnDelete: { ...ALL_EDGE_ACTIONS },
    edgeOnUpdate: { ...ALL_EDGE_ACTIONS },
  },
  full: {
    showColumns: true,
    showDataTypes: true,
    showKeyIcons: true,
    showNullable: true,
    showComments: true,
    showConstraints: true,
    showEdgePolicies: true,
    edgeOnDelete: { ...ALL_EDGE_ACTIONS },
    edgeOnUpdate: { ...ALL_EDGE_ACTIONS },
  },
};

interface DiagramStoreState {
  selectedDiagramId: string | null;
  selectedTableId: string | null;
  selectedColumnId: string | null;
  activeTab: TDiagramTab;
  viewMode: TViewMode;

  isLeftPanelOpen: boolean;
  isRightPanelOpen: boolean;

  isSearchOpen: boolean;
  searchQuery: string;
  searchResults: ISearchResult[];

  filter: IDiagramFilter;

  changeSource: 'canvas' | 'ddl' | 'external' | null;

  selectedConnectionId: string | null;

  // Table visibility & colors
  hiddenTableIds: string[];
  tableColors: Record<string, string>;

  // Left panel view mode
  leftPanelView: 'diagrams' | 'tables';

  // Right panel mode
  rightPanelMode: 'detail' | 'compare';
  compareTargetVersionId: string | null;

  // Local buffer (manual save)
  localTables: ITable[];
  isDirty: boolean;
  isLayoutDirty: boolean;

  // Lock
  isDiagramLocked: boolean;
  lockedNodeIds: string[];

  // Undo/Redo
  undoStack: UndoState[];
  redoStack: UndoState[];
  pendingLayoutRestore: Record<string, { x: number; y: number }> | null;

  // DDL filter
  ddlIncludedTableIds: string[] | null;

  // Real diagram persisted state
  realTables: ITable[];
  realDiagramId: string | null;
  realSelectedTableId: string | null;
  isRealChangelogOpen: boolean;
  lastRealChangelog: ISchemaChangelog | null;

  // Cascade simulation
  cascadeSimulation: ICascadeResult | null;
}

interface UndoState {
  tables: ITable[];
  positions?: Record<string, { x: number; y: number }>;
}

const MAX_UNDO_STACK = 50;

function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

/** Migrate legacy keyType (singular) → keyTypes (array) for backward compatibility */
function normalizeTables(tables: ITable[]): ITable[] {
  return tables.map((t) => ({
    ...t,
    columns: t.columns.map((c) => {
      const col = c as IColumn & { keyType?: string | null };
      if (col.keyTypes && Array.isArray(col.keyTypes)) return c;
      // Legacy: keyType (singular) → keyTypes (array)
      const legacy = col.keyType;
      const keyTypes = legacy ? [legacy as import('~/shared/types/db').TKeyType] : [];
      const { keyType: _, ...rest } = col;
      return { ...rest, keyTypes } as IColumn;
    }),
  }));
}

interface DiagramStoreActions {
  setSelectedDiagramId: (id: string | null) => void;
  setSelectedTableId: (id: string | null) => void;
  setSelectedColumnId: (id: string | null) => void;
  setActiveTab: (tab: TDiagramTab) => void;
  setViewMode: (mode: TViewMode) => void;

  toggleLeftPanel: () => void;
  toggleRightPanel: () => void;
  setSearchOpen: (open: boolean) => void;
  setSearchQuery: (query: string) => void;
  setSearchResults: (results: ISearchResult[]) => void;
  setFilter: (filter: Partial<IDiagramFilter>) => void;
  setFilterPreset: (preset: IDiagramFilter['preset']) => void;
  setChangeSource: (source: DiagramStoreState['changeSource']) => void;
  setSelectedConnectionId: (id: string | null) => void;

  // Table visibility & colors
  setHiddenTableIds: (ids: string[]) => void;
  toggleTableVisibility: (tableId: string) => void;
  showAllTables: () => void;
  setTableColors: (colors: Record<string, string>) => void;
  setTableColor: (tableId: string, color: string | null) => void;

  // Left panel view mode
  setLeftPanelView: (view: 'diagrams' | 'tables') => void;

  // Right panel mode
  setRightPanelMode: (mode: 'detail' | 'compare') => void;
  setCompareTargetDiagramId: (id: string | null) => void;

  // Local buffer (manual save)
  setLocalTables: (tables: ITable[]) => void;
  updateLocalTable: (updated: ITable) => void;
  addLocalTable: (table: ITable) => void;
  deleteLocalTable: (tableId: string) => void;
  resetLocalTables: (tables: ITable[]) => void;
  setLayoutDirty: (dirty: boolean) => void;

  // Lock
  toggleDiagramLock: () => void;
  toggleNodeLock: (nodeId: string) => void;

  // Undo/Redo
  pushUndoState: (tables: ITable[], positions?: Record<string, { x: number; y: number }>) => void;
  undo: () => void;
  redo: () => void;
  clearHistory: () => void;
  clearPendingLayoutRestore: () => void;

  // DDL filter
  setDdlIncludedTableIds: (ids: string[] | null) => void;

  // Real diagram actions
  setRealTables: (tables: ITable[]) => void;
  setRealDiagramId: (id: string | null) => void;
  setRealSelectedTableId: (id: string | null) => void;
  setRealChangelogOpen: (open: boolean) => void;
  setLastRealChangelog: (changelog: ISchemaChangelog | null) => void;

  // Cascade simulation
  setCascadeSimulation: (result: ICascadeResult | null) => void;
  clearCascadeSimulation: () => void;
}

export const useDiagramStore = create<DiagramStoreState & DiagramStoreActions>((set) => ({
  selectedDiagramId: null,
  selectedTableId: null,
  selectedColumnId: null,
  activeTab: 'virtual',
  viewMode: 'canvas',

  isLeftPanelOpen: true,
  isRightPanelOpen: false,

  isSearchOpen: false,
  searchQuery: '',
  searchResults: [],

  filter: DEFAULT_FILTER,

  changeSource: null,

  selectedConnectionId: null,

  // Table visibility & colors
  hiddenTableIds: [],
  tableColors: {},

  // Left panel view mode
  leftPanelView: 'diagrams',

  // Right panel mode
  rightPanelMode: 'detail',
  compareTargetVersionId: null,

  // Local buffer (manual save)
  localTables: [],
  isDirty: false,
  isLayoutDirty: false,

  // Lock
  isDiagramLocked: false,
  lockedNodeIds: [],

  // Undo/Redo
  undoStack: [],
  redoStack: [],
  pendingLayoutRestore: null,

  // DDL filter
  ddlIncludedTableIds: null,

  // Real diagram persisted state
  realTables: [],
  realDiagramId: null,
  realSelectedTableId: null,
  isRealChangelogOpen: false,
  lastRealChangelog: null,

  // Cascade simulation
  cascadeSimulation: null,

  setSelectedDiagramId: (id) => set({ selectedDiagramId: id }),
  setSelectedTableId: (id) =>
    set({ selectedTableId: id, isRightPanelOpen: id !== null }),
  setSelectedColumnId: (id) => set({ selectedColumnId: id }),
  setActiveTab: (tab) => set({ activeTab: tab }),
  setViewMode: (mode) => set({ viewMode: mode }),

  toggleLeftPanel: () => set((state) => ({ isLeftPanelOpen: !state.isLeftPanelOpen })),
  toggleRightPanel: () => set((state) => ({ isRightPanelOpen: !state.isRightPanelOpen })),
  setSearchOpen: (open) => set({ isSearchOpen: open, searchQuery: open ? '' : '', searchResults: [] }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setSearchResults: (results) => set({ searchResults: results }),
  setFilter: (partial) =>
    set((state) => ({ filter: { ...state.filter, ...partial, preset: 'custom' as const } })),
  setFilterPreset: (preset) =>
    set((state) => {
      const presetValues = FILTER_PRESETS[preset];
      if (!presetValues) return { filter: { ...state.filter, preset } };
      return { filter: { ...state.filter, ...presetValues, preset } };
    }),
  setChangeSource: (source) => set({ changeSource: source }),
  setSelectedConnectionId: (id) => set({ selectedConnectionId: id }),

  // Table visibility & colors
  setHiddenTableIds: (ids) => set({ hiddenTableIds: ids }),
  toggleTableVisibility: (tableId) =>
    set((state) => {
      const ids = state.hiddenTableIds.includes(tableId)
        ? state.hiddenTableIds.filter((id) => id !== tableId)
        : [...state.hiddenTableIds, tableId];
      return { hiddenTableIds: ids };
    }),
  showAllTables: () => set({ hiddenTableIds: [] }),
  setTableColors: (colors) => set({ tableColors: colors }),
  setTableColor: (tableId, color) =>
    set((state) => {
      const colors = { ...state.tableColors };
      if (color) {
        colors[tableId] = color;
      } else {
        delete colors[tableId];
      }
      return { tableColors: colors };
    }),

  // Left panel view mode
  setLeftPanelView: (view) => set({ leftPanelView: view }),

  // Right panel mode
  setRightPanelMode: (mode) => set({ rightPanelMode: mode }),
  setCompareTargetDiagramId: (id) => set({ compareTargetVersionId: id }),

  // Local buffer (manual save)
  setLocalTables: (tables) => set({ localTables: normalizeTables(tables), isDirty: true }),
  updateLocalTable: (updated) =>
    set((state) => ({
      localTables: state.localTables.map((t) => (t.id === updated.id ? updated : t)),
      isDirty: true,
    })),
  addLocalTable: (table) =>
    set((state) => ({
      localTables: [...state.localTables, table],
      isDirty: true,
    })),
  deleteLocalTable: (tableId) =>
    set((state) => ({
      localTables: state.localTables.filter((t) => t.id !== tableId),
      isDirty: true,
    })),
  resetLocalTables: (tables) =>
    set({ localTables: normalizeTables(tables), isDirty: false, isLayoutDirty: false }),
  setLayoutDirty: (dirty) => set({ isLayoutDirty: dirty }),

  // Lock
  toggleDiagramLock: () =>
    set((state) => ({ isDiagramLocked: !state.isDiagramLocked })),
  toggleNodeLock: (nodeId) =>
    set((state) => ({
      lockedNodeIds: state.lockedNodeIds.includes(nodeId)
        ? state.lockedNodeIds.filter((id) => id !== nodeId)
        : [...state.lockedNodeIds, nodeId],
    })),

  // Undo/Redo
  pushUndoState: (tables, positions) =>
    set((state) => {
      const entry: UndoState = { tables: deepClone(tables) };
      if (positions) entry.positions = deepClone(positions);
      const newStack = [...state.undoStack, entry];
      if (newStack.length > MAX_UNDO_STACK) newStack.shift();
      return { undoStack: newStack, redoStack: [] };
    }),
  undo: () =>
    set((state) => {
      if (state.undoStack.length === 0) return state;
      const newUndo = [...state.undoStack];
      const prev = newUndo.pop()!;
      const currentEntry: UndoState = { tables: deepClone(state.localTables) };
      // Positions for redo are captured by the caller when they detect pendingLayoutRestore
      return {
        undoStack: newUndo,
        redoStack: [...state.redoStack, currentEntry],
        localTables: prev.tables,
        isDirty: true,
        pendingLayoutRestore: prev.positions ?? null,
      };
    }),
  redo: () =>
    set((state) => {
      if (state.redoStack.length === 0) return state;
      const newRedo = [...state.redoStack];
      const next = newRedo.pop()!;
      const currentEntry: UndoState = { tables: deepClone(state.localTables) };
      return {
        redoStack: newRedo,
        undoStack: [...state.undoStack, currentEntry],
        localTables: next.tables,
        isDirty: true,
        pendingLayoutRestore: next.positions ?? null,
      };
    }),
  clearHistory: () => set({ undoStack: [], redoStack: [] }),
  clearPendingLayoutRestore: () => set({ pendingLayoutRestore: null }),

  // DDL filter
  setDdlIncludedTableIds: (ids) => set({ ddlIncludedTableIds: ids }),

  // Real diagram actions
  setRealTables: (tables) => set({ realTables: tables ?? [] }),
  setRealDiagramId: (id) => set({ realDiagramId: id }),
  setRealSelectedTableId: (id) => set({ realSelectedTableId: id }),
  setRealChangelogOpen: (open) => set({ isRealChangelogOpen: open }),
  setLastRealChangelog: (changelog) => set({ lastRealChangelog: changelog }),

  // Cascade simulation
  setCascadeSimulation: (result) => set({ cascadeSimulation: result }),
  clearCascadeSimulation: () => set({ cascadeSimulation: null }),
}));
