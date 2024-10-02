/**
 * @file
 * @since v3.7
 */

import ApplicationState   from 'store/application';
import { watch, unwatch } from 'directives/utils';

const attr = 'g3w-v-download-id';

export default {
  bind(el, binding) {
    if ('boolean' === typeof binding.value ? binding.value : true) {
      watch({
        el,
        attr,
        watcher: [
          () => ApplicationState.download,
          bool => {
            const className = binding.modifiers && binding.modifiers.show && 'hide' || 'disabled';
            el.classList.toggle(`g3w-${className}`, className === 'hide' ? !bool : bool)
          }
        ]
      });
    }
  },
  unbind: el => unwatch({ el, attr })
};