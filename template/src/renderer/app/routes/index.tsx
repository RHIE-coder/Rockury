import { Routes, Route } from 'react-router';
import { HomePage } from '@/pages/home';
import { PromptsPage } from '@/pages/prompts';

export function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/prompts" element={<PromptsPage />} />
    </Routes>
  );
}
