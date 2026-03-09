# Installation Guide

## Prerequisites

- Node.js 18+
- npm 9+

---

## Required Dependencies

### 1. React Core

```bash
npm install react react-dom
npm install -D @types/react @types/react-dom @vitejs/plugin-react
```

### 2. Tailwind CSS

```bash
npm install -D tailwindcss @tailwindcss/vite
```

### 3. UI Utilities

```bash
npm install clsx tailwind-merge
```

---

## One-liner Installation

```bash
npm install react react-dom clsx tailwind-merge && npm install -D @types/react @types/react-dom @vitejs/plugin-react tailwindcss @tailwindcss/vite
```

---

## Optional Dependencies

### State Management (Zustand)

```bash
npm install zustand
```

### React Router

```bash
npm install react-router
```

### Data Fetching (React Query)

```bash
npm install @tanstack/react-query
```

### UI Component Library (shadcn/ui dependencies)

```bash
npm install class-variance-authority lucide-react
```

---

## Project Structure

```
src/
├── app/                    # Electron main process entry
│   ├── main.ts             # Main process entry point
│   ├── preload.ts          # Preload script (IPC bridge)
│   ├── windows.ts          # Window factory
│   └── windows-config.ts   # Window configuration
│
├── main/                   # Main process business logic
│   ├── ipc/                # IPC handlers
│   └── services/           # Main process services
│
├── renderer/               # React UI (renderer process)
│   ├── app/                # App entry points
│   ├── components/         # Reusable UI components
│   ├── pages/              # Page components
│   ├── stores/             # Zustand stores
│   └── shared/             # Shared utilities (ui, hooks, lib)
│
└── shared/                 # Shared between main & renderer
    ├── ipc/                # IPC channels & types
    └── types/              # Shared type definitions
```

---

## Path Aliases

| Alias | Path | Usage |
|-------|------|-------|
| `~/*` | `src/*` | All source files |
| `@/*` | `src/renderer/*` | Renderer process only |
| `#/*` | `src/main/*` | Main process only |

### Usage Examples

```typescript
// Import from shared
import { CHANNELS } from '~/shared/ipc/channels';

// Import from renderer
import { Button } from '@/shared/ui/button';

// Import from main process
import { fileSystemManager } from '#/services/fileSystemManager';
```

---

## Running the App

```bash
# Development
npm start

# Build
npm run package

# Create distributables
npm run make
```

---

## Troubleshooting

### TypeScript path alias not working

Ensure `tsconfig.json` has the correct paths configuration:

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "~/*": ["src/*"],
      "@/*": ["src/renderer/*"],
      "#/*": ["src/main/*"]
    }
  }
}
```

### Vite alias not resolving

Check `vite.common.config.ts` for alias configuration:

```typescript
export const alias = {
  '~': path.resolve(__dirname, 'src'),
  '@': path.resolve(__dirname, 'src/renderer'),
  '#': path.resolve(__dirname, 'src/main'),
};
```
