import { jwtVerify, SignJWT } from "jose";

export const SESSION_COOKIE = "fhs_session";

const encoder = new TextEncoder();

export type AuthPayload = {
  sub: string;
  email: string;
  name: string;
};

function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (secret && secret.length >= 16) {
    return encoder.encode(secret);
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("JWT_SECRET must be set and at least 16 characters in production.");
  }

  return encoder.encode("local-dev-secret-change-me");
}

export async function createSessionToken(payload: AuthPayload): Promise<string> {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getJwtSecret());
}

export async function verifySessionToken(token: string): Promise<AuthPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret());
    if (
      typeof payload.sub !== "string" ||
      typeof payload.email !== "string" ||
      typeof payload.name !== "string"
    ) {
      return null;
    }

    return {
      sub: payload.sub,
      email: payload.email,
      name: payload.name,
    };
  } catch {
    return null;
  }
}

export const sessionCookieConfig = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 60 * 60 * 24 * 7,
};
