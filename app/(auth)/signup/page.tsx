import type { Metadata } from "next";
import { AuthShell } from "../auth-shell";
import { SignupForm } from "../auth-forms";
import { site } from "@/lib/site";

export const metadata: Metadata = { title: "Join" };

export default function SignupPage() {
  return (
    <AuthShell
      title={`Join ${site.name}`}
      subtitle="Create an account to apply for KvK castle positions. A leader approves new accounts."
    >
      <SignupForm />
    </AuthShell>
  );
}
