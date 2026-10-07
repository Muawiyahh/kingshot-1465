import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { SUPABASE_ANON_KEY, SUPABASE_URL, supabaseConfigured } from "@/lib/supabase/config";
import { LOCALE_COOKIE, isLocale, localePath, matchAcceptLanguage, splitLocale } from "@/lib/i18n/config";

const PROTECTED = ["/account", "/apply", "/admin"];

/**
 * 1. Adds a language prefix to URLs that lack one (saved choice, else browser language).
 * 2. Keeps the language cookie in sync with the page being viewed (Server Actions read it).
 * 3. Refreshes the Supabase session and does an optimistic sign-in redirect. Real
 *    authorization happens in the data layer and RLS, not here.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const { locale, rest } = splitLocale(pathname);

  if (!locale) {
    const saved = request.cookies.get(LOCALE_COOKIE)?.value;
    const preferred = isLocale(saved) ? saved : matchAcceptLanguage(request.headers.get("accept-language"));
    const url = request.nextUrl.clone();
    url.pathname = localePath(preferred, pathname);
    return NextResponse.redirect(url);
  }

  const rememberLocale = (res: NextResponse) => {
    if (request.cookies.get(LOCALE_COOKIE)?.value !== locale) {
      res.cookies.set(LOCALE_COOKIE, locale, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
    }
    return res;
  };

  let response = NextResponse.next({ request });
  if (!supabaseConfigured) return rememberLocale(response);

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims?.sub);

  if (!signedIn && PROTECTED.some((p) => rest === p || rest.startsWith(`${p}/`))) {
    const url = request.nextUrl.clone();
    url.pathname = localePath(locale, "/login");
    url.search = `?next=${encodeURIComponent(pathname)}`;
    return rememberLocale(NextResponse.redirect(url));
  }

  return rememberLocale(response);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|webp|svg|ico|txt|xml)$).*)"],
};
