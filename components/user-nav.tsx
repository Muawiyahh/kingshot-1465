import Link from "next/link";
import { ShieldCheck } from "lucide-react";
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
        <Link href={localePath(locale, "/admin")} className={buttonClass("secondary", "sm")}>
          <ShieldCheck className="size-4 text-gold" aria-hidden />
          <span className="hidden sm:inline">{t.nav.admin}</span>
        </Link>
      )}
      <Link href={localePath(locale, "/account")} className={buttonClass("ghost", "sm", "max-w-[12rem] pl-1.5")}>
        <AllianceAvatar tag={profile.alliance_tag} size={32} />
        <span className="hidden truncate sm:inline">{profile.ingame_name}</span>
      </Link>
      <form action={signOut}>
        <button type="submit" className={buttonClass("ghost", "sm", "px-3")}>
          {t.nav.signOut}
        </button>
      </form>
    </>
  );
}
