import { createHmac, timingSafeEqual } from "crypto";
import type { NextRequest, NextResponse } from "next/server";

/**
 * Temporary preview gate — remove when Paladior launches.
 *
 * Disable: unset PALADIOR_ACCESS_CODE (gate skips entirely).
 * Delete: see PREVIEW_GATE.md
 */

export const PREVIEW_COOKIE = "paladior_preview";
export const PREVIEW_MAX_AGE_SEC = 60 * 60 * 24 * 30; // 30 days

/** Gate is on only while the server env var is set. */
export function isPreviewGateEnabled(): boolean {
  return Boolean(process.env.PALADIOR_ACCESS_CODE?.trim());
}

function accessCode(): string {
  return process.env.PALADIOR_ACCESS_CODE?.trim() ?? "";
}

/** Opaque cookie value — cannot be forged without knowing the access code. */
export function previewCookieValue(): string {
  return createHmac("sha256", accessCode()).update("paladior.preview.v1").digest("hex");
}

export function codesMatch(submitted: string): boolean {
  const expected = accessCode();
  if (!expected || !submitted) return false;
  const a = Buffer.from(submitted.trim());
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function hasValidPreviewCookie(request: NextRequest): boolean {
  if (!isPreviewGateEnabled()) return true;
  const raw = request.cookies.get(PREVIEW_COOKIE)?.value;
  if (!raw) return false;
  try {
    const expected = Buffer.from(previewCookieValue());
    const got = Buffer.from(raw);
    return expected.length === got.length && timingSafeEqual(expected, got);
  } catch {
    return false;
  }
}

export function previewCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: PREVIEW_MAX_AGE_SEC,
  };
}

export function clearPreviewCookie(response: NextResponse) {
  response.cookies.set(PREVIEW_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

export function setPreviewCookie(response: NextResponse) {
  response.cookies.set(PREVIEW_COOKIE, previewCookieValue(), previewCookieOptions());
}

/** Paths that stay reachable without a preview cookie. */
export function isPreviewPublicPath(pathname: string): boolean {
  return (
    pathname === "/preview" ||
    pathname === "/api/preview-access" ||
    pathname.startsWith("/api/preview-access/")
  );
}
