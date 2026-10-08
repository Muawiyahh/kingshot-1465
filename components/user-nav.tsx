import Link from "next/link";
import { LogOut, ShieldCheck } from "lucide-react";
import { AllianceAvatar } from "@/components/alliance-banner";
import { buttonClass } from "@/components/ui";
import { getProfile, isLeader } from "@/lib/auth";
import { fmt } from "@/lib/i18n/format";
import { localePath } from "@/lib/i18n/config";
import { getI18n } from "@/lib/i18n/server";
import { getUnreadCount } from "@/lib/messages";
import { signOut } from "@/app/[lang]/(auth)/actions";

export async function UserNav() {
  const [profile, { locale, t }] = await Promise.all([getProfile(), getI18n()]);

  if (!profile) {
    return (
      <>
        <Link href={localePath(locale, "/login")} className={buttonClass("ghost", "sm", "px-3 max-[359px]:hidden")}>
          {t.nav.signIn}
        </Link>
        <Link href={localePath(locale, "/signup")} className={buttonClass("primary", "sm", "px-3.5")}>
          {t.nav.join}
        </Link>
      </>
    );
  }

  const unread = await getUnreadCount(profile.id);

  return (
    <>
      {isLeader(profile) && (
        <Link href={localePath(locale, "/admin")} aria-label={t.nav.admin} className={buttonClass("secondary", "sm")}>
          <ShieldCheck className="size-4 text-gold" aria-hidden />
          <span className="hidden lg:inline">{t.nav.admin}</span>
        </Link>
      )}
      <Link
        href={localePath(locale, "/account")}
        aria-label={unread > 0 ? `${profile.ingame_name}, ${fmt(t.account.messages.unread, { n: unread })}` : profile.ingame_name}
        className={buttonClass("ghost", "sm", "max-w-[12rem] pl-2.5 pr-2.5 sm:pl-2 sm:pr-2")}
      >
        <span className="relative shrink-0">
          <AllianceAvatar tag={profile.alliance_tag} size={32} />
          {/* Unread messages: a red dot on the avatar, like an app badge. */}
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 size-3 rounded-full bg-primary shadow-[0_0_0_2px_var(--bg)]" aria-hidden />
          )}
        </span>
        <span className="hidden truncate lg:inline">{profile.ingame_name}</span>
      </Link>
      <form action={signOut} className="-ml-2">
        <button type="submit" aria-label={t.nav.signOut} className={buttonClass("ghost", "sm", "pl-2 pr-2")}>
          {/* An icon on phones: translated labels like "Se déconnecter" don't fit beside the other buttons. */}
          <LogOut className="size-4 sm:hidden" aria-hidden />
          <span className="hidden sm:inline">{t.nav.signOut}</span>
        </button>
      </form>
    </>
  );
}
