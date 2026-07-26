import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { SUPABASE_ANON_KEY, SUPABASE_URL, isSupabaseConfigured } from "@/lib/supabase/config";
import {
  hasValidPreviewCookie,
  isPreviewGateEnabled,
  isPreviewPublicPath,
} from "@/lib/previewGate";

/** Routes that require a Supabase session. Everything else stays public (after preview). */
const PROTECTED = [
  "/dashboard",
  "/deals",
  "/portfolio",
  "/comparables",
  "/map-search",
  "/bank-financing",
  "/cashflow-simulator",
  "/risk-analysis",
  "/reports",
  "/documents",
  "/settings",
];

function redirectToLogin(request: NextRequest, pathname: string, error?: string) {
  const url = request.nextUrl.clone();
  url.pathname = "/login";
  url.search = "";
  url.searchParams.set("next", pathname);
  if (error) url.searchParams.set("error", error);
  return NextResponse.redirect(url);
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // --- Temporary preview gate (remove with PREVIEW_GATE.md) ---------------
  if (isPreviewGateEnabled()) {
    const unlocked = hasValidPreviewCookie(request);

    if (!unlocked && !isPreviewPublicPath(pathname)) {
      const url = request.nextUrl.clone();
      url.pathname = "/preview";
      url.search = "";
      if (pathname !== "/") url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }

    if (unlocked && pathname === "/preview") {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      url.search = "";
      return NextResponse.redirect(url);
    }
  }
  // ------------------------------------------------------------------------

  const needsAuth = PROTECTED.some((p) => pathname === p || pathname.startsWith(p + "/"));

  // Fail closed: never open protected routes without a configured Supabase project.
  if (!isSupabaseConfigured) {
    if (needsAuth) {
      return redirectToLogin(
        request,
        pathname,
        "Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY."
      );
    }
    return NextResponse.next();
  }

  // Must be mutated in place so refreshed auth cookies reach the browser.
  let response = NextResponse.next({ request });

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (toSet) => {
        toSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        toSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && needsAuth) {
    return redirectToLogin(request, pathname);
  }

  if (user && (pathname === "/login" || pathname === "/signup")) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
