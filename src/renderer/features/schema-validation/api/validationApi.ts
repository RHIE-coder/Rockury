import { getElectronApi } from '@/shared/api/electronApi';

const api = getElectronApi();

export const validationApi = {
  run: (args: { virtualDiagramId: string; connectionId: string }) =>
    api.VALIDATION_RUN(args),
};
