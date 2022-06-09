import {t, tPlugin}  from 'core/i18n/i18n.service';
const G3WApplicationFilter = {
 install(Vue) {
   Vue.filter('t', value => t(value));
   Vue.filter('tPlugin', value => value !== null ? tPlugin(value) : '');
  }
};

export default  G3WApplicationFilter;

