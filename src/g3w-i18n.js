/**
 * @file inspired by "leaflet-i18n"
 */
import ApplicationState  from 'g3w-state';
import { flattenObject } from 'utils/flattenObject';

const MISSING = new Set(); // list of un-translated strings

/**
 * @param {string} string text to be translated
 * 
 * @returns {string} localized string
 */
export function gettext(string) {
  let value = window.initConfig.locales?.[ApplicationState.language]?.[string] ?? ApplicationState.locales?.[ApplicationState.language]?.[string] ?? ApplicationState.locales?.en?.[string]; // fallback to "en"
  if (undefined === value && 'en' !== ApplicationState.language && !MISSING.has(string)) {
    MISSING.add(string);
    console.info(`[G3W-I18N] missing: '${string}'`);
  }
  return value ?? string;
};

/**
 * @param {string} lang   code (eg. "it")
 * @param {*}      locale i18n object
 */
gettext.register = function(lang, locale) {
  Vue.set(ApplicationState.locales, lang, Vue.observable({ ...(ApplicationState.locales[lang] || {}), ...(flattenObject(locale, '.')) }));
};