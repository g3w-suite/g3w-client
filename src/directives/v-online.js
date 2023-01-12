import ApplicationState from 'store/application-state';
import { watch, unwatch } from 'directives/utils';

const attr = 'g3w-v-offline-id';

/**
 * ORIGINAL SOURCE: src/app/gui/vue/vue.directives.js@v3.6
 */
export default {
  bind(el, binding) {
    // show if online
    watch({
      el,
      attr,
      watcher: [
        () => ApplicationState.online,
        (bool) => {
          bool = ((binding.arg && binding.arg === 'hide' ? false : true) ?  bool : !bool);
          el.classList.toggle('g3w-hide', !bool)
        }
      ]
    });
  },
  unbind: (el) => unwatch({ el, attr })
};