import { getElectronApi } from '@/shared/api/electronApi';

const api = getElectronApi();

export const driftApi = {
  lightweightCheck: (args: { connectionId: string }) =>
    api.DRIFT_LIGHTWEIGHT_CHECK(args),
  fullCheck: (args: { connectionId: string }) =>
    api.DRIFT_FULL_CHECK(args),
};
