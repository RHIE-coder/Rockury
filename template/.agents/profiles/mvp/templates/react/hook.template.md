# React Hook Template

## Basic Custom Hook

```tsx
// hooks/use{HookName}.ts

import { useState, useCallback, useEffect } from 'react';

type Use{HookName}Options = {
  initialValue?: string;
  onChange?: (value: string) => void;
};

type Use{HookName}Return = {
  value: string;
  setValue: (value: string) => void;
  reset: () => void;
};

export const use{HookName} = (
  options: Use{HookName}Options = {}
): Use{HookName}Return => {
  const { initialValue = '', onChange } = options;
  const [value, setValueState] = useState(initialValue);

  const setValue = useCallback((newValue: string) => {
    setValueState(newValue);
    onChange?.(newValue);
  }, [onChange]);

  const reset = useCallback(() => {
    setValueState(initialValue);
  }, [initialValue]);

  return {
    value,
    setValue,
    reset,
  };
};
```

## Query Hook (React Query)

```tsx
// hooks/use{Entity}.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { {entityService} } from '@/services/{entity}';
import type { {Entity}, Create{Entity}Input, Update{Entity}Input } from '@/types/{entity}';

// Query Keys
export const {entity}Keys = {
  all: ['{entity}s'] as const,
  lists: () => [...{entity}Keys.all, 'list'] as const,
  list: (filters: string) => [...{entity}Keys.lists(), { filters }] as const,
  details: () => [...{entity}Keys.all, 'detail'] as const,
  detail: (id: string) => [...{entity}Keys.details(), id] as const,
};

// Get single entity
export const use{Entity} = (id: string) => {
  return useQuery({
    queryKey: {entity}Keys.detail(id),
    queryFn: () => {entityService}.getById(id),
    enabled: !!id,
  });
};

// Get entity list
export const use{Entity}List = (params?: { page?: number; limit?: number }) => {
  return useQuery({
    queryKey: {entity}Keys.list(JSON.stringify(params)),
    queryFn: () => {entityService}.getAll(params),
  });
};

// Create entity
export const useCreate{Entity} = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Create{Entity}Input) => {entityService}.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: {entity}Keys.lists() });
    },
  });
};

// Update entity
export const useUpdate{Entity} = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Update{Entity}Input }) =>
      {entityService}.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: {entity}Keys.detail(id) });
      queryClient.invalidateQueries({ queryKey: {entity}Keys.lists() });
    },
  });
};

// Delete entity
export const useDelete{Entity} = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => {entityService}.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: {entity}Keys.lists() });
    },
  });
};
```

## Infinite Query Hook

```tsx
// hooks/use{Entity}Infinite.ts

import { useInfiniteQuery } from '@tanstack/react-query';
import { {entityService} } from '@/services/{entity}';

export const use{Entity}Infinite = (limit: number = 20) => {
  return useInfiniteQuery({
    queryKey: ['{entity}s', 'infinite', limit],
    queryFn: ({ pageParam = 1 }) =>
      {entityService}.getAll({ page: pageParam, limit }),
    initialPageParam: 1,
    getNextPageParam: (lastPage, pages) => {
      if (lastPage.data.length < limit) return undefined;
      return pages.length + 1;
    },
  });
};
```

## Debounced Value Hook

```tsx
// hooks/useDebouncedValue.ts

import { useState, useEffect } from 'react';

export const useDebouncedValue = <T>(value: T, delay: number = 300): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
};
```

## Local Storage Hook

```tsx
// hooks/useLocalStorage.ts

import { useState, useEffect, useCallback } from 'react';

export const useLocalStorage = <T>(
  key: string,
  initialValue: T
): [T, (value: T | ((prev: T) => T)) => void, () => void] => {
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') return initialValue;

    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const setValue = useCallback((value: T | ((prev: T) => T)) => {
    setStoredValue((prev) => {
      const newValue = value instanceof Function ? value(prev) : value;
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify(newValue));
      }
      return newValue;
    });
  }, [key]);

  const removeValue = useCallback(() => {
    setStoredValue(initialValue);
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(key);
    }
  }, [key, initialValue]);

  return [storedValue, setValue, removeValue];
};
```

## Media Query Hook

```tsx
// hooks/useMediaQuery.ts

import { useState, useEffect } from 'react';

export const useMediaQuery = (query: string): boolean => {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    setMatches(media.matches);

    const listener = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, [query]);

  return matches;
};

// Preset hooks
export const useIsMobile = () => useMediaQuery('(max-width: 767px)');
export const useIsTablet = () => useMediaQuery('(min-width: 768px) and (max-width: 1023px)');
export const useIsDesktop = () => useMediaQuery('(min-width: 1024px)');
```

---

## Checklist

- [ ] Return type explicitly defined
- [ ] Cleanup function in useEffect if needed
- [ ] Dependencies array correct
- [ ] Memoization where appropriate
- [ ] SSR safe (check `typeof window`)
- [ ] Test file created
