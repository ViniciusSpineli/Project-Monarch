import { APP_ID, COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { ForbiddenError } from "@shared/_core/errors";
import { parse as parseCookieHeader } from "cookie";
import type { Request } from "express";
import { SignJWT, jwtVerify } from "jose";
import type { User } from "../../drizzle/schema";
import * as db from "../db";
import { ENV } from "./env";

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.length > 0;

export type SessionPayload = {
  openId: string;
  appId: string;
  name: string;
};

/**
 * Local session manager. Everything here is self-contained — the session is a
 * JWT signed and verified with JWT_SECRET, with no external auth provider.
 */
class SDKServer {
  private getSessionSecret() {
    return new TextEncoder().encode(ENV.cookieSecret);
  }

  private parseCookies(cookieHeader: string | undefined) {
    if (!cookieHeader) {
      return new Map<string, string>();
    }
    return new Map(Object.entries(parseCookieHeader(cookieHeader)));
  }

  /** Mint a session token for the given owner openId. */
  async createSessionToken(
    openId: string,
    options: { expiresInMs?: number; name?: string } = {}
  ): Promise<string> {
    return this.signSession(
      { openId, appId: APP_ID, name: options.name || "" },
      options
    );
  }

  async signSession(
    payload: SessionPayload,
    options: { expiresInMs?: number } = {}
  ): Promise<string> {
    const issuedAt = Date.now();
    const expiresInMs = options.expiresInMs ?? ONE_YEAR_MS;
    const expirationSeconds = Math.floor((issuedAt + expiresInMs) / 1000);

    return new SignJWT({
      openId: payload.openId,
      appId: payload.appId,
      name: payload.name,
    })
      .setProtectedHeader({ alg: "HS256", typ: "JWT" })
      .setExpirationTime(expirationSeconds)
      .sign(this.getSessionSecret());
  }

  async verifySession(
    cookieValue: string | undefined | null
  ): Promise<SessionPayload | null> {
    if (!cookieValue) {
      return null;
    }

    try {
      const { payload } = await jwtVerify(cookieValue, this.getSessionSecret(), {
        algorithms: ["HS256"],
      });
      const { openId, appId, name } = payload as Record<string, unknown>;

      if (
        !isNonEmptyString(openId) ||
        !isNonEmptyString(appId) ||
        !isNonEmptyString(name)
      ) {
        return null;
      }

      return { openId, appId, name };
    } catch {
      // Invalid/expired token — treat as logged out. No noise: this fires on
      // every request from a stale cookie and is expected, not an error.
      return null;
    }
  }

  /** Owner user materialized from a session when no database is configured. */
  private buildOwnerUser(payload: SessionPayload): AuthenticatedUser {
    const now = new Date();
    return {
      id: -1,
      openId: payload.openId,
      name: payload.name || ENV.ownerName,
      email: ENV.ownerEmail,
      loginMethod: "local",
      role: "admin",
      createdAt: now,
      updatedAt: now,
      lastSignedIn: now,
    };
  }

  async authenticateRequest(req: Request): Promise<AuthenticatedUser> {
    // 1. Prefer the session cookie.
    const cookies = this.parseCookies(req.headers.cookie);
    let sessionToken = cookies.get(COOKIE_NAME);

    // 2. Fallback to a Bearer token (useful for API clients / non-cookie flows).
    if (!sessionToken) {
      const authHeader = req.headers.authorization;
      if (typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
        sessionToken = authHeader.slice(7);
      }
    }

    const session = await this.verifySession(sessionToken);
    if (!session) {
      throw ForbiddenError("Invalid session");
    }

    const signedInAt = new Date();
    // Sync the owner into the DB when one is configured; otherwise run DB-less
    // with a synthetic owner so the app works before MySQL is set up.
    let user = await db.getUserByOpenId(session.openId);
    if (!user) {
      await db.upsertUser({
        openId: session.openId,
        name: session.name || ENV.ownerName,
        email: ENV.ownerEmail,
        loginMethod: "local",
        role: "admin",
        lastSignedIn: signedInAt,
      });
      user = await db.getUserByOpenId(session.openId);
    } else {
      await db.upsertUser({ openId: user.openId, lastSignedIn: signedInAt });
    }

    return user ?? this.buildOwnerUser(session);
  }
}

export type AuthenticatedUser = User;

export const sdk = new SDKServer();
