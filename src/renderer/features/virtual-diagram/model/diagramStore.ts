import { create } from 'zustand';
import type { IDiagramFilter, ISearchResult } from '~/shared/types/db';

export type TDiagramTab = 'virtual' | 'real' | 'diff';

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

  isLeftPanelOpen: boolean;
  isRightPanelOpen: boolean;

  isSearchOpen: boolean;
  searchQuery: string;
  searchResults: ISearchResult[];

  filter: IDiagramFilter;

  changeSource: 'canvas' | 'ddl' | 'external' | null;

  selectedConnectionId: string | null;
}

interface DiagramStoreActions {
  setSelectedDiagramId: (id: string | null) => void;
  setSelectedTableId: (id: string | null) => void;
  setSelectedColumnId: (id: string | null) => void;
  toggleDdlEditor: () => void;
  setDdlEditorOpen: (open: boolean) => void;
  setActiveTab: (tab: TDiagramTab) => void;

  toggleLeftPanel: () => void;
  toggleRightPanel: () => void;
  setSearchOpen: (open: boolean) => void;
  setSearchQuery: (query: string) => void;
  setSearchResults: (results: ISearchResult[]) => void;
  setFilter: (filter: Partial<IDiagramFilter>) => void;
  setFilterPreset: (preset: IDiagramFilter['preset']) => void;
  setChangeSource: (source: DiagramStoreState['changeSource']) => void;
  setSelectedConnectionId: (id: string | null) => void;
}

export const useDiagramStore = create<DiagramStoreState & DiagramStoreActions>((set) => ({
  selectedDiagramId: null,
  selectedTableId: null,
  selectedColumnId: null,
  isDdlEditorOpen: false,
  activeTab: 'virtual',

  isLeftPanelOpen: true,
  isRightPanelOpen: false,

  isSearchOpen: false,
  searchQuery: '',
  searchResults: [],

  filter: DEFAULT_FILTER,

  changeSource: null,

  selectedConnectionId: null,

  setSelectedDiagramId: (id) => set({ selectedDiagramId: id }),
  setSelectedTableId: (id) =>
    set({ selectedTableId: id, isRightPanelOpen: id !== null }),
  setSelectedColumnId: (id) => set({ selectedColumnId: id }),
  toggleDdlEditor: () => set((state) => ({ isDdlEditorOpen: !state.isDdlEditorOpen })),
  setDdlEditorOpen: (open) => set({ isDdlEditorOpen: open }),
  setActiveTab: (tab) => set({ activeTab: tab }),

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
}));
