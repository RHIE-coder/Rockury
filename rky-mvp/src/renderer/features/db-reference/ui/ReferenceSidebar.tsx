import { useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Search,
  Binary,
  TableProperties,
  Link2,
  BarChart3,
  Eye,
  Cog,
  Zap,
  Shapes,
  Layers,
  Shield,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import type { IReferenceCategory, TLang } from '../model/types';

const CATEGORY_STYLE: Record<string, { icon: React.ElementType; color: string; desc: Record<TLang, string> }> = {
  'data-types': { icon: Binary, color: 'text-teal-500', desc: { en: 'INT, VARCHAR, JSON, UUID and more', ko: 'INT, VARCHAR, JSON, UUID 등 데이터 타입' } },
  'table-column': { icon: TableProperties, color: 'text-blue-500', desc: { en: 'DDL basics for tables & columns', ko: '테이블과 컬럼의 DDL 기초' } },
  'constraints': { icon: Link2, color: 'text-rose-500', desc: { en: 'PK, FK, Unique, Check constraints', ko: 'PK, FK, Unique, Check 제약 조건' } },
  'indexes': { icon: BarChart3, color: 'text-amber-500', desc: { en: 'Index types & optimization', ko: '인덱스 유형과 최적화' } },
  'views': { icon: Eye, color: 'text-emerald-500', desc: { en: 'Views & materialized views', ko: '뷰와 구체화된 뷰' } },
  'routines': { icon: Cog, color: 'text-violet-500', desc: { en: 'Stored procedures & functions', ko: '저장 프로시저와 함수' } },
  'triggers-events': { icon: Zap, color: 'text-orange-500', desc: { en: 'Triggers & scheduled events', ko: '트리거와 예약 이벤트' } },
  'types-sequences': { icon: Shapes, color: 'text-cyan-500', desc: { en: 'Custom types & sequences', ko: '커스텀 타입과 시퀀스' } },
  'partitioning': { icon: Layers, color: 'text-pink-500', desc: { en: 'Table partitioning strategies', ko: '테이블 파티셔닝 전략' } },
  'security': { icon: Shield, color: 'text-red-500', desc: { en: 'Roles, grants & RLS policies', ko: '역할, 권한, RLS 정책' } },
  'advanced': { icon: Sparkles, color: 'text-indigo-500', desc: { en: 'CTEs, JSON, window functions', ko: 'CTE, JSON, 윈도우 함수' } },
};

interface ReferenceSidebarProps {
  categories: IReferenceCategory[];
  selectedItemId: string | null;
  onSelect: (itemId: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  lang: TLang;
}

export function ReferenceSidebar({ categories, selectedItemId, onSelect, searchQuery, onSearchChange, lang }: ReferenceSidebarProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    () => new Set(categories.map((c) => c.id)),
  );

  function toggleCategory(id: string) {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const q = searchQuery.toLowerCase();

  return (
    <div className="w-64 shrink-0 overflow-y-auto border-r border-border">
      {/* Search */}
      <div className="sticky top-0 z-10 border-b border-border bg-background p-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={lang === 'ko' ? '항목 검색...' : 'Search items...'}
            className="w-full rounded-md border border-border bg-muted/30 py-1.5 pl-7 pr-2 text-xs outline-none placeholder:text-muted-foreground/60 focus:border-primary/50 focus:ring-1 focus:ring-primary/20"
          />
        </div>
      </div>

      <div className="p-2 space-y-0.5">
        {categories.map((cat) => {
          const style = CATEGORY_STYLE[cat.id];
          const Icon = style?.icon ?? TableProperties;
          const color = style?.color ?? 'text-muted-foreground';
          const desc = style?.desc?.[lang] ?? '';
          const isExpanded = expandedCategories.has(cat.id);

          // Filter items by search
          const filteredItems = q
            ? cat.items.filter((item) =>
                item.name.toLowerCase().includes(q)
                || item.summary.toLowerCase().includes(q)
                || (item.summaryKo?.toLowerCase().includes(q))
              )
            : cat.items;

          // Hide empty categories when searching
          if (q && filteredItems.length === 0) return null;

          return (
            <div key={cat.id}>
              <button
                type="button"
                className="flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-semibold hover:bg-muted/80 transition-colors"
                onClick={() => toggleCategory(cat.id)}
              >
                {isExpanded ? (
                  <ChevronDown className="size-3 shrink-0 text-muted-foreground" />
                ) : (
                  <ChevronRight className="size-3 shrink-0 text-muted-foreground" />
                )}
                <Icon className={cn('size-3.5 shrink-0', color)} />
                <span className="truncate">{cat.label}</span>
                <span className="ml-auto shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                  {filteredItems.length}
                </span>
              </button>
              {isExpanded && (
                <div className="ml-5 mt-0.5 space-y-px border-l-2 border-border/50 pl-2">
                  {desc && (
                    <p className="px-2 py-1 text-[10px] text-muted-foreground/70 leading-relaxed">
                      {desc}
                    </p>
                  )}
                  {filteredItems.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className={cn(
                        'block w-full rounded-md px-2 py-1 text-left text-xs transition-colors',
                        selectedItemId === item.id
                          ? 'bg-primary/10 text-primary font-medium'
                          : 'text-foreground/80 hover:bg-muted/60 hover:text-foreground',
                      )}
                      onClick={() => onSelect(item.id)}
                    >
                      {item.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {q && categories.every((cat) => {
          const filtered = cat.items.filter((item) =>
            item.name.toLowerCase().includes(q)
            || item.summary.toLowerCase().includes(q)
            || (item.summaryKo?.toLowerCase().includes(q))
          );
          return filtered.length === 0;
        }) && (
          <div className="flex flex-col items-center gap-1 py-8 text-center">
            <Search className="size-5 text-muted-foreground/40" />
            <p className="text-xs text-muted-foreground">
              {lang === 'ko' ? '검색 결과 없음' : 'No results found'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
