# Phase 1: Navigation Restructure Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Restructure DB Tool navigation from flat 7-tab layout into 4-area toggle (Overview, Package, Schema Studio, Live Console) with area-specific sub-tabs.

**Architecture:** Replace `DbTopNav` (flat nav) with a two-tier navigation: area toggle (top row) + area-specific view tabs (second row). Each area renders its own sub-routes. Existing pages are temporarily mapped to the new areas without functional changes.

**Tech Stack:** React 19, React Router, Zustand, Tailwind CSS 4, lucide-react

**Design Reference:** `docs/plans/2026-03-07-schema-studio-live-console-design.md` Section 2

---

### Task 1: Update Route Constants

**Files:**
- Modify: `src/renderer/shared/config/constants.ts`

**Step 1: Update ROUTES constant**

Replace the flat DB routes with nested area routes:

```typescript
export const ROUTES = {
  ROOT: '/',
  DB: {
    ROOT: '/db',
    OVERVIEW: '/db/overview',
    PACKAGE: '/db/package',
    SCHEMA_STUDIO: {
      ROOT: '/db/studio',
      DIAGRAM: '/db/studio/diagram',
      DDL: '/db/studio/ddl',
      SEED: '/db/studio/seed',
      MOCKING: '/db/studio/mocking',
      DOCUMENTING: '/db/studio/documenting',
      VALIDATION: '/db/studio/validation',
    },
    LIVE_CONSOLE: {
      ROOT: '/db/console',
      CONNECTION: '/db/console/connection',
      DIAGRAM: '/db/console/diagram',
      DATA: '/db/console/data',
      SQL: '/db/console/sql',
      EXPLORER: '/db/console/explorer',
      QUERY_COLLECTION: '/db/console/query-collection',
      SEED: '/db/console/seed',
      VALIDATION_RUN: '/db/console/validation-run',
    },
  },
  API: '/api',
  CODE: '/code',
  INFRA: '/infra',
} as const;
```

**Step 2: Run TypeScript check to find broken references**

Run: `npx tsc --noEmit 2>&1 | head -50`
Expected: Multiple errors for old route references (ROUTES.DB.CONNECTION, ROUTES.DB.QUERY, etc.)

**Step 3: Commit**

```bash
git add src/renderer/shared/config/constants.ts
git commit -m "refactor(routes): restructure DB routes into 4-area hierarchy"
```

---

### Task 2: Create Area Toggle Widget

**Files:**
- Create: `src/renderer/widgets/db-area-toggle/model/types.ts`
- Create: `src/renderer/widgets/db-area-toggle/ui/AreaToggle.tsx`
- Create: `src/renderer/widgets/db-area-toggle/ui/AreaToggleButton.tsx`
- Create: `src/renderer/widgets/db-area-toggle/index.ts`

**Step 1: Create types**

`src/renderer/widgets/db-area-toggle/model/types.ts`:

```typescript
import type { LucideIcon } from 'lucide-react';

export type TDbArea = 'overview' | 'package' | 'studio' | 'console';

export interface IDbAreaItem {
  id: TDbArea;
  label: string;
  icon: LucideIcon;
  path: string;
}
```

**Step 2: Create AreaToggleButton component**

`src/renderer/widgets/db-area-toggle/ui/AreaToggleButton.tsx`:

```tsx
import { NavLink } from 'react-router';
import { cn } from '@/shared/lib/utils';
import type { IDbAreaItem } from '../model/types';

interface AreaToggleButtonProps {
  item: IDbAreaItem;
}

export function AreaToggleButton({ item }: AreaToggleButtonProps) {
  const Icon = item.icon;

  return (
    <NavLink
      to={item.path}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium rounded-md transition-colors',
          isActive
            ? 'bg-primary text-primary-foreground'
            : 'text-muted-foreground hover:text-foreground hover:bg-muted',
        )
      }
    >
      <Icon className="size-4" />
      <span>{item.label}</span>
    </NavLink>
  );
}
```

**Step 3: Create AreaToggle component**

`src/renderer/widgets/db-area-toggle/ui/AreaToggle.tsx`:

