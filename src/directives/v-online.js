/**
 * @file
 * @since v3.7
 */

import ApplicationState   from 'store/application-state';
import { watch, unwatch } from 'directives/utils';

const attr = 'g3w-v-offline-id';

export default {
  bind(el, binding) {
    // show if online
    watch({
      el,
      attr,
      watcher: [
        () => ApplicationState.online,
        bool => {
          bool = !(binding.arg && 'hide' === binding.arg) ?  bool : !bool;
          el.classList.toggle('g3w-hide', !bool)
        }
      ]
    });
  },
  unbind: el => unwatch({ el, attr })
};