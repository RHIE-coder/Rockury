import { create } from 'zustand';

interface QueryTab {
  id: string;
  name: string;
  sql: string;
}

interface QueryStoreState {
  activeTabId: string | null;
  tabs: QueryTab[];
  selectedConnectionId: string | null;
}

interface QueryStoreActions {
  setSelectedConnectionId: (id: string | null) => void;
  setActiveTabId: (id: string) => void;
  addTab: (tab?: Partial<QueryTab>) => void;
  removeTab: (id: string) => void;
  updateTabSql: (id: string, sql: string) => void;
  updateTabName: (id: string, name: string) => void;
}

let tabCounter = 0;

function createTab(partial?: Partial<QueryTab>): QueryTab {
  tabCounter++;
  return {
    id: `tab-${Date.now()}-${tabCounter}`,
    name: partial?.name ?? `Query ${tabCounter}`,
    sql: partial?.sql ?? '',
  };
}

export const useQueryStore = create<QueryStoreState & QueryStoreActions>((set) => {
  const initialTab = createTab();
  return {
    activeTabId: initialTab.id,
    tabs: [initialTab],
    selectedConnectionId: null,

    setSelectedConnectionId: (id) => set({ selectedConnectionId: id }),

    setActiveTabId: (id) => set({ activeTabId: id }),

    addTab: (partial) => {
      const tab = createTab(partial);
      set((state) => ({
        tabs: [...state.tabs, tab],
        activeTabId: tab.id,
      }));
    },

    removeTab: (id) =>
      set((state) => {
        const newTabs = state.tabs.filter((t) => t.id !== id);
        if (newTabs.length === 0) {
          const tab = createTab();
          return { tabs: [tab], activeTabId: tab.id };
        }
        const newActiveId =
          state.activeTabId === id ? newTabs[newTabs.length - 1].id : state.activeTabId;
        return { tabs: newTabs, activeTabId: newActiveId };
      }),

    updateTabSql: (id, sql) =>
      set((state) => ({
        tabs: state.tabs.map((t) => (t.id === id ? { ...t, sql } : t)),
      })),

    updateTabName: (id, name) =>
      set((state) => ({
        tabs: state.tabs.map((t) => (t.id === id ? { ...t, name } : t)),
      })),
  };
});
