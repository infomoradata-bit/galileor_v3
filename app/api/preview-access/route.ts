import { NextResponse } from "next/server";
import {
  clearPreviewCookie,
  codesMatch,
  isPreviewGateEnabled,
  setPreviewCookie,
} from "@/lib/previewGate";

export async function POST(request: Request) {
  if (!isPreviewGateEnabled()) {
    return NextResponse.json({ ok: true, disabled: true });
  }

  let code = "";
  try {
    const body = (await request.json()) as { code?: unknown };
    code = typeof body.code === "string" ? body.code : "";
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }

  if (!codesMatch(code)) {
    return NextResponse.json({ ok: false, error: "Incorrect access code." }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  setPreviewCookie(response);
  return response;
}

/** Clears the preview cookie ("Lock preview"). */
export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  clearPreviewCookie(response);
  return response;
}
