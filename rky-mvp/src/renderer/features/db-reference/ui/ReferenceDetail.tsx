import { useState } from 'react';
import { Check, X, Minus } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import type { IReferenceItem } from '../model/types';
import type { TDbType } from '~/shared/types/db';

const DB_LABELS: Record<TDbType, string> = {
  postgresql: 'PostgreSQL',
  mysql: 'MySQL',
  mariadb: 'MariaDB',
  sqlite: 'SQLite',
};

const DB_ORDER: TDbType[] = ['postgresql', 'mysql', 'mariadb', 'sqlite'];

const LEVEL_ICONS = {
  full: <Check className="size-3.5 text-green-500" />,
  partial: <Minus className="size-3.5 text-yellow-500" />,
  none: <X className="size-3.5 text-red-400" />,
};

interface ReferenceDetailProps {
  item: IReferenceItem;
}

export function ReferenceDetail({ item }: ReferenceDetailProps) {
  const dbTypes = DB_ORDER.filter((k) => item.syntax[k] != null);
  const [activeDb, setActiveDb] = useState<TDbType>(dbTypes[0] ?? 'postgresql');

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      <div>
        <h2 className="text-lg font-bold">{item.name}</h2>
        <p className="text-sm text-muted-foreground">{item.summary}</p>
      </div>

      <div className="text-sm leading-relaxed whitespace-pre-wrap">{item.description}</div>

      {dbTypes.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-1">Syntax</h3>
          <div className="flex gap-1 mb-2">
            {dbTypes.map((db) => (
              <button
                key={db}
                type="button"
                className={cn(
                  'px-2 py-0.5 text-xs rounded',
                  activeDb === db
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80',
                )}
                onClick={() => setActiveDb(db)}
              >
                {DB_LABELS[db]}
              </button>
            ))}
          </div>
          <pre className="rounded bg-muted p-3 text-xs overflow-x-auto">
            <code>{item.syntax[activeDb]}</code>
          </pre>
        </div>
      )}

      <div>
        <h3 className="text-sm font-semibold mb-1">Vendor Support</h3>
        <table className="w-full text-xs">
          <tbody>
            {DB_ORDER.map((db) => {
              const support = item.vendorSupport[db];
              return (
                <tr key={db} className="border-b border-border last:border-0">
                  <td className="py-1 font-medium w-28">{DB_LABELS[db]}</td>
                  <td className="py-1 w-8">{LEVEL_ICONS[support.level]}</td>
                  <td className="py-1 capitalize text-muted-foreground">{support.level}</td>
                  <td className="py-1 text-muted-foreground/60">{support.notes}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {item.tips && item.tips.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-1">Tips</h3>
          <ul className="list-disc list-inside text-xs text-muted-foreground space-y-0.5">
            {item.tips.map((tip, i) => (
              <li key={i}>{tip}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
