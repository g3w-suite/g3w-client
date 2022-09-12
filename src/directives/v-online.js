import ApplicationState from 'core/applicationstate';
import { createDirectiveObj, unbindWatch } from 'directives/utils';

/**
 * ORIGINAL SOURCE: src/app/gui/vue/vue.directives.js@v3.6
 */
export default {
  bind(el, binding) {
    // show if online
    const showHideHandler = bool => {
      bool = ((binding.arg && binding.arg === 'hide' ? false : true) ?  bool : !bool);
      el.classList.toggle('g3w-hide', !bool)
    };
    showHideHandler(ApplicationState.online);
    createDirectiveObj({
      el,
      attr: 'g3w-v-offline-id',
      watcher: [() => ApplicationState.online, showHideHandler]
    });
  },
  unbind: (el) => unbindWatch({ el, attr: 'g3w-v-offline-id' })
};