import { cookies } from "next/headers";
import crypto from "node:crypto";

const COOKIE_NAME = "kkc_admin";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

function secret(): string {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 16) {
    throw new Error(
      "SESSION_SECRET env var is missing or too short. Set it to a long random string.",
    );
  }
  return s;
}

function sign(value: string): string {
  return crypto.createHmac("sha256", secret()).update(value).digest("hex");
}

function timingSafeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

/** Verify a plaintext password against the ADMIN_PASSWORD env var. */
export function verifyPassword(input: string): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;
  return timingSafeEqual(input, expected);
}

/** Build a signed session token: "issuedAt.signature". */
function buildToken(): string {
  const issuedAt = Date.now().toString();
  const sig = sign(issuedAt);
  return `${issuedAt}.${sig}`;
}

function verifyToken(token: string): boolean {
  const [issuedAt, sig] = token.split(".");
  if (!issuedAt || !sig) return false;
  const expected = sign(issuedAt);
  if (!timingSafeEqual(sig, expected)) return false;
  const age = Date.now() - Number(issuedAt);
  if (!Number.isFinite(age) || age < 0) return false;
  return age <= MAX_AGE_SECONDS * 1000;
}

/** Set the signed admin session cookie. */
export function setAdminSession(): void {
  cookies().set(COOKIE_NAME, buildToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

/** Clear the admin session cookie. */
export function clearAdminSession(): void {
  cookies().set(COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

/** True iff a valid, unexpired admin session cookie is present. */
export function isAdminAuthenticated(): boolean {
  const c = cookies().get(COOKIE_NAME);
  if (!c) return false;
  return verifyToken(c.value);
}
