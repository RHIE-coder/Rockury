import { useState, useMemo } from 'react';
import { Package, ChevronDown } from 'lucide-react';
import { PackageList } from '@/features/package-management';
import { usePackageStore } from '@/features/package-management';
import { useConnections } from '@/features/db-connection';
import { useDiagrams, useDiagramVersions } from '@/features/virtual-diagram';
import { useSeeds } from '@/features/seed';
import { PackageActions } from './PackageActions';

export function DbPackagePage() {
  const { activePackageId } = usePackageStore();

  return (
    <div className="flex h-full">
      {/* Left: Package List */}
      <div className="w-64 shrink-0 overflow-y-auto border-r border-border">
        <PackageList />
      </div>

      {/* Right: Package Dashboard */}
      <div className="flex-1 overflow-y-auto p-6">
        {activePackageId ? (
          <PackageDashboard />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-4 text-muted-foreground">
            <Package className="size-12" />
            <p className="text-sm">Select a package to view dashboard</p>
          </div>
        )}
      </div>
    </div>
  );
}

function PackageDashboard() {
  const [connectionId, setConnectionId] = useState('');
  const [diagramId, setDiagramId] = useState('');
  const [versionId, setVersionId] = useState('');
  const [seedId, setSeedId] = useState('');

  const { data: connections } = useConnections();
  const { data: diagrams } = useDiagrams();
  const { data: versions } = useDiagramVersions(diagramId);
  const { data: seeds } = useSeeds();

  const virtualDiagrams = useMemo(
    () => (diagrams ?? []).filter((d) => d.type === 'virtual'),
    [diagrams],
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Orchestrator Actions</h2>
        <p className="text-sm text-muted-foreground">
          Cross-domain actions connecting Schema Studio and Live Console
        </p>
      </div>

      {/* Selectors */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Selector
          label="Connection"
          value={connectionId}
          onChange={setConnectionId}
          options={(connections ?? []).map((c) => ({ value: c.id, label: c.name }))}
          placeholder="Select connection"
        />
        <Selector
          label="Diagram"
          value={diagramId}
          onChange={(v) => {
            setDiagramId(v);
            setVersionId('');
          }}
          options={virtualDiagrams.map((d) => ({ value: d.id, label: d.name }))}
          placeholder="Select diagram"
        />
        <Selector
          label="Version"
          value={versionId}
          onChange={setVersionId}
          options={(versions ?? []).map((v) => ({ value: v.id, label: v.name }))}
          placeholder="Select version"
          disabled={!diagramId}
        />
        <Selector
          label="Seed"
          value={seedId}
          onChange={setSeedId}
          options={(seeds ?? []).map((s) => ({ value: s.id, label: s.name }))}
          placeholder="Select seed (optional)"
        />
      </div>

      {/* Status Bar */}
      {connectionId && diagramId && (
        <div className="flex items-center gap-2 rounded-lg bg-muted/30 px-4 py-2">
          <div className="size-2 rounded-full bg-green-500" />
          <span className="text-xs text-muted-foreground">
            Ready to run actions
          </span>
          {!versionId && (
            <span className="text-xs text-amber-500">
              (Select a version for Forward action)
            </span>
          )}
        </div>
      )}

      {/* Actions */}
      <PackageActions
        connectionId={connectionId}
        diagramId={diagramId}
        versionId={versionId}
        seedId={seedId}
      />
    </div>
  );
}

function Selector({
  label,
  value,
  onChange,
  options,
  placeholder,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder: string;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-1">
      <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className="w-full appearance-none rounded-md border border-border bg-background px-3 py-2 pr-8 text-sm text-foreground outline-none transition-colors hover:border-ring focus:border-ring focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
        >
          <option value="">{placeholder}</option>
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      </div>
    </div>
  );
}
