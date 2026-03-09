export interface IPrompt {
  id: string;
  title: string;
  category: TPromptCategory;
  description: string;
  template: string;
  createdAt: string;
  updatedAt: string;
}

export type TPromptCategory =
  | 'page-generation'
  | 'feature-generation'
  | 'entity-generation'
  | 'ipc-addition'
  | 'crud-fullset'
  | 'component-generation';

export const PROMPT_CATEGORY_LABELS: Record<TPromptCategory, string> = {
  'page-generation': 'Page 생성',
  'feature-generation': 'Feature 생성',
  'entity-generation': 'Entity 생성',
  'ipc-addition': 'IPC 추가',
  'crud-fullset': 'CRUD 풀셋',
  'component-generation': '컴포넌트 생성',
};

export interface ICreatePromptRequest {
  title: string;
  category: TPromptCategory;
  description: string;
  template: string;
}

export interface IUpdatePromptRequest {
  id: string;
  title?: string;
  category?: TPromptCategory;
  description?: string;
  template?: string;
}
