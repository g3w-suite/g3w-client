import ApplicationState from 'core/applicationstate';
import { createDirectiveObj, unbindWatch } from 'directives/utils';
const {t, tPlugin} = require('core/i18n/i18n.service');

/**
 * ORIGINAL SOURCE: src/app/gui/vue/vue.directives.js@v3.6
 */
export default {
  bind(el, binding) {
    const handler = () => {
      const title = (binding.arg === 'plugin' ? tPlugin : t)(binding.value);
      el.setAttribute('title', title);
      el.setAttribute('data-original-title', title)
    };
    handler();
    createDirectiveObj({
      el,
      attr: 'g3w-v-t-title-id',
      watcher: [() => ApplicationState.lng, handler]
    });
  },
  unbind: (el) => unbindWatch({ attr:'g3w-v-t-title-id', el })
}