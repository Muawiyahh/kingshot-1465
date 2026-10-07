import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthShell } from "../auth-shell";
import { LoginForm } from "../auth-forms";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <AuthShell title="Welcome back" subtitle="Sign in with your game ID.">
      <Suspense fallback={<LoginForm />}>
        <LoginWithNext searchParams={searchParams} />
      </Suspense>
    </AuthShell>
  );
}

async function LoginWithNext({ searchParams }: { searchParams: PageProps<"/login">["searchParams"] }) {
  const { next } = await searchParams;
  return <LoginForm next={typeof next === "string" ? next : undefined} />;
}
