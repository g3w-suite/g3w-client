import ApplicationState from 'core/applicationstate';
import { createDirectiveObj, unbindWatch } from 'directives/utils';

/**
 * ORIGINAL SOURCE: src/app/gui/vue/vue.directives.js@v3.6
 */
export default {
  bind(el) {
    const showHideHandler = plugins => {
      el.classList.toggle('g3w-hide', plugins.length === 0)
    };
    showHideHandler(ApplicationState.plugins);
    createDirectiveObj({
      el,
      attr: 'g3w-v-plugins-id',
      watcher: [() => ApplicationState.plugins, showHideHandler]
    });
  },
  unbind: (el) => unbindWatch({ el, attr: 'g3w-v-plugins-id' })
};