```tsx
import { LayoutDashboard, Package, PenTool, Monitor } from 'lucide-react';
import { ROUTES } from '@/shared/config/constants';
import type { IDbAreaItem } from '../model/types';
import { AreaToggleButton } from './AreaToggleButton';

const areas: IDbAreaItem[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard, path: ROUTES.DB.OVERVIEW },
  { id: 'package', label: 'Package', icon: Package, path: ROUTES.DB.PACKAGE },
  { id: 'studio', label: 'Schema Studio', icon: PenTool, path: ROUTES.DB.SCHEMA_STUDIO.ROOT },
  { id: 'console', label: 'Live Console', icon: Monitor, path: ROUTES.DB.LIVE_CONSOLE.ROOT },
];

export function AreaToggle() {
  return (
    <nav className="flex items-center gap-1 border-b px-3 py-1.5">
      {areas.map((area) => (
        <AreaToggleButton key={area.id} item={area} />
      ))}
    </nav>
  );
}
```

**Step 4: Create barrel export**

`src/renderer/widgets/db-area-toggle/index.ts`:

```typescript
export { AreaToggle } from './ui/AreaToggle';
export type { TDbArea, IDbAreaItem } from './model/types';
```

**Step 5: Commit**

```bash
git add src/renderer/widgets/db-area-toggle/
git commit -m "feat(nav): add 4-area toggle widget"
```

---

### Task 3: Create View Tabs Widget

Each area has its own sub-tabs. Create a reusable ViewTabs component.

**Files:**
- Create: `src/renderer/widgets/db-view-tabs/model/types.ts`
- Create: `src/renderer/widgets/db-view-tabs/ui/ViewTabs.tsx`
- Create: `src/renderer/widgets/db-view-tabs/ui/ViewTab.tsx`
- Create: `src/renderer/widgets/db-view-tabs/index.ts`

**Step 1: Create types**

`src/renderer/widgets/db-view-tabs/model/types.ts`:

```typescript
import type { LucideIcon } from 'lucide-react';

export interface IViewTabItem {
  id: string;
  label: string;
  icon: LucideIcon;
  path: string;
}
```

**Step 2: Create ViewTab component**

`src/renderer/widgets/db-view-tabs/ui/ViewTab.tsx`:

```tsx
import { NavLink } from 'react-router';
import { cn } from '@/shared/lib/utils';
import type { IViewTabItem } from '../model/types';

interface ViewTabProps {
  item: IViewTabItem;
}

export function ViewTab({ item }: ViewTabProps) {
  const Icon = item.icon;

  return (
    <NavLink
      to={item.path}
      className={({ isActive }) =>
        cn(
          'relative flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors',
          'hover:text-foreground',
          isActive
            ? 'text-foreground after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-primary'
            : 'text-muted-foreground',
        )
      }
    >
      <Icon className="size-3.5" />
      <span>{item.label}</span>
    </NavLink>
  );
}
```

**Step 3: Create ViewTabs component**

`src/renderer/widgets/db-view-tabs/ui/ViewTabs.tsx`:

```tsx
import type { IViewTabItem } from '../model/types';
import { ViewTab } from './ViewTab';

interface ViewTabsProps {
  items: IViewTabItem[];
}

export function ViewTabs({ items }: ViewTabsProps) {
  return (
    <nav className="flex items-center border-b px-2 overflow-x-auto bg-muted/20">
      {items.map((item) => (
        <ViewTab key={item.id} item={item} />
      ))}
    </nav>
  );
}
```

**Step 4: Create barrel export**

`src/renderer/widgets/db-view-tabs/index.ts`:

```typescript
export { ViewTabs } from './ui/ViewTabs';
export type { IViewTabItem } from './model/types';
```

**Step 5: Commit**

```bash
git add src/renderer/widgets/db-view-tabs/
git commit -m "feat(nav): add reusable view tabs widget"
```

---

### Task 4: Create Area Layout Components

Each area needs its own layout that renders the ViewTabs + Outlet.

**Files:**
- Create: `src/renderer/app/layouts/SchemaStudioLayout.tsx`
- Create: `src/renderer/app/layouts/LiveConsoleLayout.tsx`
- Modify: `src/renderer/app/layouts/DbLayout.tsx`

**Step 1: Create SchemaStudioLayout**

`src/renderer/app/layouts/SchemaStudioLayout.tsx`:

