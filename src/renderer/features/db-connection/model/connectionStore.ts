import { create } from 'zustand';

interface ConnectionStoreState {
  selectedConnectionId: string | null;
  isFormOpen: boolean;
  editingConnectionId: string | null;
}

interface ConnectionStoreActions {
  setSelectedConnectionId: (id: string | null) => void;
  openForm: (editingId?: string | null) => void;
  closeForm: () => void;
}

export const useConnectionStore = create<ConnectionStoreState & ConnectionStoreActions>((set) => ({
  selectedConnectionId: null,
  isFormOpen: false,
  editingConnectionId: null,

  setSelectedConnectionId: (id) => set({ selectedConnectionId: id }),
  openForm: (editingId = null) => set({ isFormOpen: true, editingConnectionId: editingId }),
  closeForm: () => set({ isFormOpen: false, editingConnectionId: null }),
}));
