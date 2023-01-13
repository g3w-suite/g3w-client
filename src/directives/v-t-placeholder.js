import ApplicationState from 'store/application-state';
import { watch, unwatch } from 'directives/utils';

const { t, tPlugin } = require('core/i18n/i18n.service');

const attr = 'g3w-v-t-placeholder-id';

/**
 * ORIGINAL SOURCE: src/app/gui/vue/vue.directives.js@v3.6
 */
export default {
  bind(el, binding) {
    watch({
      el,
      attr,
      watcher: [
        () => ApplicationState.language,
        () => { el.setAttribute('placeholder', (binding.arg === 'plugin' ? tPlugin : t)(binding.value)); }
      ]
    });
  },
  unbind: (el) => unwatch({ el, attr })
}