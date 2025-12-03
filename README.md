# Elysia Simple CRUD

This is a simple CRUD application using ElysiaJS, Prisma, and Prismabox.

## Prerequisites

- Bun
- MySQL Database

## Setup

1. Install dependencies:
   ```bash
   bun install
   ```

2. Configure environment variables:
   Copy `.env` and update `DATABASE_URL` with your MySQL connection string.

3. Generate Prisma Client and Prismabox models:
   ```bash
   bunx prisma generate
   ```

4. Push schema to database:
   ```bash
   bunx prisma db push
   ```

## Run

```bash
bun run src/index.ts
```

## API Documentation

Swagger documentation is available at `http://localhost:3000/swagger`.

## Endpoints

- **Auth**
  - `POST /auth/register`: Register a new user
  - `POST /auth/login`: Login and get JWT

- **Users** (Protected, requires `Authorization: Bearer <token>`)
  - `GET /users/me`: Get current user info
  - `PUT /users/me`: Update current user info
  - `DELETE /users/me`: Delete current user
