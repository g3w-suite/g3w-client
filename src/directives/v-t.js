import ApplicationState from 'core/applicationstate';
import { createDirectiveObj, unbindWatch } from 'directives/utils';
const {t} = require('core/i18n/i18n.service');

/**
 * ORIGINAL SOURCE: src/app/gui/vue/vue.directives.js@v3.6
 */
export default {
  bind (el, binding) {
    const innerHTML = el.innerHTML;
    const handlerElement = innerHTML => {
      const value = binding.value !== null ? t(binding.value) : '';
      switch(binding.arg ? binding.arg : 'post') {
        case 'pre': el.innerHTML = `${value} ${innerHTML}`; break;
        case 'post': el.innerHTML = `${innerHTML} ${value}`; break;
      }
    };
    handlerElement(innerHTML);
    createDirectiveObj({
      el,
      attr: 'g3w-v-t-id',
      watcher: [() => ApplicationState.lng, () => handlerElement(innerHTML)]
    });
  },
  unbind: (el) => unbindWatch({ el, attr:'g3w-v-t-id' })
}