import { create } from 'zustand';
import type { TPageSize } from './useDataQuery';
import type { IFilter } from './sqlBuilder';
import type { VisibilityState } from '@tanstack/react-table';

interface DataBrowserState {
  tableName: string;
  page: number;
  pageSize: TPageSize;
  orderBy: { column: string; direction: 'ASC' | 'DESC' } | null;
  filters: IFilter[];
  columnVisibility: VisibilityState;

  setTableName: (name: string) => void;
  setPage: (page: number) => void;
  setPageSize: (size: TPageSize) => void;
  setOrderBy: (orderBy: DataBrowserState['orderBy']) => void;
  setFilters: (filters: IFilter[]) => void;
  setColumnVisibility: (vis: VisibilityState) => void;
  resetForTable: (name: string) => void;
}

export const useDataBrowserStore = create<DataBrowserState>((set, get) => ({
  tableName: '',
  page: 0,
  pageSize: 50,
  orderBy: null,
  filters: [],
  columnVisibility: {},

  setTableName: (name) => set({ tableName: name }),
  setPage: (page) => set({ page }),
  setPageSize: (size) => set({ pageSize: size, page: 0 }),
  setOrderBy: (orderBy) => set({ orderBy }),
  setFilters: (filters) => set({ filters, page: 0 }),
  setColumnVisibility: (vis) => set({ columnVisibility: vis }),
  resetForTable: (name) =>
    set({
      tableName: name,
      page: 0,
      orderBy: null,
      filters: [],
      columnVisibility: {},
    }),
}));
