import { create } from 'zustand';

export type TQueryBrowserTab = 'query' | 'collection' | 'history';

const SCHEMA_PANEL_STORAGE_KEY = 'qb-schema-panel-open';

interface QueryBrowserState {
  activeTab: TQueryBrowserTab;
  selectedQueryId: string | null;
  selectedCollectionId: string | null;
  historyDrawerOpen: boolean;
  schemaPanelOpen: boolean;

  setActiveTab: (tab: TQueryBrowserTab) => void;
  setSelectedQueryId: (id: string | null) => void;
  setSelectedCollectionId: (id: string | null) => void;
  setHistoryDrawerOpen: (open: boolean) => void;
  setSchemaPanelOpen: (open: boolean) => void;
}

export const useQueryBrowserStore = create<QueryBrowserState>((set) => ({
  activeTab: 'query',
  selectedQueryId: null,
  selectedCollectionId: null,
  historyDrawerOpen: false,
  schemaPanelOpen: localStorage.getItem(SCHEMA_PANEL_STORAGE_KEY) === 'true',

  setActiveTab: (tab) => set({ activeTab: tab }),
  setSelectedQueryId: (id) => set({ selectedQueryId: id }),
  setSelectedCollectionId: (id) => set({ selectedCollectionId: id }),
  setHistoryDrawerOpen: (open) => set({ historyDrawerOpen: open }),
  setSchemaPanelOpen: (open) => {
    localStorage.setItem(SCHEMA_PANEL_STORAGE_KEY, String(open));
    set({ schemaPanelOpen: open });
  },
}));
