# React Component Template

## Basic Component

```tsx
// components/features/{ComponentName}/{ComponentName}.tsx

import { Suspense } from 'react';
import { cn } from '@/lib/utils';
import type { ComponentProps } from 'react';

type {ComponentName}Props = {
  /** Required prop description */
  requiredProp: string;
  /** Optional prop description */
  optionalProp?: boolean;
  /** Additional CSS classes */
  className?: string;
};

export function {ComponentName}({
  requiredProp,
  optionalProp = false,
  className,
}: {ComponentName}Props) {
  return (
    <div className={cn('base-styles', className)}>
      {/* Component content */}
    </div>
  );
}
```

## Component with Data Fetching

```tsx
// components/features/{ComponentName}/{ComponentName}.tsx

'use client';

import { Suspense } from 'react';
import { useQuery } from '@tanstack/react-query';
import { {serviceName} } from '@/services/{serviceName}';
import { {ComponentName}Skeleton } from './{ComponentName}Skeleton';
import { ErrorBoundary } from '@/components/ui/error-boundary';

type {ComponentName}Props = {
  id: string;
};

function {ComponentName}Content({ id }: {ComponentName}Props) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['{queryKey}', id],
    queryFn: () => {serviceName}.getById(id),
  });

  if (isLoading) return <{ComponentName}Skeleton />;
  if (error) throw error;
  if (!data) return null;

  return (
    <div>
      {/* Render data */}
    </div>
  );
}

export function {ComponentName}({ id }: {ComponentName}Props) {
  return (
    <ErrorBoundary fallback={<div>Error loading data</div>}>
      <Suspense fallback={<{ComponentName}Skeleton />}>
        <{ComponentName}Content id={id} />
      </Suspense>
    </ErrorBoundary>
  );
}
```

## Component with Form

```tsx
// components/features/{FormName}/{FormName}.tsx

'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

const {formName}Schema = z.object({
  fieldName: z.string().min(1, 'Required'),
  email: z.string().email('Invalid email'),
});

type {FormName}Values = z.infer<typeof {formName}Schema>;

type {FormName}Props = {
  onSubmit: (values: {FormName}Values) => void;
  defaultValues?: Partial<{FormName}Values>;
  isLoading?: boolean;
};

export function {FormName}({
  onSubmit,
  defaultValues,
  isLoading = false,
}: {FormName}Props) {
  const form = useForm<{FormName}Values>({
    resolver: zodResolver({formName}Schema),
    defaultValues: {
      fieldName: '',
      email: '',
      ...defaultValues,
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="fieldName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Field Label</FormLabel>
              <FormControl>
                <Input placeholder="Enter value" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Submitting...' : 'Submit'}
        </Button>
      </form>
    </Form>
  );
}
```

## Skeleton Component

```tsx
// components/features/{ComponentName}/{ComponentName}Skeleton.tsx

import { Skeleton } from '@/components/ui/skeleton';

export function {ComponentName}Skeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-1/3" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-2/3" />
    </div>
  );
}
```

## Index Export

```tsx
// components/features/{ComponentName}/index.ts

export { {ComponentName} } from './{ComponentName}';
export { {ComponentName}Skeleton } from './{ComponentName}Skeleton';
export type { {ComponentName}Props } from './{ComponentName}';
```

---

## Directory Structure

```
components/features/{ComponentName}/
├── {ComponentName}.tsx           # Main component
├── {ComponentName}Skeleton.tsx   # Loading skeleton
├── {ComponentName}.test.tsx      # Tests
└── index.ts                      # Exports
```

## Checklist

- [ ] Props type defined with JSDoc
- [ ] Loading state handled (Suspense/Skeleton)
- [ ] Error state handled (ErrorBoundary)
- [ ] Accessible (ARIA, semantic HTML)
- [ ] Responsive design
- [ ] Test file created
