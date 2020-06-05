const {t, tPlugin} = require('core/i18n/i18n.service');
const vm = new Vue();
const G3WApplicationFilter = {
 install(Vue) {
   Vue.filter('t', function (value) {
     return t(value);
   });
   Vue.filter('tPlugin', function(value) {
     return value !== null ? tPlugin(value) : '';
   });
  }
};

module.exports = G3WApplicationFilter;

