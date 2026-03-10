import { useState, useCallback, useMemo } from 'react';
import {
  ChevronRight,
  ChevronDown,
  Table2,
  Eye,
  Workflow,
  Code,
  Zap,
  Calendar,
  Hash,
  Type,
  List,
  Plus,
  Layers,
  Shield,
  Lock,
  Key,
  Puzzle,
  FolderOpen,
  Globe,
  HardDrive,
  Languages,
  CircleDot,
} from 'lucide-react';
import type { TSchemaObjectType, TDbType, ISchemaObjects } from '~/shared/types/db';
import { DIALECT_INFO, SCHEMA_OBJECT_CATEGORIES } from '~/shared/types/db';

interface ObjectTreeProps {
  objects: Partial<ISchemaObjects>;
  dbType: TDbType;
  mode: 'readonly' | 'editable';
  selectedObject?: { type: TSchemaObjectType; name: string } | null;
  onSelect?: (type: TSchemaObjectType, name: string) => void;
  onContextMenu?: (type: TSchemaObjectType, name: string, event: React.MouseEvent) => void;
  onAdd?: (type: TSchemaObjectType) => void;
}

const OBJECT_ICONS: Record<TSchemaObjectType, React.ElementType> = {
  table: Table2,
  view: Eye,
  materialized_view: Eye,
  function: Code,
  procedure: Workflow,
  trigger: Zap,
  event: Calendar,
  type: Type,
  sequence: Hash,
  index: List,
  partition: Layers,
  role: Shield,
  policy: Lock,
  grant: Key,
  extension: Puzzle,
  schema: FolderOpen,
  foreign_table: Globe,
  tablespace: HardDrive,
  collation: Languages,
  domain: CircleDot,
};

const TYPE_LABELS: Record<TSchemaObjectType, string> = {
  table: 'Tables',
  view: 'Views',
  materialized_view: 'Materialized Views',
  function: 'Functions',
  procedure: 'Procedures',
  trigger: 'Triggers',
  event: 'Events',
  type: 'Types',
  sequence: 'Sequences',
  index: 'Indexes',
  partition: 'Partitions',
  role: 'Roles',
  policy: 'Policies',
  grant: 'Grants',
  extension: 'Extensions',
  schema: 'Schemas',
  foreign_table: 'Foreign Tables',
  tablespace: 'Tablespaces',
  collation: 'Collations',
  domain: 'Domains',
};

function getObjectNames(objects: Partial<ISchemaObjects>, type: TSchemaObjectType): string[] {
  switch (type) {
    case 'table':
      return (objects.tables ?? []).map((t) => t.name);
    case 'view':
      return (objects.views ?? []).filter((v) => !v.isMaterialized).map((v) => v.name);
    case 'materialized_view':
      return (objects.views ?? []).filter((v) => v.isMaterialized).map((v) => v.name);
    case 'function':
      return (objects.functions ?? []).map((f) => f.name);
    case 'procedure':
      return (objects.procedures ?? []).map((p) => p.name);
    case 'trigger':
      return (objects.triggers ?? []).map((t) => t.name);
    case 'event':
      return (objects.events ?? []).map((e) => e.name);
    case 'type':
      return (objects.types ?? []).map((t) => t.name);
    case 'sequence':
      return (objects.sequences ?? []).map((s) => s.name);
    case 'index':
      return (objects.indexes ?? []).map((i) => i.name);
    case 'partition':
      return (objects.partitions ?? []).map((p) => p.name);
    case 'role':
      return (objects.roles ?? []).map((r) => r.name);
    case 'policy':
      return (objects.policies ?? []).map((p) => p.name);
    case 'grant':
      return (objects.grants ?? []).map((g) => `${g.grantee} → ${g.objectName}`);
    case 'extension':
      return (objects.extensions ?? []).map((e) => e.name);
    case 'schema':
      return (objects.schemas ?? []).map((s) => s.name);
    case 'foreign_table':
      return (objects.foreignTables ?? []).map((f) => f.name);
    case 'tablespace':
      return (objects.tablespaces ?? []).map((t) => t.name);
    case 'collation':
      return (objects.collations ?? []).map((c) => c.name);
    case 'domain':
      return (objects.types ?? []).filter((t) => t.type === 'domain').map((t) => t.name);
    default:
      return [];
  }
}

