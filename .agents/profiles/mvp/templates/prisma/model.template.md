# Prisma Model Template

## Basic Model

```prisma
// prisma/schema.prisma

model {Entity} {
  id        String   @id @default(uuid())

  // Required fields
  name      String
  email     String   @unique

  // Optional fields
  bio       String?
  avatarUrl String?  @map("avatar_url")

  // Enums
  status    {Entity}Status @default(ACTIVE)
  role      {Entity}Role   @default(USER)

  // Timestamps
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")
  deletedAt DateTime? @map("deleted_at") // Soft delete

  // Relations
  posts     Post[]
  profile   Profile?

  // Indexes
  @@index([email])
  @@index([status, createdAt])
  @@map("{entities}") // Table name in database
}

enum {Entity}Status {
  ACTIVE
  INACTIVE
  SUSPENDED
}

enum {Entity}Role {
  USER
  EDITOR
  ADMIN
}
```

## One-to-One Relation

```prisma
model User {
  id        String   @id @default(uuid())
  email     String   @unique
  profile   Profile?
}

model Profile {
  id        String   @id @default(uuid())
  bio       String?
  avatarUrl String?

  // One-to-one relation
  userId    String   @unique @map("user_id")
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("profiles")
}
```

## One-to-Many Relation

```prisma
model User {
  id    String @id @default(uuid())
  posts Post[]
}

model Post {
  id        String   @id @default(uuid())
  title     String
  content   String
  published Boolean  @default(false)

  // One-to-many relation
  authorId  String   @map("author_id")
  author    User     @relation(fields: [authorId], references: [id], onDelete: Cascade)

  @@index([authorId])
  @@map("posts")
}
```

## Many-to-Many Relation

```prisma
model Post {
  id         String     @id @default(uuid())
  title      String
  categories Category[]
}

model Category {
  id    String @id @default(uuid())
  name  String @unique
  posts Post[]
}

// Prisma handles the join table automatically
// Or define explicit join table:

model Post {
  id         String         @id @default(uuid())
  title      String
  categories PostCategory[]
}

model Category {
  id    String         @id @default(uuid())
  name  String         @unique
  posts PostCategory[]
}

model PostCategory {
  postId     String   @map("post_id")
  categoryId String   @map("category_id")

  post       Post     @relation(fields: [postId], references: [id], onDelete: Cascade)
  category   Category @relation(fields: [categoryId], references: [id], onDelete: Cascade)

  assignedAt DateTime @default(now()) @map("assigned_at")

  @@id([postId, categoryId])
  @@map("post_categories")
}
```

## Self-Relation (Hierarchy)

```prisma
model Category {
  id        String     @id @default(uuid())
  name      String

  // Self-relation
  parentId  String?    @map("parent_id")
  parent    Category?  @relation("CategoryHierarchy", fields: [parentId], references: [id])
  children  Category[] @relation("CategoryHierarchy")

  @@index([parentId])
  @@map("categories")
}
```

## Composite Primary Key

```prisma
model UserRole {
  userId String @map("user_id")
  roleId String @map("role_id")

  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  role   Role   @relation(fields: [roleId], references: [id], onDelete: Cascade)

  assignedAt DateTime @default(now()) @map("assigned_at")
  assignedBy String   @map("assigned_by")

  @@id([userId, roleId])
  @@map("user_roles")
}
```

## JSON Field

```prisma
model Settings {
  id     String @id @default(uuid())
  userId String @unique @map("user_id")

  // JSON field for flexible data
  preferences Json @default("{}")
  metadata    Json?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("settings")
}
```

## Full-Text Search (PostgreSQL)

```prisma
model Article {
  id      String @id @default(uuid())
  title   String
  content String

  @@index([title, content], type: Gin)
  @@map("articles")
}
```

---

## Common Patterns

### Soft Delete
```prisma
model Entity {
  id        String    @id @default(uuid())
  deletedAt DateTime? @map("deleted_at")

  @@index([deletedAt])
}
```

### Audit Fields
```prisma
model Entity {
  id        String   @id @default(uuid())
  createdAt DateTime @default(now()) @map("created_at")
  createdBy String   @map("created_by")
  updatedAt DateTime @updatedAt @map("updated_at")
  updatedBy String?  @map("updated_by")
}
```

### Versioning
```prisma
model Document {
  id        String @id @default(uuid())
  version   Int    @default(1)
  content   String

  @@unique([id, version])
}
```

---

## Migration Commands

```bash
# Create migration
npx prisma migrate dev --name {migration_name}

# Apply migration
npx prisma migrate deploy

# Reset database
npx prisma migrate reset

# Generate client
npx prisma generate

# Studio (GUI)
npx prisma studio
```

## Checklist

- [ ] Use `@map` for snake_case column names
- [ ] Use `@@map` for snake_case table names
- [ ] Add appropriate indexes
- [ ] Define cascade behavior on relations
- [ ] Use appropriate field types
- [ ] Add soft delete if needed
- [ ] Include audit fields
