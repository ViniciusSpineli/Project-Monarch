export const ENV = {
  // Secret used to sign/verify the local session JWT.
  cookieSecret: process.env.JWT_SECRET ?? "",
  // MySQL connection string. Optional: the app runs DB-less with an in-memory
  // owner session when this is not set.
  databaseUrl: process.env.DATABASE_URL ?? "",
  // The single password that unlocks the app (local login).
  appPassword: process.env.APP_PASSWORD ?? "",
  // Owner profile shown across the app.
  ownerName: process.env.APP_OWNER_NAME ?? "Monarch",
  ownerEmail: process.env.APP_OWNER_EMAIL ?? null,
  isProduction: process.env.NODE_ENV === "production",
};
