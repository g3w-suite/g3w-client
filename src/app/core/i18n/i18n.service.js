import ApplicationState from 'store/application-state';
import ApplicationService from 'services/application';

const {XHR} = require('core/utils/utils');


// array of i18n plugin
const plugins18n = [];

/**
 * @TODO
 * @param config
 * @returns {Promise<void>}
 */
async function init(config) {
  setLanguageTranslation(config.language);
}

/**
 * @TODO
 * @param language
 * @returns {Promise<void>}
 */
async function setLanguageTranslation(language) {
  // check if is empty object
  if (Object.keys(ApplicationState.i18n.getLocaleMessage(language)).length === 0) {
    const messageTranslationLanguageObject = await XHR.get({
      url: `${ApplicationService.getConfig().urls.staticurl}client/locales/${language}.json`,
    })
    //add plugin eventually
    messageTranslationLanguageObject.plugins = {}
    ApplicationState.i18n.mergeLocaleMessage(language, messageTranslationLanguageObject);
  }
  //set language
  ApplicationState.i18n.locale = language;
}

/**
 * @since 3.9.0
 * @param language
 * @returns {Promise<void>}
 */
async function setPluginLanguageTranslation(name){
  try {
    const pluginLanguageTranslation = await XHR.get({
      url: `${ApplicationService.getConfig().urls.staticurl}${name}/locales/${ApplicationState.i18n.locale}.json`,
    })
    //TODO need a way to split also plugin language file request
    addI18n({
      [ApplicationState.i18n.locale]: {
        plugins: {
          [name]: pluginLanguageTranslation
        }
      }
    });
  } catch(err){

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
  setPluginLanguageTranslation(name);
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
  await setLanguageTranslation(language);
  plugins18n.forEach(name => {
    setPluginLanguageTranslation(name);
  })
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
