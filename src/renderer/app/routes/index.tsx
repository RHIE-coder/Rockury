import { Routes, Route, Navigate } from 'react-router';
import { ROUTES } from '@/shared/config/constants';
import { AppLayout } from '../layouts/AppLayout';
import { DbLayout } from '../layouts/DbLayout';
import { DbPackagePage } from '@/pages/db-package';
import { DbConnectionPage } from '@/pages/db-connection';
import { DbDiagramPage } from '@/pages/db-diagram';
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
        {/* Root redirect to DB Package */}
        <Route index element={<Navigate to={ROUTES.DB.PACKAGE} replace />} />

        {/* DB Service */}
        <Route path="db" element={<DbLayout />}>
          <Route index element={<Navigate to={ROUTES.DB.PACKAGE} replace />} />
          <Route path="package" element={<DbPackagePage />} />
          <Route path="connection" element={<DbConnectionPage />} />
          <Route path="diagram" element={<DbDiagramPage />} />
          <Route path="query" element={<DbQueryPage />} />
          <Route path="documenting" element={<DbDocumentingPage />} />
          <Route path="validation" element={<DbValidationPage />} />
          <Route path="mocking" element={<DbMockingPage />} />
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
