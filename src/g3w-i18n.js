/**
 * @file inspired by "leaflet-i18n"
 */
import ApplicationState from 'store/application';
import { flattenObject } from 'utils/flattenObject';

/**
 * @param {string} string text to be translated
 * 
 * @returns {string} localized string
 */
export function gettext(string) {
  let value;
  try {
    value = ApplicationState.locales?.[ApplicationState.language]?.[string] ?? ApplicationState.locales?.en?.[string]; // fallback to "en"
  } catch (e) {
    // fail silently
  }
  if (undefined === value) {
    console.info(`[G3W-I18N] missing: ${string}`);
    value = string;
  }
  return value ?? string;
};

/**
 * @param {string} lang   code (eg. "it") 
 * @param {*}      locale i18n object
 */
gettext.register = function(lang, locale) {
  ApplicationState.locales[lang] = Object.assign(ApplicationState.locales[lang] || {}, flattenObject(locale, '.'));
};