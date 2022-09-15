import ApplicationState from 'core/applicationstate';
import { watch, unwatch } from 'directives/utils';
const {t} = require('core/i18n/i18n.service');

const attr = 'g3w-v-t-id';

/**
 * ORIGINAL SOURCE: src/app/gui/vue/vue.directives.js@v3.6
 */
export default {
  bind(el, binding) {
    const innerHTML = el.innerHTML;
    watch({
      el,
      attr,
      watcher: [
        () => ApplicationState.lng,
        () => {
          const value = binding.value !== null ? t(binding.value) : '';
          switch(binding.arg ? binding.arg : 'post') {
            case 'pre': el.innerHTML = `${value} ${innerHTML}`; break;
            case 'post': el.innerHTML = `${innerHTML} ${value}`; break;
          }
        }
      ]
    });
  },
  unbind: (el) => unwatch({ el, attr })
}