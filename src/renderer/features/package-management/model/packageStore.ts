import { create } from 'zustand';

interface PackageStoreState {
  activePackageId: string | null;
  isFormOpen: boolean;
  editingPackageId: string | null;
}

interface PackageStoreActions {
  setActivePackageId: (id: string | null) => void;
  openForm: (editingId?: string | null) => void;
  closeForm: () => void;
}

export const usePackageStore = create<PackageStoreState & PackageStoreActions>((set) => ({
  activePackageId: null,
  isFormOpen: false,
  editingPackageId: null,

  setActivePackageId: (id) => set({ activePackageId: id }),
  openForm: (editingId = null) => set({ isFormOpen: true, editingPackageId: editingId }),
  closeForm: () => set({ isFormOpen: false, editingPackageId: null }),
}));
