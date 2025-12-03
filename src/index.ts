import { Elysia, t } from "elysia";
import { swagger } from "@elysiajs/swagger";
import { jwt } from "@elysiajs/jwt";
import { PrismaClient } from "@prisma/client";
import { UserPlain, UserPlainInputCreate, UserPlainInputUpdate } from "./generated/prismabox/User";

// Initialize Prisma Client
const prisma = new PrismaClient({});

// Define User Response Schema (excluding password)
const UserResponse = t.Omit(UserPlain, ['password']);

const app = new Elysia()
  .use(swagger())
  .use(
    jwt({
      name: "jwt",
      secret: process.env.JWT_SECRET || "secret",
    })
  )
  .group("/auth", (app) =>
    app
      .post(
        "/register",
        async ({ body, set }) => {
          const { password, ...rest } = body;
          // Hash password using Bun's built-in password hashing
          const hashedPassword = await Bun.password.hash(password);

          try {
            const user = await prisma.user.create({
              data: {
                ...rest,
                password: hashedPassword,
              },
            });

            // Return user without password
            const { password: _, ...userWithoutPassword } = user;
            return userWithoutPassword;
          } catch (error: any) {
            // Handle unique constraint violation (P2002)
            if (error.code === 'P2002') {
              set.status = 409;
              return { message: "Email already exists" };
            }
            throw error;
          }
        },
        {
          body: UserPlainInputCreate,
          response: {
            200: UserResponse,
            409: t.Object({ message: t.String() })
          },
          detail: {
            summary: "Register a new user",
            tags: ["Auth"]
          }
        }
      )
      .post(
        "/login",
        async ({ body, jwt, set }) => {
          const user = await prisma.user.findUnique({
            where: { email: body.email },
          });

          if (!user) {
            set.status = 401;
            return { message: "Invalid credentials" };
          }

          const isMatch = await Bun.password.verify(body.password, user.password);

          if (!isMatch) {
            set.status = 401;
            return { message: "Invalid credentials" };
          }

          const token = await jwt.sign({
            id: user.id,
            email: user.email,
          });

          return { token };
        },
        {
          body: t.Object({
            email: t.String(),
            password: t.String(),
          }),
          response: {
            200: t.Object({ token: t.String() }),
            401: t.Object({ message: t.String() })
          },
          detail: {
            summary: "Login user",
            tags: ["Auth"]
          }
        }
      )
  )
  .group("/users", (app) =>
    app
      .derive(async ({ jwt, headers, set }) => {
        const auth = headers["authorization"];
        if (!auth || !auth.startsWith("Bearer ")) {
          set.status = 401;
          throw new Error("Unauthorized");
        }
        const token = auth.slice(7);
        const payload = await jwt.verify(token);
        if (!payload) {
          set.status = 401;
          throw new Error("Unauthorized");
        }
        return { userId: payload.id as string };
      })
      .get(
        "/me",
        async ({ userId, set }) => {
          const user = await prisma.user.findUnique({
            where: { id: userId }
          });
          if (!user) {
            set.status = 404;
            return { message: "User not found" };
          }
          const { password, ...rest } = user;
          return rest;
        },
        {
          response: {
            200: UserResponse,
            404: t.Object({ message: t.String() })
          },
          detail: {
            summary: "Get current user info",
            tags: ["Users"]
          }
        }
      )
      .put(
        "/me",
        async ({ userId, body, set }) => {
          // If password is being updated, hash it
          let dataToUpdate: any = { ...body };
          if (dataToUpdate.password) {
            dataToUpdate.password = await Bun.password.hash(dataToUpdate.password);
          }

          try {
            const user = await prisma.user.update({
              where: { id: userId },
              data: dataToUpdate
            });
            const { password, ...rest } = user;
            return rest;
          } catch (error) {
            set.status = 400;
            return { message: "Could not update user" };
          }
        },
        {
          body: UserPlainInputUpdate,
          response: {
            200: UserResponse,
            400: t.Object({ message: t.String() })
          },
          detail: {
            summary: "Update current user info",
            tags: ["Users"]
          }
        }
      )
      .delete(
        "/me",
        async ({ userId, set }) => {
          await prisma.user.delete({
            where: { id: userId }
          });
          return { message: "User deleted" };
        },
        {
          response: {
            200: t.Object({ message: t.String() })
          },
          detail: {
            summary: "Delete current user",
            tags: ["Users"]
          }
        }
      )
  )
  .listen(3000);

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
);
console.log(`📚 Swagger documentation at ${app.server?.hostname}:${app.server?.port}/swagger`);
