import { useState, useMemo } from 'react';
import { BookOpen } from 'lucide-react';
import { ReferenceSidebar } from './ReferenceSidebar';
import { ReferenceDetail } from './ReferenceDetail';
import type { IReferenceCategory, IReferenceItem, TLang } from '../model/types';

import dataTypesData from '../data/data-types.json';
import tableColumnData from '../data/table-column.json';
import constraintsData from '../data/constraints.json';
import indexesData from '../data/indexes.json';
import viewsData from '../data/views.json';
import routinesData from '../data/routines.json';
import triggersEventsData from '../data/triggers-events.json';
import typesSequencesData from '../data/types-sequences.json';
import partitioningData from '../data/partitioning.json';
import securityData from '../data/security.json';
import advancedData from '../data/advanced.json';

const CATEGORY_LABELS: Record<string, Record<TLang, string>> = {
  'data-types': { en: '0. Data Types', ko: '0. 데이터 타입' },
  'table-column': { en: '1. Table & Column', ko: '1. 테이블 & 컬럼' },
  'constraints': { en: '2. Constraints', ko: '2. 제약 조건' },
  'indexes': { en: '3. Indexes', ko: '3. 인덱스' },
  'views': { en: '4. Views', ko: '4. 뷰' },
  'routines': { en: '5. Routines', ko: '5. 루틴' },
  'triggers-events': { en: '6. Triggers & Events', ko: '6. 트리거 & 이벤트' },
  'types-sequences': { en: '7. Types & Sequences', ko: '7. 타입 & 시퀀스' },
  'partitioning': { en: '8. Partitioning', ko: '8. 파티셔닝' },
  'security': { en: '9. Security', ko: '9. 보안' },
  'advanced': { en: '10. Advanced', ko: '10. 고급 기능' },
};

const categoryData: { id: string; items: IReferenceItem[] }[] = [
  { id: 'data-types', items: dataTypesData as IReferenceItem[] },
  { id: 'table-column', items: tableColumnData as IReferenceItem[] },
  { id: 'constraints', items: constraintsData as IReferenceItem[] },
  { id: 'indexes', items: indexesData as IReferenceItem[] },
  { id: 'views', items: viewsData as IReferenceItem[] },
  { id: 'routines', items: routinesData as IReferenceItem[] },
  { id: 'triggers-events', items: triggersEventsData as IReferenceItem[] },
  { id: 'types-sequences', items: typesSequencesData as IReferenceItem[] },
  { id: 'partitioning', items: partitioningData as IReferenceItem[] },
  { id: 'security', items: securityData as IReferenceItem[] },
  { id: 'advanced', items: advancedData as IReferenceItem[] },
];

export function ReferencePage() {
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [lang, setLang] = useState<TLang>('ko');
  const [searchQuery, setSearchQuery] = useState('');

  const categories: IReferenceCategory[] = useMemo(
    () =>
      categoryData.map((c) => ({
        id: c.id,
        label: CATEGORY_LABELS[c.id]?.[lang] ?? c.id,
        items: c.items,
      })),
    [lang],
  );

  const allItems = useMemo(() => categories.flatMap((c) => c.items), [categories]);
  const selectedItem = allItems.find((item) => item.id === selectedItemId) ?? null;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border px-4 py-1.5">
        <h1 className="text-sm font-semibold">
          {lang === 'ko' ? 'DB 설계 레퍼런스' : 'DB Design Reference'}
        </h1>
        <div className="flex items-center gap-1 rounded-md bg-muted p-0.5">
          <button
            type="button"
            className={`px-2 py-0.5 text-xs rounded ${lang === 'en' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'}`}
            onClick={() => setLang('en')}
          >
            EN
          </button>
          <button
            type="button"
            className={`px-2 py-0.5 text-xs rounded ${lang === 'ko' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'}`}
            onClick={() => setLang('ko')}
          >
            KO
          </button>
        </div>
      </div>
      <div className="flex flex-1 overflow-hidden">
        <ReferenceSidebar
          categories={categories}
          selectedItemId={selectedItemId}
          onSelect={setSelectedItemId}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          lang={lang}
        />
        {selectedItem ? (
          <ReferenceDetail item={selectedItem} lang={lang} />
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
            <div className="rounded-full bg-primary/10 p-4">
              <BookOpen className="size-8 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium">
                {lang === 'ko' ? 'DB 설계 레퍼런스' : 'DB Design Reference'}
              </p>
              <p className="mt-1 text-xs text-muted-foreground max-w-[240px]">
                {lang === 'ko'
                  ? '왼쪽 목록에서 항목을 선택하면 상세 설명, SQL 구문, 벤더별 지원 현황을 확인할 수 있습니다.'
                  : 'Select an item from the sidebar to view detailed descriptions, SQL syntax, and vendor support information.'}
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-1.5 mt-2 max-w-[300px]">
              <span className="rounded-full bg-blue-500/15 px-2 py-0.5 text-[10px] text-blue-600 dark:text-blue-400">11 {lang === 'ko' ? '카테고리' : 'categories'}</span>
              <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] text-emerald-600 dark:text-emerald-400">{allItems.length} {lang === 'ko' ? '항목' : 'items'}</span>
              <span className="rounded-full bg-violet-500/15 px-2 py-0.5 text-[10px] text-violet-600 dark:text-violet-400">4 {lang === 'ko' ? '벤더' : 'vendors'}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
