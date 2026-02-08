import {
  Package,
  Plug,
  GitBranch,
  Terminal,
  FileText,
  ShieldCheck,
  Shuffle,
} from 'lucide-react';
import { ROUTES } from '@/shared/config/constants';
import type { IDbNavItem } from '../model/types';
import { NavTab } from './NavTab';

const navItems: IDbNavItem[] = [
  { id: 'package', label: 'Package', icon: Package, path: ROUTES.DB.PACKAGE },
  { id: 'connection', label: 'Connection', icon: Plug, path: ROUTES.DB.CONNECTION },
  { id: 'diagram', label: 'Diagram', icon: GitBranch, path: ROUTES.DB.DIAGRAM },
  { id: 'query', label: 'Query', icon: Terminal, path: ROUTES.DB.QUERY },
  { id: 'documenting', label: 'Documenting', icon: FileText, path: ROUTES.DB.DOCUMENTING },
  { id: 'validation', label: 'Validation', icon: ShieldCheck, path: ROUTES.DB.VALIDATION },
  { id: 'mocking', label: 'Mocking', icon: Shuffle, path: ROUTES.DB.MOCKING },
];

export function DbTopNav() {
  return (
    <nav className="flex items-center border-b px-2 overflow-x-auto">
      {navItems.map((item) => (
        <NavTab key={item.id} item={item} />
      ))}
    </nav>
  );
}
