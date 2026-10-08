import "server-only";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./config";

/** Per-request client acting as the signed-in user (RLS applies). Must be called behind a Suspense boundary or in a Server Action. */
export async function createClient() {
  // Cookies alone can be read while Next prerenders a session's App Shell, and the Supabase client
  // reads the clock as it starts. Waiting for the real request keeps all database work out of that.
  await connection();
  const cookieStore = await cookies();

  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a Server Component; proxy.ts refreshes the session instead.
        }
      },
    },
  });
}
