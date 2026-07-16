import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  completeFocusSession,
  completeMission,
  createJournalEntry,
  createMission,
  createUser,
  deleteMission,
  duplicateMission,
  getDashboardData,
  getEvolution,
  getStatistics,
  getUserByUsername,
  listMissions,
  listUsersByStatus,
  markNotificationsRead,
  notifyAdmins,
  setUserStatus,
  updateMission,
} from "./db";
import type { User } from "../drizzle/schema";
import { getSessionCookieOptions } from "./_core/cookies";
import { hashPassword, verifyPassword } from "./_core/password";
import { sdk } from "./_core/sdk";
import { systemRouter } from "./_core/systemRouter";
import { adminProcedure, protectedProcedure, publicProcedure, router } from "./_core/trpc";

/** Remove o hash de senha antes de devolver o usuário ao cliente. */
function toPublicUser(user: User | null | undefined) {
  if (!user) return null;
  const { passwordHash, ...safe } = user;
  return safe;
}

export const missionInput = z.object({
  title: z.string().trim().min(3).max(160),
  description: z.string().trim().max(1000).optional(),
  type: z.enum(["daily", "weekly", "monthly", "unique", "epic", "challenge", "secret"]),
  category: z.string().trim().min(2).max(48),
  xpReward: z.number().int().min(5).max(5000),
  durationMinutes: z.number().int().min(0).max(1440),
  skillSlug: z.string().trim().max(48).nullable().optional(),
  priority: z.enum(["low", "medium", "high", "critical"]),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => toPublicUser(opts.ctx.user)),
    register: publicProcedure
      .input(z.object({
        username: z.string().trim().min(3).max(40)
          .regex(/^[a-zA-Z0-9._-]+$/, "Use apenas letras, números, ponto, hífen ou sublinhado."),
        password: z.string().min(4).max(200),
        name: z.string().trim().max(80).optional(),
      }))
      .mutation(async ({ input }) => {
        const existing = await getUserByUsername(input.username);
        if (existing) {
          throw new TRPCError({ code: "CONFLICT", message: "Este usuário já está em uso." });
        }
        await createUser({
          username: input.username,
          passwordHash: hashPassword(input.password),
          name: input.name || input.username,
          role: "user",
          status: "pending",
        });
        await notifyAdmins("NOVO CADASTRO", `${input.username} solicitou acesso ao Sistema.`);
        return { status: "pending" as const };
      }),
    login: publicProcedure
      .input(z.object({ username: z.string().trim().min(1), password: z.string().min(1) }))
      .mutation(async ({ ctx, input }) => {
        const user = await getUserByUsername(input.username);
        if (!user || !verifyPassword(input.password, user.passwordHash)) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Usuário ou senha inválidos." });
        }
        if (user.status === "pending") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Cadastro aguardando liberação do administrador." });
        }
        if (user.status === "rejected") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Acesso negado pelo administrador." });
        }

        const token = await sdk.createSessionToken(user.openId, {
          name: user.name || user.username,
          expiresInMs: ONE_YEAR_MS,
        });
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge: ONE_YEAR_MS });

        return { success: true } as const;
      }),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  admin: router({
    pendingUsers: adminProcedure.query(async () => {
      const pending = await listUsersByStatus("pending");
      return pending.map(toPublicUser);
    }),
    setUserStatus: adminProcedure
      .input(z.object({ userId: z.number().int().positive(), status: z.enum(["approved", "rejected"]) }))
      .mutation(async ({ input }) => {
        const updated = await setUserStatus(input.userId, input.status);
        return toPublicUser(updated);
      }),
  }),
  dashboard: router({
    get: protectedProcedure.query(({ ctx }) => getDashboardData(ctx.user.id)),
  }),
  missions: router({
    list: protectedProcedure.query(({ ctx }) => listMissions(ctx.user.id)),
    create: protectedProcedure.input(missionInput).mutation(({ ctx, input }) => createMission(ctx.user.id, input)),
    update: protectedProcedure
      .input(z.object({ id: z.number().int().positive(), data: missionInput.partial() }))
      .mutation(({ ctx, input }) => updateMission(ctx.user.id, input.id, input.data)),
    delete: protectedProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(({ ctx, input }) => deleteMission(ctx.user.id, input.id)),
    duplicate: protectedProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(({ ctx, input }) => duplicateMission(ctx.user.id, input.id)),
    complete: protectedProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(({ ctx, input }) => completeMission(ctx.user.id, input.id)),
  }),
  focus: router({
    complete: protectedProcedure
      .input(z.object({ skillSlug: z.string().min(1), minutes: z.number().int().min(1).max(180) }))
      .mutation(({ ctx, input }) => completeFocusSession(ctx.user.id, input.skillSlug, input.minutes)),
  }),
  statistics: router({
    get: protectedProcedure.query(({ ctx }) => getStatistics(ctx.user.id)),
  }),
  evolution: router({
    get: protectedProcedure.query(({ ctx }) => getEvolution(ctx.user.id)),
    createJournalEntry: protectedProcedure
      .input(z.object({
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        title: z.string().trim().min(3).max(160),
        content: z.string().trim().min(5).max(5000),
        mood: z.enum(["focused", "proud", "neutral", "tired", "challenged"]),
      }))
      .mutation(({ ctx, input }) => createJournalEntry(ctx.user.id, input)),
  }),
  notifications: router({
    markAllRead: protectedProcedure.mutation(({ ctx }) => markNotificationsRead(ctx.user.id)),
  }),
});

export type AppRouter = typeof appRouter;
