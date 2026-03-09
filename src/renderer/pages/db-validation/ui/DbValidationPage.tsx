import { useState, useCallback } from 'react';
import {
  ShieldCheck,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Plus,
  Trash2,
  ChevronDown,
  ChevronRight,
  Play,
  Pencil,
  Code,
  Table2,
  FileText,
} from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/shared/components/ui/button';
import { Select } from '@/shared/components/ui/select';
import { ValidationRunner, ValidationReport } from '@/features/schema-validation';
import {
  useValidationSuites,
  useCreateValidationSuite,
  useUpdateValidationSuite,
  useDeleteValidationSuite,
  useRunValidationSuite,
} from '@/features/schema-validation';
import { validationApi } from '@/features/schema-validation/api/validationApi';
import { useConnections } from '@/features/db-connection';
import type {
  IValidationSuite,
  IValidationRule,
  IValidationCheck,
  IValidationReport,
  IValidationRunResult,
  TValidationCheckType,
} from '~/shared/types/db';

// ─── Helpers ───

function generateId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

const CHECK_TYPES: { value: TValidationCheckType; label: string }[] = [
  { value: 'schema', label: 'Schema' },
  { value: 'data', label: 'Data' },
  { value: 'query', label: 'Query' },
  { value: 'fk', label: 'FK' },
];

const OPERATORS = ['=', '!=', '>', '<', '>=', '<=', 'IS NULL', 'IS NOT NULL', 'LIKE', 'IN'] as const;

// ─── CheckEditor ───

