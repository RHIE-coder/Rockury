import { Routes, Route } from 'react-router';

export function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<div>Hello</div>} />
    </Routes>
  );
}
