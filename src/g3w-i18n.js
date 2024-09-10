import ApplicationState from 'store/application-state';

module.exports = {
  getAppLanguage: () =>window.initConfig.user.i18n || "en",
  /* function to translate */
  t:        text => i18next.t(text),
  /* function to translate plugins */
  tPlugin:  text =>i18next.t(`plugins.${text}`),
  addI18n(i18nObject) {
    for (const language in i18nObject) {
      const languageObj = i18nObject[language];
      for (const key in languageObj)  {
        i18next.addResource(language, 'translation', key, languageObj[key])
      }
    }
  },
  addI18nPlugin({name, config}) {
    for (const language in config) {
      const pluginLanguage = ApplicationState.i18n.plugins[language];
      if (pluginLanguage) { pluginLanguage.plugins[name] = config[language] }
    }
    const i18nObject = ApplicationState.i18n.plugins;
    for (const language in i18nObject) {
      const languageObj = i18nObject[language];
      for (const key in languageObj)  {
        i18next.addResource(language, 'translation', key, languageObj[key])
      }
    }
  },
};
