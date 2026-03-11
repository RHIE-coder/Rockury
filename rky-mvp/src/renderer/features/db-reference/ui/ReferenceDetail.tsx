import { useState } from 'react';
import { Check, X, Minus, Lightbulb, Database } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import type { IReferenceItem, TLang } from '../model/types';
import type { TDbType } from '~/shared/types/db';

const DB_LABELS: Record<TDbType, string> = {
  postgresql: 'PostgreSQL',
  mysql: 'MySQL',
  mariadb: 'MariaDB',
  sqlite: 'SQLite',
};

const DB_ORDER: TDbType[] = ['postgresql', 'mysql', 'mariadb', 'sqlite'];

const DB_COLORS: Record<TDbType, { bg: string; text: string; active: string; border: string; logo: string }> = {
  postgresql: {
    bg: 'bg-blue-500/10',
    text: 'text-blue-600 dark:text-blue-400',
    active: 'bg-blue-500 text-white',
    border: 'border-blue-500/30',
    logo: 'text-blue-500',
  },
  mysql: {
    bg: 'bg-orange-500/10',
    text: 'text-orange-600 dark:text-orange-400',
    active: 'bg-orange-500 text-white',
    border: 'border-orange-500/30',
    logo: 'text-orange-500',
  },
  mariadb: {
    bg: 'bg-teal-500/10',
    text: 'text-teal-600 dark:text-teal-400',
    active: 'bg-teal-500 text-white',
    border: 'border-teal-500/30',
    logo: 'text-teal-500',
  },
  sqlite: {
    bg: 'bg-sky-500/10',
    text: 'text-sky-600 dark:text-sky-400',
    active: 'bg-sky-500 text-white',
    border: 'border-sky-500/30',
    logo: 'text-sky-500',
  },
};

