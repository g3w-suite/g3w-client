import ApplicationState from 'core/applicationstate';
import { createDirectiveObj, unbindWatch } from 'directives/utils';
const {t, tPlugin} = require('core/i18n/i18n.service');

/**
 * ORIGINAL SOURCE: src/app/gui/vue/vue.directives.js@v3.6
 */
export default {
  bind(el, binding) {
    const handler = () => {
      const placeholder = (binding.arg === 'plugin' ? tPlugin : t)(binding.value);
      el.setAttribute('placeholder', placeholder);
    };
    handler();
    createDirectiveObj({
      el,
      attr: 'g3w-v-t-placeholder-id',
      watcher: [() => ApplicationState.lng, handler]
    });
  },
  unbind: (el) => unbindWatch({ attr:'g3w-v-t-placeholder-id', el })
}