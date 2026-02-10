import { create } from 'zustand';
import type { IDiagramFilter, ISearchResult, ITable, ISchemaChangelog } from '~/shared/types/db';

export type TDiagramTab = 'virtual' | 'real' | 'diff';
export type TViewMode = 'canvas' | 'ddl';

export const DEFAULT_FILTER: IDiagramFilter = {
  showColumns: true,
  showDataTypes: true,
  showKeyIcons: true,
  showNullable: true,
  showComments: false,
  showConstraints: false,
  preset: 'full',
};

export const FILTER_PRESETS: Record<string, Partial<IDiagramFilter>> = {
  compact: {
    showColumns: false,
    showDataTypes: false,
    showKeyIcons: false,
    showNullable: false,
    showComments: false,
    showConstraints: false,
  },
  full: {
    showColumns: true,
    showDataTypes: true,
    showKeyIcons: true,
    showNullable: true,
    showComments: true,
    showConstraints: true,
  },
};

interface DiagramStoreState {
  selectedDiagramId: string | null;
  selectedTableId: string | null;
  selectedColumnId: string | null;
  isDdlEditorOpen: boolean;
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

  // Right panel mode
  rightPanelMode: 'detail' | 'compare';
  compareTargetDiagramId: string | null;

  // Real diagram persisted state
  realTables: ITable[];
  realDiagramId: string | null;
  realSelectedTableId: string | null;
  isRealChangelogOpen: boolean;
  lastRealChangelog: ISchemaChangelog | null;
}

interface DiagramStoreActions {
  setSelectedDiagramId: (id: string | null) => void;
  setSelectedTableId: (id: string | null) => void;
  setSelectedColumnId: (id: string | null) => void;
  toggleDdlEditor: () => void;
  setDdlEditorOpen: (open: boolean) => void;
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

  // Right panel mode
  setRightPanelMode: (mode: 'detail' | 'compare') => void;
  setCompareTargetDiagramId: (id: string | null) => void;

  // Real diagram actions
  setRealTables: (tables: ITable[]) => void;
  setRealDiagramId: (id: string | null) => void;
  setRealSelectedTableId: (id: string | null) => void;
  setRealChangelogOpen: (open: boolean) => void;
  setLastRealChangelog: (changelog: ISchemaChangelog | null) => void;
}

export const useDiagramStore = create<DiagramStoreState & DiagramStoreActions>((set) => ({
  selectedDiagramId: null,
  selectedTableId: null,
  selectedColumnId: null,
  isDdlEditorOpen: false,
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

  // Right panel mode
  rightPanelMode: 'detail',
  compareTargetDiagramId: null,

  // Real diagram persisted state
  realTables: [],
  realDiagramId: null,
  realSelectedTableId: null,
  isRealChangelogOpen: false,
  lastRealChangelog: null,

  setSelectedDiagramId: (id) => set({ selectedDiagramId: id }),
  setSelectedTableId: (id) =>
    set({ selectedTableId: id, isRightPanelOpen: id !== null }),
  setSelectedColumnId: (id) => set({ selectedColumnId: id }),
  toggleDdlEditor: () => set((state) => ({ isDdlEditorOpen: !state.isDdlEditorOpen })),
  setDdlEditorOpen: (open) => set({ isDdlEditorOpen: open }),
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

  // Right panel mode
  setRightPanelMode: (mode) => set({ rightPanelMode: mode }),
  setCompareTargetDiagramId: (id) => set({ compareTargetDiagramId: id }),

  // Real diagram actions
  setRealTables: (tables) => set({ realTables: tables }),
  setRealDiagramId: (id) => set({ realDiagramId: id }),
  setRealSelectedTableId: (id) => set({ realSelectedTableId: id }),
  setRealChangelogOpen: (open) => set({ isRealChangelogOpen: open }),
  setLastRealChangelog: (changelog) => set({ lastRealChangelog: changelog }),
}));
