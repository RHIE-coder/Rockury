import { create } from 'zustand';

export type TQueryBrowserTab = 'query' | 'collection' | 'history';

interface QueryBrowserState {
  activeTab: TQueryBrowserTab;
  selectedQueryId: string | null;
  selectedCollectionId: string | null;
  historyDrawerOpen: boolean;

  setActiveTab: (tab: TQueryBrowserTab) => void;
  setSelectedQueryId: (id: string | null) => void;
  setSelectedCollectionId: (id: string | null) => void;
  setHistoryDrawerOpen: (open: boolean) => void;
}

export const useQueryBrowserStore = create<QueryBrowserState>((set) => ({
  activeTab: 'query',
  selectedQueryId: null,
  selectedCollectionId: null,
  historyDrawerOpen: false,

  setActiveTab: (tab) => set({ activeTab: tab }),
  setSelectedQueryId: (id) => set({ selectedQueryId: id }),
  setSelectedCollectionId: (id) => set({ selectedCollectionId: id }),
  setHistoryDrawerOpen: (open) => set({ historyDrawerOpen: open }),
}));
