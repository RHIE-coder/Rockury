# Express Route Template

## Router

```typescript
// routes/{entity}.routes.ts

import { Router } from 'express';
import { {entity}Controller } from '@/controllers/{entity}.controller';
import { validate } from '@/middlewares/validate';
import { authenticate } from '@/middlewares/authenticate';
import { requirePermission } from '@/middlewares/authorize';
import {
  create{Entity}Schema,
  update{Entity}Schema,
  get{Entity}Schema,
  list{Entity}Schema,
} from '@/schemas/{entity}.schema';

const router = Router();

// Apply authentication to all routes
router.use(authenticate);

/**
 * @route GET /api/{entities}
 * @desc Get all {entities} with pagination
 * @access Private
 */
router.get(
  '/',
  validate(list{Entity}Schema),
  {entity}Controller.getAll
);

/**
 * @route GET /api/{entities}/:id
 * @desc Get {entity} by ID
 * @access Private
 */
router.get(
  '/:id',
  validate(get{Entity}Schema),
  {entity}Controller.getById
);

/**
 * @route POST /api/{entities}
 * @desc Create new {entity}
 * @access Private
 */
router.post(
  '/',
  validate(create{Entity}Schema),
  {entity}Controller.create
);

/**
 * @route PUT /api/{entities}/:id
 * @desc Update {entity}
 * @access Private
 */
router.put(
  '/:id',
  validate(update{Entity}Schema),
  {entity}Controller.update
);

/**
 * @route DELETE /api/{entities}/:id
 * @desc Delete {entity}
 * @access Private (Admin only)
 */
router.delete(
  '/:id',
  requirePermission('admin'),
  validate(get{Entity}Schema),
  {entity}Controller.delete
);

export { router as {entity}Router };
```

## Controller

```typescript
// controllers/{entity}.controller.ts

import { Request, Response, NextFunction } from 'express';
import { {entity}Service } from '@/services/{entity}.service';
import { AppError } from '@/utils/AppError';
import type { AuthenticatedRequest } from '@/types/express';

export const {entity}Controller = {
  /**
   * Get all {entities} with pagination
   */
  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const { page = 1, limit = 20 } = req.validated.query;

      const result = await {entity}Service.getAll({ page, limit });

      res.json({
        data: result.data,
        pagination: {
          page,
          limit,
          total: result.total,
          totalPages: Math.ceil(result.total / limit),
        },
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get {entity} by ID
   */
  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.validated.params;

      const {entity} = await {entity}Service.getById(id);

      if (!{entity}) {
        throw new AppError('{Entity} not found', 404, '{ENTITY}_NOT_FOUND');
      }

      res.json({ data: {entity} });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Create new {entity}
   */
  async create(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = req.validated.body;
      const userId = req.user.id;

      const {entity} = await {entity}Service.create({
        ...data,
        createdBy: userId,
      });

      res.status(201).json({ data: {entity} });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Update {entity}
   */
  async update(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.validated.params;
      const data = req.validated.body;

      const {entity} = await {entity}Service.update(id, data);

      if (!{entity}) {
        throw new AppError('{Entity} not found', 404, '{ENTITY}_NOT_FOUND');
      }

      res.json({ data: {entity} });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Delete {entity}
   */
  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.validated.params;

      const deleted = await {entity}Service.delete(id);

      if (!deleted) {
        throw new AppError('{Entity} not found', 404, '{ENTITY}_NOT_FOUND');
      }

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  },
};
```

## Service

```typescript
// services/{entity}.service.ts

import { prisma } from '@/lib/prisma';
import type {
  Create{Entity}Input,
  Update{Entity}Input,
} from '@/schemas/{entity}.schema';

export const {entity}Service = {
  /**
   * Get all {entities} with pagination
   */
  async getAll(params: { page: number; limit: number }) {
    const { page, limit } = params;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      prisma.{entity}.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          // ... select fields
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.{entity}.count(),
    ]);

    return { data, total };
  },

  /**
   * Get {entity} by ID
   */
  async getById(id: string) {
    return prisma.{entity}.findUnique({
      where: { id },
      select: {
        id: true,
        // ... select fields
        createdAt: true,
        updatedAt: true,
      },
    });
  },

  /**
   * Create new {entity}
   */
  async create(data: Create{Entity}Input & { createdBy: string }) {
    return prisma.{entity}.create({
      data,
      select: {
        id: true,
        // ... select fields
        createdAt: true,
      },
    });
  },

  /**
   * Update {entity}
   */
  async update(id: string, data: Update{Entity}Input) {
    return prisma.{entity}.update({
      where: { id },
      data,
      select: {
        id: true,
        // ... select fields
        updatedAt: true,
      },
    });
  },

  /**
   * Delete {entity}
   */
  async delete(id: string) {
    try {
      await prisma.{entity}.delete({ where: { id } });
      return true;
    } catch {
      return false;
    }
  },
};
```

## Schema (Zod)

```typescript
// schemas/{entity}.schema.ts

import { z } from 'zod';

// Create schema
export const create{Entity}Schema = z.object({
  body: z.object({
    name: z.string().min(1, 'Name is required').max(100),
    description: z.string().max(500).optional(),
    // ... other fields
  }),
});

// Update schema
export const update{Entity}Schema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid ID format'),
  }),
  body: z.object({
    name: z.string().min(1).max(100).optional(),
    description: z.string().max(500).optional(),
    // ... other fields
  }),
});

// Get by ID schema
export const get{Entity}Schema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid ID format'),
  }),
});

// List schema
export const list{Entity}Schema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
    search: z.string().optional(),
    sortBy: z.enum(['createdAt', 'name']).default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
  }),
});

// Type exports
export type Create{Entity}Input = z.infer<typeof create{Entity}Schema>['body'];
export type Update{Entity}Input = z.infer<typeof update{Entity}Schema>['body'];
```

---

## Directory Structure

```
src/
├── routes/
│   └── {entity}.routes.ts
├── controllers/
│   └── {entity}.controller.ts
├── services/
│   └── {entity}.service.ts
├── schemas/
│   └── {entity}.schema.ts
└── __tests__/
    ├── unit/
    │   └── services/{entity}.service.test.ts
    └── integration/
        └── routes/{entity}.routes.test.ts
```

## Checklist

- [ ] All inputs validated with Zod
- [ ] Proper error handling
- [ ] Authentication applied
- [ ] Authorization for sensitive operations
- [ ] Pagination implemented
- [ ] Response format consistent
- [ ] Test files created
