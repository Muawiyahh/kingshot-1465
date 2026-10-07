import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { getProfile, isLeader } from "@/lib/auth";
import { buttonClass } from "@/components/ui";
import { signOut } from "@/app/(auth)/actions";

export async function UserNav() {
  const profile = await getProfile();

  if (!profile) {
    return (
      <>
        <Link href="/login" className={buttonClass("ghost", "sm")}>
          Sign in
        </Link>
        <Link href="/signup" className={buttonClass("primary", "sm")}>
          Join
        </Link>
      </>
    );
  }

  return (
    <>
      {isLeader(profile) && (
        <Link href="/admin" className={buttonClass("secondary", "sm")}>
          <ShieldCheck className="size-4 text-gold" aria-hidden />
          <span className="hidden sm:inline">Admin</span>
        </Link>
      )}
      <Link href="/account" className={buttonClass("ghost", "sm", "max-w-[10rem]")}>
        <span className="truncate">{profile.ingame_name}</span>
      </Link>
      <form action={signOut}>
        <button type="submit" className={buttonClass("ghost", "sm")}>
          Sign out
        </button>
      </form>
    </>
  );
}