const CATEGORY_BADGE: Record<string, { label: string; labelKo: string; color: string }> = {
  'table-column': { label: 'Table & Column', labelKo: '테이블 & 컬럼', color: 'bg-blue-500/15 text-blue-600 dark:text-blue-400' },
  'constraints': { label: 'Constraints', labelKo: '제약 조건', color: 'bg-rose-500/15 text-rose-600 dark:text-rose-400' },
  'indexes': { label: 'Indexes', labelKo: '인덱스', color: 'bg-amber-500/15 text-amber-600 dark:text-amber-400' },
  'views': { label: 'Views', labelKo: '뷰', color: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' },
  'routines': { label: 'Routines', labelKo: '루틴', color: 'bg-violet-500/15 text-violet-600 dark:text-violet-400' },
  'triggers-events': { label: 'Triggers & Events', labelKo: '트리거 & 이벤트', color: 'bg-orange-500/15 text-orange-600 dark:text-orange-400' },
  'types-sequences': { label: 'Types & Sequences', labelKo: '타입 & 시퀀스', color: 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400' },
  'partitioning': { label: 'Partitioning', labelKo: '파티셔닝', color: 'bg-pink-500/15 text-pink-600 dark:text-pink-400' },
  'security': { label: 'Security', labelKo: '보안', color: 'bg-red-500/15 text-red-600 dark:text-red-400' },
  'advanced': { label: 'Advanced', labelKo: '고급 기능', color: 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400' },
};

const LEVEL_CONFIG: Record<string, { icon: React.ReactNode; label: Record<TLang, string>; color: string; bg: string }> = {
  full: {
    icon: <Check className="size-3.5" />,
    label: { en: 'Full Support', ko: '완전 지원' },
    color: 'text-green-600 dark:text-green-400',
    bg: 'bg-green-500/10',
  },
  partial: {
    icon: <Minus className="size-3.5" />,
    label: { en: 'Partial', ko: '부분 지원' },
    color: 'text-yellow-600 dark:text-yellow-400',
    bg: 'bg-yellow-500/10',
  },
  none: {
    icon: <X className="size-3.5" />,
    label: { en: 'Not Supported', ko: '미지원' },
    color: 'text-red-500 dark:text-red-400',
    bg: 'bg-red-500/10',
  },
};

interface ReferenceDetailProps {
  item: IReferenceItem;
  lang: TLang;
}

export function ReferenceDetail({ item, lang }: ReferenceDetailProps) {
  const dbTypes = DB_ORDER.filter((k) => item.syntax[k] != null);
  const [activeDb, setActiveDb] = useState<TDbType>(dbTypes[0] ?? 'postgresql');

  const summary = lang === 'ko' && item.summaryKo ? item.summaryKo : item.summary;
  const description = lang === 'ko' && item.descriptionKo ? item.descriptionKo : item.description;
  const tips = lang === 'ko' && item.tipsKo ? item.tipsKo : item.tips;
  const badge = CATEGORY_BADGE[item.category];

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-5">
      {/* Header */}
      <div className="space-y-2">
        {badge && (
          <span className={cn('inline-block rounded-full px-2.5 py-0.5 text-[10px] font-semibold', badge.color)}>
            {lang === 'ko' ? badge.labelKo : badge.label}
          </span>
        )}
        <h2 className="text-xl font-bold tracking-tight">{item.name}</h2>
        <p className="text-sm text-muted-foreground leading-relaxed border-l-2 border-primary/40 pl-3">
          {summary}
        </p>
      </div>

      {/* Description */}
      <div className="rounded-lg bg-muted/40 p-4">
        <p className="text-sm leading-relaxed whitespace-pre-wrap">{description}</p>
      </div>

      {/* Syntax */}
      {dbTypes.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold flex items-center gap-1.5">
            <span className="inline-block size-1.5 rounded-full bg-primary" />
            {lang === 'ko' ? '구문 (Syntax)' : 'Syntax'}
          </h3>
          <div className="flex gap-1">
            {dbTypes.map((db) => {
              const colors = DB_COLORS[db];
              return (
                <button
                  key={db}
                  type="button"
                  className={cn(
                    'px-3 py-1 text-xs rounded-md font-medium transition-all',
                    activeDb === db
                      ? colors.active
                      : cn('border', colors.border, colors.text, 'hover:opacity-80'),
                  )}
                  onClick={() => setActiveDb(db)}
                >
                  {DB_LABELS[db]}
                </button>
              );
            })}
          </div>
          <div className={cn('rounded-lg border overflow-hidden', DB_COLORS[activeDb].border)}>
            <div className={cn('flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-semibold', DB_COLORS[activeDb].bg, DB_COLORS[activeDb].text)}>
              <Database className="size-3" />
              {DB_LABELS[activeDb]}
            </div>
            <pre className="p-3 text-xs overflow-x-auto bg-[#1e1e2e] text-[#cdd6f4]">
              <code>{item.syntax[activeDb]}</code>
            </pre>
          </div>
        </div>
      )}

      {/* Vendor Support */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold flex items-center gap-1.5">
          <span className="inline-block size-1.5 rounded-full bg-primary" />
          {lang === 'ko' ? '벤더 지원 현황' : 'Vendor Support'}
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {DB_ORDER.map((db) => {
            const support = item.vendorSupport[db];
            const notes = lang === 'ko' && support.notesKo ? support.notesKo : support.notes;
            const level = LEVEL_CONFIG[support.level];
            const colors = DB_COLORS[db];

            return (
              <div
                key={db}
                className={cn(
                  'rounded-lg border p-3 space-y-1.5 transition-colors',
                  colors.border,
                )}
              >
                <div className="flex items-center justify-between">
                  <span className={cn('text-xs font-semibold', colors.text)}>
                    {DB_LABELS[db]}
                  </span>
                  <span className={cn('flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium', level.bg, level.color)}>
                    {level.icon}
                    {level.label[lang]}
                  </span>
                </div>
                {notes && (
                  <p className="text-[11px] text-muted-foreground leading-relaxed">{notes}</p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Tips */}
      {tips && tips.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold flex items-center gap-1.5">
            <span className="inline-block size-1.5 rounded-full bg-primary" />
            {lang === 'ko' ? '팁' : 'Tips'}
          </h3>
          <div className="space-y-1.5">
            {tips.map((tip, i) => (
              <div
                key={i}
                className="flex gap-2 rounded-lg bg-amber-500/5 border border-amber-500/20 p-3"
              >
                <Lightbulb className="size-3.5 shrink-0 text-amber-500 mt-0.5" />
                <p className="text-xs text-foreground/80 leading-relaxed">{tip}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Related Items */}
      {item.relatedItems && item.relatedItems.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold flex items-center gap-1.5">
            <span className="inline-block size-1.5 rounded-full bg-primary" />
            {lang === 'ko' ? '관련 항목' : 'Related'}
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {item.relatedItems.map((rel) => (
              <span
                key={rel}
                className="inline-block rounded-md bg-muted px-2.5 py-1 text-xs text-muted-foreground"
              >
                {rel}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