function CheckEditor({
  check,
  onUpdate,
  onDelete,
}: {
  check: IValidationCheck;
  onUpdate: (updated: IValidationCheck) => void;
  onDelete: () => void;
}) {
  const isUiMode = !check.expression.trim().toUpperCase().startsWith('SELECT');
  const [mode, setMode] = useState<'sql' | 'ui'>(isUiMode && check.expression.includes('|') ? 'ui' : 'sql');

  // UI condition: "table|column|operator|value"
  const parsedUi = check.expression.includes('|') ? check.expression.split('|') : ['', '', '=', ''];
  const [uiTable, setUiTable] = useState(parsedUi[0] ?? '');
  const [uiColumn, setUiColumn] = useState(parsedUi[1] ?? '');
  const [uiOperator, setUiOperator] = useState(parsedUi[2] ?? '=');
  const [uiValue, setUiValue] = useState(parsedUi[3] ?? '');

  const handleUiChange = (table: string, column: string, operator: string, value: string) => {
    setUiTable(table);
    setUiColumn(column);
    setUiOperator(operator);
    setUiValue(value);
    onUpdate({ ...check, expression: `${table}|${column}|${operator}|${value}` });
  };

  return (
    <div className="rounded border border-border bg-card p-3 space-y-2">
      <div className="flex items-center gap-2">
        {/* Type selector */}
        <Select
          value={check.type}
          onChange={(e) => onUpdate({ ...check, type: e.target.value as TValidationCheckType })}
          className="h-7 w-28 text-xs"
        >
          {CHECK_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </Select>

        {/* Mode toggle */}
        <div className="flex rounded border border-border">
          <button
            onClick={() => setMode('sql')}
            className={`flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium transition-colors ${
              mode === 'sql' ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'
            }`}
          >
            <Code className="size-3" />
            SQL
          </button>
          <button
            onClick={() => setMode('ui')}
            className={`flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium transition-colors ${
              mode === 'ui' ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'
            }`}
          >
            <Table2 className="size-3" />
            Condition
          </button>
        </div>

        <div className="ml-auto">
          <Button variant="ghost" size="icon-xs" onClick={onDelete}>
            <Trash2 className="size-3 text-destructive" />
          </Button>
        </div>
      </div>

      {mode === 'sql' ? (
        <textarea
          value={check.expression}
          onChange={(e) => onUpdate({ ...check, expression: e.target.value })}
          placeholder="SELECT COUNT(*) FROM users WHERE email IS NOT NULL"
          className="w-full resize-none rounded border border-border bg-transparent p-2 font-mono text-xs outline-none focus:border-primary"
          rows={3}
          spellCheck={false}
        />
      ) : (
        <div className="grid grid-cols-4 gap-2">
          <input
            value={uiTable}
            onChange={(e) => handleUiChange(e.target.value, uiColumn, uiOperator, uiValue)}
            placeholder="Table"
            className="rounded border border-border bg-transparent px-2 py-1 text-xs outline-none focus:border-primary"
          />
          <input
            value={uiColumn}
            onChange={(e) => handleUiChange(uiTable, e.target.value, uiOperator, uiValue)}
            placeholder="Column"
            className="rounded border border-border bg-transparent px-2 py-1 text-xs outline-none focus:border-primary"
          />
          <Select
            value={uiOperator}
            onChange={(e) => handleUiChange(uiTable, uiColumn, e.target.value, uiValue)}
            className="h-7 text-xs"
          >
            {OPERATORS.map((op) => (
              <option key={op} value={op}>
                {op}
              </option>
            ))}
          </Select>
          <input
            value={uiValue}
            onChange={(e) => handleUiChange(uiTable, uiColumn, uiOperator, e.target.value)}
            placeholder="Value"
            className="rounded border border-border bg-transparent px-2 py-1 text-xs outline-none focus:border-primary"
          />
        </div>
      )}

      {/* Expected result */}
      <div className="flex items-center gap-2">
        <label className="text-[10px] font-medium text-muted-foreground">Expected</label>
        <input
          value={check.expectedResult ?? ''}
          onChange={(e) => onUpdate({ ...check, expectedResult: e.target.value || undefined })}
          placeholder="e.g., 0, true, non-empty"
          className="flex-1 rounded border border-border bg-transparent px-2 py-1 text-xs outline-none focus:border-primary"
        />
      </div>
    </div>
  );
}

// ─── RuleEditor ───

function RuleEditor({
  rule,
  onUpdate,
  onDelete,
}: {
  rule: IValidationRule;
  onUpdate: (updated: IValidationRule) => void;
  onDelete: () => void;
}) {
  const [isExpanded, setIsExpanded] = useState(true);

  const handleCheckUpdate = (checkId: string, updated: IValidationCheck) => {
    onUpdate({
      ...rule,
      checks: rule.checks.map((c) => (c.id === checkId ? updated : c)),
    });
  };

  const handleCheckDelete = (checkId: string) => {
    onUpdate({
      ...rule,
      checks: rule.checks.filter((c) => c.id !== checkId),
    });
  };

  const handleAddCheck = () => {
    const newCheck: IValidationCheck = {
      id: generateId(),
      ruleId: rule.id,
      type: 'query',
      expression: '',
      expectedResult: undefined,
    };
    onUpdate({ ...rule, checks: [...rule.checks, newCheck] });
  };

  return (
    <div className="rounded-lg border border-border">
      {/* Rule Header */}
      <div className="flex items-center gap-2 border-b border-border px-3 py-2">
        <button onClick={() => setIsExpanded(!isExpanded)} className="text-muted-foreground">
          {isExpanded ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
        </button>
        <input
          value={rule.name}
          onChange={(e) => onUpdate({ ...rule, name: e.target.value })}
          placeholder="Rule name"
          className="flex-1 bg-transparent text-xs font-medium outline-none"
        />
        <span className="text-[10px] text-muted-foreground">{rule.checks.length} checks</span>
        <Button variant="ghost" size="icon-xs" onClick={onDelete}>
          <Trash2 className="size-3 text-destructive" />
        </Button>
      </div>

      {isExpanded && (
        <div className="space-y-2 p-3">
          {/* Rule description */}
          <input
            value={rule.description}
            onChange={(e) => onUpdate({ ...rule, description: e.target.value })}
            placeholder="Rule description (optional)"
            className="w-full rounded border border-border bg-transparent px-2 py-1 text-xs text-muted-foreground outline-none focus:border-primary"
          />

          {/* Checks */}
          {rule.checks.map((check) => (
            <CheckEditor
              key={check.id}
              check={check}
              onUpdate={(updated) => handleCheckUpdate(check.id, updated)}
              onDelete={() => handleCheckDelete(check.id)}
            />
          ))}

          {rule.checks.length === 0 && (
            <p className="py-2 text-center text-xs text-muted-foreground">
              No checks yet. Add a check to define validation logic.
            </p>
          )}

          <Button variant="outline" size="xs" onClick={handleAddCheck} className="gap-1">
            <Plus className="size-3" />
            Add Check
          </Button>
        </div>
      )}
    </div>
  );
}

// ─── SuiteDetail ───

function SuiteDetail({
  suite,
  onUpdate,
  onDelete,
}: {
  suite: IValidationSuite;
  onUpdate: (updated: Partial<IValidationSuite> & { id: string }) => void;
  onDelete: () => void;
}) {
  const { data: connections } = useConnections();
  const [suiteConnectionId, setSuiteConnectionId] = useState('');
  const runSuite = useRunValidationSuite();
  const [runResult, setRunResult] = useState<IValidationRunResult | null>(null);

  const handleRuleUpdate = (ruleId: string, updated: IValidationRule) => {
    const newRules = suite.rules.map((r) => (r.id === ruleId ? updated : r));
    onUpdate({ id: suite.id, rules: newRules });
  };

  const handleRuleDelete = (ruleId: string) => {
    const newRules = suite.rules.filter((r) => r.id !== ruleId);
    onUpdate({ id: suite.id, rules: newRules });
  };

  const handleAddRule = () => {
    const newRule: IValidationRule = {
      id: generateId(),
      suiteId: suite.id,
      name: '',
      description: '',
      checks: [],
    };
    onUpdate({ id: suite.id, rules: [...suite.rules, newRule] });
  };

  const handleRun = () => {
    if (!suiteConnectionId) return;
    runSuite.mutate(
      { suiteId: suite.id, connectionId: suiteConnectionId },
      {
        onSuccess: (result) => {
          if (result.success) {
            setRunResult(result.data);
          }
        },
      },
    );
  };

  const totalChecks = suite.rules.reduce((sum, r) => sum + r.checks.length, 0);

  return (
    <div className="space-y-4">
      {/* Suite Header */}
      <div className="flex items-start justify-between">
        <div className="flex-1 space-y-1.5">
          <input
            value={suite.name}
            onChange={(e) => onUpdate({ id: suite.id, name: e.target.value })}
            className="w-full bg-transparent text-sm font-semibold outline-none"
            placeholder="Suite name"
          />
          <input
            value={suite.description}
            onChange={(e) => onUpdate({ id: suite.id, description: e.target.value })}
            className="w-full bg-transparent text-xs text-muted-foreground outline-none"
            placeholder="Suite description (optional)"
          />
        </div>
        <Button variant="ghost" size="xs" onClick={onDelete} className="text-destructive">
          <Trash2 className="size-3.5" />
        </Button>
      </div>

      {/* Suite Runner */}
      <div className="flex items-center gap-2 rounded-md border border-border bg-card p-3">
        <Select
          value={suiteConnectionId}
          onChange={(e) => setSuiteConnectionId(e.target.value)}
          className="h-7 w-56 text-xs"
        >
          <option value="">Select connection...</option>
          {connections?.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} ({c.dbType})
            </option>
          ))}
        </Select>
        <Button
          size="xs"
          onClick={handleRun}
          disabled={!suiteConnectionId || runSuite.isPending || totalChecks === 0}
          className="gap-1"
        >
          <Play className="size-3" />
          {runSuite.isPending ? 'Running...' : 'Run Suite'}
        </Button>
        <span className="ml-auto text-[10px] text-muted-foreground">
          {suite.rules.length} rules, {totalChecks} checks
        </span>
      </div>

      {/* Run Results */}
      {runResult && (
        <div
          className={`rounded-lg border p-3 ${
            runResult.status === 'passed'
              ? 'border-green-500/20 bg-green-500/5'
              : runResult.status === 'failed'
                ? 'border-destructive/20 bg-destructive/5'
                : 'border-border'
          }`}
        >
          <div className="flex items-center gap-2">
            {runResult.status === 'passed' ? (
              <CheckCircle className="size-4 text-green-500" />
            ) : runResult.status === 'failed' ? (
              <XCircle className="size-4 text-destructive" />
            ) : (
              <AlertTriangle className="size-4 text-yellow-500" />
            )}
            <span className="text-xs font-medium capitalize">{runResult.status}</span>
            <span className="text-[10px] text-muted-foreground">
              {runResult.results.filter((r) => r.passed).length}/{runResult.results.length} checks
              passed
            </span>
          </div>
          {runResult.results.some((r) => !r.passed) && (
            <div className="mt-2 space-y-1">
              {runResult.results
                .filter((r) => !r.passed)
                .map((r) => {
                  const rule = suite.rules.find((rl) => rl.id === r.ruleId);
                  const check = rule?.checks.find((c) => c.id === r.checkId);
                  return (
                    <div
                      key={`${r.ruleId}-${r.checkId}`}
                      className="flex items-start gap-2 rounded border border-border px-2 py-1.5"
                    >
                      <XCircle className="mt-0.5 size-3 shrink-0 text-destructive" />
                      <div className="text-xs">
                        <span className="font-medium">{rule?.name ?? r.ruleId}</span>
                        {check && (
                          <span className="text-muted-foreground"> - {check.type}</span>
                        )}
                        {r.actual && (
                          <span className="ml-1 text-muted-foreground">
                            (got: {r.actual})
                          </span>
                        )}
                        {r.error && (
                          <p className="mt-0.5 text-destructive">{r.error}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      )}

      {/* Rules */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold">Rules</h3>
          <Button variant="outline" size="xs" onClick={handleAddRule} className="gap-1">
            <Plus className="size-3" />
            Add Rule
          </Button>
        </div>

        {suite.rules.length === 0 && (
          <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border py-8 text-muted-foreground">
            <FileText className="size-6" />
            <p className="text-xs">No rules defined. Add a rule to start building validations.</p>
          </div>
        )}

        {suite.rules.map((rule) => (
          <RuleEditor
            key={rule.id}
            rule={rule}
            onUpdate={(updated) => handleRuleUpdate(rule.id, updated)}
            onDelete={() => handleRuleDelete(rule.id)}
          />
        ))}
      </div>
    </div>
  );
}

// ─── SuiteEmptyState ───

function SuiteEmptyState() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 text-muted-foreground">
      <ShieldCheck className="size-10 opacity-30" />
      <div className="text-center">
        <p className="text-sm font-medium">No suite selected</p>
        <p className="mt-1 text-xs">Select a validation suite from the left panel, or create a new one.</p>
      </div>
    </div>
  );
}

// ─── Main Page ───

export function DbValidationPage() {
  // Schema validation (existing)
  const [selectedDiagramId, setSelectedDiagramId] = useState('');
  const [selectedConnectionId, setSelectedConnectionId] = useState('');
  const [report, setReport] = useState<IValidationReport | null>(null);

  const runValidation = useMutation({
    mutationFn: () =>
      validationApi.run({
        virtualDiagramId: selectedDiagramId,
        connectionId: selectedConnectionId,
      }),
    onSuccess: (result) => {
      if (result.success) {
        setReport(result.data);
      }
    },
  });

  // Validation suites
  const [selectedSuiteId, setSelectedSuiteId] = useState<string | null>(null);
  const { data: suites } = useValidationSuites();
  const createSuite = useCreateValidationSuite();
  const updateSuite = useUpdateValidationSuite();
  const deleteSuite = useDeleteValidationSuite();

  const selectedSuite = suites?.find((s) => s.id === selectedSuiteId);

  const handleCreateSuite = () => {
    createSuite.mutate(
      { name: 'New Suite', description: '' },
      {
        onSuccess: (result) => {
          if (result.success) {
            setSelectedSuiteId(result.data.id);
          }
        },
      },
    );
  };

  const handleUpdateSuite = useCallback(
    (updated: Partial<IValidationSuite> & { id: string }) => {
      updateSuite.mutate(updated);
    },
    [updateSuite],
  );

  const handleDeleteSuite = () => {
    if (!selectedSuiteId) return;
    deleteSuite.mutate(
      { id: selectedSuiteId },
      {
        onSuccess: () => {
          setSelectedSuiteId(null);
        },
      },
    );
  };

  // Tab: schema-validation (existing runner) vs suite-validation
  const [activeTab, setActiveTab] = useState<'schema' | 'suites'>('suites');

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-border px-6 py-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="size-5" />
          <h1 className="text-lg font-semibold">Schema Validation</h1>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Validate schemas, define custom validation suites with rules and checks.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border">
        <button
          onClick={() => setActiveTab('suites')}
          className={`px-4 py-2 text-xs font-medium transition-colors ${
            activeTab === 'suites'
              ? 'border-b-2 border-primary text-foreground'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Validation Suites
        </button>
        <button
          onClick={() => setActiveTab('schema')}
          className={`px-4 py-2 text-xs font-medium transition-colors ${
            activeTab === 'schema'
              ? 'border-b-2 border-primary text-foreground'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Schema Compare
        </button>
      </div>

      {activeTab === 'schema' ? (
        /* Schema Validation (existing) */
        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="border-b border-border px-6 py-3">
            <ValidationRunner
              selectedDiagramId={selectedDiagramId}
              selectedConnectionId={selectedConnectionId}
              onDiagramChange={setSelectedDiagramId}
              onConnectionChange={setSelectedConnectionId}
              onRun={() => runValidation.mutate()}
              isRunning={runValidation.isPending}
            />
          </div>

          <div className="flex-1 overflow-y-auto">
            {runValidation.isError && (
              <div className="mx-6 mt-4 flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3">
                <XCircle className="size-4 text-destructive" />
                <span className="text-sm text-destructive">
                  Validation failed. Please check your selections.
                </span>
              </div>
            )}

            {report ? (
              <div className="p-6">
                <div
                  className={`mb-4 flex items-center gap-3 rounded-lg border p-4 ${
                    report.isValid
                      ? 'border-green-500/20 bg-green-500/5'
                      : 'border-destructive/20 bg-destructive/5'
                  }`}
                >
                  {report.isValid ? (
                    <CheckCircle className="size-6 text-green-500" />
                  ) : (
                    <XCircle className="size-6 text-destructive" />
                  )}
                  <div>
                    <div className="font-semibold">
                      {report.isValid ? 'Validation Passed' : 'Validation Failed'}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {report.errors.length} error(s) · {report.warnings.length} warning(s)
                    </div>
                  </div>
                </div>
                <ValidationReport report={report} />
              </div>
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <ShieldCheck className="mx-auto size-8 opacity-30" />
                  <p className="mt-2 text-xs">
                    Select a virtual diagram and connection, then run validation.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Validation Suites */
        <div className="flex flex-1 overflow-hidden">
          {/* Left: Suite List */}
          <div className="w-64 shrink-0 border-r border-border overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border px-3 py-2">
              <span className="text-xs font-medium text-muted-foreground">Suites</span>
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={handleCreateSuite}
                disabled={createSuite.isPending}
              >
                <Plus className="size-3.5" />
              </Button>
            </div>
            {suites?.length === 0 && (
              <div className="px-3 py-6 text-center text-xs text-muted-foreground">
                No suites yet. Create one to get started.
              </div>
            )}
            {suites?.map((suite) => (
              <button
                key={suite.id}
                onClick={() => setSelectedSuiteId(suite.id)}
                className={`w-full border-b border-border/50 px-3 py-2.5 text-left transition-colors ${
                  selectedSuiteId === suite.id
                    ? 'bg-accent/60'
                    : 'hover:bg-accent/30'
                }`}
              >
                <div className="text-xs font-medium truncate">{suite.name || 'Untitled Suite'}</div>
                <div className="mt-0.5 text-[10px] text-muted-foreground">
                  {suite.rules.length} rules ·{' '}
                  {suite.rules.reduce((sum, r) => sum + r.checks.length, 0)} checks
                </div>
              </button>
            ))}
          </div>

          {/* Right: Suite Detail */}
          <div className="flex-1 overflow-y-auto p-6">
            {selectedSuite ? (
              <SuiteDetail
                suite={selectedSuite}
                onUpdate={handleUpdateSuite}
                onDelete={handleDeleteSuite}
              />
            ) : (
              <SuiteEmptyState />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
