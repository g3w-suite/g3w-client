const {t, tPlugin} = require('core/i18n/i18n.service');
const G3WApplicationFilter = {
 install(Vue) {
   Vue.filter('t', value => t(value));
   Vue.filter('tPlugin', value => value !== null ? tPlugin(value) : '');
  }
};

module.exports = G3WApplicationFilter;

