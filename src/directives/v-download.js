import ApplicationState from 'store/application-state';
import { watch, unwatch } from 'directives/utils';

const attr = 'g3w-v-download-id';

/**
 * ORIGINAL SOURCE: src/app/gui/vue/vue.directives.js@v3.6
 */
export default {
  bind(el, binding) {
    if (typeof binding.value === 'boolean' ? binding.value : true) {
      watch({
        el,
        attr,
        watcher: [
          () => ApplicationState.download,
          (bool) => {
            const className = binding.modifiers && binding.modifiers.show && 'hide' || 'disabled';
            el.classList.toggle(`g3w-${className}`, className === 'hide' ? !bool : bool)
          }
        ]
      });
    }
  },
  unbind: (el) => unwatch({ el, attr })
};