export function ObjectTree({
  objects,
  dbType,
  mode,
  selectedObject,
  onSelect,
  onContextMenu,
  onAdd,
}: ObjectTreeProps) {
  const supportedObjects = useMemo(() => DIALECT_INFO[dbType].supportedObjects, [dbType]);

  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    () => new Set(SCHEMA_OBJECT_CATEGORIES.map((c) => c.id)),
  );
  const [expandedTypes, setExpandedTypes] = useState<Set<TSchemaObjectType>>(
    () => new Set<TSchemaObjectType>(['table']),
  );

  const toggleCategory = useCallback((categoryId: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) next.delete(categoryId);
      else next.add(categoryId);
      return next;
    });
  }, []);

  const toggleType = useCallback((type: TSchemaObjectType) => {
    setExpandedTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  }, []);

  return (
    <div className="flex flex-col text-sm">
      {SCHEMA_OBJECT_CATEGORIES.map((category) => {
        const supportedTypes = category.types.filter((t) => supportedObjects.includes(t));
        if (supportedTypes.length === 0) return null;

        const isCategoryExpanded = expandedCategories.has(category.id);

        return (
          <div key={category.id}>
            {/* Category header */}
            <button
              type="button"
              className="flex w-full items-center gap-1 px-2 py-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:bg-accent"
              onClick={() => toggleCategory(category.id)}
            >
              {isCategoryExpanded ? (
                <ChevronDown className="size-3" />
              ) : (
                <ChevronRight className="size-3" />
              )}
              <span className="flex-1 text-left">{category.label}</span>
              {mode === 'editable' && onAdd && (
                <span
                  role="button"
                  tabIndex={0}
                  className="flex size-4 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground"
                  onClick={(e) => {
                    e.stopPropagation();
                    onAdd(supportedTypes[0]);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.stopPropagation();
                      onAdd(supportedTypes[0]);
                    }
                  }}
                >
                  <Plus className="size-3" />
                </span>
              )}
            </button>

            {/* Type groups */}
            {isCategoryExpanded &&
              supportedTypes.map((type) => {
                const names = getObjectNames(objects, type);
                const count = names.length;
                const Icon = OBJECT_ICONS[type];
                const isTypeExpanded = expandedTypes.has(type);

                return (
                  <div key={type}>
                    {/* Type header */}
                    <button
                      type="button"
                      className="flex w-full items-center gap-1.5 py-0.5 pl-5 pr-2 text-xs hover:bg-accent"
                      onClick={() => toggleType(type)}
                    >
                      {isTypeExpanded ? (
                        <ChevronDown className="size-3 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="size-3 text-muted-foreground" />
                      )}
                      <Icon className="size-3.5 text-muted-foreground" />
                      <span className="flex-1 text-left">{TYPE_LABELS[type]}</span>
                      <span className="rounded bg-accent px-1.5 py-0.5 text-[10px] text-muted-foreground">
                        {count}
                      </span>
                    </button>

                    {/* Object names */}
                    {isTypeExpanded &&
                      names.map((name) => {
                        const isSelected =
                          selectedObject?.type === type && selectedObject?.name === name;

                        return (
                          <button
                            key={name}
                            type="button"
                            className={`flex w-full items-center truncate py-0.5 pl-12 pr-2 text-xs ${
                              isSelected
                                ? 'bg-accent/50 text-foreground'
                                : 'text-foreground/80 hover:bg-accent'
                            }`}
                            onClick={() => onSelect?.(type, name)}
                            onContextMenu={(e) => {
                              e.preventDefault();
                              onContextMenu?.(type, name, e);
                            }}
                          >
                            {name}
                          </button>
                        );
                      })}
                    {isTypeExpanded && names.length === 0 && (
                      <div className="py-0.5 pl-12 pr-2 text-[10px] text-muted-foreground italic">
                        No {TYPE_LABELS[type].toLowerCase()}
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        );
      })}
    </div>
  );
}
