import { COOKIE_NAME } from "@shared/const";
import { z } from "zod";
import {
  completeFocusSession,
  completeMission,
  createJournalEntry,
  createMission,
  deleteMission,
  duplicateMission,
  getDashboardData,
  getEvolution,
  getStatistics,
  listMissions,
  markNotificationsRead,
  updateMission,
} from "./db";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";

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
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  dashboard: router({
    get: publicProcedure.query(() => getDashboardData()),
  }),
  missions: router({
    list: publicProcedure.query(() => listMissions()),
    create: publicProcedure.input(missionInput).mutation(({ input }) => createMission(input)),
    update: publicProcedure
      .input(z.object({ id: z.number().int().positive(), data: missionInput.partial() }))
      .mutation(({ input }) => updateMission(input.id, input.data)),
    delete: publicProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(({ input }) => deleteMission(input.id)),
    duplicate: publicProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(({ input }) => duplicateMission(input.id)),
    complete: publicProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(({ input }) => completeMission(input.id)),
  }),
  focus: router({
    complete: publicProcedure
      .input(z.object({ skillSlug: z.string().min(1), minutes: z.number().int().min(1).max(180) }))
      .mutation(({ input }) => completeFocusSession(input.skillSlug, input.minutes)),
  }),
  statistics: router({
    get: publicProcedure.query(() => getStatistics()),
  }),
  evolution: router({
    get: publicProcedure.query(() => getEvolution()),
    createJournalEntry: publicProcedure
      .input(z.object({
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        title: z.string().trim().min(3).max(160),
        content: z.string().trim().min(5).max(5000),
        mood: z.enum(["focused", "proud", "neutral", "tired", "challenged"]),
      }))
      .mutation(({ input }) => createJournalEntry(input)),
  }),
  notifications: router({
    markAllRead: publicProcedure.mutation(() => markNotificationsRead()),
  }),
});

export type AppRouter = typeof appRouter;