```tsx
import { Outlet } from 'react-router';
import {
  GitBranch,
  Code2,
  Sprout,
  Shuffle,
  FileText,
  ShieldCheck,
} from 'lucide-react';
import { ROUTES } from '@/shared/config/constants';
import { ViewTabs } from '@/widgets/db-view-tabs';
import type { IViewTabItem } from '@/widgets/db-view-tabs';

const tabs: IViewTabItem[] = [
  { id: 'diagram', label: 'Diagram', icon: GitBranch, path: ROUTES.DB.SCHEMA_STUDIO.DIAGRAM },
  { id: 'ddl', label: 'DDL', icon: Code2, path: ROUTES.DB.SCHEMA_STUDIO.DDL },
  { id: 'seed', label: 'Seed', icon: Sprout, path: ROUTES.DB.SCHEMA_STUDIO.SEED },
  { id: 'mocking', label: 'Mocking', icon: Shuffle, path: ROUTES.DB.SCHEMA_STUDIO.MOCKING },
  { id: 'documenting', label: 'Documenting', icon: FileText, path: ROUTES.DB.SCHEMA_STUDIO.DOCUMENTING },
  { id: 'validation', label: 'Validation', icon: ShieldCheck, path: ROUTES.DB.SCHEMA_STUDIO.VALIDATION },
];

export function SchemaStudioLayout() {
  return (
    <div className="flex flex-col h-full">
      <ViewTabs items={tabs} />
      <div className="flex-1 overflow-hidden">
        <Outlet />
      </div>
    </div>
  );
}
```

**Step 2: Create LiveConsoleLayout**

`src/renderer/app/layouts/LiveConsoleLayout.tsx`:

```tsx
import { Outlet } from 'react-router';
import {
  Plug,
  GitBranch,
  Table,
  FileCode,
  Terminal,
  Library,
  Sprout,
  ShieldCheck,
} from 'lucide-react';
import { ROUTES } from '@/shared/config/constants';
import { ViewTabs } from '@/widgets/db-view-tabs';
import type { IViewTabItem } from '@/widgets/db-view-tabs';

const tabs: IViewTabItem[] = [
  { id: 'connection', label: 'Connection', icon: Plug, path: ROUTES.DB.LIVE_CONSOLE.CONNECTION },
  { id: 'diagram', label: 'Diagram', icon: GitBranch, path: ROUTES.DB.LIVE_CONSOLE.DIAGRAM },
  { id: 'data', label: 'Data', icon: Table, path: ROUTES.DB.LIVE_CONSOLE.DATA },
  { id: 'sql', label: 'SQL', icon: FileCode, path: ROUTES.DB.LIVE_CONSOLE.SQL },
  { id: 'explorer', label: 'Explorer', icon: Terminal, path: ROUTES.DB.LIVE_CONSOLE.EXPLORER },
  { id: 'query-collection', label: 'Query Collection', icon: Library, path: ROUTES.DB.LIVE_CONSOLE.QUERY_COLLECTION },
  { id: 'seed', label: 'Seed', icon: Sprout, path: ROUTES.DB.LIVE_CONSOLE.SEED },
  { id: 'validation-run', label: 'Validation Run', icon: ShieldCheck, path: ROUTES.DB.LIVE_CONSOLE.VALIDATION_RUN },
];

export function LiveConsoleLayout() {
  return (
    <div className="flex flex-col h-full">
      <ViewTabs items={tabs} />
      <div className="flex-1 overflow-hidden">
        <Outlet />
      </div>
    </div>
  );
}
```

**Step 3: Update DbLayout to use AreaToggle**

Replace `src/renderer/app/layouts/DbLayout.tsx`:

```tsx
import { Outlet } from 'react-router';
import { AreaToggle } from '@/widgets/db-area-toggle';

export function DbLayout() {
  return (
    <div className="flex flex-col h-full">
      <AreaToggle />
      <div className="flex-1 overflow-hidden">
        <Outlet />
      </div>
    </div>
  );
}
```

**Step 4: Commit**

```bash
git add src/renderer/app/layouts/
git commit -m "feat(nav): add area layouts with view tabs"
```

---

### Task 5: Create Placeholder Pages for New Areas

Temporary pages for areas/tabs that don't have content yet.

**Files:**
- Create: `src/renderer/pages/db-overview/ui/DbOverviewPage.tsx`
- Create: `src/renderer/pages/db-overview/index.ts`

**Step 1: Create Overview placeholder page**

`src/renderer/pages/db-overview/ui/DbOverviewPage.tsx`:

