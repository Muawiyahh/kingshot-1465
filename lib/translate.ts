import "server-only";
import type { Locale } from "@/lib/i18n/config";

const ENDPOINT = "https://api.cognitive.microsofttranslator.com/translate";

/** This site's locale codes, mapped to the codes Azure Translator expects. */
const AZURE_LANG: Record<Locale, string> = {
  en: "en",
  de: "de",
  "zh-cn": "zh-Hans",
  "zh-tw": "zh-Hant",
  fr: "fr",
  es: "es",
  id: "id",
  tl: "fil",
  "pt-br": "pt",
  ko: "ko",
};

export const translateConfigured = Boolean(process.env.AZURE_TRANSLATOR_KEY);

/**
 * Translates one message body with Azure AI Translator. Returns null if the service isn't
 * configured, the call fails, or the text is already essentially this language (Azure sometimes
 * no-ops same-language input, which we treat the same as failure so the UI can say so).
 */
export async function translateText(text: string, to: Locale): Promise<string | null> {
  const key = process.env.AZURE_TRANSLATOR_KEY;
  if (!key) return null;

  const url = `${ENDPOINT}?api-version=3.0&to=${AZURE_LANG[to]}`;
  const headers: Record<string, string> = {
    "Ocp-Apim-Subscription-Key": key,
    "Content-Type": "application/json",
  };
  // Required for a regional resource; a Global resource ignores it if set.
  if (process.env.AZURE_TRANSLATOR_REGION) {
    headers["Ocp-Apim-Subscription-Region"] = process.env.AZURE_TRANSLATOR_REGION;
  }

  try {
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify([{ text }]),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      console.error("Azure Translator error", res.status, await res.text().catch(() => ""));
      return null;
    }
    const data = (await res.json()) as { translations: { text: string }[] }[];
    return data[0]?.translations[0]?.text ?? null;
  } catch (e) {
    console.error("Azure Translator request failed", e);
    return null;
  }
}
