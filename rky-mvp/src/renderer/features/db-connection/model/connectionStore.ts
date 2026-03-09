import { create } from 'zustand';
import type { TConnectionStatus } from '@/entities/connection';

interface ConnectionStoreState {
  selectedConnectionId: string | null;
  isFormOpen: boolean;
  editingConnectionId: string | null;
  statusMap: Record<string, TConnectionStatus>;
}

interface ConnectionStoreActions {
  setSelectedConnectionId: (id: string | null) => void;
  openForm: (editingId?: string | null) => void;
  closeForm: () => void;
  setStatus: (id: string, status: TConnectionStatus) => void;
}

export const useConnectionStore = create<ConnectionStoreState & ConnectionStoreActions>((set) => ({
  selectedConnectionId: null,
  isFormOpen: false,
  editingConnectionId: null,
  statusMap: {},

  setSelectedConnectionId: (id) => set({ selectedConnectionId: id }),
  openForm: (editingId = null) => set({ isFormOpen: true, editingConnectionId: editingId }),
  closeForm: () => set({ isFormOpen: false, editingConnectionId: null }),
  setStatus: (id, status) => set((s) => ({ statusMap: { ...s.statusMap, [id]: status } })),
}));