```tsx
import { LayoutDashboard } from 'lucide-react';

export function DbOverviewPage() {
  return (
    <div className="flex h-full items-center justify-center text-muted-foreground">
      <div className="flex flex-col items-center gap-2">
        <LayoutDashboard className="size-12 opacity-30" />
        <p className="text-lg font-medium">Overview</p>
        <p className="text-sm">Resource dependency graph coming soon</p>
      </div>
    </div>
  );
}
```

**Step 2: Create barrel export**

`src/renderer/pages/db-overview/index.ts`:

```typescript
export { DbOverviewPage } from './ui/DbOverviewPage';
```

**Step 3: Commit**

```bash
git add src/renderer/pages/db-overview/
git commit -m "feat(nav): add overview placeholder page"
```

---

### Task 6: Rewire Routes

Connect the new layout structure with routes. Map existing pages to their new locations.

**Files:**
- Modify: `src/renderer/app/routes/index.tsx`

**Step 1: Update AppRouter**

```tsx
import { Routes, Route, Navigate } from 'react-router';
import { ROUTES } from '@/shared/config/constants';
import { AppLayout } from '../layouts/AppLayout';
import { DbLayout } from '../layouts/DbLayout';
import { SchemaStudioLayout } from '../layouts/SchemaStudioLayout';
import { LiveConsoleLayout } from '../layouts/LiveConsoleLayout';
import { DbOverviewPage } from '@/pages/db-overview';
import { DbPackagePage } from '@/pages/db-package';
import { DbDiagramPage } from '@/pages/db-diagram';
import { DbConnectionPage } from '@/pages/db-connection';
import { DbQueryPage } from '@/pages/db-query';
import { DbDocumentingPage } from '@/pages/db-documenting';
import { DbValidationPage } from '@/pages/db-validation';
import { DbMockingPage } from '@/pages/db-mocking';
import { PlaceholderPage } from '@/pages/placeholder';
import { NotFoundPage } from '@/pages/not-found';

export function AppRouter() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        {/* Root redirect to Overview */}
        <Route index element={<Navigate to={ROUTES.DB.OVERVIEW} replace />} />

        {/* DB Service */}
        <Route path="db" element={<DbLayout />}>
          <Route index element={<Navigate to="overview" replace />} />

          {/* Overview */}
          <Route path="overview" element={<DbOverviewPage />} />

          {/* Package */}
          <Route path="package" element={<DbPackagePage />} />

          {/* Schema Studio */}
          <Route path="studio" element={<SchemaStudioLayout />}>
            <Route index element={<Navigate to="diagram" replace />} />
            <Route path="diagram" element={<DbDiagramPage />} />
            <Route path="ddl" element={<PlaceholderPage service="DDL Editor" />} />
            <Route path="seed" element={<PlaceholderPage service="Seed Manager" />} />
            <Route path="mocking" element={<DbMockingPage />} />
            <Route path="documenting" element={<DbDocumentingPage />} />
            <Route path="validation" element={<DbValidationPage />} />
          </Route>

          {/* Live Console */}
          <Route path="console" element={<LiveConsoleLayout />}>
            <Route index element={<Navigate to="connection" replace />} />
            <Route path="connection" element={<DbConnectionPage />} />
            <Route path="diagram" element={<PlaceholderPage service="Real Diagram" />} />
            <Route path="data" element={<PlaceholderPage service="Data Browser" />} />
            <Route path="sql" element={<PlaceholderPage service="SQL Definition" />} />
            <Route path="explorer" element={<DbQueryPage />} />
            <Route path="query-collection" element={<PlaceholderPage service="Query Collection" />} />
            <Route path="seed" element={<PlaceholderPage service="Seed Capture" />} />
            <Route path="validation-run" element={<PlaceholderPage service="Validation Run" />} />
          </Route>
        </Route>

        {/* Placeholder Services */}
        <Route path="api" element={<PlaceholderPage service="API" />} />
        <Route path="code" element={<PlaceholderPage service="Code" />} />
        <Route path="infra" element={<PlaceholderPage service="Infra" />} />

        {/* 404 */}
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
```

**Step 2: Run TypeScript check**

Run: `npx tsc --noEmit 2>&1 | head -30`
Expected: May have errors from old ROUTES references in other files. Fix in next task.

**Step 3: Commit**

