import { useState, useMemo, useCallback } from 'react';
import {
  BookOpen,
  Search,
  Tag,
  Play,
  Pencil,
  Plus,
  Trash2,
  Database,
  Loader2,
  X,
  Save,
  ChevronRight,
} from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { useConnections } from '@/features/db-connection';
import {
  useSavedQueries,
  useExecuteQuery,
  useSaveQuery,
  useUpdateQuery,
  useDeleteQuery,
} from '@/features/query-execution';
import type { IQuery, IQueryResult } from '~/shared/types/db';

export function QueryCollectionPage() {
  const [selectedQueryId, setSelectedQueryId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [connectionId, setConnectionId] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const { data: queries } = useSavedQueries();
  const { data: connections } = useConnections();
  const saveQuery = useSaveQuery();

  const selectedQuery = (queries ?? []).find((q) => q.id === selectedQueryId);

  // Group queries by first tag
  const grouped = useMemo(() => {
    const filtered = (queries ?? []).filter(
      (q) =>
        q.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        q.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        q.sqlContent.toLowerCase().includes(searchTerm.toLowerCase()),
    );
    const groups: Record<string, IQuery[]> = {};
    for (const q of filtered) {
      if (q.tags.length === 0) {
        if (!groups['Untagged']) groups['Untagged'] = [];
        groups['Untagged'].push(q);
      } else {
        const tag = q.tags[0];
        if (!groups[tag]) groups[tag] = [];
        groups[tag].push(q);
      }
    }
    return groups;
  }, [queries, searchTerm]);

  const handleCreate = useCallback(
    (data: { name: string; description: string; sqlContent: string; tags: string[] }) => {
      saveQuery.mutate(data, {
        onSuccess: (res) => {
          if (res.success) {
            setSelectedQueryId(res.data.id);
            setIsCreating(false);
          }
        },
      });
    },
    [saveQuery],
  );

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-6 py-3">
        <div className="flex items-center gap-2">
          <BookOpen className="size-5 text-foreground" />
          <h1 className="text-lg font-semibold text-foreground">Query Collection</h1>
          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
            {(queries ?? []).length} queries
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <select
              value={connectionId}
              onChange={(e) => setConnectionId(e.target.value)}
              className="appearance-none rounded-md border border-border bg-background px-3 py-1.5 pr-8 text-sm text-foreground outline-none transition-colors hover:border-ring focus:border-ring focus:ring-1 focus:ring-ring"
            >
              <option value="">Select connection...</option>
              {(connections ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <Database className="pointer-events-none absolute right-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          </div>
          <button
            onClick={() => {
              setIsCreating(true);
              setSelectedQueryId(null);
            }}
            className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Plus className="size-3.5" />
            New Query
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left: Query List (SwaggerUI-style grouped) */}
        <div className="w-72 shrink-0 overflow-y-auto border-r border-border">
          {/* Search */}
          <div className="border-b border-border p-3">
            <div className="flex items-center gap-2 rounded-md border border-border bg-background px-2.5 py-1.5">
              <Search className="size-3.5 shrink-0 text-muted-foreground" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search queries..."
                className="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="size-3" />
                </button>
              )}
            </div>
          </div>

          {/* Grouped list */}
          {Object.keys(grouped).length === 0 ? (
            <div className="px-3 py-8 text-center">
              <BookOpen className="mx-auto size-6 text-muted-foreground/30" />
              <p className="mt-2 text-xs text-muted-foreground">
                {searchTerm ? 'No matching queries' : 'No saved queries yet'}
              </p>
            </div>
          ) : (
            Object.entries(grouped).map(([tag, tagQueries]) => (
              <div key={tag}>
                <div className="flex items-center gap-1.5 border-b border-border bg-muted/50 px-3 py-1.5">
                  <Tag className="size-3 text-muted-foreground" />
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {tag}
                  </span>
                  <span className="text-[10px] text-muted-foreground/60">
                    ({tagQueries.length})
                  </span>
                </div>
                {tagQueries.map((q) => (
                  <button
                    key={q.id}
                    onClick={() => {
                      setSelectedQueryId(q.id);
                      setIsCreating(false);
                    }}
                    className={`w-full border-b border-border/30 px-3 py-2 text-left transition-colors hover:bg-accent ${
                      selectedQueryId === q.id ? 'bg-accent' : ''
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <ChevronRight className="size-3 shrink-0 text-muted-foreground" />
                      <span className="truncate text-xs font-medium text-foreground">
                        {q.name}
                      </span>
                    </div>
                    <div className="mt-0.5 truncate pl-[18px] text-[10px] text-muted-foreground">
                      {q.description || q.sqlContent.slice(0, 50)}
                    </div>
                  </button>
                ))}
              </div>
            ))
          )}
        </div>

        {/* Right: Query Detail */}
        <div className="flex-1 overflow-y-auto p-6">
          {isCreating ? (
            <QueryCreateForm
              onSave={handleCreate}
              onCancel={() => setIsCreating(false)}
              isSaving={saveQuery.isPending}
            />
          ) : selectedQuery ? (
            <QueryDetailCard
              query={selectedQuery}
              connectionId={connectionId}
              onDeleted={() => setSelectedQueryId(null)}
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <div className="text-center">
                <BookOpen className="mx-auto size-8 text-muted-foreground/30" />
                <p className="mt-2 text-sm text-muted-foreground">Select a query to view details</p>
                <p className="mt-1 text-xs text-muted-foreground/60">
                  Or create a new query with the button above
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function QueryDetailCard({
  query,
  connectionId,
  onDeleted,
}: {
  query: IQuery;
  connectionId: string;
  onDeleted: () => void;
}) {
  const [result, setResult] = useState<IQueryResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const executeMutation = useExecuteQuery();
  const updateQuery = useUpdateQuery();
  const deleteQuery = useDeleteQuery();

  const handleExecute = () => {
    setError(null);
    executeMutation.mutate(
      { connectionId, sql: query.sqlContent },
      {
        onSuccess: (res) => {
          if (res.success) {
            setResult(res.data);
          } else {
            setError('Execution failed');
          }
        },
        onError: (err) => {
          setError(err instanceof Error ? err.message : 'Unknown error');
        },
      },
    );
  };

  const handleDelete = () => {
    deleteQuery.mutate(query.id, {
      onSuccess: () => onDeleted(),
    });
  };

  if (isEditing) {
    return (
      <QueryEditForm
        query={query}
        onSave={(data) => {
          updateQuery.mutate(
            { id: query.id, ...data },
            { onSuccess: () => setIsEditing(false) },
          );
        }}
        onCancel={() => setIsEditing(false)}
        isSaving={updateQuery.isPending}
      />
    );
  }

  return (
    <div className="space-y-5">
      {/* Query header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">{query.name}</h2>
          {query.description && (
            <p className="mt-1 text-sm text-muted-foreground">{query.description}</p>
          )}
          {query.tags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {query.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-medium text-foreground"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsEditing(true)}
            className="rounded p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            title="Edit query"
          >
            <Pencil className="size-4" />
          </button>
          <button
            onClick={handleDelete}
            disabled={deleteQuery.isPending}
            className="rounded p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
            title="Delete query"
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      </div>

      {/* SQL Preview */}
      <div className="rounded-lg border border-border">
        <div className="flex items-center justify-between border-b border-border bg-muted/30 px-4 py-2">
          <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            SQL
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExecute}
              disabled={!connectionId || executeMutation.isPending}
              className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1 text-xs text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {executeMutation.isPending ? (
                <Loader2 className="size-3 animate-spin" />
              ) : (
                <Play className="size-3" />
              )}
              Execute
            </button>
          </div>
        </div>
        <pre className="max-h-64 overflow-auto p-4 font-mono text-xs text-foreground">
          {query.sqlContent}
        </pre>
      </div>

      {!connectionId && (
        <div className="rounded-lg bg-amber-500/10 px-4 py-2 text-xs text-amber-500">
          Select a connection in the header to execute this query
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
          <p className="text-sm font-medium text-destructive">Error</p>
          <p className="mt-1 font-mono text-xs text-destructive/80">{error}</p>
        </div>
      )}

      {/* Results */}
      {result && <ResultsTable results={result} />}

      {/* Metadata */}
      <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
        <span>Created: {new Date(query.createdAt).toLocaleDateString()}</span>
        <span>Updated: {new Date(query.updatedAt).toLocaleDateString()}</span>
      </div>
    </div>
  );
}

function QueryEditForm({
  query,
  onSave,
  onCancel,
  isSaving,
}: {
  query: IQuery;
  onSave: (data: { name: string; description: string; sqlContent: string; tags: string[] }) => void;
  onCancel: () => void;
  isSaving: boolean;
}) {
  const [name, setName] = useState(query.name);
  const [description, setDescription] = useState(query.description);
  const [sqlContent, setSqlContent] = useState(query.sqlContent);
  const [tagsInput, setTagsInput] = useState(query.tags.join(', '));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      name,
      description,
      sqlContent,
      tags: tagsInput
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Edit Query</h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-border px-3 py-1.5 text-sm text-foreground transition-colors hover:bg-accent"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSaving || !name.trim() || !sqlContent.trim()}
            className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {isSaving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
            Save
          </button>
        </div>
      </div>
      <QueryFormFields
        name={name}
        setName={setName}
        description={description}
        setDescription={setDescription}
        sqlContent={sqlContent}
        setSqlContent={setSqlContent}
        tagsInput={tagsInput}
        setTagsInput={setTagsInput}
      />
    </form>
  );
}

function QueryCreateForm({
  onSave,
  onCancel,
  isSaving,
}: {
  onSave: (data: { name: string; description: string; sqlContent: string; tags: string[] }) => void;
  onCancel: () => void;
  isSaving: boolean;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [sqlContent, setSqlContent] = useState('');
  const [tagsInput, setTagsInput] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      name,
      description,
      sqlContent,
      tags: tagsInput
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">New Query</h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-border px-3 py-1.5 text-sm text-foreground transition-colors hover:bg-accent"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSaving || !name.trim() || !sqlContent.trim()}
            className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {isSaving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
            Save
          </button>
        </div>
      </div>
      <QueryFormFields
        name={name}
        setName={setName}
        description={description}
        setDescription={setDescription}
        sqlContent={sqlContent}
        setSqlContent={setSqlContent}
        tagsInput={tagsInput}
        setTagsInput={setTagsInput}
      />
    </form>
  );
}

function QueryFormFields({
  name,
  setName,
  description,
  setDescription,
  sqlContent,
  setSqlContent,
  tagsInput,
  setTagsInput,
}: {
  name: string;
  setName: (v: string) => void;
  description: string;
  setDescription: (v: string) => void;
  sqlContent: string;
  setSqlContent: (v: string) => void;
  tagsInput: string;
  setTagsInput: (v: string) => void;
}) {
  return (
    <>
      <div className="space-y-1">
        <label className="text-xs font-medium text-foreground">Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Query name"
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-ring focus:ring-1 focus:ring-ring"
        />
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-foreground">Description</label>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Brief description (optional)"
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-ring focus:ring-1 focus:ring-ring"
        />
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-foreground">Tags</label>
        <input
          type="text"
          value={tagsInput}
          onChange={(e) => setTagsInput(e.target.value)}
          placeholder="Comma-separated tags (e.g., reports, admin)"
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-ring focus:ring-1 focus:ring-ring"
        />
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-foreground">SQL</label>
        <textarea
          value={sqlContent}
          onChange={(e) => setSqlContent(e.target.value)}
          placeholder="SELECT * FROM ..."
          rows={10}
          className="w-full resize-none rounded-md border border-border bg-background px-3 py-2 font-mono text-sm text-foreground outline-none transition-colors focus:border-ring focus:ring-1 focus:ring-ring"
        />
      </div>
    </>
  );
}

function ResultsTable({ results }: { results: IQueryResult }) {
  if (results.columns.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-muted/20 p-4 text-center">
        <p className="text-sm text-foreground">Query executed successfully</p>
        {results.affectedRows !== undefined && (
          <p className="mt-1 text-xs text-muted-foreground">
            {results.affectedRows} row(s) affected
          </p>
        )}
        <p className="mt-1 text-[10px] text-muted-foreground">{results.executionTimeMs}ms</p>
      </div>
    );
  }

  return (
    <div className="overflow-auto rounded-lg border border-border">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-border bg-muted/50">
            <th className="px-3 py-2 text-left text-[10px] font-medium text-muted-foreground">#</th>
            {results.columns.map((col) => (
              <th key={col} className="px-3 py-2 text-left font-medium text-foreground">
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {results.rows.map((row, i) => (
            <tr key={i} className="border-b border-border/50 hover:bg-accent/30">
              <td className="px-3 py-1.5 font-mono text-[10px] text-muted-foreground">{i + 1}</td>
              {results.columns.map((col) => (
                <td key={col} className="px-3 py-1.5 font-mono text-foreground">
                  {row[col] === null ? (
                    <span className="italic text-muted-foreground">NULL</span>
                  ) : (
                    String(row[col])
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex items-center justify-between border-t border-border bg-muted/30 px-3 py-1.5">
        <span className="text-[10px] text-muted-foreground">
          {results.rowCount} row{results.rowCount !== 1 ? 's' : ''}
        </span>
        <span className="text-[10px] text-muted-foreground">{results.executionTimeMs}ms</span>
      </div>
    </div>
  );
}
