import ApplicationState from 'core/applicationstate';
import { watch, unwatch } from 'directives/utils';

const { t } = require('core/i18n/i18n.service');

const attr = 'g3w-v-t-html-id';

/**
 * ORIGINAL SOURCE: src/app/gui/vue/vue.directives.js@v3.6
 */
export default {
  bind(el, binding) {
    watch({
      el,
      attr,
      watcher: [
        () => ApplicationState.lng,
        () => { el.innerHTML = `${t(binding.value)}`; }
      ]
    });
  },
  unbind: (el) => unwatch({ el, attr })
};