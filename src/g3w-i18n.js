// Based on leaflet-i18n
export const L = {
  locales: {},
  language: null,
  registerLocale(lang, locale) {
    L.locales[lang] = L.merge(L.locales[lang] || {}, locale);
  },
  setLocale(lang) {
    L.language = lang;
  },
  // translate
  translate(string, data) {
    let value;
    try {
      value = L.locales[L.language]?.[string] ?? (string || '').split('.').reduce((locale, key) => locale[key], L.locales[L.language] || {});
    } catch (e) {
      // fail silently
    }
    // fallback to "en"
    if (undefined === value) {
      try {
        value = L.locales.en?.[string] ?? (string || '').split('.').reduce((locale, key) => locale[key], L.locales.en || {}) 
      } catch (e) {
        console.info(`[G3W-I18N] ${string} not found`);
      }
    }
    // // based on: `L.Util.template`
    // string = string.replace(/\{ *([\w_-]+) *\}/g, function (str, key) {
    //   let value = data[key];
    //   if (undefined === value) {
    //     console.warn('No value provided for variable ' + str);
    //   } else if ('function' === typeof value) {
    //     value = value(data);
    //   }
    //   return value;
    // });
    return value ?? string;
  },
  // deep merge
  merge(target, source) {
    for (const key in source) {
      if (source[key] instanceof Object && key in target) {
        target[key] = L.merge(target[key], source[key]);
      } else {
        target[key] = source[key];
      }
    }
    return target;
  }
};

L._ = L.translate;

/* function to translate */
export const t = text => L._(text);

 /* function to translate plugins */
export const tPlugin =  text => L._(`plugins.${text}`);

export default {
  t,
  tPlugin,
};
