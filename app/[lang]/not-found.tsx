import { ButtonLink, Container } from "@/components/ui";
import { localePath } from "@/lib/i18n/config";
import { getI18n } from "@/lib/i18n/server";

export default async function NotFound() {
  const { locale, t } = await getI18n();
  return (
    <Container className="py-28 text-center">
      <p className="numeral text-7xl font-black">404</p>
      <h1 className="mt-6 font-display text-3xl font-bold">{t.notFound.title}</h1>
      <p className="mt-3 text-muted">{t.notFound.body}</p>
      <div className="mt-8">
        <ButtonLink href={localePath(locale, "/")}>{t.notFound.home}</ButtonLink>
      </div>
    </Container>
  );
}
