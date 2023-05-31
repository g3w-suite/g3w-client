import ApplicationState from 'store/application-state';
import ApplicationService from 'services/application';

const {XHR} = require('core/utils/utils');

const LOCALES_PATH = 'locales';

// array of i18n plugin
const plugins18n = [];

/**
 * @TODO
 * @param config
 * @returns {Promise<void>}
 */
async function init({language}={}) {
  await getAppLanguageTranslation(language);
  setLanguageTranslation(language);
}

/**
 * @TODO
 * @param language
 * @returns {Promise<void>}
 */
async function getAppLanguageTranslation(language) {
  // check if is empty object
  if (Object.keys(ApplicationState.i18n.getLocaleMessage(language)).length === 0) {
    const messageTranslationLanguageObject = await XHR.get({
      url: `${ApplicationService.getConfig().urls.staticurl}client/${LOCALES_PATH}/${language}.json`,
    })
    //add plugin eventually
    messageTranslationLanguageObject.plugins = {}
    ApplicationState.i18n.mergeLocaleMessage(language, messageTranslationLanguageObject);
  }
}

/**
 *@since 3.9.0
 * @param language
 */
function setLanguageTranslation(language) {
  ApplicationState.i18n.locale = language;
}

/**
 * @since 3.9.0
 * @param language
 * @returns {Promise<void>}
 */
async function getPluginLanguageTranslation({name, language}= {}){
  try {
    const pluginLanguageTranslation = await XHR.get({
      url: `${ApplicationService.getConfig().urls.staticurl}${name}/${LOCALES_PATH}/${language}.json`,
    })
    addI18n({
      [language]: {
        plugins: {
          [name]: pluginLanguageTranslation
        }
      }
    });
  } catch(err){
    //@TODO handle possible error on loading plugin translation
  }
}

/**
 * @since 3.9.0
 * @param language
 * @returns {Promise<void>}
 */

/**
 * @TODO
 * @returns {string}
 */
const getAppLanguage = function() {
  const config = ApplicationService.getConfig();
  return config.user.i18n || "en";
};

/**
 * @TODO
 * @param text
 * @returns {*}
 */
// function to translate
const t = function(text) {
  return ApplicationState.i18n.t(text);
};

/**
 * @TODO
 * @param text
 * @returns {*}
 */
// function to translate plugins
const tPlugin = function(text) {
  return ApplicationState.i18n.t(`plugins.${text}`);
};

/**
 * @TODO
 * @param filter
 * @returns {function(*): *}
 */
const tPrefix = function(filter) {
  return function(text) {
    return  ApplicationState.i18n.t(`${filter}.${text}`);
  }
};

/**
 * @TODO
 * @param name
 * @param config
 */
const addI18nPlugin = async function({name}) {
  plugins18n.push(name);
  await getPluginLanguageTranslation({
    name,
    language: ApplicationState.i18n.locale
  });
};

/**
 * @TODO
 * @param i18nObject
 */
const addI18n = function(i18nObject) {
  for (const language in i18nObject) {
    const languageObj = i18nObject[language];
    for (const key in languageObj)  {
      ApplicationState.i18n.mergeLocaleMessage(language, {
        [key]:  languageObj[key]
      })
    }
  }
};

/**
 * @TODO
 * @param language
 * @returns {Promise<void>}
 */
const changeLanguage = async function(language){
  const promisesChangeLanguage = [getAppLanguageTranslation(language)];
  plugins18n.forEach(name => {
    promisesChangeLanguage.push(getPluginLanguageTranslation({
      name,
      language
    }));
  })
  await Promise.allSettled(promisesChangeLanguage);
  //set language
  setLanguageTranslation(language);
};

module.exports = {
  init,
  t,
  tPlugin,
  tPrefix,
  addI18n,
  addI18nPlugin,
  changeLanguage,
  getAppLanguage
};
