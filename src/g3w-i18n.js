import ApplicationState from 'store/application';

export const getAppLanguage = () => window.initConfig.user.i18n || "en";
/* function to translate */
export const t = text => i18next.t(text);

/* function to translate plugins */
export const  tPlugin = text => i18next.t(`plugins.${text}`);

export const addI18n = (i18nObject) => {
  for (const lang in i18nObject) {
    for (const key in i18nObject[lang])  {
      i18next.addResource(lang, 'translation', key, i18nObject[lang][key])
    }
  }
};

export const addI18nPlugin = ({ name, config }) => {
  for (const lang in config) {
    if (ApplicationState.i18n.plugins[lang]) {
      ApplicationState.i18n.plugins[lang].plugins[name] = config[lang]
    }
  }
  for (const lang in ApplicationState.i18n.plugins) {
    for (const key in ApplicationState.i18n.plugins[lang])  {
      i18next.addResource(lang, 'translation', key, ApplicationState.i18n.plugins[lang][key])
    }
  }
}

export default {
  getAppLanguage,
  t,
  tPlugin,
  addI18n,
  addI18nPlugin,
};
