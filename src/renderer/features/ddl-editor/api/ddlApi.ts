import { getElectronApi } from '@/shared/api/electronApi';
import type { ITable } from '@/entities/table';
import type { TDbType } from '@/entities/connection';

const api = getElectronApi();

export const ddlApi = {
  parse: (args: { ddl: string; dbType: TDbType }) => api.DDL_PARSE(args),
  generate: (args: { tables: ITable[]; dbType: TDbType }) => api.DDL_GENERATE(args),
};
