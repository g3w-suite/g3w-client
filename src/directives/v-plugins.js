import ApplicationState from 'core/applicationstate';
import { watch, unwatch } from 'directives/utils';

const attr = 'g3w-v-plugins-id';

/**
 * ORIGINAL SOURCE: src/app/gui/vue/vue.directives.js@v3.6
 */
export default {
  bind(el) {
    watch({
      el,
      attr,
      watcher: [
        () => ApplicationState.plugins,
        (plugins) => { el.classList.toggle('g3w-hide', plugins.length === 0) }
      ]
    });
  },
  unbind: (el) => unwatch({ el, attr })
};