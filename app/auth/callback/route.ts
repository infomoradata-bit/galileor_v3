import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

/** Exchanges the OAuth / email-confirmation code for a session cookie. */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await getSupabaseServerClient();
    const { error } = (await supabase?.auth.exchangeCodeForSession(code)) ?? {
      error: new Error("Supabase is not configured"),
    };
    if (!error) return NextResponse.redirect(`${origin}${next}`);
  }

  const failed = new URL("/login", origin);
  failed.searchParams.set("error", "Sign-in link is invalid or has expired.");
  return NextResponse.redirect(failed);
}
