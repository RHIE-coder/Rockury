import { getElectronApi } from '@/shared/api/electronApi';

const api = getElectronApi();

export const diffApi = {
  compare: (args: { virtualDiagramId: string; connectionId: string }) =>
    api.SCHEMA_DIFF(args),
  compareVirtual: (args: { sourceDiagramId: string; targetDiagramId: string }) =>
    api.SCHEMA_DIFF_VIRTUAL(args),
  applyRealToVirtual: (args: { virtualDiagramId: string; connectionId: string }) =>
    api.SCHEMA_APPLY_REAL_TO_VIRTUAL(args),
};
