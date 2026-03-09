# Unit Test Template

## Service Test

```typescript
// __tests__/unit/services/{entity}.service.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { {entity}Service } from '@/services/{entity}.service';
import { prisma } from '@/lib/prisma';

// Mock Prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    {entity}: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
  },
}));

describe('{Entity}Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getById', () => {
    it('should return {entity} when found', async () => {
      // Arrange
      const mock{Entity} = {
        id: '123',
        name: 'Test',
        createdAt: new Date(),
      };
      vi.mocked(prisma.{entity}.findUnique).mockResolvedValue(mock{Entity});

      // Act
      const result = await {entity}Service.getById('123');

      // Assert
      expect(result).toEqual(mock{Entity});
      expect(prisma.{entity}.findUnique).toHaveBeenCalledWith({
        where: { id: '123' },
        select: expect.any(Object),
      });
    });

    it('should return null when {entity} not found', async () => {
      // Arrange
      vi.mocked(prisma.{entity}.findUnique).mockResolvedValue(null);

      // Act
      const result = await {entity}Service.getById('nonexistent');

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('should create {entity} with valid data', async () => {
      // Arrange
      const input = { name: 'New {Entity}', createdBy: 'user-123' };
      const created = { id: '456', ...input, createdAt: new Date() };
      vi.mocked(prisma.{entity}.create).mockResolvedValue(created);

      // Act
      const result = await {entity}Service.create(input);

      // Assert
      expect(result).toEqual(created);
      expect(prisma.{entity}.create).toHaveBeenCalledWith({
        data: input,
        select: expect.any(Object),
      });
    });
  });

  describe('getAll', () => {
    it('should return paginated {entities}', async () => {
      // Arrange
      const mock{Entities} = [
        { id: '1', name: 'First' },
        { id: '2', name: 'Second' },
      ];
      vi.mocked(prisma.{entity}.findMany).mockResolvedValue(mock{Entities});
      vi.mocked(prisma.{entity}.count).mockResolvedValue(10);

      // Act
      const result = await {entity}Service.getAll({ page: 1, limit: 2 });

      // Assert
      expect(result.data).toEqual(mock{Entities});
      expect(result.total).toBe(10);
      expect(prisma.{entity}.findMany).toHaveBeenCalledWith({
        skip: 0,
        take: 2,
        orderBy: { createdAt: 'desc' },
        select: expect.any(Object),
      });
    });

    it('should apply correct offset for pagination', async () => {
      // Arrange
      vi.mocked(prisma.{entity}.findMany).mockResolvedValue([]);
      vi.mocked(prisma.{entity}.count).mockResolvedValue(0);

      // Act
      await {entity}Service.getAll({ page: 3, limit: 10 });

      // Assert
      expect(prisma.{entity}.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 20, take: 10 })
      );
    });
  });
});
```

## Utility Function Test

```typescript
// __tests__/unit/utils/formatDate.test.ts

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { formatDate, formatRelativeTime } from '@/lib/utils/date';

describe('formatDate', () => {
  it('should format date in default format', () => {
    const date = new Date('2024-01-15T10:30:00Z');

    expect(formatDate(date)).toBe('2024-01-15');
  });

  it('should format date with custom format', () => {
    const date = new Date('2024-01-15T10:30:00Z');

    expect(formatDate(date, 'YYYY/MM/DD')).toBe('2024/01/15');
  });

  it('should handle string date input', () => {
    expect(formatDate('2024-01-15')).toBe('2024-01-15');
  });

  it('should return empty string for invalid date', () => {
    expect(formatDate('invalid')).toBe('');
    expect(formatDate(null)).toBe('');
    expect(formatDate(undefined)).toBe('');
  });
});

describe('formatRelativeTime', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-15T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return "just now" for recent times', () => {
    const date = new Date('2024-01-15T11:59:30Z');

    expect(formatRelativeTime(date)).toBe('just now');
  });

  it('should return minutes ago', () => {
    const date = new Date('2024-01-15T11:55:00Z');

    expect(formatRelativeTime(date)).toBe('5 minutes ago');
  });

  it('should return hours ago', () => {
    const date = new Date('2024-01-15T10:00:00Z');

    expect(formatRelativeTime(date)).toBe('2 hours ago');
  });

  it('should return days ago', () => {
    const date = new Date('2024-01-13T12:00:00Z');

    expect(formatRelativeTime(date)).toBe('2 days ago');
  });
});
```

