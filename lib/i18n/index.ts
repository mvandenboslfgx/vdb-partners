import { en } from "@/lib/i18n/en";
import { nl } from "@/lib/i18n/nl";
export type Locale = "nl" | "en";
export type TranslationKey = keyof typeof nl;
const dictionaries = { nl, en };
export function t(key: TranslationKey, locale: Locale = "nl") {
  return dictionaries[locale][key] ?? dictionaries.nl[key];
}
export { en, nl };
