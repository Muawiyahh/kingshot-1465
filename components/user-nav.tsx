import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { AccountMenu } from "@/components/account-menu";
import { buttonClass } from "@/components/ui";
import { getProfile, getUserId, isLeader } from "@/lib/auth";
import { localePath } from "@/lib/i18n/config";
import { getI18n } from "@/lib/i18n/server";
import { getUnreadCount } from "@/lib/messages";

/** Right side of the top bar: Sign in / Join, or the account menu (plus a quick Admin link for leaders). */
export async function UserNav() {
  // The unread count uses the ID from the session token, so it loads alongside the profile.
  const me = await getUserId();
  const [profile, { locale, t }, unread] = await Promise.all([getProfile(), getI18n(), me ? getUnreadCount(me) : 0]);

  if (!profile) {
    return (
      <>
        <Link href={localePath(locale, "/login")} className={buttonClass("ghost", "sm", "px-3 max-[359px]:hidden")}>
          {t.nav.signIn}
        </Link>
        <Link href={localePath(locale, "/signup")} className={buttonClass("primary", "sm", "px-4")}>
          {t.nav.join}
        </Link>
      </>
    );
  }

  const leader = isLeader(profile);
  return (
    <>
      {/* One-click way into Admin for leaders on larger screens; on phones it's in the menu. */}
      {leader && (
        <Link
          href={localePath(locale, "/admin")}
          aria-label={t.nav.admin}
          title={t.nav.admin}
          className="hidden size-10 items-center justify-center rounded-full text-gold transition-colors hover:bg-white/5 md:flex"
        >
          <ShieldCheck className="size-[18px]" aria-hidden />
        </Link>
      )}
      <AccountMenu
        name={profile.ingame_name}
        tag={profile.alliance_tag}
        gameId={profile.game_id}
        unread={unread}
        leader={leader}
      />
    </>
  );
}
