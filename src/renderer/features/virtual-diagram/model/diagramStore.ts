import { create } from 'zustand';

type TDiagramTab = 'virtual' | 'real' | 'diff';

interface DiagramStoreState {
  selectedDiagramId: string | null;
  selectedTableId: string | null;
  selectedColumnId: string | null;
  isDdlEditorOpen: boolean;
  activeTab: TDiagramTab;
}

interface DiagramStoreActions {
  setSelectedDiagramId: (id: string | null) => void;
  setSelectedTableId: (id: string | null) => void;
  setSelectedColumnId: (id: string | null) => void;
  toggleDdlEditor: () => void;
  setDdlEditorOpen: (open: boolean) => void;
  setActiveTab: (tab: TDiagramTab) => void;
}

export const useDiagramStore = create<DiagramStoreState & DiagramStoreActions>((set) => ({
  selectedDiagramId: null,
  selectedTableId: null,
  selectedColumnId: null,
  isDdlEditorOpen: false,
  activeTab: 'virtual',

  setSelectedDiagramId: (id) => set({ selectedDiagramId: id }),
  setSelectedTableId: (id) => set({ selectedTableId: id }),
  setSelectedColumnId: (id) => set({ selectedColumnId: id }),
  toggleDdlEditor: () => set((state) => ({ isDdlEditorOpen: !state.isDdlEditorOpen })),
  setDdlEditorOpen: (open) => set({ isDdlEditorOpen: open }),
  setActiveTab: (tab) => set({ activeTab: tab }),
}));
