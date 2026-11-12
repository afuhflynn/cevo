import { argon2id, hash, verify } from "argon2";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "./auth-adapter";
import {
  resetPasswordEmailHtml,
  resetPasswordEmailText,
  sendAuthEmail,
  verificationEmailHtml,
  verificationEmailText,
} from "./email";
import { db } from "./prisma";

export const auth = betterAuth({
  baseURL: process.env["BETTER_AUTH_URL"],
  secret: process.env["BETTER_AUTH_SECRET"],
  database: prismaAdapter,
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
    minPasswordLength: 12,
    maxPasswordLength: 128,
    autoSignIn: false,
    revokeSessionsOnPasswordReset: true,
    password: {
      hash: (password) => hash(password, { type: argon2id }),
      verify: ({ hash: stored, password }) => verify(stored, password),
    },
    sendResetPassword: async ({ user, url }) => {
      await sendAuthEmail({
        to: user.email,
        subject: "Reset your Cevo password",
        html: resetPasswordEmailHtml(url),
        text: resetPasswordEmailText(url),
      });
    },
    resetPasswordTokenExpiresIn: 60 * 60,
  },
  emailVerification: {
    sendVerificationEmail: async ({ user, url }) => {
      const link = new URL(url);
      link.searchParams.set("callbackURL", "/sign-in?verified=1");
      await sendAuthEmail({
        to: user.email,
        subject: "Verify your Cevo email",
        html: verificationEmailHtml(link.toString()),
        text: verificationEmailText(link.toString()),
      });
    },
    sendOnSignUp: true,
    sendOnSignIn: false,
    autoSignInAfterVerification: false,
    expiresIn: 24 * 60 * 60,
  },
  session: {
    expiresIn: 30 * 24 * 60 * 60,
    updateAge: 24 * 60 * 60,
  },
  user: {
    additionalFields: {
      role: { type: "string", input: false },
      isActive: { type: "boolean", input: false },
    },
  },
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          const email = user.email.trim().toLowerCase();
          const name =
            typeof user.name === "string" ? user.name.trim() : user.name;
          if (email !== user.email || name !== user.name) {
            return { data: { ...user, email, name } };
          }
        },
      },
    },
    session: {
      create: {
        before: async (session) => {
          const owner = await db.orm.public.User.where({
            id: session.userId,
          }).first();
          if (!owner || owner.isActive === false) {
            return false;
          }
        },
      },
    },
  },
});
