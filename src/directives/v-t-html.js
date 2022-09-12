import ApplicationState from 'core/applicationstate';
import { createDirectiveObj, unbindWatch } from 'directives/utils';
const {t} = require('core/i18n/i18n.service');

/**
 * ORIGINAL SOURCE: src/app/gui/vue/vue.directives.js@v3.6
 */
export default {
  bind(el, binding) {
    const handlerElement = () => { el.innerHTML = `${t(binding.value)}`; };
    handlerElement();
    createDirectiveObj({
      el,
      attr: 'g3w-v-t-html-id',
      watcher: [() => ApplicationState.lng, handlerElement]
    });
  },
  unbind: (el) => unbindWatch({ attr:'g3w-v-t-html-id', el })
};