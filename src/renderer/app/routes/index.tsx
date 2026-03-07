import { Routes, Route, Navigate } from 'react-router';
import { ROUTES } from '@/shared/config/constants';
import { AppLayout } from '../layouts/AppLayout';
import { DbLayout } from '../layouts/DbLayout';
import { SchemaStudioLayout } from '../layouts/SchemaStudioLayout';
import { LiveConsoleLayout } from '../layouts/LiveConsoleLayout';
import { DbOverviewPage } from '@/pages/db-overview';
import { DbPackagePage } from '@/pages/db-package';
import { DbConnectionPage } from '@/pages/db-connection';
import { StudioDiagramPage, ConsoleDiagramPage } from '@/pages/db-diagram';
import { StudioDdlPage } from '@/pages/db-ddl';
import { ExplorerPage } from '@/pages/db-explorer';
import { QueryCollectionPage } from '@/pages/db-query-collection';
import { DbDocumentingPage } from '@/pages/db-documenting';
import { DbValidationPage } from '@/pages/db-validation';
import { DbMockingPage } from '@/pages/db-mocking';
import { PlaceholderPage } from '@/pages/placeholder';
import { NotFoundPage } from '@/pages/not-found';

export function AppRouter() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        {/* Root redirect to DB Overview */}
        <Route index element={<Navigate to={ROUTES.DB.OVERVIEW} replace />} />

        {/* DB Service */}
        <Route path="db" element={<DbLayout />}>
          <Route index element={<Navigate to={ROUTES.DB.OVERVIEW} replace />} />
          <Route path="overview" element={<DbOverviewPage />} />
          <Route path="package" element={<DbPackagePage />} />

          {/* Schema Studio */}
          <Route path="studio" element={<SchemaStudioLayout />}>
            <Route index element={<Navigate to={ROUTES.DB.SCHEMA_STUDIO.DIAGRAM} replace />} />
            <Route path="diagram" element={<StudioDiagramPage />} />
            <Route path="ddl" element={<StudioDdlPage />} />
            <Route path="seed" element={<PlaceholderPage service="Seed" />} />
            <Route path="mocking" element={<DbMockingPage />} />
            <Route path="documenting" element={<DbDocumentingPage />} />
            <Route path="validation" element={<DbValidationPage />} />
          </Route>

          {/* Live Console */}
          <Route path="console" element={<LiveConsoleLayout />}>
            <Route index element={<Navigate to={ROUTES.DB.LIVE_CONSOLE.CONNECTION} replace />} />
            <Route path="connection" element={<DbConnectionPage />} />
            <Route path="diagram" element={<ConsoleDiagramPage />} />
            <Route path="data" element={<PlaceholderPage service="Data Browser" />} />
            <Route path="sql" element={<PlaceholderPage service="SQL Definition Viewer" />} />
            <Route path="explorer" element={<ExplorerPage />} />
            <Route path="query-collection" element={<QueryCollectionPage />} />
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
