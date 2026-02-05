import { Routes, Route } from 'react-router';

// Import pages here
// import { HomePage } from '@/pages/home';
// import { SettingsPage } from '@/pages/settings';

export function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<div>Home</div>} />
      {/* Add routes here */}
      {/* <Route path="/" element={<HomePage />} /> */}
      {/* <Route path="/settings" element={<SettingsPage />} /> */}
    </Routes>
  );
}