```bash
git add src/renderer/app/routes/index.tsx
git commit -m "feat(nav): rewire routes to 4-area structure"
```

---

### Task 7: Fix Broken Route References

Update all files still referencing old flat ROUTES.DB paths.

**Files to check and update:**
- `src/renderer/widgets/db-top-nav/ui/DbTopNav.tsx` (will be deleted or kept as legacy)
- `src/renderer/widgets/app-sidebar/ui/AppSidebar.tsx` (ROUTES.DB.ROOT still valid)
- Any feature files referencing ROUTES.DB.CONNECTION, ROUTES.DB.QUERY, etc.

**Step 1: Find all broken references**

Run: `npx tsc --noEmit 2>&1 | grep "ROUTES.DB"`

Fix each file by updating the route path to the new structure.

Common mappings:
- `ROUTES.DB.PACKAGE` -> `ROUTES.DB.PACKAGE` (unchanged)
- `ROUTES.DB.CONNECTION` -> `ROUTES.DB.LIVE_CONSOLE.CONNECTION`
- `ROUTES.DB.DIAGRAM` -> `ROUTES.DB.SCHEMA_STUDIO.DIAGRAM`
- `ROUTES.DB.QUERY` -> `ROUTES.DB.LIVE_CONSOLE.EXPLORER`
- `ROUTES.DB.DOCUMENTING` -> `ROUTES.DB.SCHEMA_STUDIO.DOCUMENTING`
- `ROUTES.DB.VALIDATION` -> `ROUTES.DB.SCHEMA_STUDIO.VALIDATION`
- `ROUTES.DB.MOCKING` -> `ROUTES.DB.SCHEMA_STUDIO.MOCKING`

**Step 2: Run TypeScript check again**

Run: `npx tsc --noEmit`
Expected: PASS (0 errors)

**Step 3: Commit**

```bash
git add -A
git commit -m "fix(nav): update all route references to new 4-area structure"
```

---

### Task 8: Remove Old DbTopNav Widget

The flat 7-tab navigation is replaced by AreaToggle + ViewTabs.

**Files:**
- Delete: `src/renderer/widgets/db-top-nav/` (entire directory)

**Step 1: Verify no imports of DbTopNav remain**

Run: `grep -r "db-top-nav\|DbTopNav" src/renderer/ --include="*.tsx" --include="*.ts"`
Expected: No results (DbLayout already updated in Task 4)

**Step 2: Delete the widget**

Run: `rm -rf src/renderer/widgets/db-top-nav`

**Step 3: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: PASS

**Step 4: Commit**

```bash
git add -A
git commit -m "refactor(nav): remove legacy DbTopNav widget"
```

---

### Task 9: Smoke Test

**Step 1: Start the app**

Run: `npm start`

**Step 2: Verify navigation**

- [ ] App loads, sidebar shows [API] [CODE] [DB] [INFRA]
- [ ] Click DB -> shows 4-area toggle: [Overview] [Package] [Schema Studio] [Live Console]
- [ ] Click Overview -> shows placeholder
- [ ] Click Package -> shows existing Package page
- [ ] Click Schema Studio -> shows view tabs: [Diagram] [DDL] [Seed] [Mocking] [Documenting] [Validation]
- [ ] Click Schema Studio > Diagram -> shows existing Diagram page (Virtual/Real/Diff tabs)
- [ ] Click Live Console -> shows view tabs: [Connection] [Diagram] [Data] [SQL] [Explorer] [Query Collection] [Seed] [Validation Run]
- [ ] Click Live Console > Connection -> shows existing Connection page
- [ ] Click Live Console > Explorer -> shows existing Query page
- [ ] Area toggle highlights correct active area
- [ ] View tabs highlight correct active tab

**Step 3: Final commit if any fixes needed**

```bash
git add -A
git commit -m "fix(nav): smoke test fixes for navigation restructure"
```

---

## Summary

| Task | Description | Est. |
|------|-------------|------|
| 1 | Update route constants | 2 min |
| 2 | Create AreaToggle widget | 5 min |
| 3 | Create ViewTabs widget | 5 min |
| 4 | Create area layout components | 5 min |
| 5 | Create Overview placeholder page | 2 min |
| 6 | Rewire routes | 5 min |
| 7 | Fix broken route references | 5 min |
| 8 | Remove old DbTopNav | 2 min |
| 9 | Smoke test | 5 min |
