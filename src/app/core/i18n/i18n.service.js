import ApplicationService from 'services/application';

// main object content for i18n
const plugins18nConfig = {};

async function init(config = { appLanguages: [] }) {
  config.appLanguages.forEach(l => plugins18nConfig[l] = { plugins: {} });
  i18next
  .use(i18nextXHRBackend)
  .init({
      lng:         config.language,
      ns:          'app',
      fallbackLng: 'en',
      resources:    config.resources
  });
  jqueryI18next.init(i18next, $, {
    tName:                        't', // --> appends $.t = i18next.t
    i18nName:                     'i18n', // --> appends $.i18n = i18next
    handleName:                   'localize', // --> appends $(selector).localize(opts);
    selectorAttr:                 'data-i18n', // selector for translating elements
    targetAttr:                   'data-i18n-target', // element attribute to grab target element to translate (if diffrent then itself)
    optionsAttr:                  'data-i18n-options', // element attribute that contains options, will load/set if useOptionsAttr = true
    useOptionsAttr:               false, // see optionsAttr
    parseDefaultValueFromContent: true // parses default values from content ele.val or ele.text
  });
  addI18n(plugins18nConfig);
}
const getAppLanguage = function() {
  return window.initConfig.user.i18n || "en";
};


// function to translate
const t = function(text) {
  return i18next.t(text);
};

// function to translate plugins
const tPlugin = function(text) {
  return i18next.t(`plugins.${text}`);
};

const tPrefix = function(filter) {
  return (text) => i18next.t(`${filter}.${text}`);
};

const addI18nPlugin = function({name, config}) {
  for (const language in config) {
    const pluginLanguage = plugins18nConfig[language];
    if (pluginLanguage) { pluginLanguage.plugins[name] = config[language] }
  }
  addI18n(plugins18nConfig);
};

const addI18n = function(i18nObject) {
  for (const language in i18nObject) {
    const languageObj = i18nObject[language];
    for (const key in languageObj)  {
      i18next.addResource(language, 'translation', key, languageObj[key])
    }
  }
};

const changeLanguage = function(language){
  i18next.changeLanguage(language);
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
