import { randomUUID } from 'node:crypto';
import type { IPrompt, TPromptCategory } from '~/shared/types';

const now = new Date().toISOString();

function makePrompt(
  title: string,
  category: TPromptCategory,
  description: string,
  template: string,
): IPrompt {
  return { id: randomUUID(), title, category, description, template, createdAt: now, updatedAt: now };
}

export const DEFAULT_PROMPTS: IPrompt[] = [
  makePrompt(
    'FSD Page 생성',
    'page-generation',
    'Feature-Sliced Design 패턴에 맞는 새 페이지를 생성합니다.',
    `Create a new FSD page for "{{pageName}}".

Directory: src/renderer/pages/{{pageName}}/
Files needed:
- ui/{{PageName}}Page.tsx  (page component using widgets/features)
- model/ (optional page-level state)
- index.ts (public API exporting the page component)

Requirements:
- Follow FSD import rules (pages can import from widgets, features, entities, shared)
- Use Tailwind CSS for styling
- Use cn() from @/shared/lib/utils for class merging
- Include proper TypeScript types
- Add route in src/renderer/app/routes/index.tsx`,
  ),

  makePrompt(
    'Feature Slice 생성',
    'feature-generation',
    '비즈니스 기능 슬라이스를 FSD 패턴으로 생성합니다.',
    `Create a new feature slice "{{featureName}}" following FSD architecture.

Directory: src/renderer/features/{{featureName}}/
Segments:
- ui/     → {{FeatureName}}Form.tsx, {{FeatureName}}Button.tsx
- model/  → types.ts, {{featureName}}Store.ts (Zustand 5)
- api/    → use{{FeatureName}}Queries.ts (TanStack Query hooks)
- lib/    → validation.ts (if needed)
- index.ts → public API exports

Dependencies: Can import from entities/ and shared/ only.
State management: Zustand 5 with TypeScript.
Data fetching: TanStack React Query via window.electronAPI.
Pattern: useQuery for reads, useMutation for writes with invalidateQueries.`,
  ),

  makePrompt(
    'Entity Slice 생성',
    'entity-generation',
    '비즈니스 엔티티 슬라이스를 FSD 패턴으로 생성합니다.',
    `Create a new entity slice "{{entityName}}" following FSD architecture.

Directory: src/renderer/entities/{{entityName}}/
Segments:
- model/types.ts   → I{{EntityName}} interface, constants
- api/             → {{entityName}}Api.ts (electronAPI wrapper)
- ui/              → {{EntityName}}Card.tsx, {{EntityName}}Row.tsx
- index.ts         → public API

Type definition fields: {{fields}}

UI components should:
- Use CVA (class-variance-authority) for variants
- Use cn() utility from @/shared/lib/utils
- Follow data-slot attribute pattern
- Import only from shared/ layer`,
  ),

  makePrompt(
    'IPC 채널 추가',
    'ipc-addition',
    '새 IPC 채널을 타입-세이프하게 추가합니다.',
    `Add a new IPC channel "{{channelName}}" for {{purpose}}.

Steps (in order):
1. src/shared/ipc/channels.ts
   → Add {{CHANNEL_NAME}} to CHANNELS const

2. src/shared/ipc/events.ts
   → Add event type mapping:
   [CHANNELS.{{CHANNEL_NAME}}]: {
     args: {{argsType}};
     response: { success: boolean; data: {{responseType}} };
   }

3. src/app/preload.ts
   → Add ipcRenderer.invoke binding (auto-typed via TElectronAPI)

4. src/main/ipc/handlers/{{domain}}Handlers.ts
   → Add ipcMain.handle with try/catch

5. src/main/services/{{domain}}Service.ts
   → Add business logic method

Note: TElectronAPI auto-derives from CHANNELS + IEvents, no manual type update needed.`,
  ),

  makePrompt(
    'CRUD 풀셋 생성',
    'crud-fullset',
    'Entity + Feature + Main process CRUD를 전체 레이어에 걸쳐 생성합니다.',
    `Generate full CRUD for "{{entityName}}" across all layers.

=== Shared (IPC Contract) ===
- src/shared/types/{{entityName}}.ts
  → I{{EntityName}}, ICreate{{EntityName}}Request, IUpdate{{EntityName}}Request
- src/shared/ipc/channels.ts
  → GET_{{ENTITY}}_LIST, CREATE_{{ENTITY}}, UPDATE_{{ENTITY}}, DELETE_{{ENTITY}}
- src/shared/ipc/events.ts
  → Type mappings for each channel

=== Main Process (Layered Architecture) ===
- src/main/repositories/{{entityName}}Repository.ts → JSON file CRUD
- src/main/services/{{entityName}}Service.ts → Business logic + ID generation (crypto.randomUUID)
- src/main/ipc/handlers/{{entityName}}Handlers.ts → IPC handlers with try/catch
- Register in src/main/ipc/handlers/index.ts

=== Renderer (Feature-Sliced Design) ===
- src/renderer/entities/{{entityName}}/ → model, api, ui, index.ts
- src/renderer/features/{{entityName}}-crud/ → TanStack Query hooks, Form, DeleteButton
- src/renderer/pages/{{entityName}}s/ → List page composing features

Fields: {{fields}}
Storage: JSON file in userData directory via fileSystem adapter`,
  ),

  makePrompt(
    '컴포넌트 생성',
    'component-generation',
    'CVA + Tailwind 기반 공통 UI 컴포넌트를 생성합니다.',
    `Create a reusable UI component "{{ComponentName}}" in shared layer.

File: src/renderer/shared/components/ui/{{component-name}}.tsx

Pattern (follow existing Button component):
- Use CVA (class-variance-authority) for variant definitions
- Use cn() from @/shared/lib/utils for class merging
- Use React.ComponentProps<"element"> for prop types
- Add data-slot="{{component-name}}" attribute
- Support asChild with Radix UI Slot if interactive

Variants: {{variants}}
Sizes: {{sizes}}

Export both component and variants:
export { {{ComponentName}}, {{componentName}}Variants }`,
  ),
];
