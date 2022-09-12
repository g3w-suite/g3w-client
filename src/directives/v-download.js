import ApplicationState from 'core/applicationstate';
import { createDirectiveObj, unbindWatch } from 'directives/utils';
const {toRawType} = require('core/utils/utils');

/**
 * ORIGINAL SOURCE: src/app/gui/vue/vue.directives.js@v3.6
 */
export default {
  bind(el, binding) {
    if (toRawType(binding.value) === 'Boolean' ? binding.value : true) {
      const downloadHandler = bool => {
        const className = binding.modifiers && binding.modifiers.show && 'hide' || 'disabled';
        el.classList.toggle(`g3w-${className}`, className === 'hide' ? !bool: bool)
      };
      downloadHandler(ApplicationState.download);
      createDirectiveObj({
        el,
        attr: 'g3w-v-download-id',
        watcher: [() => ApplicationState.download, downloadHandler]
      });
    }
  },
  unbind: (el) => unbindWatch({ el, attr: 'g3w-v-download-id' })
};