import { useState, useCallback } from 'react';
import { queryApi } from '@/features/query-execution/api/queryApi';
import { queryBrowserApi } from '../api/queryBrowserApi';
import { isDdl } from '../lib/ddlDetection';
import type { IQueryResult } from '~/shared/types/db';

interface TxState {
  txId: string;
  dmlType: string;
  affectedRows: number;
}

export function useQueryExecution(connectionId: string) {
  const [result, setResult] = useState<IQueryResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [txState, setTxState] = useState<TxState | null>(null);
  const [isDdlWarning, setIsDdlWarning] = useState(false);

  const execute = useCallback(async (sql: string) => {
    setError(null);
    setResult(null);
    setTxState(null);
    setIsDdlWarning(false);
    setIsLoading(true);

    try {
      if (isDdl(sql)) {
        const res = await queryApi.execute({ connectionId, sql });
        if (!res.success) throw new Error((res as any).error ?? 'DDL execution failed');
        setResult(res.data ?? null);
        setIsDdlWarning(true);
        return;
      }

      // Detect DML after stripping leading comments
      const trimmed = sql.replace(/^\s*(--[^\n]*\n|\/\*[\s\S]*?\*\/\s*)*/g, '').trim();
      const isDml = /^(INSERT|UPDATE|DELETE)\s/i.test(trimmed);

      if (isDml) {
        const beginRes = await queryBrowserApi.txBegin(connectionId);
        if (!beginRes.success) throw new Error(beginRes.error ?? 'Failed to begin transaction');
        const txId = beginRes.data!.txId;

        const execRes = await queryBrowserApi.txExecute(txId, sql);
        if (!execRes.success) {
          await queryBrowserApi.txRollback(txId).catch(() => {});
          throw new Error(execRes.error ?? 'DML execution failed');
        }

        const dmlType = trimmed.split(/\s/)[0].toUpperCase();
        setTxState({
          txId,
          dmlType,
          affectedRows: execRes.data?.affectedRows ?? 0,
        });
        setResult(execRes.data ?? null);
      } else {
        // SELECT or other read queries
        const res = await queryApi.execute({ connectionId, sql });
        if (!res.success) throw new Error((res as any).error ?? 'Query failed');
        setResult(res.data ?? null);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, [connectionId]);

  const confirm = useCallback(async () => {
    if (!txState) return;
    try {
      const res = await queryBrowserApi.txCommit(txState.txId);
      if (!res.success) throw new Error(res.error ?? 'Commit failed');
      setTxState(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [txState]);

  const rollback = useCallback(async () => {
    if (!txState) return;
    try {
      const res = await queryBrowserApi.txRollback(txState.txId);
      if (!res.success) throw new Error(res.error ?? 'Rollback failed');
      setTxState(null);
      setResult(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [txState]);

  const dismissError = useCallback(() => setError(null), []);

  return {
    result,
    error,
    isLoading,
    txState,
    isDdlWarning,
    execute,
    confirm,
    rollback,
    dismissError,
  };
}
