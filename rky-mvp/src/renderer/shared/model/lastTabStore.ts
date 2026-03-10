import { create } from 'zustand';

/**
 * Stores the last visited sub-tab path for each area that has tabs.
 * Used to restore the last tab when navigating back to an area.
 */
interface LastTabState {
  /** area root path → last visited full path */
  lastTabs: Record<string, string>;
  setLastTab: (areaRoot: string, fullPath: string) => void;
}

export const useLastTabStore = create<LastTabState>((set) => ({
  lastTabs: {},
  setLastTab: (areaRoot, fullPath) =>
    set((s) => ({ lastTabs: { ...s.lastTabs, [areaRoot]: fullPath } })),
}));