## Custom Hook Test

```typescript
// __tests__/unit/hooks/useAuth.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useAuth } from '@/hooks/useAuth';
import { authService } from '@/services/auth';

vi.mock('@/services/auth', () => ({
  authService: {
    login: vi.fn(),
    logout: vi.fn(),
    getCurrentUser: vi.fn(),
  },
}));

describe('useAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with loading state', () => {
    vi.mocked(authService.getCurrentUser).mockReturnValue(Promise.resolve(null));

    const { result } = renderHook(() => useAuth());

    expect(result.current.isLoading).toBe(true);
    expect(result.current.user).toBeNull();
  });

  it('should set user after successful login', async () => {
    const mockUser = { id: '1', email: 'test@example.com' };
    vi.mocked(authService.login).mockResolvedValue(mockUser);
    vi.mocked(authService.getCurrentUser).mockResolvedValue(null);

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.login('test@example.com', 'password');
    });

    expect(result.current.user).toEqual(mockUser);
    expect(result.current.isAuthenticated).toBe(true);
  });

  it('should clear user after logout', async () => {
    const mockUser = { id: '1', email: 'test@example.com' };
    vi.mocked(authService.getCurrentUser).mockResolvedValue(mockUser);
    vi.mocked(authService.logout).mockResolvedValue(undefined);

    const { result } = renderHook(() => useAuth());

    await waitFor(() => {
      expect(result.current.user).toEqual(mockUser);
    });

    await act(async () => {
      await result.current.logout();
    });

    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('should handle login error', async () => {
    vi.mocked(authService.login).mockRejectedValue(new Error('Invalid credentials'));
    vi.mocked(authService.getCurrentUser).mockResolvedValue(null);

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      try {
        await result.current.login('wrong@example.com', 'wrong');
      } catch (error) {
        // Expected error
      }
    });

    expect(result.current.user).toBeNull();
    expect(result.current.error).toBe('Invalid credentials');
  });
});
```

## Zod Schema Test

```typescript
// __tests__/unit/schemas/{entity}.schema.test.ts

import { describe, it, expect } from 'vitest';
import { create{Entity}Schema, update{Entity}Schema } from '@/schemas/{entity}.schema';

describe('create{Entity}Schema', () => {
  it('should validate correct input', () => {
    const input = {
      body: {
        name: 'Valid Name',
        email: 'test@example.com',
      },
    };

    const result = create{Entity}Schema.safeParse(input);

    expect(result.success).toBe(true);
  });

  it('should reject empty name', () => {
    const input = {
      body: {
        name: '',
        email: 'test@example.com',
      },
    };

    const result = create{Entity}Schema.safeParse(input);

    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toContain('name');
  });

  it('should reject invalid email', () => {
    const input = {
      body: {
        name: 'Valid Name',
        email: 'not-an-email',
      },
    };

    const result = create{Entity}Schema.safeParse(input);

    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toContain('email');
  });

  it('should reject name exceeding max length', () => {
    const input = {
      body: {
        name: 'a'.repeat(101),
        email: 'test@example.com',
      },
    };

    const result = create{Entity}Schema.safeParse(input);

    expect(result.success).toBe(false);
  });
});

describe('update{Entity}Schema', () => {
  it('should validate with partial body', () => {
    const input = {
      params: { id: '123e4567-e89b-12d3-a456-426614174000' },
      body: { name: 'Updated Name' },
    };

    const result = update{Entity}Schema.safeParse(input);

    expect(result.success).toBe(true);
  });

  it('should reject invalid UUID', () => {
    const input = {
      params: { id: 'not-a-uuid' },
      body: { name: 'Updated Name' },
    };

    const result = update{Entity}Schema.safeParse(input);

    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toContain('id');
  });
});
```

---

## Test Setup

```typescript
// vitest.setup.ts

import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Global mocks
vi.mock('@/lib/prisma');

// Reset mocks between tests
beforeEach(() => {
  vi.clearAllMocks();
});
```

## Checklist

- [ ] AAA pattern (Arrange-Act-Assert)
- [ ] Descriptive test names
- [ ] Edge cases covered
- [ ] Error scenarios tested
- [ ] Mocks properly cleaned up
- [ ] No test interdependencies
