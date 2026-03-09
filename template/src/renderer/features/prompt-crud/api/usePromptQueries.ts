import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { promptApi } from '@/entities/prompt';
import type { ICreatePromptRequest, IUpdatePromptRequest } from '@/entities/prompt';

const PROMPT_QUERY_KEY = ['prompts'] as const;

export function usePrompts() {
  return useQuery({
    queryKey: PROMPT_QUERY_KEY,
    queryFn: async () => {
      const result = await promptApi.getAll();
      if (!result.success) throw new Error('Failed to fetch prompts');
      return result.data;
    },
  });
}

export function useCreatePrompt() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: ICreatePromptRequest) => {
      const result = await promptApi.create(data);
      if (!result.success) throw new Error('Failed to create prompt');
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROMPT_QUERY_KEY });
    },
  });
}

export function useUpdatePrompt() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: IUpdatePromptRequest) => {
      const result = await promptApi.update(data);
      if (!result.success) throw new Error('Failed to update prompt');
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROMPT_QUERY_KEY });
    },
  });
}

export function useDeletePrompt() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const result = await promptApi.delete(id);
      if (!result.success) throw new Error('Failed to delete prompt');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROMPT_QUERY_KEY });
    },
  });
}
