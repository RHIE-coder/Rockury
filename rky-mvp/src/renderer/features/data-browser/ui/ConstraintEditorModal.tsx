import { useState, useMemo, useCallback } from 'react';
import { AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/shared/components/ui/dialog';
import { Button } from '@/shared/components/ui/button';
import { HighlightedSql } from '@/shared/lib/sqlHighlight';
import type { TConstraintType, TDbType, IConstraint, ITable } from '~/shared/types/db';
import {
  buildAddConstraintSql,
  buildRenameConstraintSql,
  buildDropConstraintSql,
  buildAlterFkActionsSql,
  buildAlterCheckSql,
  buildAlterColumnsSql,
  buildDropNotNullSql,
  buildValidationQuery,
  buildRestoreConstraintSql,
  FK_ACTIONS,
} from '../lib/constraintSql';
import type { IConstraintDef, IValidationQuery } from '../lib/constraintSql';

type TFkAction = 'CASCADE' | 'SET NULL' | 'SET DEFAULT' | 'RESTRICT' | 'NO ACTION' | undefined;

// ─── Mode types ───

export type TConstraintEditMode =
  | { kind: 'add' }
  | { kind: 'rename'; constraint: IConstraint }
  | { kind: 'editColumns'; constraint: IConstraint }
  | { kind: 'editFk'; constraint: IConstraint }
  | { kind: 'editCheck'; constraint: IConstraint }
  | { kind: 'drop'; constraint: IConstraint };

// ─── Execution result ───

export interface IConstraintExecResult {
  success: boolean;
  /** Populated on failure */
  error?: string;
  /** If rollback was attempted */
  rolledBack?: boolean;
  rollbackError?: string;
}

interface ConstraintEditorModalProps {
  open: boolean;
  mode: TConstraintEditMode;
  tableName: string;
  dbType: TDbType;
  tableColumns: string[];
  allTables: ITable[];
  onExecute: (sqlStatements: string[], rollbackSql?: string) => Promise<IConstraintExecResult>;
  onValidate: (sql: string) => Promise<{ rows: Record<string, unknown>[]; columns: string[] } | null>;
  onClose: () => void;
}

// ─── Shared helpers ───

function LabeledInput({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}

const inputCls = 'rounded border border-border bg-background px-2 py-1.5 text-xs outline-none focus:border-primary';
const selectCls = 'rounded border border-border bg-background px-2 py-1.5 text-xs outline-none focus:border-primary';

const CONSTRAINT_TYPES: TConstraintType[] = ['PK', 'FK', 'UK', 'IDX', 'CHECK', 'NOT_NULL'];

// ─── Violation panel ───

interface IViolationState {
  status: 'idle' | 'checking' | 'clean' | 'violated';
  count?: number;
  sampleRows?: Record<string, unknown>[];
  sampleColumns?: string[];
  guidance?: string;
}

function ViolationPanel({ state }: { state: IViolationState }) {
  if (state.status === 'idle') return null;

  if (state.status === 'checking') {
    return (
      <div className="flex items-center gap-2 rounded border border-border bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
        <Loader2 className="size-3.5 animate-spin" />
        Checking data compatibility...
      </div>
    );
  }

  if (state.status === 'clean') {
    return (
      <div className="flex items-center gap-2 rounded border border-green-500/30 bg-green-500/5 px-3 py-2 text-xs text-green-700 dark:text-green-400">
        <CheckCircle2 className="size-3.5" />
        No data violations found. Safe to proceed.
      </div>
    );
  }

  // violated
  return (
    <div className="rounded border border-amber-500/30 bg-amber-500/5 px-3 py-2">
      <div className="flex items-center gap-2 text-xs font-medium text-amber-700 dark:text-amber-400">
        <AlertTriangle className="size-3.5" />
        {state.count} violating row{state.count !== 1 ? 's' : ''} found
      </div>

      {state.guidance && (
        <pre className="mt-2 whitespace-pre-wrap break-words text-[11px] leading-relaxed text-muted-foreground">
          {state.guidance}
        </pre>
      )}

      {state.sampleRows && state.sampleRows.length > 0 && state.sampleColumns && (
        <div className="mt-2 max-h-[120px] overflow-auto rounded border border-border">
          <table className="w-full text-[10px]">
            <thead className="sticky top-0 bg-muted text-muted-foreground">
              <tr>
                {state.sampleColumns.map((col) => (
                  <th key={col} className="px-2 py-0.5 text-left font-medium">{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {state.sampleRows.map((row, i) => (
                <tr key={i} className="border-t border-border/30">
                  {state.sampleColumns!.map((col) => (
                    <td key={col} className="max-w-[120px] truncate px-2 py-0.5 font-mono">
                      {row[col] === null ? <span className="text-muted-foreground/50">NULL</span> : String(row[col])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Execution error panel ───

function ExecErrorPanel({ result }: { result: IConstraintExecResult }) {
  return (
    <div className="rounded border border-destructive/30 bg-destructive/5 px-3 py-2">
      <p className="text-xs font-medium text-destructive">Execution failed</p>
      <pre className="mt-1 whitespace-pre-wrap break-words text-[11px] leading-relaxed text-destructive/80">
        {result.error}
      </pre>
      {result.rolledBack && (
        <p className="mt-2 text-[11px] text-green-700 dark:text-green-400">
          <CheckCircle2 className="mr-1 inline size-3" />
          Original constraint was automatically restored.
        </p>
      )}
      {result.rollbackError && (
        <p className="mt-2 text-[11px] text-destructive">
          <AlertTriangle className="mr-1 inline size-3" />
          Rollback failed: {result.rollbackError}
          <br />
          You may need to manually re-add the constraint.
        </p>
      )}
    </div>
  );
}

// ─── Main component ───

export function ConstraintEditorModal({
  open,
  mode,
  tableName,
  dbType,
  tableColumns,
  allTables,
  onExecute,
  onValidate,
  onClose,
}: ConstraintEditorModalProps) {
  // ─── Add mode state ───
  const [addType, setAddType] = useState<TConstraintType>('UK');
  const [addName, setAddName] = useState('');
  const [addColumns, setAddColumns] = useState<string[]>([]);
  const [addRefTable, setAddRefTable] = useState('');
  const [addRefColumn, setAddRefColumn] = useState('');
  const [addOnDelete, setAddOnDelete] = useState<TFkAction>(undefined);
  const [addOnUpdate, setAddOnUpdate] = useState<TFkAction>(undefined);
  const [addCheckExpr, setAddCheckExpr] = useState('');

  // ─── Rename mode state ───
  const [newName, setNewName] = useState(() =>
    mode.kind === 'rename' ? mode.constraint.name : '',
  );

  // ─── Edit FK mode state ───
  const [fkOnDelete, setFkOnDelete] = useState<TFkAction>(() =>
    mode.kind === 'editFk' ? mode.constraint.reference?.onDelete : undefined,
  );
  const [fkOnUpdate, setFkOnUpdate] = useState<TFkAction>(() =>
    mode.kind === 'editFk' ? mode.constraint.reference?.onUpdate : undefined,
  );

  // ─── Edit Columns mode state (PK, UK, IDX) ───
  const [editCols, setEditCols] = useState<string[]>(() => {
    if (mode.kind === 'editColumns') {
      const c = mode.constraint.columns;
      return Array.isArray(c) ? [...c] : [String(c)];
    }
    return [];
  });

  // ─── Edit CHECK mode state ───
  const [checkExpr, setCheckExpr] = useState(() =>
    mode.kind === 'editCheck' ? mode.constraint.checkExpression ?? '' : '',
  );

  // ─── UI state ───
  const [isExecuting, setIsExecuting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [violation, setViolation] = useState<IViolationState>({ status: 'idle' });
  const [execResult, setExecResult] = useState<IConstraintExecResult | null>(null);

  // Available columns for reference table (FK)
  const refTableColumns = useMemo(() => {
    const target = mode.kind === 'add' ? addRefTable : '';
    const t = allTables.find((tb) => tb.name === target);
    return t?.columns.map((c) => c.name) ?? [];
  }, [allTables, addRefTable, mode.kind]);

  // ─── Build current constraint def (for validation) ───
  function getCurrentDef(): IConstraintDef | null {
    if (mode.kind === 'add') {
      return {
        type: addType,
        name: addName,
        columns: addColumns,
        ...(addType === 'FK' && {
          reference: { table: addRefTable, column: addRefColumn, onDelete: addOnDelete, onUpdate: addOnUpdate },
        }),
        ...(addType === 'CHECK' && { checkExpression: addCheckExpr }),
      };
    }
    if (mode.kind === 'editColumns') {
      return { type: mode.constraint.type, name: mode.constraint.name, columns: editCols };
    }
    if (mode.kind === 'editCheck') {
      return { type: 'CHECK', name: mode.constraint.name, columns: [], checkExpression: checkExpr };
    }
    if (mode.kind === 'editFk' && mode.constraint.reference) {
      const cols = Array.isArray(mode.constraint.columns) ? mode.constraint.columns : [String(mode.constraint.columns)];
      return {
        type: 'FK',
        name: mode.constraint.name,
        columns: cols,
        reference: {
          table: mode.constraint.reference.table,
          column: mode.constraint.reference.column,
          onDelete: fkOnDelete,
          onUpdate: fkOnUpdate,
        },
      };
    }
    return null;
  }

  // ─── SQL generation ───
  function generateSql(): string[] {
    try {
      switch (mode.kind) {
        case 'add': {
          const def = getCurrentDef();
          if (!def) return [];
          return [buildAddConstraintSql(tableName, def, dbType)];
        }
        case 'rename':
          return [buildRenameConstraintSql(tableName, mode.constraint.name, newName, mode.constraint.type, dbType)];
        case 'editColumns':
          return buildAlterColumnsSql(tableName, mode.constraint.name, mode.constraint.type, editCols, dbType);
        case 'editFk': {
          const c = mode.constraint;
          if (!c.reference) return [];
          const cols = Array.isArray(c.columns) ? c.columns : [String(c.columns)];
          return buildAlterFkActionsSql(tableName, c.name, cols, {
            table: c.reference.table,
            column: c.reference.column,
            onDelete: fkOnDelete,
            onUpdate: fkOnUpdate,
          }, dbType);
        }
        case 'editCheck':
          return buildAlterCheckSql(tableName, mode.constraint.name, checkExpr, dbType);
        case 'drop': {
          const c = mode.constraint;
          if (c.type === 'NOT_NULL') {
            const col = Array.isArray(c.columns) ? c.columns[0] : String(c.columns);
            return [buildDropNotNullSql(tableName, col, dbType)];
          }
          return [buildDropConstraintSql(tableName, c.name, c.type, dbType)];
        }
        default:
          return [];
      }
    } catch (e) {
      return [`-- Error: ${(e as Error).message}`];
    }
  }

  // ─── Build rollback SQL for DROP+ADD patterns ───
  function getRollbackSql(): string | undefined {
    // Only needed for multi-statement operations (editFk, editCheck)
    // where DROP happens first and ADD might fail
    if (mode.kind === 'editColumns' || mode.kind === 'editFk' || mode.kind === 'editCheck') {
      const c = mode.constraint;
      return buildRestoreConstraintSql(tableName, c, dbType) ?? undefined;
    }
    return undefined;
  }

  const sqlStatements = showPreview ? generateSql() : [];

  // ─── Pre-validation ───
  const handleValidate = useCallback(async () => {
    const def = getCurrentDef();
    if (!def) return;

    const vq = buildValidationQuery(tableName, def, dbType);
    if (!vq) {
      // No validation possible for this type (IDX, RENAME, etc.)
      setViolation({ status: 'clean' });
      return;
    }

    setViolation({ status: 'checking' });

    try {
      // Run count query
      const countResult = await onValidate(vq.countSql);
      const count = countResult?.rows?.[0]
        ? Number(Object.values(countResult.rows[0])[0])
        : 0;

      if (count === 0) {
        setViolation({ status: 'clean' });
        return;
      }

      // Run sample query
      const sampleResult = await onValidate(vq.sampleSql);

      setViolation({
        status: 'violated',
        count,
        sampleRows: sampleResult?.rows ?? [],
        sampleColumns: sampleResult?.columns ?? [],
        guidance: vq.guidance,
      });
    } catch {
      // If validation query itself fails, allow proceeding
      setViolation({ status: 'clean' });
    }
  }, [tableName, dbType, onValidate, mode, addType, addName, addColumns, addRefTable, addRefColumn, addCheckExpr, checkExpr, fkOnDelete, fkOnUpdate, editCols]);

  // ─── Execute ───
  const handleExecute = async () => {
    const stmts = generateSql();
    if (stmts.length === 0 || stmts[0].startsWith('-- Error')) return;

    setIsExecuting(true);
    setExecResult(null);

    try {
      const rollbackSql = getRollbackSql();
      const result = await onExecute(stmts, rollbackSql);

      if (result.success) {
        onClose();
      } else {
        setExecResult(result);
      }
    } finally {
      setIsExecuting(false);
    }
  };

  // ─── Validation ───
  function isValid(): boolean {
    switch (mode.kind) {
      case 'add':
        if (!addName.trim()) return false;
        if (addType === 'CHECK') return !!addCheckExpr.trim();
        if (addType === 'NOT_NULL') return addColumns.length === 1;
        if (addType === 'FK') return addColumns.length > 0 && !!addRefTable && !!addRefColumn;
        return addColumns.length > 0;
      case 'rename':
        return !!newName.trim() && newName !== mode.constraint.name;
      case 'editColumns': {
        if (editCols.length === 0) return false;
        const orig = Array.isArray(mode.constraint.columns) ? mode.constraint.columns : [String(mode.constraint.columns)];
        return editCols.join(',') !== orig.join(',');
      }
      case 'editFk':
        return true;
      case 'editCheck':
        return !!checkExpr.trim();
      case 'drop':
        return true;
      default:
        return false;
    }
  }

  // Whether this mode needs data validation
  const needsValidation = mode.kind === 'add' || mode.kind === 'editColumns' || mode.kind === 'editFk' || mode.kind === 'editCheck';

  const title = {
    add: 'Add Constraint',
    rename: 'Rename Constraint',
    editColumns: 'Edit Columns',
    editFk: 'Edit FK Actions',
    editCheck: 'Edit CHECK Expression',
    drop: 'Drop Constraint',
  }[mode.kind];

  const toggleColumn = (col: string) => {
    setAddColumns((prev) =>
      prev.includes(col) ? prev.filter((c) => c !== col) : [...prev, col],
    );
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-sm">{title}</DialogTitle>
        </DialogHeader>

        <div className="flex max-h-[60vh] flex-col gap-3 overflow-y-auto py-2">
          {/* ─── ADD ─── */}
          {mode.kind === 'add' && (
            <>
              <LabeledInput label="Type">
                <select
                  className={selectCls}
                  value={addType}
                  onChange={(e) => {
                    setAddType(e.target.value as TConstraintType);
                    setViolation({ status: 'idle' });
                    setExecResult(null);
                  }}
                >
                  {CONSTRAINT_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </LabeledInput>

              <LabeledInput label="Constraint Name">
                <input
                  className={inputCls}
                  value={addName}
                  onChange={(e) => setAddName(e.target.value)}
                  placeholder={`${tableName}_${addType.toLowerCase()}_...`}
                />
              </LabeledInput>

              {addType !== 'CHECK' && (
                <LabeledInput label="Columns">
                  <div className="flex flex-wrap gap-1">
                    {tableColumns.map((col) => (
                      <button
                        key={col}
                        type="button"
                        onClick={() => {
                          toggleColumn(col);
                          setViolation({ status: 'idle' });
                        }}
                        className={`rounded px-1.5 py-0.5 text-[10px] font-medium transition-colors ${
                          addColumns.includes(col)
                            ? 'bg-primary/20 text-primary'
                            : 'bg-muted text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        {col}
                      </button>
                    ))}
                  </div>
                </LabeledInput>
              )}

              {addType === 'FK' && (
                <>
                  <LabeledInput label="Reference Table">
                    <select
                      className={selectCls}
                      value={addRefTable}
                      onChange={(e) => {
                        setAddRefTable(e.target.value);
                        setAddRefColumn('');
                        setViolation({ status: 'idle' });
                      }}
                    >
                      <option value="">Select table...</option>
                      {allTables.map((t) => (
                        <option key={t.name} value={t.name}>{t.name}</option>
                      ))}
                    </select>
                  </LabeledInput>
                  {addRefTable && (
                    <LabeledInput label="Reference Column">
                      <select
                        className={selectCls}
                        value={addRefColumn}
                        onChange={(e) => {
                          setAddRefColumn(e.target.value);
                          setViolation({ status: 'idle' });
                        }}
                      >
                        <option value="">Select column...</option>
                        {refTableColumns.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </LabeledInput>
                  )}
                  <div className="grid grid-cols-2 gap-2">
                    <LabeledInput label="ON DELETE">
                      <select className={selectCls} value={addOnDelete ?? ''} onChange={(e) => setAddOnDelete((e.target.value || undefined) as TFkAction)}>
                        <option value="">Default</option>
                        {FK_ACTIONS.map((a) => <option key={a} value={a}>{a}</option>)}
                      </select>
                    </LabeledInput>
                    <LabeledInput label="ON UPDATE">
                      <select className={selectCls} value={addOnUpdate ?? ''} onChange={(e) => setAddOnUpdate((e.target.value || undefined) as TFkAction)}>
                        <option value="">Default</option>
                        {FK_ACTIONS.map((a) => <option key={a} value={a}>{a}</option>)}
                      </select>
                    </LabeledInput>
                  </div>
                </>
              )}

              {addType === 'CHECK' && (
                <LabeledInput label="Expression">
                  <input
                    className={inputCls}
                    value={addCheckExpr}
                    onChange={(e) => {
                      setAddCheckExpr(e.target.value);
                      setViolation({ status: 'idle' });
                    }}
                    placeholder="e.g. age > 0 AND age < 200"
                  />
                </LabeledInput>
              )}
            </>
          )}

          {/* ─── RENAME ─── */}
          {mode.kind === 'rename' && (
            <>
              <LabeledInput label="Current Name">
                <input className={inputCls} value={mode.constraint.name} disabled />
              </LabeledInput>
              <LabeledInput label="New Name">
                <input
                  className={inputCls}
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
              </LabeledInput>
            </>
          )}

          {/* ─── EDIT COLUMNS (PK, UK, IDX) ─── */}
          {mode.kind === 'editColumns' && (
            <>
              <div className="rounded bg-muted px-2 py-1.5 text-xs">
                <span className={`mr-1.5 rounded px-1.5 py-0.5 text-[9px] font-bold leading-none ${
                  mode.constraint.type === 'PK' ? 'bg-amber-500/20 text-amber-700 dark:text-amber-400'
                    : mode.constraint.type === 'UK' ? 'bg-green-500/20 text-green-700 dark:text-green-400'
                    : 'bg-purple-500/20 text-purple-700 dark:text-purple-400'
                }`}>{mode.constraint.type}</span>
                <span className="font-mono">{mode.constraint.name}</span>
              </div>

              <LabeledInput label="Columns (click to add, drag to reorder)">
                {/* Selected columns — reorderable */}
                <div className="flex flex-col gap-1">
                  {editCols.map((col, idx) => (
                    <div key={col} className="flex items-center gap-1">
                      <span className="w-4 text-center text-[9px] text-muted-foreground">{idx + 1}</span>
                      <span className="flex-1 rounded bg-primary/10 px-2 py-1 font-mono text-[11px] text-primary">
                        {col}
                      </span>
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => {
                          const next = [...editCols];
                          [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
                          setEditCols(next);
                          setViolation({ status: 'idle' });
                        }}
                        className="rounded px-1 py-0.5 text-[9px] text-muted-foreground hover:bg-muted disabled:opacity-30"
                      >
                        ▲
                      </button>
                      <button
                        type="button"
                        disabled={idx === editCols.length - 1}
                        onClick={() => {
                          const next = [...editCols];
                          [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
                          setEditCols(next);
                          setViolation({ status: 'idle' });
                        }}
                        className="rounded px-1 py-0.5 text-[9px] text-muted-foreground hover:bg-muted disabled:opacity-30"
                      >
                        ▼
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditCols((prev) => prev.filter((c) => c !== col));
                          setViolation({ status: 'idle' });
                        }}
                        className="rounded px-1 py-0.5 text-[9px] text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>

                {/* Available columns to add */}
                {tableColumns.filter((c) => !editCols.includes(c)).length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {tableColumns
                      .filter((c) => !editCols.includes(c))
                      .map((col) => (
                        <button
                          key={col}
                          type="button"
                          onClick={() => {
                            setEditCols((prev) => [...prev, col]);
                            setViolation({ status: 'idle' });
                          }}
                          className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground transition-colors hover:text-foreground"
                        >
                          + {col}
                        </button>
                      ))}
                  </div>
                )}
              </LabeledInput>
            </>
          )}

          {/* ─── EDIT FK ─── */}
          {mode.kind === 'editFk' && mode.constraint.reference && (
            <>
              <div className="rounded bg-muted px-2 py-1.5 text-xs">
                <span className="font-mono">{mode.constraint.name}</span>
                <span className="text-muted-foreground"> → {mode.constraint.reference.table}.{mode.constraint.reference.column}</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <LabeledInput label="ON DELETE">
                  <select className={selectCls} value={fkOnDelete ?? ''} onChange={(e) => setFkOnDelete((e.target.value || undefined) as TFkAction)}>
                    <option value="">Default</option>
                    {FK_ACTIONS.map((a) => <option key={a} value={a}>{a}</option>)}
                  </select>
                </LabeledInput>
                <LabeledInput label="ON UPDATE">
                  <select className={selectCls} value={fkOnUpdate ?? ''} onChange={(e) => setFkOnUpdate((e.target.value || undefined) as TFkAction)}>
                    <option value="">Default</option>
                    {FK_ACTIONS.map((a) => <option key={a} value={a}>{a}</option>)}
                  </select>
                </LabeledInput>
              </div>
            </>
          )}

          {/* ─── EDIT CHECK ─── */}
          {mode.kind === 'editCheck' && (
            <>
              <LabeledInput label="Constraint">
                <input className={inputCls} value={mode.constraint.name} disabled />
              </LabeledInput>
              <LabeledInput label="Expression">
                <input
                  className={inputCls}
                  value={checkExpr}
                  onChange={(e) => {
                    setCheckExpr(e.target.value);
                    setViolation({ status: 'idle' });
                  }}
                />
              </LabeledInput>
            </>
          )}

          {/* ─── DROP ─── */}
          {mode.kind === 'drop' && (
            <div className="rounded border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs">
              <p className="font-medium text-destructive">
                Drop constraint <span className="font-mono">{mode.constraint.name}</span> ({mode.constraint.type})?
              </p>
              <p className="mt-1 text-muted-foreground">This action cannot be undone.</p>
            </div>
          )}

          {/* ─── Violation check result ─── */}
          <ViolationPanel state={violation} />

          {/* ─── Execution error ─── */}
          {execResult && !execResult.success && <ExecErrorPanel result={execResult} />}

          {/* ─── SQL Preview ─── */}
          {showPreview && sqlStatements.length > 0 && (
            <div className="rounded border border-border bg-muted/50 p-2">
              <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">SQL Preview</p>
              {sqlStatements.map((sql, i) => (
                <pre key={i} className="whitespace-pre-wrap break-all font-mono text-[11px] leading-relaxed">
                  <HighlightedSql sql={sql} />
                </pre>
              ))}
            </div>
          )}
        </div>

        <DialogFooter className="flex items-center justify-between gap-2">
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowPreview((v) => !v)}
              className="text-xs"
            >
              {showPreview ? 'Hide SQL' : 'Preview SQL'}
            </Button>
            {needsValidation && isValid() && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleValidate}
                disabled={violation.status === 'checking'}
                className="text-xs"
              >
                {violation.status === 'checking' ? 'Checking...' : 'Check Data'}
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={onClose} className="text-xs">
              Cancel
            </Button>
            <Button
              variant={mode.kind === 'drop' ? 'destructive' : 'default'}
              size="sm"
              disabled={!isValid() || isExecuting}
              onClick={handleExecute}
              className="text-xs"
            >
              {isExecuting
                ? 'Executing...'
                : violation.status === 'violated'
                  ? 'Execute Anyway'
                  : mode.kind === 'drop'
                    ? 'Drop'
                    : 'Execute'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
