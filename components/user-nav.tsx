import Link from "next/link";
import { LogOut, ShieldCheck } from "lucide-react";
import { AllianceAvatar } from "@/components/alliance-banner";
import { buttonClass } from "@/components/ui";
import { getProfile, isLeader } from "@/lib/auth";
import { localePath } from "@/lib/i18n/config";
import { getI18n } from "@/lib/i18n/server";
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
        aria-label={profile.ingame_name}
        className={buttonClass("ghost", "sm", "max-w-[12rem] pl-2.5 pr-2.5 sm:pl-2 sm:pr-2")}
      >
        <AllianceAvatar tag={profile.alliance_tag} size={32} />
        <span className="hidden truncate lg:inline">{profile.ingame_name}</span>
      </Link>
      {/* Pads are 8px on both sides of each gap and the sign-out form pulls in by the container gap, so each visible gap equals the container gap plus 8px: 20px, or 24px from lg up. */}
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
